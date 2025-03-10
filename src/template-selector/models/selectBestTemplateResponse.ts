import { Expose } from 'class-transformer';

export class SelectBestTemplateResponse {
  question: string;
  @Expose({ name: 'suggested_template' })
  suggestedTemplate: string;
  @Expose({ name: 'similarity_scores' })
  similarityScores: object;
}
