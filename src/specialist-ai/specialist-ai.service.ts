import { Injectable, Logger } from '@nestjs/common';
import { distinct, map, Observable, scan } from 'rxjs';
import { SpecialistAIResponse } from '../models/specialistAIResponse';
import { ChatRequest } from '../models/chatRequest';
import * as fs from 'node:fs';
import { join } from 'path';
import { CoreMessage, generateText, streamText } from 'ai';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';
import { LlmSelectorService } from '../llm-selector/llm-selector.service';

const promptFilePath: string = './resources/specialist_prompt.md';

@Injectable()
export class SpecialistAiService {
  private readonly logger: Logger = new Logger(SpecialistAiService.name);

  constructor(private readonly llmSelectorService: LlmSelectorService) {}

  async retrieveAnswer(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object[],
  ): Promise<SpecialistAIResponse> {
    const request = this.prepareInput(clinicalQuestion, clinicalNotes);

    const { text } = await generateText(request);
    this.logger.debug('Specialist AI response:', text);

    return this.specialistResponseFrom(text);
  }

  retrieveAnswerStreamed(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object[],
  ): Observable<SpecialistAIResponse> {
    const request = this.prepareInput(clinicalQuestion, clinicalNotes);

    // @ts-expect-error("it is complaining that error has any type")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (request as any).onError = ({ error }) => {
      this.logger.error(
        'error during streaming Specialist AI response:',
        error,
      );
    };

    const { textStream } = streamText(request);

    return fromReadableStreamLike(textStream as ReadableStream)
      .pipe(
        scan(
          (accumulatedResponse: string, currentResponse: string): string =>
            accumulatedResponse + currentResponse,
          '',
        ),
      )
      .pipe(distinct())
      .pipe(
        map((accumulatedResponse: string): SpecialistAIResponse => {
          return this.specialistResponseFrom(accumulatedResponse);
        }),
      );
  }

  // TODO try to merge with retrieveAnswer
  async retrieveChatAnswer(
    chatRequest: ChatRequest,
  ): Promise<SpecialistAIResponse> {
    // TODO should previousMessages contain information about whether the message was from 'user' or 'assistant'?
    //      Will Pathway accept messages from 'assistant' as context?
    const request = this.prepareChatInput(chatRequest);

    const { text } = await generateText(request);
    this.logger.debug('Specialist AI response:', text);

    return this.specialistResponseFrom(text);
  }

  // TODO try to merge with retrieveAnswerStreamed
  retrieveChatAnswerStreamed(
    chatRequest: ChatRequest,
  ): Observable<SpecialistAIResponse> {
    // TODO should previousMessages contain information about whether the message was from 'user' or 'assistant'?
    //      Will Pathway accept messages from 'assistant' as context?
    const request = this.prepareChatInput(chatRequest);

    // @ts-expect-error("it is complaining that error has any type")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (request as any).onError = ({ error }) => {
      this.logger.error(
        'error during streaming Specialist AI chat response:',
        error,
      );
    };

    const { textStream } = streamText(request);

    return fromReadableStreamLike(textStream as ReadableStream)
      .pipe(
        scan(
          (accumulatedResponse: string, currentResponse: string): string =>
            accumulatedResponse + currentResponse,
          '',
        ),
      )
      .pipe(distinct())
      .pipe(
        map((accumulatedResponse: string): SpecialistAIResponse => {
          return this.specialistResponseFrom(accumulatedResponse);
        }),
      );
  }

  private prepareChatInput(chatRequest: ChatRequest) {
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

    const input = {
      model: this.llmSelectorService.selectModel(),
      messages: [
        {
          role: 'user',
          // TODO add as a user/assistant messages array
          content: message,
        } as CoreMessage,
      ],
    };

    this.logger.debug('Specialist AI chat request: ', input);
    return input;
  }

  private specialistResponseFrom(data: string): SpecialistAIResponse {
    const specialistResponse: SpecialistAIResponse = new SpecialistAIResponse();
    specialistResponse.summaryResponse = data;
    specialistResponse.citations = [];
    return specialistResponse;
  }

  private prepareInput(clinicalQuestion: string, clinicalNotes: string) {
    const promptTemplate: string = fs
      .readFileSync(join(process.cwd(), promptFilePath))
      .toString()
      .replace('{{question}}', clinicalQuestion)
      // TODO originally, this should be populated template, but since we're still not generating correct populated template, use clinical notes for now
      .replace('{{notes}}', clinicalNotes);

    const input = {
      model: this.llmSelectorService.selectModel(),
      messages: [
        {
          role: 'user',
          content: promptTemplate,
        } as CoreMessage,
      ],
    };

    this.logger.debug('Specialist AI request: ', input);
    return input;
  }
}
