import { Injectable } from '@nestjs/common';
import { generateText, LanguageModelV1 } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { ReferralRequest } from './models/referralRequest';
import * as fs from 'node:fs';
import { join } from 'path';
import { ReferralResponse } from './models/referralResponse';
import { TemplateSelectorService } from './template-selector/template-selector.service';

enum AIProvider {
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  // TODO add further models
}

const patientIdToFiles = new Map<number, string>([
  [69, './resources/case_69.txt'],
  [11, './resources/case_11.txt'],
  [21, './resources/case_21.txt'],
  [37, './resources/case_37.txt'],
  [59, './resources/case_59.txt'],
  [72, './resources/case_72.txt'],
  [74, './resources/case_74.txt'],
  [76, './resources/case_76.txt'],
  [85, './resources/case_85.txt'],
  [101, './resources/case_101.txt'],
]);
const defaultPatientHistory: string = fs
  .readFileSync(join(process.cwd(), './resources/case_69.txt'))
  .toString();

const systemPromptFilePath: string = './resources/prompt.txt';
// const referralTemplateFileMimeType: string = 'application/pdf';
// const referralTemplateFilePath: string =
//   './resources/Endocrinology eConsult Checklists FINAL 4.19.22.docx.pdf';

@Injectable()
export class AppService {
  constructor(
    private readonly templateSelectorService: TemplateSelectorService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(
    request: ReferralRequest,
  ): Promise<ReferralResponse> {
    console.log('request: ', request);

    const bestTemplate = await this.templateSelectorService.selectBestTemplate(
      request.question,
    );
    console.log('bestTemplate', bestTemplate);

    const systemPrompt: string = fs
      .readFileSync(join(process.cwd(), systemPromptFilePath))
      .toString();

    // const referralTemplatesBase64: string = Buffer.from(
    //   fs.readFileSync(referralTemplateFilePath).toString(),
    // ).toString('base64');

    let patientHistory: string = defaultPatientHistory;
    if (patientIdToFiles.has(request.patientId)) {
      patientHistory = fs
        .readFileSync(
          join(
            process.cwd(),
            patientIdToFiles.get(request.patientId) ??
              './resources/case_69.txt',
          ),
        )
        .toString();
    }

    const input = {
      model: this.selectModel(),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: request.question,
            },
            {
              type: 'text',
              text: patientHistory,
            },
            // {
            //   type: 'file',
            //   data: referralTemplatesBase64,
            //   mimeType: referralTemplateFileMimeType,
            // },
          ],
        },
      ],
    };

    // console.log('referralTemplatesBase64: ', referralTemplatesBase64);
    console.log('input: ', input);
    console.dir(input.messages[0].content);

    // @ts-expect-error('input type is not recognized even though it matches to required type')
    const { text } = await generateText(input);
    console.log(text);

    const supposedJsonResponse: string = text
      .substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
      .replaceAll(/\n/g, '');
    console.log('supposedJsonResponse:', supposedJsonResponse);

    const response: ReferralResponse = JSON.parse(
      supposedJsonResponse,
    ) as ReferralResponse;
    console.log(response);

    return response;
  }

  // TODO determine appropriate return type
  private selectModel(): LanguageModelV1 {
    switch (String(process.env.AI_PROVIDER).toUpperCase() as AIProvider) {
      case AIProvider.Claude:
        return anthropic('claude-3-opus-20240229');
      case AIProvider.Gemini:
        return google('models/gemini-2.0-flash');
      default:
        throw new Error('unknown AI_PROVIDER type selected');
    }
  }
}
