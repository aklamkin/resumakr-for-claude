# Distribution Guide

This document outlines the distribution options for Resumakr.

## Current Distribution Method

### Source Code via GitHub (Recommended)

**Repository:** https://github.com/aklamkin/resumakr-for-claude

Users can clone and run the application using Docker Compose:

```bash
# Clone repository
git clone https://github.com/aklamkin/resumakr-for-claude.git
cd resumakr-for-claude

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
# Edit .env files with your configuration

# Start with Docker Compose
docker-compose up -d
docker exec resumakr-api npm run migrate
docker exec -it resumakr-api npm run create-admin
```

**Advantages:**
- ✅ Full source code access for customization
- ✅ Easy updates via `git pull`
- ✅ Transparent - users can review all code
- ✅ Free hosting on GitHub
- ✅ Version control history

**Disadvantages:**
- ⚠️ Requires Docker knowledge
- ⚠️ Users must configure environment variables
- ⚠️ Requires building images locally (first run is slower)

## Alternative Distribution Options

### Option 1: Pre-built Docker Images (Docker Hub)

Publish pre-built images to Docker Hub for faster deployment.

#### Setup Steps:

1. **Create Docker Hub repositories:**
   - `aklamkin/resumakr-backend`
   - `aklamkin/resumakr-frontend`

2. **Build and push images:**
   ```bash
   # Login to Docker Hub
   docker login

   # Tag images
   docker tag resumakr-for-claude-backend:latest aklamkin/resumakr-backend:latest
   docker tag resumakr-for-claude-backend:latest aklamkin/resumakr-backend:1.0.0
   docker tag resumakr-for-claude-frontend:latest aklamkin/resumakr-frontend:latest
   docker tag resumakr-for-claude-frontend:latest aklamkin/resumakr-frontend:1.0.0

   # Push to Docker Hub
   docker push aklamkin/resumakr-backend:latest
   docker push aklamkin/resumakr-backend:1.0.0
   docker push aklamkin/resumakr-frontend:latest
   docker push aklamkin/resumakr-frontend:1.0.0
   ```

3. **Update docker-compose.yml:**
   ```yaml
   services:
     backend:
       image: aklamkin/resumakr-backend:latest
       # Remove build directive
     frontend:
       image: aklamkin/resumakr-frontend:latest
       # Remove build directive
   ```

4. **Simplified user installation:**
   ```bash
   # Download docker-compose.yml
   curl -O https://raw.githubusercontent.com/aklamkin/resumakr-for-claude/main/docker-compose.yml

   # Download .env.example
   curl -O https://raw.githubusercontent.com/aklamkin/resumakr-for-claude/main/.env.example

   # Configure and start
   cp .env.example .env
   # Edit .env
   docker-compose up -d
   ```

**Advantages:**
- ✅ Much faster first-time setup (no building)
- ✅ Smaller download (no source code needed for deployment)
- ✅ Versioned releases (can pin to specific versions)
- ✅ Professional distribution method

**Disadvantages:**
- ⚠️ Requires Docker Hub account
- ⚠️ Public images (or requires paid plan for private)
- ⚠️ Must rebuild and push for each release

### Option 2: Managed Hosting Platforms

Deploy to cloud platforms with one-click deployment.

#### Railway.app
- Single command deployment
- Automatic HTTPS
- Database included
- Cost: ~$5-20/month

#### Render.com
- Free tier available
- Automatic deployments from GitHub
- Cost: Free - $25/month

#### DigitalOcean App Platform
- Managed container hosting
- Automatic scaling
- Cost: ~$5-25/month

#### Heroku
- Simple deployment
- Add-ons for database, etc.
- Cost: ~$7-25/month

### Option 3: Self-Hosted Installation Script

Create an automated installation script for VPS deployment.

```bash
#!/bin/bash
# install.sh - One-command Resumakr installation

# Download and run
curl -fsSL https://raw.githubusercontent.com/aklamkin/resumakr-for-claude/main/install.sh | bash
```

Would handle:
- Docker installation check
- Repository cloning
- Environment setup
- Database initialization
- Admin user creation

### Option 4: Kubernetes Helm Chart

For enterprise deployments needing scalability.

Would provide:
- Helm chart for Kubernetes
- ConfigMaps for configuration
- Persistent volume claims for database
- Ingress configuration
- Auto-scaling policies

## Recommended Approach

### For Current Stage (MVP/Beta):

**Primary: GitHub Source Code Distribution**
- Keep it simple and transparent
- Users who want to self-host can use Docker Compose
- Full control and customization

**Optional: Docker Hub Images**
- Publish for convenience
- Version releases with semantic versioning
- Faster deployment for non-developers

### For Production/Commercial:

**Multi-Channel Distribution:**

1. **SaaS Offering** (Primary)
   - Hosted version at https://app.resumakr.com
   - Managed service with subscriptions
   - No installation needed

2. **Enterprise Self-Hosted** (Secondary)
   - Docker images on Docker Hub
   - Kubernetes Helm charts
   - Support packages

3. **Open Source Community** (Tertiary)
   - Source code on GitHub
   - Community contributions
   - Free tier / self-hosted option

## Versioning Strategy

Use semantic versioning (semver):
- `1.0.0` - Major releases (breaking changes)
- `1.1.0` - Minor releases (new features)
- `1.1.1` - Patch releases (bug fixes)

Tag releases in Git:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Deployment Automation (Future)

Consider GitHub Actions for automated builds:

```yaml
# .github/workflows/docker-publish.yml
name: Docker Build and Push

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push to Docker Hub
        # Automated build and push on version tags
```

## Current Recommendation

**Start with:**
1. ✅ GitHub source distribution (current)
2. ✅ Clear README with Docker Compose instructions (done)
3. ⏭️ Consider Docker Hub if demand grows

**Future additions:**
- Docker Hub images for convenience
- Installation script for VPS deployment
- Managed hosting option (SaaS)
- Helm chart for enterprise

---

**For most users right now:** GitHub + Docker Compose is the best balance of simplicity, transparency, and functionality.
