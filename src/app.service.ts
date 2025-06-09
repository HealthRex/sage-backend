import { Injectable, Logger } from '@nestjs/common';
import {
  CoreMessage,
  FilePart,
  generateObject,
  ImagePart,
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
import { map, Observable, tap } from 'rxjs';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';
import { LLMResponse, llmResponseSchema } from './models/llmResponse';
import { z } from 'zod';
import { ChatRequest } from './models/chatRequest';
import { SessionKeys } from './const';

enum AIProvider {
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  // TODO add further models
}

const systemPromptFilePath: string = './resources/prompt.txt';
const systemPromptWithoutTemplatesFilePath: string =
  './resources/prompt_no_matched_templates.txt';
const systemPromptFollowupQuestionsFilePath: string =
  './resources/prompt_followup_questions.txt';

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

  getRoot(): string {
    return 'Stanford eConsult Backend service';
  }

  async postReferralQuestion(
    request: ReferralRequest,
  ): Promise<ReferralResponse> {
    const systemPrompt = await this.selectSystemPrompt(request);
    const bestTemplate: string =
      await this.templateSelectorService.selectBestTemplate(request.question);

    const llmResponse = await this.queryLLM<LLMResponse>(
      systemPrompt,
      [
        'Clinical question: ' + request.question,
        'Patient notes: ' + request.clinicalNotes,
        bestTemplate,
      ],
      llmResponseSchema(JSON.parse(bestTemplate)),
    );
    const pathwayResponse = await this.queryPathway(request, llmResponse);
    const response: ReferralResponse = llmResponse as ReferralResponse;
    response.specialistAIResponse = pathwayResponse;

    this.logger.debug(response);

    return response;
  }

  async postReferralQuestionStreamed(
    request: ReferralRequest,
    session: Record<string, any>,
  ): Promise<Observable<{ data: ReferralResponse }>> {
    const systemPrompt = await this.selectSystemPrompt(request);
    const llmResponseObservable: Observable<ReferralResponse> =
      this.queryLLMStreamed<ReferralResponse>(
        systemPrompt,
        [
          'Clinical question: ' + request.question,
          'Patient notes: ' + request.clinicalNotes,
        ],
        llmResponseSchema({}),
      );

    return new Observable((subscriber) => {
      let accumulatedResponse: ReferralResponse = new ReferralResponse();
      llmResponseObservable.subscribe({
        next: (next: ReferralResponse) => {
          accumulatedResponse = next;
          session[SessionKeys.REFERRAL_RESPONSE] = accumulatedResponse;

          // reset Pathway conversation history on new referral request
          session[SessionKeys.PREVIOUS_PATHWAY_CONVERSATIONS] = [];

          this.logger.debug('LLM partial response: ', next);
          subscriber.next({ data: next });
        },
        error: (reason) => {
          this.logger.error('error querying LLM: ', reason);
          subscriber.error(reason);
        },
        complete: () => {
          this.queryPathwayStreamed(request, accumulatedResponse)
            .pipe(
              map((specialistAIResponse: SpecialistAIResponse) => {
                accumulatedResponse.specialistAIResponse = specialistAIResponse;
                return accumulatedResponse;
              }),
            )
            .subscribe({
              next: (next: ReferralResponse) => {
                session[SessionKeys.REFERRAL_RESPONSE] = next;
                subscriber.next({ data: next });
              },
              complete: () => subscriber.complete(),
              error: (reason) => {
                this.logger.error('error querying LLM: ', reason);
                subscriber.error(reason);
              },
            });
        },
      });
    });
  }

  async postPathwayQuestion(
    request: string,
    session: Record<string, any>,
  ): Promise<SpecialistAIResponse> {
    const chatRequest: ChatRequest = this.prepareChatRequest(session, request);
    return this.pathwayService.retrieveChatAnswer(chatRequest);
  }

  postPathwayQuestionStreamed(
    request: string,
    session: Record<string, any>,
  ): Observable<{ data: SpecialistAIResponse }> {
    const chatRequest: ChatRequest = this.prepareChatRequest(session, request);
    let accumulatedResponse: SpecialistAIResponse;
    return new Observable((subscriber) => {
      this.pathwayService
        .retrieveChatAnswerStreamed(chatRequest)
        .pipe(
          tap((next) => {
            accumulatedResponse = next;
          }),
          map((next) => {
            return { data: next };
          }),
        )
        .subscribe({
          next: (next) => {
            subscriber.next(next);
          },
          complete: () => {
            (
              session[SessionKeys.PREVIOUS_PATHWAY_CONVERSATIONS] as Record<
                string,
                SpecialistAIResponse
              >[]
            ).push({
              [request]: accumulatedResponse,
            });
            subscriber.complete();
          },
          error: (reason) => {
            this.logger.error('error querying Pathway: ', reason, chatRequest);
            subscriber.error(reason);
          },
        });
    });
  }

  generateFollowupQuestions(session: Record<string, any>): Promise<string[]> {
    const systemPrompt = fs
      .readFileSync(join(process.cwd(), systemPromptFollowupQuestionsFilePath))
      .toString();

    if (
      session[SessionKeys.REFERRAL_REQUEST] == null ||
      (session[SessionKeys.REFERRAL_REQUEST] as ReferralRequest).question ==
        null ||
      session[SessionKeys.REFERRAL_RESPONSE] == null ||
      (session[SessionKeys.REFERRAL_RESPONSE] as ReferralResponse)
        .specialistAIResponse == null ||
      (session[SessionKeys.REFERRAL_RESPONSE] as ReferralResponse)
        .specialistAIResponse?.summaryResponse == null
    ) {
      return Promise.reject(
        new Error(
          'either referralRequest (or its question field) or' +
            ' referralResponse (or its specialistAIResponse field or its summaryResponse field) are empty',
        ),
      );
    }

    let lastPathwayResponse = (
      session[SessionKeys.REFERRAL_RESPONSE] as ReferralResponse
    ).specialistAIResponse?.summaryResponse;
    if (session[SessionKeys.PREVIOUS_PATHWAY_CONVERSATIONS] != null) {
      const lastPathwayConversation = (
        session[SessionKeys.PREVIOUS_PATHWAY_CONVERSATIONS] as Record<
          string,
          SpecialistAIResponse
        >[]
      ).at(-1);
      for (const question in lastPathwayConversation) {
        lastPathwayResponse = lastPathwayConversation[question].summaryResponse;
      }
    }
    const request = [
      'Clinical question: ' +
        (session[SessionKeys.REFERRAL_REQUEST] as ReferralRequest).question,
      'LLM-generated specialist response: ' + lastPathwayResponse,
    ];

    const responseSchema = z.string().array();

    return this.queryLLM<string[]>(systemPrompt, request, responseSchema);
  }

  private async queryLLM<T>(
    systemPrompt: string,
    messages: string[],
    responseSchema: z.Schema<any, z.ZodTypeDef, any>,
  ): Promise<T> {
    const input = this.prepareLLMInput(systemPrompt, messages, responseSchema);

    const { object } = await generateObject<T>(input);
    this.logger.debug('structured response:', object);

    return object;
  }

  private queryLLMStreamed<T>(
    systemPrompt: string,
    messages: string[],
    responseSchema: z.Schema<any, z.ZodTypeDef, any>,
  ): Observable<T> {
    const input = this.prepareLLMInput(systemPrompt, messages, responseSchema);

    // @ts-expect-error("it is complaining that error has any type")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (input as any).onError = ({ error }) => {
      this.logger.error('error during streaming structured response:', error);
    };

    const { partialObjectStream } = streamObject(input);

    return fromReadableStreamLike<T>(partialObjectStream as ReadableStream);
  }

  private prepareLLMInput(
    systemPrompt: string,
    messages: string[],
    responseSchema: z.Schema<any, z.ZodTypeDef, any>,
  ) {
    const input = {
      model: this.selectModel(),
      schema: responseSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [] as UserContent,
        } as CoreMessage,
      ],
    };

    for (const message of messages) {
      (
        input.messages[0].content as Array<TextPart | ImagePart | FilePart>
      ).push({
        type: 'text',
        text: message,
      } as TextPart);
    }

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

  private async selectSystemPrompt(request: ReferralRequest): Promise<string> {
    const bestTemplate: string =
      await this.templateSelectorService.selectBestTemplate(request.question);
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

  private prepareChatRequest(session: Record<string, any>, request: string) {
    const originalReferralRequest = session[
      'referralRequest'
    ] as ReferralRequest;
    const originalReferralResponse = session[
      'referralResponse'
    ] as ReferralResponse;
    let previousConversations: Record<string, SpecialistAIResponse>[] = session[
      'previousPathwayConversations'
    ] as Record<string, SpecialistAIResponse>[];
    if (previousConversations == null) {
      previousConversations = [];
    }

    let originalSpecialistAIResponse: SpecialistAIResponse =
      new SpecialistAIResponse();
    if (
      originalReferralResponse &&
      originalReferralResponse.specialistAIResponse
    ) {
      originalSpecialistAIResponse =
        originalReferralResponse.specialistAIResponse;
    }
    return new ChatRequest(
      request,
      originalReferralRequest.question,
      originalReferralRequest.clinicalNotes,
      originalSpecialistAIResponse.summaryResponse,
      previousConversations,
    );
  }
}
