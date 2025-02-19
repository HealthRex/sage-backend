import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

import { ReferralRequest } from '../models/referralRequest';
import { ReferralResponse } from '../models/referralResponse';
import { ApiCreatedResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
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
    console.log('controller request', request);
    return await this.appService.postReferralQuestion(request);
  }
}
