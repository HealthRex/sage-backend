import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Session,
  Sse,
} from '@nestjs/common';
import { AppService } from './app.service';

import { ReferralRequest } from './models/referralRequest';
import { ReferralResponse } from './models/referralResponse';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SpecialistAIResponse } from './models/specialistAIResponse';

@Controller()
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
    session['referralRequest'] = request;
    return await this.appService.postReferralQuestion(request);
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
    session['referralRequest'] = request;
    return await this.appService.postReferralQuestionStreamed(request);
  }

  @Post('/ask-pathway')
  @ApiCreatedResponse({
    description:
      'Successfully received Pathway AI response to a clarifying question.',
    type: SpecialistAIResponse,
  })
  async postPathwayQuestion(
    @Session() session: Record<string, any>,
    @Body() request: string[],
  ): Promise<SpecialistAIResponse> {
    this.logger.debug('controller request', request);
    this.logger.debug('session', session);
    return await this.appService.postPathwayQuestion(request);
  }

  @Post('/ask-pathway-streamed')
  @Sse()
  @ApiOkResponse({
    description:
      'Successfully received streamed Pathway AI response to a clarifying question.',
    type: SpecialistAIResponse,
  })
  postPathwayQuestionStreamed(
    @Session() session: Record<string, any>,
    @Body() request: string[],
  ): Observable<{ data: SpecialistAIResponse }> {
    this.logger.debug('controller request', request);
    this.logger.debug('session', session);
    return this.appService.postPathwayQuestionStreamed(request);
  }

  @Post('/followup-questions')
  @ApiCreatedResponse({
    description: 'Successfully generated followup questions from LLM.',
    type: 'string',
    isArray: true,
  })
  generateFollowupQuestions(@Body() request: string[]): Promise<string[]> {
    this.logger.debug('controller request', request);
    return this.appService.generateFollowupQuestions(request);
  }
}
