# MCP Sandbox Security Platform Tutorial

This tutorial provides a step-by-step guide for users to set up, configure, and use the MCP Sandbox Security Platform. It covers everything from installation to advanced usage.

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- Docker and Docker Compose
- Git
- A code editor (e.g., VS Code)

## Step 1: Clone the Repository

Clone the project from GitHub:

```bash
git clone https://github.com/yourusername/mcp-sandbox-security-platform.git
cd mcp-sandbox-security-platform
```

## Step 2: Set Up Environment Variables

Copy the example environment files:

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

Edit these files to configure your database URL, JWT secrets, and other settings as needed.

## Step 3: Start the Development Environment

Use Docker Compose to start all services:

```bash
docker-compose up -d
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001
- PostgreSQL database on port 5432
- Redis on port 6379

## Step 4: Database Setup

Run Prisma migrations:

```bash
cd packages/backend
npx prisma migrate dev
```

You can explore the database using Prisma Studio:

```bash
npx prisma studio
```

## Step 5: Running the Applications

### Backend
```bash
cd packages/backend
npm install
npm run dev
```

### Frontend
```bash
cd packages/frontend
npm install
npm run dev
```

## Step 6: User Authentication

- Register a new user via the frontend at http://localhost:3000/register
- Log in at http://localhost:3000/login
- Use the dashboard to manage sandboxes and policies

## Step 7: Creating a Sandbox

1. Navigate to the Sandbox Management section in the dashboard.
2. Click 'Create New Sandbox'.
3. Configure security policies and start the session.

API Example:
```bash
curl -X POST http://localhost:3001/api/sandbox \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"toolId": "tool-uuid", "policyId": "policy-uuid"}'
```

## Step 8: Monitoring and Threat Analysis

- Use the real-time monitoring dashboard to view session activities.
- Run threat analysis via API:
```bash
curl -X POST http://localhost:3001/api/threat-analysis \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "session-uuid"}'
```

## Step 9: Testing

Run tests:
```bash
# Backend
cd packages/backend && npm test

# Frontend
cd packages/frontend && npm test
```

## Step 10: Production Deployment

- Build Docker images for production.
- Use a managed database service.
- Configure SSL and a reverse proxy like Nginx.
- Set up monitoring and logging.

For detailed production steps, refer to the [deployment guide](docs/deployment-guide.md).

## Troubleshooting

- Check Docker logs: `docker-compose logs`
- Verify environment variables
- Ensure ports are not conflicting

For more issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Additional Resources

- [Main README](README.md)
- [Docker Setup Guide](DOCKER_SETUP_GUIDE.md)
- [Security Documentation](SECURITY.md)

If you encounter any issues, open a GitHub issue or contribute to the project!