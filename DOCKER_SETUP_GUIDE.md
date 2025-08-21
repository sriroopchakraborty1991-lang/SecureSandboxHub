# Docker Setup Guide for MCP Sandbox Security Platform

## Problem
The local development environment is experiencing issues with:
- Blank page display despite server running
- TypeScript compilation errors
- Module loading conflicts
- Environment-specific dependency issues

## Solution: Docker Deployment

Docker provides a consistent, isolated environment that eliminates local dependency conflicts and ensures reliable application execution.

## Prerequisites

### Install Docker Desktop
1. **Download Docker Desktop for Windows:**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Windows
   - Run the installer and follow the setup wizard

2. **Enable WSL 2 (if prompted):**
   - Docker Desktop may require WSL 2 backend
   - Follow the prompts to enable WSL 2

3. **Verify Installation:**
   ```powershell
   docker --version
   docker-compose --version
   ```

## Quick Start

### Option 1: Full Stack with Docker Compose (Recommended)

1. **Navigate to project root:**
   ```powershell
   cd "E:\mcp project"
   ```

2. **Start all services:**
   ```powershell
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Option 2: Frontend Only

If you only want to run the frontend:

1. **Navigate to frontend directory:**
   ```powershell
   cd "E:\mcp project\packages\frontend"
   ```

2. **Build and run frontend container:**
   ```powershell
   docker build -t mcp-frontend .
   docker run -p 3000:3000 mcp-frontend
   ```

3. **Access frontend:**
   - http://localhost:3000

## Docker Configuration Details

### Services Included:
- **Frontend**: React/Vite application (Port 3000)
- **Backend**: Node.js API server (Port 3001)
- **Database**: PostgreSQL (Port 5432)
- **Redis**: Caching layer (Port 6379)

### Key Benefits:
- ✅ Consistent environment across all machines
- ✅ Isolated dependencies
- ✅ No local Node.js/npm conflicts
- ✅ Production-like environment
- ✅ Easy cleanup and reset

## Troubleshooting

### If containers fail to start:
1. **Check Docker is running:**
   ```powershell
   docker ps
   ```

2. **View container logs:**
   ```powershell
   docker-compose logs frontend
   docker-compose logs backend
   ```

3. **Rebuild containers:**
   ```powershell
   docker-compose down
   docker-compose up --build --force-recreate
   ```

### If port conflicts occur:
1. **Stop existing services:**
   ```powershell
   # Stop any running npm dev servers
   # Check what's using the ports
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

2. **Modify ports in docker-compose.yml if needed:**
   ```yaml
   frontend:
     ports:
       - "3002:3000"  # Change external port
   ```

## Alternative: Development with Docker

For development with hot reload:

1. **Use development override:**
   ```powershell
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

2. **Or modify docker-compose.yml to mount source code:**
   ```yaml
   frontend:
     volumes:
       - ./packages/frontend:/usr/src/app
       - /usr/src/app/node_modules
   ```

## Clean Up

**Stop all services:**
```powershell
docker-compose down
```

**Remove all containers and volumes:**
```powershell
docker-compose down -v --remove-orphans
```

**Remove all images:**
```powershell
docker system prune -a
```

## Next Steps

Once Docker is running successfully:
1. Test all application features
2. Verify authentication flows
3. Check admin panel functionality
4. Test sandbox creation and monitoring

This Docker approach should resolve the blank page issues and provide a stable development environment.