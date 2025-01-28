import { Injectable } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerateContentResult,
} from '@google/generative-ai';
import { ReferralRequest } from '../models/referralRequest';

const genAI: GoogleGenerativeAI = new GoogleGenerativeAI(
  process.env.API_KEY as string,
);
const model: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(request: ReferralRequest): Promise<string> {
    console.log('request: ', request);
    const result: GenerateContentResult = await model.generateContent(
      request.question,
    );
    console.log(result.response.text());
    return result.response.text();
  }
}
