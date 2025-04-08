import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

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

export const llmResponseSchema = z.object({
  specialistSummary: z.string(),
  templateSelectionProcess: z.string(),
  populatedTemplate: z.array(
    z.object({ field: z.string(), value: z.string() }),
  ),
});
