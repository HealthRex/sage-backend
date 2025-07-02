import { Expose } from 'class-transformer';

export class ClinicalCaseResponse {
  @Expose({ name: 'patient_age' })
  patientAge: number;
  @Expose({ name: 'patient_gender' })
  patientGender: string;
  @Expose({ name: 'icd10_code' })
  icd10Code: string;
  @Expose({ name: 'rationale' })
  rationale: number;
  @Expose({ name: 'error' })
  error: any;
  @Expose({ name: 'retry_count' })
  retryCount: number;
  @Expose({ name: 'stopped' })
  stopped: boolean;
}
