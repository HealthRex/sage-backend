import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { AxiosError } from 'axios';
import { AnswersRequest } from './models/answersRequest';
import { Message } from './models/message';
import { AnswersResponse } from './models/answersResponse';
import { Citation, SpecialistAIResponse } from '../models/specialistAIResponse';
import EventSourceStream from '@server-sent-stream/web';
import { ChatRequest } from '../models/chatRequest';

@Injectable()
export class PathwayService {
  private readonly logger = new Logger(PathwayService.name);

  constructor(private readonly httpService: HttpService) {}

  async retrieveAnswer(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: Record<string, string>[],
  ): Promise<SpecialistAIResponse> {
    const request = this.prepareAnswersRequest(
      clinicalQuestion,
      clinicalNotes,
      filledTemplate,
    );

    const data = await this.doSyncRequest(request);
    return this.specialistResponseFrom(data);
  }

  retrieveAnswerStreamed(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: Record<string, string>[],
  ): Observable<SpecialistAIResponse> {
    const request = this.prepareAnswersRequest(
      clinicalQuestion,
      clinicalNotes,
      filledTemplate,
      true,
    );
    return this.doAsyncRequest(request);
  }

  // TODO try to merge with retrieveAnswer
  async retrieveChatAnswer(
    chatRequest: ChatRequest,
  ): Promise<SpecialistAIResponse> {
    // TODO should previousMessages contain information about whether the message was from 'user' or 'assistant'?
    //      Will Pathway accept messages from 'assistant' as context?
    const request = this.toAnswersRequest(chatRequest);
    const data = await this.doSyncRequest(request);

    return this.specialistResponseFrom(data);
  }

  // TODO try to merge with retrieveAnswerStreamed
  retrieveChatAnswerStreamed(
    chatRequest: ChatRequest,
  ): Observable<SpecialistAIResponse> {
    // TODO should previousMessages contain information about whether the message was from 'user' or 'assistant'?
    //      Will Pathway accept messages from 'assistant' as context?
    const request = this.toAnswersRequest(
      chatRequest,
      true, // shouldStream
    );
    return this.doAsyncRequest(request);
  }

