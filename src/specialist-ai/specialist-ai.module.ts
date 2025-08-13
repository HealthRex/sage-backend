import { Module } from '@nestjs/common';
import { SpecialistAiService } from './specialist-ai.service';
import { LlmSelectorModule } from '../llm-selector/llm-selector.module';

@Module({
  imports: [LlmSelectorModule],
  providers: [SpecialistAiService],
  exports: [SpecialistAiService],
})
export class SpecialistAiModule {}
