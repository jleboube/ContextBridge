# ContextBridge - AI Conversation Memory System

ContextBridge is a persistent conversation memory system that allows users to save, organize, and seamlessly transfer AI conversations between different providers (OpenAI, Anthropic, Google, etc.).

## Features

### Phase 1 (MVP) ✅
- **Project Workspaces**: Organize AI conversations into projects
- **Conversation Storage**: Store and manage conversations from different AI providers
- **Manual Summarization & Export**: Export conversations in various formats for AI handoff
- **User Authentication**: Secure login and registration system
- **Web Interface**: Clean, responsive dashboard for project management

### Phase 2 (Planned)
- **Automated Summarization**: AI-powered context compression
- **Multi-Provider Context Handoff**: Seamless AI provider switching
- **Advanced User Controls**: Edit summaries, selective context forwarding

### Phase 3 (Planned)
- **Team Collaboration**: Shared project workspaces
- **Plugin Ecosystem**: Third-party integrations
- **Enterprise Features**: SOC2 compliance, on-premise deployment

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Docker (optional)

### Development Setup

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd contextbridge
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database and other configurations
```

3. **Set up database**
```bash
# Create PostgreSQL database
createdb contextbridge

# Run migrations
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed
```

4. **Start development servers**
```bash
npm run dev
# This starts both backend (port 3001) and frontend (port 5173)
```

### Production Deployment

#### Using Docker Compose (Recommended)
```bash
# Create production environment file
cp .env.example .env.production

# Start services
docker-compose up -d

# Run database migrations
docker-compose exec app npm run db:migrate
```

#### Manual Deployment
```bash
# Build application
npm run build

# Start production server
NODE_ENV=production npm start
```

## Project Structure

```
├── src/
│   ├── server/           # Backend API server
│   │   ├── database/     # Database migrations and connection
│   │   ├── middleware/   # Authentication, validation, rate limiting
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic (export service)
│   │   └── index.js      # Express server setup
│   └── client/           # React frontend
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React contexts (auth)
│       ├── pages/        # Page components
│       ├── services/     # API client services
│       └── utils/        # Utility functions
├── docker-compose.yml    # Docker services configuration
├── Dockerfile           # Production container setup
└── knexfile.js         # Database configuration
```

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Conversations
- `GET /api/conversations/project/:projectId` - List conversations in project
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `POST /api/messages` - Add single message
- `POST /api/messages/batch` - Add multiple messages
- `GET /api/messages/conversation/:id` - Get conversation messages
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

### Exports
- `POST /api/exports/project/:id` - Export project in various formats
- `GET /api/exports/history` - Get export history
- `GET /api/exports/:id` - Get specific export

## Export Formats

ContextBridge supports multiple export formats for AI handoff:

### JSON
Complete conversation data with metadata for backup/restore

### Markdown
Human-readable format with conversation history

### Context Prompt
AI-optimized format for different providers:
- OpenAI-compatible
- Anthropic Claude-compatible
- Google Gemini-compatible
- Generic format

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional: OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Security Features

- JWT-based authentication with refresh tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection protection via parameterized queries
- XSS protection with Content Security Policy
- CORS configuration
- Helmet.js security headers

## Database Schema

### Users
- Authentication and profile information
- Support for local and OAuth authentication

### Projects
- User project workspaces
- Tagging and organization
- Status tracking (active/archived/completed)

### Conversations
- AI conversation metadata
- Provider and model tracking
- Context summaries (for Phase 2)

### Messages
- Individual conversation messages
- Role-based (user/assistant/system)
- Metadata storage for enhanced features

### Exports
- Export history tracking
- Multiple format support
- User audit trail

## Performance Considerations

- Database indexes on frequently queried fields
- Connection pooling for database
- Rate limiting to prevent abuse
- Efficient pagination for large datasets
- Optimized bundle sizes with Vite

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.