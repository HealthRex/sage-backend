import { Message } from './message';

export class AnswersRequest {
  constructor(
    public messages: Message[],
    // TODO for some reason citations aren't generated if the response is not streamed even though the response contains references to them
    public stream: boolean = false,
  ) {}

  model: string = 'pathway-v7-1';
}
