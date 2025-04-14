import { Body, Controller, Get, Logger, Post, Sse } from '@nestjs/common';
import { AppService } from './app.service';

import { ReferralRequest } from './models/referralRequest';
import { ReferralResponse } from './models/referralResponse';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';

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
  postReferralQuestionStreamed(
    @Body() request: ReferralRequest,
  ): Observable<{ data: ReferralResponse }> {
    this.logger.debug('controller request', request);
    return this.appService.postReferralQuestionStreamed(request);
  }

  @Post('/ask-pathway')
  @ApiCreatedResponse({
    description:
      'Successfully received Pathway AI response to a clarifying question.',
  })
  async postPathwayQuestion(@Body() request: string[]): Promise<string> {
    this.logger.debug('controller request', request);
    return await this.appService.postPathwayQuestion(request);
  }
}
