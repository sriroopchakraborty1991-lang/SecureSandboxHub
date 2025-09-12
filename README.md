Details here https://deepwiki.com/sriroopchakraborty1991-lang/SecureSandboxHub/1-mcp-sandbox-security-platform-overview

# MCP Sandbox Security Platform

A simplified sandbox security platform for managing and monitoring secure execution environments.

## Core Features

- **Sandbox Management**: Create and manage isolated execution environments
- **Security Policies**: Define and enforce security rules for sandbox sessions
- **Threat Analysis**: Basic threat detection and risk assessment
- **Role-Based Access Control**: User authentication and authorization
- **Real-time Monitoring**: WebSocket-based session monitoring

## Technology Stack

- **Backend**: Node.js with Fastify framework
- **Frontend**: React with Vite
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Caching**: Redis (optional)
- **Containerization**: Docker

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Development Setup

1. Clone the repository
2. Copy environment files:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   ```
3. Start the development environment:
   ```bash
   docker-compose up -d
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### API Endpoints

- `POST /api/sandbox` - Create new sandbox session
- `GET /api/sandbox` - List sandbox sessions
- `GET /api/policies` - List security policies
- `POST /api/policies` - Create security policy
- `POST /api/threat-analysis` - Analyze threats

## Project Structure

```
packages/
├── backend/          # Fastify API server
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── prisma/       # Database schema
└── frontend/         # React application
    └── src/
        ├── components/   # React components
        ├── features/     # Feature modules
        ├── hooks/        # Custom hooks
        └── services/     # API services
```

## Development

### Backend Development
```bash
cd packages/backend
npm install
npm run dev
```

### Frontend Development
```bash
cd packages/frontend
npm install
npm run dev
```

### Database Management
```bash
cd packages/backend
npx prisma migrate dev
npx prisma studio
```

## Testing

```bash
# Backend tests
cd packages/backend && npm test

# Frontend tests
cd packages/frontend && npm test
```

## Production Deployment

For production deployment, consider:
- Using managed PostgreSQL service
- Implementing proper secret management
- Setting up SSL/TLS certificates
- Configuring reverse proxy (nginx)
- Implementing proper logging and monitoring

## Security Considerations

- All API endpoints require authentication
- Input validation on all user inputs
- SQL injection protection via Prisma ORM
- Rate limiting on API endpoints
- CORS configuration for frontend access

## License

MIT License
