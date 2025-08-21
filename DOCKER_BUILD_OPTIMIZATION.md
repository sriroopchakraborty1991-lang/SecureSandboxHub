# Docker Build Optimization Guide

## Frontend Build Cancellation Solutions

This guide addresses the frontend build cancellation issue in Docker Desktop and provides comprehensive solutions.

## Problem Analysis

The frontend build cancellation typically occurs due to:
1. **Memory constraints** - Node.js build process exceeding available memory
2. **CPU limitations** - Insufficient processing power for TypeScript compilation
3. **Build timeouts** - Docker Desktop default timeout settings
4. **Large build context** - Unnecessary files being copied to Docker context
5. **Network issues** - npm package installation failures

## Solutions Implemented

### 1. Optimized Dockerfile

**Key improvements:**
- Multi-stage build with proper layer caching
- Increased Node.js memory limit (`--max-old-space-size=4096`)
- Build dependencies for native modules
- npm configuration optimizations
- Build timeout handling with retry mechanism
- Custom nginx configuration with API proxy

### 2. Enhanced .dockerignore

**Excluded files:**
- Development dependencies and cache files
- Test files and coverage reports
- IDE and OS-specific files
- Documentation and configuration files
- Build outputs and temporary files

### 3. Docker Compose Resource Limits

**Resource allocation:**
- Memory limit: 6GB (with 2GB reservation)
- CPU limit: 2.0 cores (with 1.0 reservation)
- Build cache volume for faster rebuilds
- Health checks for service monitoring

## Docker Desktop Settings

### Recommended Settings:

1. **Resources > Advanced:**
   - Memory: 8GB minimum (12GB recommended)
   - CPUs: 4 cores minimum
   - Swap: 2GB
   - Disk image size: 100GB+

2. **Docker Engine:**
   ```json
   {
     "builder": {
       "gc": {
         "defaultKeepStorage": "20GB",
         "enabled": true
       }
     },
     "experimental": false,
     "features": {
       "buildkit": true
     }
   }
   ```

3. **Build Settings:**
   - Enable BuildKit for improved performance
   - Increase build timeout to 30 minutes

## Build Commands

### Production Build:
```bash
# Clean build with no cache
docker-compose build --no-cache frontend

# Build with BuildKit
DOCKER_BUILDKIT=1 docker-compose build frontend

# Build and run
docker-compose up --build frontend
```

### Development Build:
```bash
# Use development Dockerfile
docker build -f Dockerfile.dev -t frontend-dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/usr/src/app frontend-dev
```

### Alternative Build Strategies:

1. **Local Build + Docker Copy:**
   ```bash
   # Build locally first
   npm run build
   
   # Simple Dockerfile for serving
   FROM nginx:alpine
   COPY dist/ /usr/share/nginx/html/
   ```

2. **Multi-stage with Cache Mount:**
   ```dockerfile
   # syntax=docker/dockerfile:1
   FROM node:18-alpine AS builder
   RUN --mount=type=cache,target=/root/.npm \
       npm ci --only=production
   ```

## Troubleshooting

### If Build Still Fails:

1. **Check Docker Desktop Logs:**
   - Settings > Troubleshoot > Get support
   - Look for memory/resource errors

2. **Monitor Resource Usage:**
   ```bash
   # Check container stats
   docker stats
   
   # Check system resources
   docker system df
   docker system prune
   ```

3. **Alternative Solutions:**
   - Use Docker Desktop alternatives (Podman, Rancher Desktop)
   - Build on CI/CD and pull images
   - Use remote Docker daemon

### Common Error Messages:

- **"Build cancelled"** → Increase memory/CPU limits
- **"ENOSPC: no space left"** → Clean Docker cache, increase disk space
- **"Killed"** → Node.js OOM, increase memory limit
- **"Network timeout"** → Check internet connection, use npm cache

## Performance Monitoring

### Build Time Optimization:
```bash
# Measure build time
time docker-compose build frontend

# Analyze build cache
docker builder du

# Clean build cache if needed
docker builder prune
```

### Memory Usage:
```bash
# Monitor during build
docker stats --no-stream

# Check container limits
docker inspect <container_id> | grep -i memory
```

## Best Practices

1. **Regular Maintenance:**
   - Clean Docker cache weekly: `docker system prune -a`
   - Update Docker Desktop regularly
   - Monitor disk space usage

2. **Development Workflow:**
   - Use development Dockerfile for local development
   - Only use production Dockerfile for deployment
   - Leverage volume mounts for hot reloading

3. **CI/CD Integration:**
   - Build images in CI/CD pipeline
   - Use registry caching
   - Implement multi-stage builds

## Files Modified

- `packages/frontend/Dockerfile` - Optimized production build
- `packages/frontend/Dockerfile.dev` - Development build
- `packages/frontend/.dockerignore` - Comprehensive exclusions
- `docker-compose.yml` - Resource limits and caching

## Next Steps

1. Test the optimized build: `docker-compose up --build frontend`
2. Monitor build performance and resource usage
3. Adjust Docker Desktop settings as recommended
4. Consider using development Dockerfile for local development

The optimizations should resolve the build cancellation issue and provide a more stable Docker development experience.