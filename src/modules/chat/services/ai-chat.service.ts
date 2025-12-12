import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private openai: OpenAI | null = null;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.isEnabled = !!apiKey;

    if (this.isEnabled) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.logger.log('OpenAI AI service initialized');
    } else {
      this.logger.warn('OpenAI API key not found. AI features will be disabled. Set OPENAI_API_KEY in environment variables.');
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  async generateResponse(
    userMessage: string,
    context?: {
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      userId?: string;
      sessionId?: string;
    },
  ): Promise<{ message: string; shouldEscalate?: boolean }> {
    if (!this.isEnabled || !this.openai) {
      throw new Error('AI service is not enabled');
    }

    try {
      const systemPrompt = `You are a helpful customer support assistant for TixHub, a Kenya-first event ticketing platform. Your role is to:

1. Help users with tickets, events, payments, orders, and account-related questions
2. Provide friendly, concise, and accurate responses
3. Guide users to relevant pages when appropriate
4. Escalate to human agents when the issue is complex or requires personal attention
5. Always be professional, empathetic, and solution-oriented
6. Use emojis sparingly and appropriately
7. Keep responses under 200 words unless detailed explanation is needed

Available actions you can suggest:
- View tickets: /tickets
- Browse events: /events
- View profile: /profile
- Contact support: escalate to human agent

If a user asks about something you cannot help with or requires sensitive information, politely suggest escalating to a human agent.`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history if available
      if (context?.conversationHistory && context.conversationHistory.length > 0) {
        // Only include last 10 messages to avoid token limits
        const recentHistory = context.conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        messages,
        temperature: 0.7,
        max_tokens: 300,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim() || '';

      // Check if AI suggests escalation
      const shouldEscalate =
        aiResponse.toLowerCase().includes('human agent') ||
        aiResponse.toLowerCase().includes('support team') ||
        aiResponse.toLowerCase().includes('contact support') ||
        aiResponse.toLowerCase().includes('escalate');

      return {
        message: aiResponse || "I'm sorry, I couldn't generate a response. Please try again or contact support.",
        shouldEscalate,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate AI response: ${error?.message || 'Unknown error'}`, error?.stack);
      // Don't throw - let the caller handle fallback
      throw new Error(`AI service error: ${error?.message || 'Failed to generate response'}`);
    }
  }

  /**
   * Check if AI service is enabled
   */
  isAiEnabled(): boolean {
    return this.isEnabled;
  }
}

