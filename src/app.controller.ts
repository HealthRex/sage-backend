import { Body, Controller, Get, Logger, Post, Sse } from '@nestjs/common';
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
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/referral')
  @ApiCreatedResponse({
    description: 'Successfully received AI response to clinical question.',
    type: ReferralResponse,
  })
  async postReferralQuestion(
    @Body() request: ReferralRequest,
  ): Promise<ReferralResponse> {
    this.logger.debug('controller request', request);
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
    @Body() request: ReferralRequest,
  ): Promise<Observable<{ data: ReferralResponse }>> {
    this.logger.debug('controller request', request);
    return await this.appService.postReferralQuestionStreamed(request);
  }

  @Post('/ask-pathway')
  @ApiCreatedResponse({
    description:
      'Successfully received Pathway AI response to a clarifying question.',
    type: SpecialistAIResponse,
  })
  async postPathwayQuestion(
    @Body() request: string[],
  ): Promise<SpecialistAIResponse> {
    this.logger.debug('controller request', request);
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
    @Body() request: string[],
  ): Observable<{ data: SpecialistAIResponse }> {
    this.logger.debug('controller request', request);
    return this.appService.postPathwayQuestionStreamed(request);
  }
}
