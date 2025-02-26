import { ApiProperty } from '@nestjs/swagger';

export class SpecialistAIResponse {
  @ApiProperty({ description: 'Summary response' })
  summaryResponse: string;

  @ApiProperty({ description: 'Suggested Lab Orders' })
  suggestedLabOrders: string[];

  @ApiProperty({ description: 'Suggested Imaging' })
  suggestedImaging: string[];

  @ApiProperty({ description: 'Suggested Medication' })
  suggestedMedications: string[];
}

// {
//   "specialistSummary": string,
//   "templateSelectionProcess": string,
//   "populatedTemplate": [object],
//   "specialistAIResponse": string
// }
export class ReferralResponse {
  @ApiProperty({ description: 'Specialist summary response' })
  specialistSummary: string;

  @ApiProperty({ description: 'Template selection process explanation' })
  templateSelectionProcess: string;

  @ApiProperty({
    description: 'Populated template',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  populatedTemplate: Record<string, string>[];

  @ApiProperty({ description: 'Specialist AI response' })
  specialistAIResponse: SpecialistAIResponse;
}
