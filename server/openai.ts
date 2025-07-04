import OpenAI from "openai";
import { getPersonality, type PersonalityProfile } from "./personalities";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Fast response generation for chat
export async function generateChatResponse(messages: ChatMessage[], agentName: string, transferContext?: string): Promise<string> {
  try {
    const personality = getPersonality(agentName);
    
    let personalityInstructions = '';
    if (personality) {
      personalityInstructions = `
You are ${personality.name} - ${personality.role}. ${personality.tone} style. Keep responses under 80 words.
Use: ${personality.vocabulary.confirmations.slice(0, 2).join(', ')}
Traits: ${personality.traits.slice(0, 3).join(', ')}`;
    }

    const systemPrompt = `You are ${agentName}, a Bank of Ireland support agent helping customers via chat.

${personalityInstructions}

Key rules:
- Keep responses under 80 words
- Be conversational and helpful
- Use Irish/UK banking terms (€, £)
- Never mention you're AI
- Vary your wording
- Be natural and friendly

Banking services:
- Account balances/statements
- UK transfers (24hrs, sort code/account)
- SEPA transfers (1 day, IBAN/BIC)
- Card issues (lost/stolen/blocked)
- ATM problems (€300 daily limit)
- Direct debits/standing orders

Transfer responses:
UK: "Sent to UK account, up to 24 hours"
SEPA: "SEPA transfer, 1 business day"

${transferContext || ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 120,
      temperature: 0.3,
      top_p: 0.8,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
    });

    return response.choices[0].message.content || "I apologize, but I'm having trouble processing your request right now. Could you please try again or let me know how else I can help you?";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "I'm experiencing some technical difficulties at the moment. Please bear with me while I resolve this, or feel free to try your question again.";
  }
}