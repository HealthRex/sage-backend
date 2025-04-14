import { Injectable, Logger } from '@nestjs/common';
import {
  CoreMessage,
  generateObject,
  LanguageModelV1,
  streamObject,
  TextPart,
  UserContent,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { ReferralRequest } from './models/referralRequest';
import * as fs from 'node:fs';
import { join } from 'path';
import { ReferralResponse } from './models/referralResponse';
import { TemplateSelectorService } from './template-selector/template-selector.service';
import { PathwayService } from './pathway/pathway.service';
import { SpecialistAIResponse } from './models/specialistAIResponse';
import { Observable } from 'rxjs';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';
import { LLMResponse, llmResponseSchema } from './models/llmResponse';

enum AIProvider {
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  // TODO add further models
}

const systemPromptFilePath: string = './resources/prompt.txt';
const systemPromptWithoutTemplatesFilePath: string =
  './resources/prompt_no_matched_templates.txt';

// const referralTemplateFileMimeType: string = 'application/pdf';
// const referralTemplateFilePath: string =
//   './resources/Endocrinology eConsult Checklists FINAL 4.19.22.docx.pdf';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly templateSelectorService: TemplateSelectorService,
    private readonly pathwayService: PathwayService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(
    request: ReferralRequest,
  ): Promise<ReferralResponse> {
    this.logger.debug('request: ', request);

    const llmResponse = await this.queryLLM(request);
    const pathwayResponse = await this.queryPathway(request, llmResponse);
    const response: ReferralResponse = llmResponse as ReferralResponse;
    response.specialistAIResponse = pathwayResponse;

    this.logger.debug(response);

    return response;
  }

  postReferralQuestionStreamed(
    request: ReferralRequest,
  ): Observable<{ data: ReferralResponse }> {
    // TODO rewrite to be more flat by making inner subscription function async like "async (subscriber) => {}"
    return new Observable((subscriber) => {
      this.logger.debug('request: ', request);

      this.queryLLMStreamed(request)
        .then((llmResponseStream) => {
          let accumulatedResponse: ReferralResponse = new ReferralResponse();
          llmResponseStream
            .subscribe((next: ReferralResponse) => {
              accumulatedResponse = next;
              subscriber.next({ data: accumulatedResponse });
            })
            .add(() =>
              this.queryPathwayStreamed(request, accumulatedResponse)
                .subscribe((specialistAIResponse) => {
                  accumulatedResponse.specialistAIResponse =
                    specialistAIResponse;

                  subscriber.next({ data: accumulatedResponse });

                  this.logger.debug('response: ', accumulatedResponse);
                })
                .add(() => {
                  subscriber.complete();
                }),
            );
        })
        .catch((reason) => {
          this.logger.error('error querying LLM: ', reason);
          subscriber.error(reason);
        });
    });
  }

  private async queryLLM(request: ReferralRequest): Promise<LLMResponse> {
    const input = await this.prepareLLMInput(request);

    const { object } = await generateObject(input);

    this.logger.debug('structured response:', object);

    return object as LLMResponse;
  }

  private async queryLLMStreamed(request: ReferralRequest) {
    const input = await this.prepareLLMInput(request);

    // @ts-expect-error("it is complaining that error has any type")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (input as any).onError = ({ error }) => {
      this.logger.error('error during streaming structured response:', error); // your error logging logic here
    };

    const { partialObjectStream } = streamObject(input);

    return fromReadableStreamLike(partialObjectStream as ReadableStream);
  }

  private async prepareLLMInput(request: ReferralRequest) {
    const systemPrompt = await this.selectSystemPrompt(request);

    // const referralTemplatesBase64: string = Buffer.from(
    //   fs.readFileSync(referralTemplateFilePath).toString(),
    // ).toString('base64');

    const input = {
      model: this.selectModel(),
      schema: llmResponseSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Clinical question: ' + request.question,
            } as TextPart,
            {
              type: 'text',
              text: 'Patient notes: ' + request.clinicalNotes,
            } as TextPart,
            // {
            //   type: 'file',
            //   data: referralTemplatesBase64,
            //   mimeType: referralTemplateFileMimeType,
            // },
          ] as UserContent,
        } as CoreMessage,
      ],
    };

    // this.logger.debug('referralTemplatesBase64: ', referralTemplatesBase64);
    this.logger.debug('input: ', input);
    return input;
  }

  private async queryPathway(
    request: ReferralRequest,
    response: LLMResponse,
  ): Promise<SpecialistAIResponse> {
    return await this.pathwayService.retrieveAnswer(
      request.question,
      request.clinicalNotes,
      response.populatedTemplate,
    );
  }

  private queryPathwayStreamed(
    request: ReferralRequest,
    response: LLMResponse,
  ): Observable<SpecialistAIResponse> {
    return this.pathwayService.retrieveAnswerStreamed(
      request.question,
      request.clinicalNotes,
      response.populatedTemplate,
    );
  }

  private async selectSystemPrompt(request: ReferralRequest) {
    const bestTemplate = await this.templateSelectorService.selectBestTemplate(
      request.question,
    );
    this.logger.debug('bestTemplate', bestTemplate);

    if (bestTemplate) {
      return fs
        .readFileSync(join(process.cwd(), systemPromptFilePath))
        .toString()
        .replace('{{TemplateGoogleDocLink}}', bestTemplate);
    } else {
      // no template selected
      return fs
        .readFileSync(join(process.cwd(), systemPromptWithoutTemplatesFilePath))
        .toString();
    }
  }

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

  async postPathwayQuestion(request: string[]): Promise<string> {
    return this.pathwayService.retrieveChatAnswer(request);
  }
}
