import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, lastValueFrom, map } from 'rxjs';
import { SelectBestTemplateRequest } from './models/selectBestTemplateRequest';
import { SelectBestTemplateResponse } from './models/selectBestTemplateResponse';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TemplateSelectorService {
  private readonly logger: Logger = new Logger(TemplateSelectorService.name);

  constructor(private readonly httpService: HttpService) {}

  async selectBestTemplate(clinicalQuestion: string): Promise<string> {
    const request: SelectBestTemplateRequest = new SelectBestTemplateRequest();
    request.question = clinicalQuestion;

    const suggestedTemplateJson: string = await lastValueFrom(
      this.httpService
        .post<SelectBestTemplateResponse, SelectBestTemplateRequest>(
          String(process.env.EMBEDDINGS_API) + '/select-best-template',
          request,
        )
        .pipe(
          // looks like we need to manually map the data to the type we want via class-transform
          map((response) => {
            response.data = plainToInstance(
              SelectBestTemplateResponse,
              response.data,
            );
            return response.data.suggestedTemplateJson;
          }),
        )
        .pipe(
          catchError((error: AxiosError) => {
            if (error.status === 404) {
              // no template matched
              return '';
            }

            // TODO handle 404 error - need to send different prompt to LLM asking it to generate template by itself
            // TODO what to do in case of 500 error?
            this.logger.error(
              'error querying template selection service',
              error.response?.data,
            );
            throw new Error('Error querying template selection service');
          }),
        ),
    );
    this.logger.debug('suggestedTemplateJson', suggestedTemplateJson);

    return suggestedTemplateJson;
  }
}
