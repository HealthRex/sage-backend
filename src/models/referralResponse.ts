import { ApiProperty } from '@nestjs/swagger';
import { SpecialistAIResponse } from './specialistAIResponse';

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
