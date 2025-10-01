import { Module } from '@nestjs/common';
import { LlmSelectorService } from './llm-selector.service';

@Module({
  providers: [LlmSelectorService],
  exports: [LlmSelectorService],
})
export class LlmSelectorModule {}
