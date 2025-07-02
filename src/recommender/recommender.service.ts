import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ClinicalCaseRequest } from './models/clinicalCaseRequest';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';
import { instanceToInstance, plainToInstance } from 'class-transformer';
import { ClinicalCaseResponse } from './models/clinicalCaseResponse';
import { AxiosError } from 'axios';
import { GetOrdersResponse } from './models/getOrdersResponse';
import { GetOrdersRequest } from './models/getOrdersRequest';

const RecommenderPaths = {
  processClinicalCasePath: '/process_clinical_case',
  getOrdersPath: '/get_orders',
} as const;

@Injectable()
export class RecommenderService {
  private readonly logger: Logger = new Logger(RecommenderService.name);

  constructor(private readonly httpService: HttpService) {}

  async retrieveRecommendations(
    clinicalQuestion: string,
    clinicalNotes: string,
  ): Promise<GetOrdersResponse> {
    const request: ClinicalCaseRequest = this.prepareRequest(
      clinicalQuestion,
      clinicalNotes,
    );

    try {
      const clinicalCase: ClinicalCaseResponse =
        await this.retrieveClinicalCaseResponse(instanceToInstance(request));

      return lastValueFrom(
        this.httpService
          .post<GetOrdersResponse, GetOrdersRequest>(
            String(process.env.RECOMMENDER_API) +
              RecommenderPaths.getOrdersPath,
            instanceToInstance(
              GetOrdersRequest.fromClinicalCaseResponse(clinicalCase),
            ),
          )
          .pipe(
            catchError((error: AxiosError) => {
              // in case of an error just return the empty response
              this.logger.error(
                'error querying Recommender Get Orders API',
                error.response?.data,
                request,
              );
              return throwError(
                () =>
                  new Error(
                    'Error querying Recommender Get Orders API: ' +
                      error.message,
                  ),
              );
            }),
          )
          .pipe(
            // looks like we need to manually map the data to the type we want via class-transform
            map((response) => {
              response.data = plainToInstance(GetOrdersResponse, response.data);
              return response.data;
            }),
          ),
      );
    } catch (e) {
      return Promise.reject(e as Error);
    }
  }

  private retrieveClinicalCaseResponse(
    request: ClinicalCaseRequest,
  ): Promise<ClinicalCaseResponse> {
    return lastValueFrom(
      this.httpService
        .post<ClinicalCaseResponse, ClinicalCaseRequest>(
          String(process.env.RECOMMENDER_API) +
            RecommenderPaths.processClinicalCasePath,
          request,
        )
        .pipe(
          catchError((error: AxiosError) => {
            // in case of an error just return the empty response
            this.logger.error(
              'error querying Recommender Process Clinical Case API',
              error.response?.data,
              request,
            );
            return throwError(
              () =>
                new Error(
                  'Error querying Recommender Process Clinical Case API: ' +
                    error.message,
                ),
            );
          }),
        )
        .pipe(
          // looks like we need to manually map the data to the type we want via class-transform
          map((response) => {
            response.data = plainToInstance(
              ClinicalCaseResponse,
              response.data,
            );
            return response.data;
          }),
        ),
    );
  }

  private prepareRequest(
    clinicalQuestion: string,
    clinicalNotes: string,
  ): ClinicalCaseRequest {
    return new ClinicalCaseRequest(clinicalQuestion, clinicalNotes);
  }
}
