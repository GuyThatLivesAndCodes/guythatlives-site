# GuyAI - AI Chatbot Assistant

GuyAI is an AI-powered chatbot interface that runs on the GuyThatLives website's unblocked games section. It provides users with an interactive AI assistant powered by Ollama.

## Features

- **Real-time AI Chat**: Chat with "Guy", a friendly AI assistant powered by the Qwen3:4b model
- **Local Chat Storage**: All chats are saved locally using browser localStorage (cookies)
- **Multiple Chat Sessions**: Create and manage multiple chat conversations
- **Streaming Responses**: See AI responses as they're generated in real-time
- **Secure Communication**: Direct HTTP communication with the Ollama server at oai1.guythatlives.net
- **Beautiful UI**: Modern, dark-themed chat interface with smooth animations

## Technology Stack

### Frontend
- Pure HTML5, CSS3, and JavaScript (no frameworks required)
- LocalStorage API for chat persistence
- Fetch API for streaming responses
- CSS Grid and Flexbox for responsive layout

### Backend
- **Ollama Server**: Hosted at `http://oai1.guythatlives.net`
- **Model**: Qwen3:4b (4 billion parameter language model)
- **API**: Ollama Chat API with streaming support

## Security Features

1. **No Server-Side Storage**: All chat data is stored locally in the user's browser
2. **Direct API Communication**: Client connects directly to Ollama API
3. **No User Tracking**: No analytics or tracking of conversations
4. **Secure HTTP**: API calls are made using standard HTTP protocols

## API Endpoints Used

- `GET /api/tags` - List available models
- `POST /api/chat` - Send chat messages and receive streaming responses

## Chat Storage Format

Chats are stored in localStorage under the key `guyai_chats` with the following structure:

```json
{
  "chat_[timestamp]_[random]": {
    "id": "chat_[timestamp]_[random]",
    "title": "Chat title (from first message)",
    "messages": [
      {
        "role": "user|assistant",
        "content": "Message content",
        "timestamp": 1234567890
      }
    ],
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

## Future Roadmap

### Phase 1 (Current)
- ✅ Basic chatbot interface
- ✅ Chat history management
- ✅ Streaming responses

### Phase 2 (Planned)
- 🔄 Simple game creation capabilities
- 🔄 Code generation for basic HTML5 games
- 🔄 Game preview and testing

### Phase 3 (Future)
- 🔮 Site-wide AI assistant
- 🔮 Context-aware help on any page
- 🔮 Game recommendations based on chat
- 🔮 Multi-modal support (images, code, etc.)

## Usage

1. Navigate to `/unblocked/guyai/`
2. Start typing in the input box
3. Press Enter or click Send to chat with Guy
4. Use the "Chats" button to view chat history
5. Use "New Chat" to start a fresh conversation

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Attribution

Powered by [Ollama](https://ollama.com) - An open-source tool for running large language models locally.
