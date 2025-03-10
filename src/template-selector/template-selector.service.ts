import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, lastValueFrom, map } from 'rxjs';
import { SelectBestTemplateRequest } from './models/selectBestTemplateRequest';
import { SelectBestTemplateResponse } from './models/selectBestTemplateResponse';
import { plainToInstance } from 'class-transformer';

// TODO this is all pointing to Endocrinology Google Doc - FIX IT!
const templateGoogleDocLinks: { [key: string]: string } = {
  'Allergy eConsult Checklists _extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Cardiology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Chemical Dependency eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Dermatology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Endocrinology eConsult Checklists FINAL 4.19.22_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'ENT eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Gastroenterology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Gynecology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Hematology eConsult Checklists FINAL 9.7.22_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Hepatology Oncology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Infectious Disease eConsult Checklists_3.13.24_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Interventional Pulmonology eConsult Checklists _extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'LGBTQ+ eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Nephrology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Neurology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Oncology trial eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Orthopedics eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Pain Medicine eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Psychiatry eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Pulmonology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Rheumatology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'SHC Referral Templates Checklists compiled DRAFT_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Sleep Medicine eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
  'Urology eConsult Checklists_extracted.txt':
    'https://docs.google.com/document/d/1tA1bkGYlnoFq2OXKMfP996ZFGoSH0DRO/edit',
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
          'http://0.0.0.0:8000/get-template',
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
