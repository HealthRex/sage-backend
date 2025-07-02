import { Module } from '@nestjs/common';
import { RecommenderService } from './recommender.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [RecommenderService],
  exports: [RecommenderService],
})
export class RecommenderModule {}
