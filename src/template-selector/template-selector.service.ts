import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, lastValueFrom } from 'rxjs';
import { SelectBestTemplateRequest } from './selectBestTemplateRequest';
import { SelectBestTemplateResponse } from './selectBestTemplateResponse';

@Injectable()
export class TemplateSelectorService {
  private readonly logger = new Logger(TemplateSelectorService.name);

  constructor(private readonly httpService: HttpService) {}

  async selectBestTemplate(clinicalQuestion: string): Promise<string> {
    const request: SelectBestTemplateRequest = new SelectBestTemplateRequest();
    request.question = clinicalQuestion;

    const { data } = await lastValueFrom(
      this.httpService
        .post<SelectBestTemplateResponse>(
          'http://0.0.0.0:5000/select-best-template',
          request,
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              'error querying template selection service',
              error.response?.data,
            );
            throw new Error('Error querying template selection service');
          }),
        ),
    );
    console.log('data', data);
    return data.bestTemplate;
  }
}
