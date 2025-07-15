import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LLMResponse } from './models/llmResponse';
import { TemplateSelectorService } from './template-selector/template-selector.service';
import { HttpModule } from '@nestjs/axios';
import { PathwayService } from './pathway/pathway.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, TemplateSelectorService, PathwayService],
      imports: [HttpModule],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getRoot()).toBe('Hello World!');
    });
  });

  describe('populatedTemplateRemoveDuplicates', () => {
    it('should remove duplicates', () => {
      const populatedTemplate: object[] = [
        { specialist: 'Endocrinology' },
        { template: 'Hyperthyroidism' },
        { specialist: 'Endocrinology' },
        { template: 'Thyroid Function Tests Interpretation' },
        {
          'My Clinical Question (condition: hyperthyroidism)':
            '37F with fatigue and trembling spells, found to have low T4 (3.1) but normal TSH (0.62). On multiple medications including stanozolol and digoxin. Would appreciate guidance on interpretation of thyroid function tests and recommended next steps in evaluation',
        },
        {
          'My most current assessment of this problem can be found in the note dated':
            'Not documented',
        },
        {
          'In your clinical question, or current note, please include information on':
            {
              Assessments: {
                Optional: [
                  {
                    'Medication history of': [
                      {
                        'Immunotherapy or chemo (such as pembrolizumab)': 'No',
                      },
                      { Amiodarone: 'No' },
                      {
                        'Immunotherapy or chemo (such as pembrolizumab)': 'No',
                      },
                      { Amiodarone: 'No' },
                      { Supplements: 'Not documented' },
                      { 'Thyroid medications': 'No' },
                    ],
                  },
                ],
                Required: [
                  {
                    'Does the patient have a history of any autoimmune disease?':
                      'Hereditary angioedema',
                  },
                  {
                    'Presence of symptoms (palpitations, tremor, heat intolerance, diarrhea, ophthalmopathy, etc.)':
                      'Trembling spells, feeling hot and flushed, tiredness, lack of energy, constipation',
                  },
                  {
                    'Does the patient have a history of any autoimmune disease?':
                      'Hereditary angioedema',
                  },
                  {
                    'Presence of symptoms (palpitations, tremor, heat intolerance, diarrhea, ophthalmopathy, etc.)':
                      'Trembling spells, feeling hot and flushed, tiredness, lack of energy, constipation',
                  },
                  { 'Is the patient pregnant?': 'Not documented' },
                  { 'Does the patient wish to conceive?': 'Not documented' },
                  { 'Thyroid exam (enlarged, nodular):': 'No goiter' },
                ],
              },
              Diagnostics: {
                Required: [
                  { 'Thyroid Stimulating Hormone (TSH)': '0.62 Î¼IU/mL' },
                  { 'Free Thyroxine (Free T4)': 'Free thyroxine index-1.7' },
                  { 'Thyroid Stimulating Hormone (TSH)': '0.62 Î¼IU/mL' },
                  { 'Free Thyroxine (Free T4)': 'Free thyroxine index-1.7' },
                  { 'Total T3': '67 ng/dL' },
                  {
                    'Thyroid stimulating immunoglobin (TSI)': 'Not documented',
                  },
                ],
              },
            },
        },
      ];
      const llmResponse: LLMResponse = new LLMResponse();
      llmResponse.populatedTemplate = populatedTemplate;
      console.log(
        JSON.stringify(llmResponse.postProcessedPopulatedTemplate(), null, 2),
      );
    });
  });
});
