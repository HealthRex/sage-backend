import { Expose } from 'class-transformer';
import { Message } from './message';

export class Choice {
  index: number;
  message: Message;
  delta: Message;
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

// TODO URL is taken now from citations array as referenceURL seems to be empty sometimes. Remove once clarified this is not needed
export class Metadata {
  referenceURI: string;
}

export class CitationDetails {
  name: string;
  metadata: Metadata;
}

export class AnswersResponse {
  id: string;
  @Expose({ name: 'object' }) // this name conflicts with the TS keyword
  chatCompletionString: string;
  created: Date;
  model: string;
  citations: string[];
  @Expose({ name: 'citations_detailed' })
  citationsDetailed: CitationDetails[];
  choices: Choice[];
  usage: Usage;
}
