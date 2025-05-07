import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, throwError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ColorAiService {
  private readonly logger = new Logger(ColorAiService.name);

  constructor(private readonly httpService: HttpService) {}

  async retrieveFilledTemplate(
    templateName: string,
    clinicalNotes: string,
  ): Promise<Record<string, string>> {
    const request = {
      ['patient_data']: clinicalNotes,
    };

    const { data } = await lastValueFrom(
      this.httpService
        .post<{ filled_template: string }>(
          String(process.env.COLOR_API).replace(
            '{template_name}',
            templateName,
          ),
          request,
          {
            headers: {
              Authorization: 'Bearer ' + process.env.COLOR_API_KEY,
            },
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            // in case of an error just return the empty response
            this.logger.error(
              'error querying Color API for template: ' + templateName,
              error.response?.data,
              request,
            );
            return throwError(
              () => new Error('Error querying Color API: ' + error.message),
            );
          }),
        ),
    );
    this.logger.debug('data', data);
    return data;
  }
}
