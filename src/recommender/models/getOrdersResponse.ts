import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class Order {
  @ApiProperty({ description: 'Order item ID' })
  itemId: string;
  @ApiProperty({ description: 'Order description' })
  description: string;
  @ApiProperty({
    description: 'Percentage of patients for which this order was made',
  })
  patientRate: number;
  @ApiProperty({ description: 'TODO' })
  encounterRate: number;
  @ApiProperty({ description: 'TODO' })
  nPatientscohortItem: number;
  @ApiProperty({ description: 'TODO' })
  nEncounterscohortItem: number;
  @ApiProperty({ description: 'TODO' })
  nPatientsCohortTotal: number;
  @ApiProperty({ description: 'TODO' })
  nEncountersCohortTotal: number;
  @ApiProperty({
    description: 'Order type, can be "procedure", "med" or "lab"',
  })
  result_type: string;
}

export class GetOrdersResponse {
  @ApiProperty({ description: 'ICD10 diagnosis code' })
  @Expose({ name: 'icd10_code' })
  icd10Code: string;
  @ApiProperty({
    description: 'TODO',
  })
  @Expose({ name: 'result_type' })
  resultType: string;
  @ApiProperty({ description: 'Patient age' })
  @Expose({ name: 'patient_age' })
  patientAge: number;
  @ApiProperty({ description: 'Patient gender' })
  @Expose({ name: 'patient_gender' })
  patientGender: string;
  @ApiProperty({ description: 'Orders', type: [Order] })
  data: Order[];
}
