import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateSelectorModule } from './template-selector/template-selector.module';
import { SpecialistAiModule } from './specialist-ai/specialist-ai.module';
import { LlmSelectorModule } from './llm-selector/llm-selector.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TemplateSelectorModule,
    SpecialistAiModule,
    LlmSelectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
