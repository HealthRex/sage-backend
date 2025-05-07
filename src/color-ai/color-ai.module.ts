import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ColorAiService } from './color-ai.service';

@Module({
  imports: [HttpModule],
  providers: [ColorAiService],
  exports: [ColorAiService],
})
export class ColorAiModule {}
