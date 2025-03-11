import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, lastValueFrom, map, of } from 'rxjs';
import { SelectBestTemplateRequest } from './models/selectBestTemplateRequest';
import { SelectBestTemplateResponse } from './models/selectBestTemplateResponse';
import { plainToInstance } from 'class-transformer';

// TODO would passing drive.google.com/file/.../view link work as well?
const templateGoogleDocLinks: { [key: string]: string } = {
  'Allergy eConsult Checklists _extracted.txt':
    'https://docs.google.com/document/d/1JtFiX31BDZWt0zt0TMKvzLEUxZO5OYlO/edit',
  'Cardiology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1oHN8mjupLrk7QVoH-s2hNNM3V4qCM-Cx/view',
  'Chemical Dependency eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/14Alx6GLZWsl5_D8c57geJSCdWitunPpr/view',
  'Dermatology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1Bc695IqIwT65sSz4uxUJraKfN3BxGVOG/view',
  'Endocrinology eConsult Checklists FINAL 4.19.22_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'ENT eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1Cof4fRSaH5HbMmr_O8mK3xrb-2YElpov/view',
  'Gastroenterology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1KzIx98EJlN8AGlHaYDBHQ0T4BEV9BvX4/view',
  'Gynecology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1iHzbpO-Kmm98z8XxMXtBd191tzluBv0e/view',
  'Hematology eConsult Checklists FINAL 9.7.22_extracted.txt':
    'https://drive.google.com/file/d/1nRdw1uIWAAw047snDVXfWGr6AwiwEEeW/view',
  'Hepatology Oncology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/14ZSQwWhmqcLETp1nNNst2caPgtghQ4OP/view',
  'Infectious Disease eConsult Checklists_3.13.24_extracted.txt':
    'https://drive.google.com/file/d/1W2eXxt3i2U6pdEOiydE4pJLfkZQmQ4qr/view',
  'Interventional Pulmonology eConsult Checklists _extracted.txt':
    'https://drive.google.com/file/d/1VCmKnX4wdh9rxE9DOQDxUhVRocZx9gjH/view',
  'LGBTQ+ eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1UdZrdqu4g7ZDelVJy80pcfZb9JwjQ8yq/view',
  'Nephrology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1MhBZ4JgUvHh1vMDsO1b4WXr14zFaaMTk/view',
  'Neurology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1yRjPXD90c3aU5Oz7bjt1keQecIo0yEx5/view',
  'Oncology trial eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1o8VVVuUgSZhLjwCzc-2u3Va0MWOAgFUD/view',
  'Orthopedics eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1rw0CvTxyExXlSVIhYW_BNCcLtrGu5Yh1/view',
  'Pain Medicine eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1Sj-riOwZ9ow6JsUh1zvloyuAFl5pJV20/view',
  'Psychiatry eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1cnJ3MZFkt5UdSpXdLAGBRB6FnNz5tqGN/view',
  'Pulmonology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/11qKl1vkOIsFGxYTAuMU6Yo57mrjQqH56/view',
  'Rheumatology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1sNB3Ls_RcYoBKjuV3YspAg9h1H30oSCB/view',
  'SHC Referral Templates Checklists compiled DRAFT_extracted.txt':
    'https://drive.google.com/file/d/1uQ7GfwsuHb5GVmb7aU0B_VLC_tTxJe7T/view',
  'Sleep Medicine eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1qdJh1mSNo8OPRsGtOpdkxh8vpeiPS1Pk/view',
  'Urology eConsult Checklists_extracted.txt':
    'https://drive.google.com/file/d/1dX80rZgPpzZGMbhdjpqBsHhCJkM3NInS/view',
};

@Injectable()
export class TemplateSelectorService {
  private readonly logger = new Logger(TemplateSelectorService.name);

  constructor(private readonly httpService: HttpService) {}

  async selectBestTemplate(clinicalQuestion: string): Promise<string> {
    const request: SelectBestTemplateRequest = new SelectBestTemplateRequest();
    request.question = clinicalQuestion;

    const { data } = await lastValueFrom(
      this.httpService
        .post<SelectBestTemplateResponse, SelectBestTemplateRequest>(
          // TODO get-template is wrong name for POST method - should be smth like select-best-template
          String(process.env.EMBEDDINGS_API) + '/get-template',
          request,
        )
        .pipe(
          // looks like we need to manually map the data to the type we want via class-transform
          map((response) => {
            response.data = plainToInstance(
              SelectBestTemplateResponse,
              response.data,
            );
            return response;
          }),
        )
        .pipe(
          catchError((error: AxiosError) => {
            if (error.status === 404) {
              // no template matched
              return of(
                error.response as AxiosResponse<
                  SelectBestTemplateResponse,
                  SelectBestTemplateRequest
                >,
              );
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
    console.log('data', data);

    return templateGoogleDocLinks[data.suggestedTemplate];
  }
}
