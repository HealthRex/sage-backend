import { ApiProperty } from '@nestjs/swagger';
import { SpecialistAIResponse } from './specialistAIResponse';
import { LLMResponse } from './llmResponse';

// {
//   "specialistSummary": string,
//   "templateSelectionProcess": string,
//   "populatedTemplate": [object],
//   "specialistAIResponse": string
// }
export class ReferralResponse extends LLMResponse {
  @ApiProperty({ description: 'Specialist AI response' })
  specialistAIResponse?: SpecialistAIResponse;
}
