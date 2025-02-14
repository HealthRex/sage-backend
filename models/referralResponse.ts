import { Type, Transform } from 'class-transformer';

// {
//   "1_specialistSummary": string,
//   "2_populatedTemplate": {
//   "a_templateSelectionProcess": string,
//     "b_strictTemplateAdherence": string,
// },
//   "3_specialistAIResponse": string
// }
export class ReferralResponse {
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistSummary: string;

  @Type(() => PopulatedTemplate)
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  populatedTemplate: PopulatedTemplate;

  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistAIResponse: string;
}

export class PopulatedTemplate {
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  templateSelectionProcess: string;

  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  filledReferralTemplate: string;
}
