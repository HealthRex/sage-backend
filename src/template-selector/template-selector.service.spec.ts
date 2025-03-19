import { Test, TestingModule } from '@nestjs/testing';
import { TemplateSelectorService } from './template-selector.service';

describe('TemplateSelectorService', () => {
  let service: TemplateSelectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateSelectorService],
    }).compile();

    service = module.get<TemplateSelectorService>(TemplateSelectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
