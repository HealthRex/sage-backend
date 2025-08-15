import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Session,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';

import { ReferralRequest } from './models/referralRequest';
import { ReferralResponse } from './models/referralResponse';
import { ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SpecialistAIResponse } from './models/specialistAIResponse';
import { SessionKeys } from './const';
import { ApiKeyGuard } from './guards/apikey.guard';

@Controller()
@UseGuards(ApiKeyGuard)
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): string {
    return this.appService.getRoot();
  }

  @Post('/referral')
  @ApiCreatedResponse({
    description: 'Successfully received AI response to clinical question.',
    type: ReferralResponse,
  })
  async postReferralQuestion(
    @Session() session: Record<string, any>,
    @Body() request: ReferralRequest,
  ): Promise<ReferralResponse> {
    this.logger.debug('controller request', request);
    session[SessionKeys.REFERRAL_REQUEST] = request;

    const response = await this.appService.postReferralQuestion(request);
    session[SessionKeys.REFERRAL_RESPONSE] = response;
    // reset Specialist AI conversation history on new referral request
    session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] = [];

    return response;
  }

  @Post('/referral-streamed')
  @Sse()
  @ApiOkResponse({
    description:
      'Successfully received streamed AI response to clinical question.',
    type: ReferralResponse,
  })
  async postReferralQuestionStreamed(
    @Session() session: Record<string, any>,
    @Body() request: ReferralRequest,
  ): Promise<Observable<{ data: ReferralResponse }>> {
    this.logger.debug('controller request', request);
    session[SessionKeys.REFERRAL_REQUEST] = request;

    return await this.appService.postReferralQuestionStreamed(request, session);
  }

  @Post('/ask-specialist')
  @ApiBody({
    schema: {
      properties: {
        question: { type: 'string' },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Successfully received Specialist AI response to a clarifying question.',
    type: SpecialistAIResponse,
  })
  async postSpecialistQuestion(
    @Session() session: Record<string, any>,
    @Body('question') question: string,
  ): Promise<SpecialistAIResponse> {
    this.logger.debug('controller request', question);
    this.logger.debug('session', session);
    const response: SpecialistAIResponse =
      await this.appService.postSpecialistQuestion(question, session);
    if (session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] == null) {
      session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] = [];
    }
    (
      session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] as Record<
        string,
        SpecialistAIResponse
      >[]
    ).push({
      [question]: response,
    });
    return response;
  }

  @Post('/ask-specialist-streamed')
  @Sse()
  @ApiBody({
    schema: {
      properties: {
        question: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Successfully received streamed Specialist AI response to a clarifying question.',
    type: SpecialistAIResponse,
  })
  postSpecialistQuestionStreamed(
    @Session() session: Record<string, any>,
    @Body('question') question: string,
  ): Observable<{ data: SpecialistAIResponse }> {
    this.logger.debug('controller request', question);
    this.logger.debug('session', session);
    if (session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] == null) {
      session[SessionKeys.PREVIOUS_SPECIALIST_CONVERSATIONS] = [];
    }
    return this.appService.postSpecialistQuestionStreamed(question, session);
  }

  @Get('/followup-questions')
  @ApiOkResponse({
    description: 'Successfully generated followup questions from LLM.',
    type: String,
    isArray: true,
  })
  generateFollowupQuestions(
    @Session() session: Record<string, any>,
  ): Promise<{ questions: string[] }> {
    this.logger.debug('controller request for followup questions generation');
    this.logger.debug('session', session);
    return this.appService.generateFollowupQuestions(session);
  }
}
