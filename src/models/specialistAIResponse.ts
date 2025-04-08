import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class SpecialistAIResponse {
  @ApiProperty({ description: 'Summary response' })
  summaryResponse: string;

  @ApiProperty({ description: 'Suggested Lab Orders' })
  suggestedLabOrders: string[];

  @ApiProperty({ description: 'Suggested Imaging' })
  suggestedImaging: string[];

  @ApiProperty({ description: 'Suggested Medication' })
  suggestedMedications: string[];

  @ApiProperty({ description: 'Citations' })
  citations: string[];
}

export const specialistAIResponseSchema = z.object({
  summaryResponse: z.string(),
  suggestedLabOrders: z.array(z.string()),
  suggestedImaging: z.array(z.string()),
  suggestedMedications: z.array(z.string()),
  citations: z.array(z.string()),
});
