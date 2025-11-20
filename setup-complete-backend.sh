#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Creating complete Resumakr backend structure...${NC}\n"

# Create directory structure
echo -e "${YELLOW}[1/15] Creating directory structure...${NC}"
mkdir -p backend/src/{routes,middleware,config,services,utils}
mkdir -p backend/migrations
mkdir -p backend/seeds
mkdir -p backend/scripts
mkdir -p frontend/src/api
mkdir -p uploads

echo -e "${GREEN}✓ Directories created${NC}\n"

# Move existing frontend files
echo -e "${YELLOW}[2/15] Reorganizing frontend...${NC}"
if [ ! -d "frontend/src" ]; then
    mkdir -p frontend
    mv src frontend/ 2>/dev/null || true
    mv index.html frontend/ 2>/dev/null || true
    mv package.json frontend/ 2>/dev/null || true
    mv vite.config.js frontend/ 2>/dev/null || true
    mv tailwind.config.js frontend/ 2>/dev/null || true
    mv postcss.config.js frontend/ 2>/dev/null || true
    mv components.json frontend/ 2>/dev/null || true
    mv eslint.config.js frontend/ 2>/dev/null || true
    mv jsconfig.json frontend/ 2>/dev/null || true
fi
echo -e "${GREEN}✓ Frontend reorganized${NC}\n"

echo -e "${GREEN}Setup script structure created!${NC}"
echo -e "${YELLOW}Now I'll guide you through copying the route files...${NC}\n"

