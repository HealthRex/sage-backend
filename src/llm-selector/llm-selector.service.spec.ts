import { Test, TestingModule } from '@nestjs/testing';
import { LlmSelectorService } from './llm-selector.service';

describe('LlmSelectorService', () => {
  let service: LlmSelectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmSelectorService],
    }).compile();

    service = module.get<LlmSelectorService>(LlmSelectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
