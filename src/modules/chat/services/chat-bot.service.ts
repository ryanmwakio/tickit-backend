import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MessageSenderType } from '../../../database/entities/chat-message.entity';
import { AiChatService } from './ai-chat.service';

export interface BotResponse {
  message: string;
  quickReplies?: string[];
  intent?: string;
  confidence?: number;
  escalate?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);

  constructor(
    @Inject(forwardRef(() => AiChatService))
    private aiChatService: AiChatService,
  ) {}

  /**
   * Process user message and generate bot response
   * Tries AI first if enabled, falls back to rule-based responses
   */
  async processMessage(
    userMessage: string,
    context?: {
      userId?: string;
      sessionId?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): Promise<BotResponse> {
    // Try AI first if enabled
    if (this.aiChatService.isAiEnabled()) {
      try {
        const aiResponse = await this.aiChatService.generateResponse(userMessage, {
          conversationHistory: context?.conversationHistory,
          userId: context?.userId,
          sessionId: context?.sessionId,
        });

        // Extract quick replies from AI response if it mentions specific actions
        const quickReplies = this.extractQuickReplies(aiResponse.message);

        return {
          message: aiResponse.message,
          quickReplies: quickReplies.length > 0 ? quickReplies : this.getDefaultQuickReplies(),
          intent: 'ai_generated',
          confidence: 0.85,
          escalate: aiResponse.shouldEscalate,
        };
      } catch (error: any) {
        this.logger.warn(`AI response failed, falling back to rule-based: ${error?.message || 'Unknown error'}`);
        // Fall through to rule-based responses - don't throw, just use fallback
      }
    }

    // Fallback to rule-based responses
    return this.processMessageRuleBased(userMessage, context);
  }

  /**
   * Rule-based message processing (fallback)
   */
  private processMessageRuleBased(
    userMessage: string,
    context?: { userId?: string; sessionId?: string },
  ): BotResponse {
    const normalizedMessage = userMessage.toLowerCase().trim();

    // Greetings
    if (this.matchesPattern(normalizedMessage, ['hello', 'hi', 'hey', 'greetings'])) {
      return {
        message: "Hello! 👋 I'm Tickit Assistant. How can I help you today?",
        quickReplies: [
          'Check my tickets',
          'Event information',
          'Payment help',
          'Contact support',
        ],
        intent: 'greeting',
        confidence: 0.9,
      };
    }

    // Ticket-related queries
    if (this.matchesPattern(normalizedMessage, ['ticket', 'tickets', 'my ticket', 'view ticket', 'download ticket'])) {
      return {
        message: "I can help you with your tickets! You can view and download your tickets from your profile page. Would you like me to guide you there?",
        quickReplies: [
          'View my tickets',
          'Download ticket',
          'Transfer ticket',
          'Need more help',
        ],
        intent: 'ticket_query',
        confidence: 0.85,
        metadata: {
          action: 'navigate',
          link: '/tickets',
        },
      };
    }

    // Event-related queries
    if (this.matchesPattern(normalizedMessage, ['event', 'events', 'upcoming', 'when', 'where', 'venue', 'date'])) {
      return {
        message: "I can help you find events! You can browse all events on our events page. What are you looking for?",
        quickReplies: [
          'Browse events',
          'Search events',
          'Event details',
          'Need more help',
        ],
        intent: 'event_query',
        confidence: 0.8,
        metadata: {
          action: 'navigate',
          link: '/events',
        },
      };
    }

    // Payment-related queries
    if (this.matchesPattern(normalizedMessage, ['payment', 'pay', 'paid', 'refund', 'money', 'mpesa', 'card'])) {
      return {
        message: "For payment-related questions, I can help! You can check your payment history in your profile. What do you need help with?",
        quickReplies: [
          'Payment status',
          'Refund request',
          'Payment failed',
          'Contact support',
        ],
        intent: 'payment_query',
        confidence: 0.85,
        metadata: {
          action: 'navigate',
          link: '/profile',
        },
      };
    }

    // Order-related queries
    if (this.matchesPattern(normalizedMessage, ['order', 'orders', 'purchase', 'bought', 'buy'])) {
      return {
        message: "I can help with your orders! You can view all your orders and their status in your profile. What would you like to know?",
        quickReplies: [
          'View orders',
          'Order status',
          'Order history',
          'Need more help',
        ],
        intent: 'order_query',
        confidence: 0.8,
        metadata: {
          action: 'navigate',
          link: '/profile',
        },
      };
    }

    // Help/Support queries
    if (this.matchesPattern(normalizedMessage, ['help', 'support', 'assistance', 'problem', 'issue', 'stuck'])) {
      return {
        message: "I'm here to help! I can assist with tickets, events, payments, and more. What do you need help with?",
        quickReplies: [
          'Ticket help',
          'Event help',
          'Payment help',
          'Talk to human agent',
        ],
        intent: 'help_request',
        confidence: 0.75,
        escalate: true,
      };
    }

    // Account-related queries
    if (this.matchesPattern(normalizedMessage, ['account', 'profile', 'settings', 'password', 'email', 'phone'])) {
      return {
        message: "I can help with account settings! You can manage your profile, notifications, and security settings from your profile page.",
        quickReplies: [
          'Update profile',
          'Change password',
          'Notification settings',
          'Security settings',
        ],
        intent: 'account_query',
        confidence: 0.8,
        metadata: {
          action: 'navigate',
          link: '/profile',
        },
      };
    }

    // Refund queries
    if (this.matchesPattern(normalizedMessage, ['refund', 'cancel', 'return', 'money back'])) {
      return {
        message: "For refunds, you can request a refund from your order details page. Refunds are typically processed within 5-7 business days. Would you like to request a refund?",
        quickReplies: [
          'Request refund',
          'Refund status',
          'Refund policy',
          'Contact support',
        ],
        intent: 'refund_query',
        confidence: 0.9,
        escalate: true,
      };
    }

    // Goodbye
    if (this.matchesPattern(normalizedMessage, ['bye', 'goodbye', 'thanks', 'thank you', 'thank', 'done'])) {
      return {
        message: "You're welcome! If you need any more help, just ask. Have a great day! 😊",
        intent: 'goodbye',
        confidence: 0.9,
      };
    }

    // Default response - ask for clarification or escalate
    return {
      message: "I'm not sure I understand. Could you rephrase your question? I can help with tickets, events, payments, orders, and account settings. Or would you like to speak with a human agent?",
      quickReplies: [
        'Ticket help',
        'Event help',
        'Payment help',
        'Talk to human agent',
      ],
      intent: 'unknown',
      confidence: 0.3,
      escalate: true,
    };
  }

  /**
   * Check if message matches any of the patterns
   */
  private matchesPattern(message: string, patterns: string[]): boolean {
    return patterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Get welcome message for new chat session
   */
  getWelcomeMessage(): string {
    return "Hello! 👋 Welcome to Tickit. I'm your virtual assistant. How can I help you today?";
  }

  /**
   * Extract quick reply suggestions from AI response
   */
  private extractQuickReplies(message: string): string[] {
    const replies: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Check for common action keywords
    if (lowerMessage.includes('ticket')) {
      replies.push('View my tickets');
    }
    if (lowerMessage.includes('event')) {
      replies.push('Browse events');
    }
    if (lowerMessage.includes('payment') || lowerMessage.includes('refund')) {
      replies.push('Payment help');
    }
    if (lowerMessage.includes('account') || lowerMessage.includes('profile')) {
      replies.push('Account settings');
    }

    return replies;
  }

  /**
   * Get default quick replies
   */
  private getDefaultQuickReplies(): string[] {
    return [
      'View my tickets',
      'Browse events',
      'Payment help',
      'Contact support',
    ];
  }
}