  private doAsyncRequest(
    request: AnswersRequest,
  ): Observable<SpecialistAIResponse> {
    return new Observable<SpecialistAIResponse>((subscriber) => {
      const accumulatedResponse: SpecialistAIResponse =
        new SpecialistAIResponse();
      accumulatedResponse.summaryResponse = '';
      accumulatedResponse.citations = [];

      this.httpService.axiosRef
        .post<ReadableStream>(String(process.env.PATHWAY_API), request, {
          headers: {
            Authorization: 'Bearer ' + process.env.PATHWAY_AI_API_KEY,
            Accept: 'text/event-stream',
          },
          responseType: 'stream',
          adapter: 'fetch',
        })
        .then(async (response) => {
          const stream = response.data; // <- should be a ReadableStream

          const decoder = new EventSourceStream();
          stream.pipeThrough(decoder);

          // Read from the EventSourceStream
          const reader = decoder.readable.getReader();

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            this.logger.debug('Pathway MessageEvent: ', value.data);
            if (value.data == null) {
              // TODO is this an error?
              break;
            }
            const parsedResponse = plainToInstance(
              AnswersResponse,
              JSON.parse(value.data),
            );

            let receivedNewData = false;
            let specialistResponseStr: string = '';
            for (const choice of parsedResponse.choices) {
              if (choice.delta?.content) {
                specialistResponseStr += choice.delta.content;
                receivedNewData = true;
              }
            }
            if (receivedNewData) {
              accumulatedResponse.summaryResponse += specialistResponseStr;
            }
            if (
              parsedResponse.citationsDetailed &&
              parsedResponse.citationsDetailed.length >
                accumulatedResponse.citations.length
            ) {
              receivedNewData = true;
              for (
                let i = accumulatedResponse.citations.length;
                i < parsedResponse.citationsDetailed.length;
                i++
              ) {
                accumulatedResponse.citations.push(
                  new Citation(
                    parsedResponse.citationsDetailed[i].name,
                    parsedResponse.citations[i],
                  ),
                );
              }
            }

            if (receivedNewData) {
              subscriber.next(accumulatedResponse);
            }
          }
          subscriber.complete();
        })
        .catch((error) => {
          this.logger.error('error querying Pathway API: ', error);
          subscriber.error(error);
        });
    });
  }

  private toAnswersRequest(
    chatRequest: ChatRequest,
    shouldStream: boolean = false,
  ): AnswersRequest {
    const request: AnswersRequest = new AnswersRequest([], shouldStream);

    let message =
      'Given clinical notes and your previous responses to questions, answer the following question:\n' +
      chatRequest.question +
      '\n' +
      'INPUT:\n' +
      'Clinical notes: ' +
      chatRequest.originalReferralRequestNotes +
      '.\n' +
      'Your previous responses to questions: ' +
      'Question 1: ' +
      chatRequest.originalReferralRequestQuestion +
      '.\n' +
      'Your response 1: ' +
      chatRequest.originalPathwayResponse +
      '.\n';

    let i = 1;
    for (const previousConversation of chatRequest.previousConversations) {
      for (const question in previousConversation) {
        message +=
          'Question ' +
          i +
          ': ' +
          question +
          '.\n' +
          'Your response ' +
          i +
          ': ' +
          previousConversation[question].summaryResponse +
          '.\n';
        i++;
      }
    }

    request.messages.push(new Message('user', message));

    this.logger.debug('Pathway API request: ', request);
    return request;
  }

  private async doSyncRequest(request: AnswersRequest) {
    const { data } = await lastValueFrom(
      this.httpService
        .post<AnswersResponse, AnswersRequest>(
          String(process.env.PATHWAY_API),
          request,
          {
            headers: {
              Authorization: 'Bearer ' + process.env.PATHWAY_AI_API_KEY,
            },
          },
        )
        .pipe(
          // looks like we need to manually map the data to the type we want via class-transform
          map((response) => {
            response.data = plainToInstance(AnswersResponse, response.data);
            return response;
          }),
        )
        .pipe(
          catchError((error: AxiosError) => {
            // in case of an error just return the empty response
            this.logger.error(
              'error querying Pathway API',
              error.response?.data,
              request.messages,
            );
            return throwError(
              () => new Error('Error querying Pathway API: ' + error.message),
            );
          }),
        ),
    );
    this.logger.debug('data', data);
    return data;
  }

  private specialistResponseFrom(data: AnswersResponse): SpecialistAIResponse {
    const specialistResponse: SpecialistAIResponse = new SpecialistAIResponse();
    let specialistResponseStr: string = '';
    for (const choice of data.choices) {
      specialistResponseStr += choice.message.content;
    }
    specialistResponse.summaryResponse = specialistResponseStr;
    specialistResponse.citations = [];
    for (let i = 0; i < data.citationsDetailed.length; i++) {
      specialistResponse.citations.push(
        new Citation(data.citationsDetailed[i].name, data.citations[i]),
      );
    }
    return specialistResponse;
  }

  private prepareAnswersRequest(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: Record<string, string>[],
    shouldStream: boolean = false,
  ): AnswersRequest {
    const request: AnswersRequest = new AnswersRequest([], shouldStream);

    let combinedMessage =
      'Clinical question: ' +
      clinicalQuestion +
      '\n Clinical notes: ' +
      clinicalNotes +
      '\n Additional information: ';

    for (const filledTemplateField of filledTemplate) {
      combinedMessage +=
        filledTemplateField['field'] +
        ': ' +
        filledTemplateField['value'] +
        '\n';
    }

    request.messages.push(new Message('user', combinedMessage));

    this.logger.debug('Pathway API request: ', request);
    return request;
  }
}
