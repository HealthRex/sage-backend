import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { jsonToZod } from '../validation/jsonToZodSchema';

export class LLMResponse {
  @ApiProperty({ description: 'Specialist summary response' })
  specialistSummary: string;

  @ApiProperty({ description: 'Template selection process explanation' })
  templateSelectionProcess: string;

  @ApiProperty({ description: 'Basic patient summary' })
  basicPatientSummary: Record<string, string>[];

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
  populatedTemplate: object[];

  // TODO review this logic - try to come up with logic without needing to call this explicitly
  public postProcessedPopulatedTemplate(): object[] {
    if (
      this.populatedTemplate == null ||
      !Array.isArray(this.populatedTemplate)
    ) {
      return this.populatedTemplate;
    }

    // TODO not content with removing these things programmatically - we shouldn't be removing these at all - maybe ask FE dev to adapt the JSONs to the format he wants
    const result = new Array<object>();
    for (const templateItem of this.populatedTemplate) {
      if (
        Object.keys(templateItem) &&
        Object.keys(templateItem).length !== 0 &&
        !Object.keys(templateItem)[0]
          .toLowerCase()
          .startsWith('my clinical question') &&
        !Object.keys(templateItem)[0]
          .toLowerCase()
          .startsWith('my most current assessment')
      ) {
        result.push(templateItem);
      }
    }

    return this.removeDuplicates(result) as Record<string, object>[];
  }

  // TODO review this logic - not sure if this works in all cases yet
  private removeDuplicates(obj: object): object {
    if (Array.isArray(obj)) {
      const result = new Array<object>();
      const seenKeys = new Set();
      for (const arrayElem of obj) {
        const elem = arrayElem as Record<string, any>;
        const filteredElem: Record<string, any> = {};
        for (const key of Object.keys(elem)) {
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            filteredElem[key] = this.removeDuplicates(elem[key] as object);
          }
        }
        if (Object.keys(filteredElem).length > 0) {
          result.push(filteredElem);
        }
      }
      return result;
    } else if (typeof obj === 'object') {
      const seenKeys = new Set();
      const filteredElem: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const objAsRecord = obj as Record<string, object>;
          filteredElem[key] = this.removeDuplicates(objAsRecord[key]);
        }
      }
      return filteredElem;
    } else {
      return obj;
    }
  }
}

export const llmResponseSchema = (
  templateJson: any,
): z.ZodObject<any, any, any, any, any> => {
  return z.object({
    specialistSummary: z.string(),
    basicPatientSummary: z.array(
      z.object({ field: z.string(), value: z.string() }),
    ),
    populatedTemplate: jsonToZod(templateJson),
  });
};
