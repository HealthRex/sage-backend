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

  @ApiProperty({ description: 'Citations' })
  citations: URL[];
}
