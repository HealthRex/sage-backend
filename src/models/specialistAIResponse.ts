import { ApiProperty } from '@nestjs/swagger';

export class Citation {
  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;
  }

  @ApiProperty({ description: 'Citation name' })
  name: string;
  @ApiProperty({ description: 'Citation URL' })
  url: string;
}

export class SpecialistAIResponse {
  @ApiProperty({ description: 'Summary response' })
  summaryResponse: string;

  @ApiProperty({ description: 'Suggested Lab Orders' })
  suggestedLabOrders: string[];

  @ApiProperty({ description: 'Suggested Imaging' })
  suggestedImaging: string[];

  @ApiProperty({ description: 'Suggested Medication' })
  suggestedMedications: string[];

  @ApiProperty({ description: 'Citations', type: [Citation] })
  citations: Citation[];
}
