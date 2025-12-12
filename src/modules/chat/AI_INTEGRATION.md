# AI Chatbot Integration

The TixHub chatbot now supports AI-powered responses using OpenAI's GPT models. The system automatically falls back to rule-based responses if AI is not configured or unavailable.

## Setup

### 1. Get OpenAI API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini  # Optional: defaults to gpt-4o-mini
```

### 3. Available Models

You can use any OpenAI chat model:
- `gpt-4o-mini` (recommended, cost-effective)
- `gpt-4o` (more capable, higher cost)
- `gpt-3.5-turbo` (faster, less capable)

### 4. How It Works

1. **AI-First Approach**: When a user sends a message, the system first tries to generate an AI response
2. **Fallback**: If AI fails or is not configured, it falls back to rule-based pattern matching
3. **Conversation Context**: The AI receives the last 10 messages for context-aware responses
4. **Smart Escalation**: The AI can detect when to escalate to human agents

### 5. Features

- ✅ Context-aware conversations
- ✅ Natural language understanding
- ✅ Automatic fallback to rule-based responses
- ✅ Conversation history support
- ✅ Smart escalation detection
- ✅ Configurable AI model

### 6. Cost Considerations

- `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- `gpt-4o`: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- Average conversation: ~500-1000 tokens per exchange

### 7. Disabling AI

To disable AI and use only rule-based responses:
- Remove or comment out `OPENAI_API_KEY` in `.env`
- The system will automatically use rule-based responses

## Testing

1. Start the backend server
2. Open the chat widget on the frontend
3. Send a message - you should receive an AI-generated response
4. Check backend logs for AI service initialization

## Troubleshooting

**AI not working?**
- Check that `OPENAI_API_KEY` is set correctly
- Verify API key has sufficient credits
- Check backend logs for error messages
- System will automatically fallback to rule-based responses

**High costs?**
- Switch to `gpt-4o-mini` model (default)
- Reduce conversation history length in `ai-chat.service.ts`
- Add rate limiting for AI requests

