import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PathwayService } from './pathway.service';

@Module({
  imports: [HttpModule],
  providers: [PathwayService],
  exports: [PathwayService],
})
export class PathwayModule {}
