import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateSelectorModule } from './template-selector/template-selector.module';

@Module({
  imports: [ConfigModule.forRoot(), TemplateSelectorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
