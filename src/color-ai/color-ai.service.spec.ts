import { Test, TestingModule } from '@nestjs/testing';
import { ColorAiService } from './color-ai.service';

describe('ColorAiService', () => {
  let service: ColorAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ColorAiService],
    }).compile();

    service = module.get<ColorAiService>(ColorAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
