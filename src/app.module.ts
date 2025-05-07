import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateSelectorModule } from './template-selector/template-selector.module';
import { PathwayModule } from './pathway/pathway.module';
import { ColorAiModule } from './color-ai/color-ai.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TemplateSelectorModule,
    PathwayModule,
    ColorAiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
