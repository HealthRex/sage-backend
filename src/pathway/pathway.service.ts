import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { AxiosError } from 'axios';
import { AnswersRequest } from './models/answersRequest';
import { Message } from './models/message';
import { AnswersResponse } from './models/answersResponse';
import { SpecialistAIResponse } from '../models/specialistAIResponse';

const PathwayMinAlphaNumLength: number = 3;
// TODO update this back to 1500 once Pathway fixes this bug
//      there's another bug where it doesn't accept 1499 alphanumeric chars - so, cutting this down to 1024
const PathwayMaxAlphaNumLength: number = 1024;

function splitIntoGivenAlphaNumCharLengths(
  str: string,
  minAlphaNumLength: number,
  maxAlphaNumLength: number,
): string[] {
  const result: string[] = [];
  if (str == null || str.length === 0) return result;

  const alphaNumericCharRegex = /[a-zA-Z0-9]/g;

  const alphaNumericCharMatches = str.matchAll(alphaNumericCharRegex);
  let i = 0;
  let startIdx = 0;
  for (const alphaNumericCharMatch of alphaNumericCharMatches) {
    if (i > 0 && i % maxAlphaNumLength === 0) {
      result.push(str.slice(startIdx, alphaNumericCharMatch.index));
      startIdx = alphaNumericCharMatch.index;
    }
    i++;
  }
  if (i % maxAlphaNumLength < minAlphaNumLength) {
    const lastChunk = result.pop();
    if (lastChunk === undefined) {
      // given string is too short in alphanumeric characters - return empty array
      return result;
    } else {
      // need to rejoin last pushed chunk with remaining chunk and re-split it
      const reJoinedChunk = lastChunk + str.slice(startIdx);
      const lastTwoSlices = splitIntoGivenAlphaNumCharLengths(
        reJoinedChunk,
        minAlphaNumLength,
        Math.ceil((maxAlphaNumLength + (i % maxAlphaNumLength)) / 2),
      );
      result.push(...lastTwoSlices);
    }
  } else {
    if (startIdx < str.length) {
      result.push(str.slice(startIdx));
    }
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
    this.logger.debug('Pathway API request: ', request);

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

    const specialistResponse: SpecialistAIResponse = new SpecialistAIResponse();
    let specialistResponseStr: string = '';
    for (const choice of data.choices) {
      specialistResponseStr += choice.message.content;
    }
    specialistResponse.summaryResponse = specialistResponseStr;
    specialistResponse.citations = data.citations;

    return specialistResponse;
  }

  retrieveAnswerStreamed(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object,
  ): Observable<SpecialistAIResponse> {
    const request = this.prepareRequest(
      clinicalQuestion,
      clinicalNotes,
      filledTemplate,
    );
    request.stream = true;
    this.logger.debug('Pathway API request: ', request);

    const accumulatedResponse: SpecialistAIResponse =
      new SpecialistAIResponse();
    accumulatedResponse.citations = [];

    return new Observable<SpecialistAIResponse>((subscriber) => {
      this.httpService
        .post<ReadableStream, AnswersRequest>(
          String(process.env.PATHWAY_API),
          request,
          {
            headers: {
              Authorization: 'Bearer ' + process.env.PATHWAY_AI_API_KEY,
            },
            responseType: 'stream',
            // decompress: true,
            adapter: 'fetch',
          },
        )
        .subscribe({
          next(value) {
            console.log(
              'Pathway API partial response type: ',
              typeof value.data,
            );

            const reader = value.data.getReader();
            const decoder = new TextDecoder();
            let readFinished = false;

            while (!readFinished) {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    readFinished = true;
                    subscriber.complete();
                    return;
                  }

                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk
                    .split('\n')
                    .filter(Boolean)
                    .filter((value) => value.startsWith('data: '));

                  for (const line of lines) {
                    try {
                      const message = line.replace(/^data: /, '');
                      // if (message === '[DONE]') {
                      //   subscriber.complete();
                      //   return;
                      // }
                      try {
                        const parsedResponse = plainToInstance(
                          AnswersResponse,
                          JSON.parse(message),
                        );

                        let specialistResponseStr: string = '';
                        for (const choice of parsedResponse.choices) {
                          specialistResponseStr += choice.delta.content;
                        }
                        accumulatedResponse.summaryResponse =
                          specialistResponseStr;
                        accumulatedResponse.citations.push(
                          ...parsedResponse.citations,
                        );

                        subscriber.next(accumulatedResponse);
                      } catch (error) {
                        console.error(
                          'Could not JSON parse stream message',
                          message,
                          error,
                        );
                        subscriber.error(error);
                      }
                    } catch (error) {
                      console.error('Error parsing update:', error);
                    }
                  }
                })
                .catch((error) => {
                  subscriber.error(error);
                })
                .finally(() => {
                  readFinished = true;
                });
            }

            // const dataStr = value.data;
            // console.log('Pathway API partial response: ', dataStr);
            //
            // const lines = dataStr
            //   .toString()
            //   .split('\n')
            //   .filter(
            //     (line) => line.trim() !== '' && line.startsWith('data: '),
            //   );
            // for (const line of lines) {
            //   const message = line.replace(/^data: /, '');
            //   // if (message === '[DONE]') {
            //   //   subscriber.complete();
            //   //   return;
            //   // }
            //   try {
            //     const parsedResponse = plainToInstance(
            //       AnswersResponse,
            //       JSON.parse(message),
            //     );
            //
            //     let specialistResponseStr: string = '';
            //     for (const choice of parsedResponse.choices) {
            //       specialistResponseStr += choice.delta.content;
            //     }
            //     accumulatedResponse.summaryResponse = specialistResponseStr;
            //     accumulatedResponse.citations.push(...parsedResponse.citations);
            //
            //     subscriber.next(accumulatedResponse);
            //   } catch (error) {
            //     console.error(
            //       'Could not JSON parse stream message',
            //       message,
            //       error,
            //     );
            //     subscriber.error(error);
            //   }
            // }
          },
          complete() {
            console.log('Pathway API partial responses completed');
            subscriber.complete();
          },
        });
    });

    // return this.httpService
    //   .post<string, AnswersRequest>(String(process.env.PATHWAY_API), request, {
    //     headers: {
    //       Authorization: 'Bearer ' + process.env.PATHWAY_AI_API_KEY,
    //     },
    //     // responseType: 'stream',
    //   })
    //   .pipe(
    //     // looks like we need to manually map the data to the type we want via class-transform
    //     map((response) => {
    //       // const lines = response.data
    //       //   .toString()
    //       //   .split('\n')
    //       //   .filter((line) => line.trim() !== '');
    //       // for (const line of lines) {
    //       //   const message = line.replace(/^data: /, '');
    //       //   if (message === '[DONE]') {
    //       //     res.write('data: DONE\n\n');
    //       //     res.end();
    //       //     return;
    //       //   }
    //       //   const parsed = JSON.parse(message);
    //       //   res.write(`data: ${parsed.choices[0].text}\n\n`);
    //       // }
    //       this.logger.debug('Response: ', response);
    //
    //       const parsedResponse = plainToInstance(
    //         AnswersResponse,
    //         JSON.parse(response.data),
    //       );
    //
    //       let specialistResponseStr: string = '';
    //       for (const choice of parsedResponse.choices) {
    //         specialistResponseStr += choice.delta.content;
    //       }
    //       accumulatedResponse.summaryResponse = specialistResponseStr;
    //       accumulatedResponse.citations.push(...parsedResponse.citations);
    //
    //       return accumulatedResponse;
    //     }),
    //   )
    //   .pipe(
    //     catchError((error: AxiosError) => {
    //       // in case of an error just return the empty response
    //       this.logger.error(
    //         'error querying Pathway API',
    //         error.response?.data,
    //         request.messages,
    //       );
    //       // throw new Error('Error querying Pathway API');
    //       return of(new SpecialistAIResponse());
    //     }),
    //   );
  }

  private prepareRequest(
    clinicalQuestion: string,
    clinicalNotes: string,
    filledTemplate: object,
  ) {
    const request: AnswersRequest = new AnswersRequest([]);

    const clinicalQuestionSplit = splitIntoGivenAlphaNumCharLengths(
      clinicalQuestion,
      PathwayMinAlphaNumLength,
      PathwayMaxAlphaNumLength,
    );

    for (const clinicalQuestionSlice of clinicalQuestionSplit) {
      request.messages.push(new Message('user', clinicalQuestionSlice));
    }

    const clinicalNotesSplit = splitIntoGivenAlphaNumCharLengths(
      clinicalNotes,
      PathwayMinAlphaNumLength,
      PathwayMaxAlphaNumLength,
    );
    for (const clinicalNotesSlice of clinicalNotesSplit) {
      request.messages.push(new Message('user', clinicalNotesSlice));
    }

    const filledTemplateSplit = splitIntoGivenAlphaNumCharLengths(
      JSON.stringify(filledTemplate),
      PathwayMinAlphaNumLength,
      PathwayMaxAlphaNumLength,
    );
    for (const filledTemplateSlice of filledTemplateSplit) {
      request.messages.push(new Message('user', filledTemplateSlice));
    }

    return request;
  }
}
