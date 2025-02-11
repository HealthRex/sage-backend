import { Injectable } from '@nestjs/common';
import { generateText, LanguageModelV1 } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { ReferralRequest } from '../models/referralRequest';

enum AIProvider {
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  // TODO add further models
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(request: ReferralRequest): Promise<string> {
    console.log('request: ', request);

    const input = {
      model: this.selectModel(),
      prompt: request.question,
    };
    const { text } = await generateText(input);

    console.log(text);
    return text;
  }

  // TODO determine appropriate return type
  private selectModel(): LanguageModelV1 {
    switch (String(process.env.AI_PROVIDER).toUpperCase() as AIProvider) {
      case AIProvider.Claude:
        return anthropic('claude-3-opus-20240229');
      case AIProvider.Gemini:
        return google('models/gemini-2.0-flash-exp');
      default:
        throw new Error('unknown AI_PROVIDER type selected');
    }
  }
}
