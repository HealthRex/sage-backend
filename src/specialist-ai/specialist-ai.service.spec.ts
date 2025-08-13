import { Test, TestingModule } from '@nestjs/testing';
import { SpecialistAiService } from './specialist-ai.service';

describe('PathwayService', () => {
  let service: SpecialistAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecialistAiService],
    }).compile();

    service = module.get<SpecialistAiService>(SpecialistAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
