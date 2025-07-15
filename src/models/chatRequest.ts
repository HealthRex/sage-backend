import { SpecialistAIResponse } from './specialistAIResponse';

export class ChatRequest {
  constructor(
    public question: string,
    public originalReferralRequestQuestion: string,
    public originalReferralRequestNotes: string,
    public originalPathwayResponse: string,
    public previousConversations: Record<string, SpecialistAIResponse>[],
  ) {}
}
