import { Injectable, Logger } from '@nestjs/common';
import {
  CoreMessage,
  FilePart,
  generateObject,
  ImagePart,
  streamObject,
  TextPart,
  UserContent,
} from 'ai';
import { ReferralRequest } from './models/referralRequest';
import * as fs from 'node:fs';
import { join } from 'path';
import { ReferralResponse } from './models/referralResponse';
import { TemplateSelectorService } from './template-selector/template-selector.service';
import { SpecialistAiService } from './specialist-ai/specialist-ai.service';
import { SpecialistAIResponse } from './models/specialistAIResponse';
import { map, Observable, tap } from 'rxjs';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';
import { LLMResponse, llmResponseSchema } from './models/llmResponse';
import { z } from 'zod';
import { ChatRequest } from './models/chatRequest';
import { SessionKeys } from './const';
import { plainToInstance } from 'class-transformer';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { LlmSelectorService } from './llm-selector/llm-selector.service';

const systemPromptFilePath: string = './resources/prompt.txt';
const systemPromptWithoutTemplatesFilePath: string =
  './resources/prompt_no_matched_templates.txt';
const systemPromptFollowupQuestionsFilePath: string =
  './resources/prompt_followup_questions.txt';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly llmSelectorService: LlmSelectorService,
    private readonly templateSelectorService: TemplateSelectorService,
    private readonly specialistAiService: SpecialistAiService,
  ) {}

  getRoot(): string {
    return 'Stanford eConsult Backend service';
  }

  async postReferralQuestion(
    request: ReferralRequest,
  ): Promise<ReferralResponse> {
    const bestTemplate: string =
      await this.templateSelectorService.selectBestTemplate(request.question);
    const systemPrompt: string = this.selectSystemPrompt(bestTemplate);

    let llmResponse: LLMResponse = await this.queryLLM<LLMResponse>(
      systemPrompt,
      [
        'Clinical question: ' + request.question,
        'Patient notes: ' + request.clinicalNotes,
      ],
      llmResponseSchema(JSON.parse(bestTemplate)),
    );
    // TODO refactor code so we don't need to call postProcess() here
    llmResponse = plainToInstance(ReferralResponse, llmResponse);
    llmResponse.populatedTemplate =
      llmResponse.postProcessedPopulatedTemplate();
    const specialistAIResponse: SpecialistAIResponse =
      await this.querySpecialistAi(request, llmResponse);
    const response: ReferralResponse = llmResponse as ReferralResponse;
    response.specialistAIResponse = specialistAIResponse;

    this.logger.debug(JSON.stringify(response, null, 2));

    return response;
  }

  async postReferralQuestionStreamed(
    request: ReferralRequest,
    session: Record<string, any>,
  ): Promise<Observable<{ data: ReferralResponse }>> {
    const bestTemplate: string =
      await this.templateSelectorService.selectBestTemplate(request.question);
    const systemPrompt: string = this.selectSystemPrompt(bestTemplate);
    const llmResponseObservable: Observable<ReferralResponse> =
      this.queryLLMStreamed<ReferralResponse>(
        systemPrompt,
        [
          'Clinical question: ' + request.question,
          'Patient notes: ' + request.clinicalNotes,
        ],
        llmResponseSchema(JSON.parse(bestTemplate)),
      );

    return new Observable((subscriber) => {
      let accumulatedResponse: ReferralResponse = new ReferralResponse();
      llmResponseObservable.subscribe({
        next: (next: ReferralResponse) => {
          // TODO refactor code so we don't need to call postProcess() here
          next = plainToInstance(ReferralResponse, next);
          next.populatedTemplate = next.postProcessedPopulatedTemplate();

          accumulatedResponse = next;
          session[SessionKeys.REFERRAL_RESPONSE] = accumulatedResponse;

          // reset Specialist AI conversation history on new referral request
          session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] = [];

          this.logger.debug('LLM partial response: ', JSON.stringify(next));
          subscriber.next({ data: next });
        },
        error: (reason) => {
          this.logger.error('error querying LLM: ', reason);
          subscriber.error(reason);
        },
        complete: () => {
          this.querySpecialistAiStreamed(request, accumulatedResponse)
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

  async postSpecialistQuestion(
    request: string,
    session: Record<string, any>,
  ): Promise<SpecialistAIResponse> {
    const chatRequest: ChatRequest = this.prepareChatRequest(session, request);
    return this.specialistAiService.retrieveChatAnswer(chatRequest);
  }

  postSpecialistQuestionStreamed(
    request: string,
    session: Record<string, any>,
  ): Observable<{ data: SpecialistAIResponse }> {
    const chatRequest: ChatRequest = this.prepareChatRequest(session, request);
    let accumulatedResponse: SpecialistAIResponse;
    return new Observable((subscriber) => {
      this.specialistAiService
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
              session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] as Record<
                string,
                SpecialistAIResponse
              >[]
            ).push({
              [request]: accumulatedResponse,
            });
            subscriber.complete();
          },
          error: (reason) => {
            this.logger.error(
              'error querying Specialist AI: ',
              reason,
              chatRequest,
            );
            subscriber.error(reason);
          },
        });
    });
  }

  generateFollowupQuestions(
    session: Record<string, any>,
  ): Promise<{ questions: string[] }> {
    const systemPrompt: string = fs
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

    let lastSpecialistResponse = (
      session[SessionKeys.REFERRAL_RESPONSE] as ReferralResponse
    ).specialistAIResponse?.summaryResponse;
    if (session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] != null) {
      const lastSpecialistConversation = (
        session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] as Record<
          string,
          SpecialistAIResponse
        >[]
      ).at(-1);
      for (const question in lastSpecialistConversation) {
        lastSpecialistResponse =
          lastSpecialistConversation[question].summaryResponse;
      }
    }
    const request = [
      'Clinical question: ' +
        (session[SessionKeys.REFERRAL_REQUEST] as ReferralRequest).question,
      'LLM-generated specialist response: ' + lastSpecialistResponse,
    ];

    const responseSchema = z.object({ questions: z.string().array() });

    return this.queryLLM<{ questions: string[] }>(
      systemPrompt,
      request,
      responseSchema,
    );
  }

  private selectSystemPrompt(bestTemplate: string) {
    if (bestTemplate.length > 0) {
      return fs
        .readFileSync(join(process.cwd(), systemPromptFilePath))
        .toString();
    } else {
      // no template selected
      return fs
        .readFileSync(join(process.cwd(), systemPromptWithoutTemplatesFilePath))
        .toString();
    }
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
      model: this.llmSelectorService.selectModel(),
      schema: responseSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [] as UserContent,
        } as CoreMessage,
      ],
      providerOptions: {
        openai: {
          strictSchemas: true,
        } satisfies OpenAIResponsesProviderOptions,
      },
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

  private async querySpecialistAi(
    request: ReferralRequest,
    response: LLMResponse,
  ): Promise<SpecialistAIResponse> {
    return await this.specialistAiService.retrieveAnswer(
      request.question,
      request.clinicalNotes,
      response.populatedTemplate,
    );
  }

  private querySpecialistAiStreamed(
    request: ReferralRequest,
    response: LLMResponse,
  ): Observable<SpecialistAIResponse> {
    return this.specialistAiService.retrieveAnswerStreamed(
      request.question,
      request.clinicalNotes,
      response.populatedTemplate,
    );
  }

  private prepareChatRequest(session: Record<string, any>, request: string) {
    const originalReferralRequest = session[
      SessionKeys.REFERRAL_REQUEST
    ] as ReferralRequest;
    const originalReferralResponse = session[
      SessionKeys.REFERRAL_RESPONSE
    ] as ReferralResponse;
    let previousConversations: Record<string, SpecialistAIResponse>[] = session[
      SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS
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
