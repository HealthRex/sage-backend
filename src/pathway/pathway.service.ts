import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { AxiosError } from 'axios';
import { AnswersRequest } from './models/answersRequest';
import { Message } from './models/message';
import { AnswersResponse } from './models/answersResponse';
import { SpecialistAIResponse } from '../models/specialistAIResponse';

const PathwayMessageLengthLimit: number = 1500;

function chunkString(str: string, length: number): string[] {
  const result = str.match(new RegExp('.{1,' + length + '}', 'g'));
  if (!result) {
    return [];
  }
  return result;
}

@Injectable()
export class PathwayService {
  private readonly logger = new Logger(PathwayService.name);

  constructor(private readonly httpService: HttpService) {}

  async retrieveAnswer(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object,
  ): Promise<SpecialistAIResponse> {
    const request = this.prepareRequest(
      clinicalQuestion,
      clinicalNotes,
      filledTemplate,
    );

    const { data } = await lastValueFrom(
      this.httpService
        .post<AnswersResponse, AnswersRequest>(
          String(process.env.PATHWAY_API),
          request,
          {
            headers: {
              Authorization: 'Bearer ' + process.env.PATHWAY_AI_API_KEY,
            },
            // responseType: 'stream'
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
          catchError((error: AxiosError, caught) => {
            // in case of an error just return the empty response
            this.logger.error(
              'error querying Pathway API',
              error.response?.data,
            );
            // throw new Error('Error querying Pathway API');
            return caught;
          }),
        ),
    );
    console.log('data', data);

    const specialistResponse: SpecialistAIResponse = new SpecialistAIResponse();
    let specialistResponseStr: string = '';
    for (const choice of data.choices) {
      specialistResponseStr += choice.message.content;
    }
    specialistResponse.summaryResponse = specialistResponseStr;
    specialistResponse.citations = data.citations;

    return specialistResponse;
  }

  private prepareRequest(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object,
  ) {
    const request: AnswersRequest = new AnswersRequest([]);

    const clinicalQuestionSplit = chunkString(
      clinicalQuestion,
      PathwayMessageLengthLimit,
    );
    for (const clinicalQuestionSlice of clinicalQuestionSplit) {
      request.messages.push(new Message('user', clinicalQuestionSlice));
    }

    const clinicalNotesSplit = chunkString(
      clinicalNotes,
      PathwayMessageLengthLimit,
    );
    for (const clinicalNotesSlice of clinicalNotesSplit) {
      request.messages.push(new Message('user', clinicalNotesSlice));
    }

    const filledTemplateSplit = chunkString(
      JSON.stringify(filledTemplate),
      PathwayMessageLengthLimit,
    );
    for (const filledTemplateSlice of filledTemplateSplit) {
      request.messages.push(new Message('user', filledTemplateSlice));
    }

    return request;
  }
}
