import { Expose } from 'class-transformer';
import { ClinicalCaseResponse } from './clinicalCaseResponse';

export class GetOrdersRequest {
  @Expose({ name: 'patient_age' })
  patientAge: number;
  @Expose({ name: 'patient_gender' })
  patientGender: string;
  @Expose({ name: 'icd10_code' })
  icd10Code: string;
  limit: number = 10; // TODO make this configurable

  constructor(patientAge: number, patientGender: string, icd10Code: string) {
    this.patientAge = patientAge;
    this.patientGender = patientGender;
    this.icd10Code = icd10Code;
  }

  public static fromClinicalCaseResponse(
    clinicalCaseResponse: ClinicalCaseResponse,
  ): GetOrdersRequest {
    return new GetOrdersRequest(
      clinicalCaseResponse.patientAge,
      clinicalCaseResponse.patientGender,
      clinicalCaseResponse.icd10Code,
    );
  }
}
