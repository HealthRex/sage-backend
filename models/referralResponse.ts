import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PopulatedTemplate {
  @ApiProperty({
    description: 'Template selection process explanation',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  templateSelectionProcess: string;

  @ApiProperty({
    description: 'Filled referral template',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  filledReferralTemplate: string;
}

// {
//   "1_specialistSummary": string,
//   "2_populatedTemplate": {
//   "a_templateSelectionProcess": string,
//     "b_strictTemplateAdherence": string,
// },
//   "3_specialistAIResponse": string
// }
export class ReferralResponse {
  @ApiProperty({
    description: 'Specialist summary response',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistSummary: string;

  @ApiProperty({
    description: 'Populated template',
  })
  @Type(() => PopulatedTemplate)
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  populatedTemplate: PopulatedTemplate;

  @ApiProperty({
    description: 'Specialist AI response',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistAIResponse: string;
}
