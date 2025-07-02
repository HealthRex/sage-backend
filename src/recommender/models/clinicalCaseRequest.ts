import { Expose } from 'class-transformer';

export class ClinicalCaseRequest {
  @Expose({ name: 'clinical_question' })
  public clinicalQuestion: string;
  @Expose({ name: 'clinical_notes' })
  public clinicalNotes: string;

  constructor(clinicalQuestion: string, clinicalNotes: string) {
    this.clinicalQuestion = clinicalQuestion;
    this.clinicalNotes = clinicalNotes;
  }
}
