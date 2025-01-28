import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

import { ReferralRequest } from '../models/referralRequest';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/referral')
  async postReferralQuestion(
    @Body() request: ReferralRequest,
  ): Promise<string> {
    console.log('controller request', request);
    return await this.appService.postReferralQuestion(request);
  }
}
