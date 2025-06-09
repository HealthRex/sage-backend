import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { jsonToZod } from '../validation/jsonToZodSchema';

export class LLMResponse {
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
}

export const llmResponseSchema = (
  templateJson: any,
): z.ZodObject<any, any, any, any, any> => {
  return z.object({
    specialistSummary: z.string(),
    populatedTemplate: jsonToZod(templateJson),
  });
};
