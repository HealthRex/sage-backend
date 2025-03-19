import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplateSelectorService } from './template-selector.service';

@Module({
  imports: [HttpModule],
  providers: [TemplateSelectorService],
  exports: [TemplateSelectorService],
})
export class TemplateSelectorModule {}
