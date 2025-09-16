import { Injectable, Logger } from '@nestjs/common';
import { LanguageModel } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createAzure } from '@ai-sdk/azure';

enum AIProvider {
  // NOTE: string value should be uppercase as we're comparing strings after uppercasing
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  SecureGPT4_1 = 'SECUREGPT4_1',
  SecureGPT5 = 'SECUREGPT5',
  SecureGPT5Mini = 'SECUREGPT5_MINI',
  // TODO add further models
}

@Injectable()
export class LlmSelectorService {
  private readonly logger: Logger = new Logger(LlmSelectorService.name);
  private model: LanguageModel;

  selectModel(): LanguageModel {
    this.logger.log('selected AI provider: ', process.env.AI_PROVIDER);
    if (this.model) {
      return this.model;
    }

    // this block is run only once at first request
    switch (String(process.env.AI_PROVIDER).toUpperCase() as AIProvider) {
      case AIProvider.Claude:
        this.model = anthropic('claude-3-opus-20240229');
        break;
      case AIProvider.Gemini:
        this.model = google('models/gemini-2.0-flash');
        break;
      case AIProvider.SecureGPT4_1:
        this.model = this.getSecureOpenAiModel('gpt-4.1');
        break;
      case AIProvider.SecureGPT5:
        this.model = this.getSecureOpenAiModel('gpt-5');
        break;
      case AIProvider.SecureGPT5Mini:
        this.model = this.getSecureOpenAiModel('gpt-5-mini');
        break;
      default:
        throw new Error('unknown AI_PROVIDER type selected');
    }

    return this.model;
  }

  private getSecureOpenAiModel(deployment: string): LanguageModel {
    return createAzure({
      baseURL: 'https://apim.stanfordhealthcare.org/openai-eastus2',
      apiVersion: '2025-01-01-preview',
      apiKey: process.env.SECUREGPT_API_KEY,
      useDeploymentBasedUrls: true,
      headers: {
        'Ocp-Apim-Subscription-Key': String(process.env.SECUREGPT_API_KEY),
      },
    })(deployment);
  }
}
