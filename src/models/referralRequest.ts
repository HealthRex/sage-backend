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
    description: 'Patient clinical notes',
    required: true,
    example:
      'HISTORY OF PRESENT ILLNESS\n' +
      'This 63-year-old white female retired lobbyist was seen for an evaluation of fatigue and dyspnea.' +
      'Over the past two years she had experienced dyspnea while climbing stairs and ankle swelling at the end of the day.' +
      'She was also aware of a increase in her heart rate.' +
      'Five months ago her physician detected asymmetry of her thyroid gland, and a biopsy was obtained which revealed adenomatous changes.' +
      'She had not experienced chest pain or palpitations, but she was unable to arise from the sitting position in the bathtub.' +
      'She did not notice hair changes or alterations in her bowel habits.' +
      'She voluntarily lost about twenty-pounds over the past year.\n' +
      'PAST MEDICAL HISTORY\n' +
      'The patient had a benign adenoma of the thyroid removed twenty years ago.\n' +
      'MEDICATIONS\n' +
      'She was started on Synthroid 0.15 μg/day, but discontinued this medication in recent weeks. She is presently on no medication.\n' +
      'PHYSICAL EXAMINATION\n' +
      'The patient was a large framed pleasant white female in no distress. She was afebrile, with a pulse of 108/min. and regular.' +
      'Respirations were 18/min. and her blood pressure was 160/75 mmHg lying and standing. The skin was soft and moist.' +
      'Her hair was of normal texture. There was slight prominence of the eyes with a mild lid lag. Fundi were benign.' +
      'There was a scar over the lower anterior area of the neck. Neck veins were not distended and no bruits were audible over the carotid vessels.  The thyroid was somewhat enlarged and nodular.  The lungs were clear.  Her heart was not enlarged, but there was a click and a grade II mid-late systolic murmur at the apex.  There was also a grade III diamond shaped systolic murmur along the left sternal border radiating over the pulmonic area.  The third heart sound was audible at the apex.  Pulses were full in the feet.  There was a fine tremor of the hands and 1+ edema of the lower extremities.  Reflexes were 3+.  There was bilateral weakness of triceps.\n' +
      'LABORATORY AND OTHER PROCEDURES\n' +
      'The electrocardiogram revealed sinus tachycardia. An echocardiogram revealed mild prolapse of the mitral valve.' +
      'Cholesterol was 220 mg/dL.\n',
  })
  clinicalNotes: string;
}
