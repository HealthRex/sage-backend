import { ApiProperty } from '@nestjs/swagger';

export class ReferralRequest {
  @ApiProperty({
    description: 'Clinical question',
    required: true,
    example:
      '37F with fatigue and trembling spells, found to have low T4 (3.1) but normal TSH (0.62). ' +
      'On multiple medications including stanozolol and digoxin. ' +
      'Would appreciate guidance on interpretation of thyroid function tests and recommended next steps in evaluation',
  })
  question: string;

  @ApiProperty({
    description: 'Patient ID for patient history retrieval',
    required: false,
    default: 69,
    example: '69',
  })
  patientId: number;
}
