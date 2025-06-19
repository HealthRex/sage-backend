import { z } from 'zod';
import { ZodTypeAny } from 'zod/lib/types';

// inspired from https://github.com/colinhacks/zod/discussions/585
export const jsonToZod = (obj: any): z.ZodTypeAny => {
  const parse = (obj: any): z.ZodTypeAny => {
    switch (typeof obj) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'bigint':
        return z.number().int();
      case 'boolean':
        return z.boolean();
      case 'object': {
        if (Array.isArray(obj)) {
          const options = obj
            .map(parse)
            .reduce(
              (acc: z.ZodTypeAny[], curr) =>
                acc.includes(curr) ? acc : [...acc, curr],
              [],
            );
          if (options.length === 1) {
            return z.array(options[0]);
          } else if (options.length > 1) {
            return z.array(z.union([options[0], options[1], ...options]));
          } else {
            return z.array(z.unknown());
          }
        }
        const zodObj: Map<string, ZodTypeAny> = new Map(
          Object.entries(obj as object).map(([k, v]) => [k, parse(v)]),
        );
        return z.object(Object.fromEntries(zodObj));
      }
      case 'undefined':
        return z.undefined();
      case 'function':
        return z.function();
      case 'symbol':
      default:
        return z.unknown();
    }
  };

  return parse(obj);
};
