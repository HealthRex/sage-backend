import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const alphaNumericCharRegex = /[a-zA-Z0-9]/g;

export function MinAlphaNumLength(
  minLength: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'minAlphaNumLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [minLength],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const [requiredMinLength] = args.constraints;
          if (!value || typeof value !== 'string') {
            return false;
          }
          const alphaNumericMatches = value.match(alphaNumericCharRegex);
          return (
            typeof requiredMinLength === 'number' &&
            alphaNumericMatches != null &&
            alphaNumericMatches.length >= requiredMinLength
          );
        },
      },
    });
  };
}
