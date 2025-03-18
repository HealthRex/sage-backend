import { Expose } from 'class-transformer';
import { Message } from './message';

export class Choice {
  index: number;
  message: Message;
  @Expose({ name: 'finish_reason' })
  finishReason: string;
}

export class Usage {
  @Expose({ name: 'completion_tokens' })
  completionTokens: number;
  @Expose({ name: 'completion_tokens_details' })
  completionTokensDetails: object;
  @Expose({ name: 'total_tokens' })
  totalTokens: number;
}

export class AnswersResponse {
  id: string;
  @Expose({ name: 'object' }) // this name conflicts with the TS keyword
  chatCompletionString: string;
  created: Date;
  model: string;
  citations: URL[];
  choices: Choice[];
  usage: Usage;
}
