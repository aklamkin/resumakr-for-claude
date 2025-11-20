#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Resumakr Setup Validation           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

ERRORS=0
WARNINGS=0

# Check directory structure
echo -e "${YELLOW}[1/10] Checking directory structure...${NC}"
REQUIRED_DIRS=(
    "backend/src/routes"
    "backend/src/middleware"
    "backend/src/config"
    "backend/migrations"
    "backend/seeds"
    "backend/scripts"
    "frontend/src/api"
    "uploads"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}✓${NC} $dir"
    else
        echo -e "  ${RED}✗${NC} $dir - MISSING"
        ((ERRORS++))
    fi
done

# Check backend files
echo -e "\n${YELLOW}[2/10] Checking backend files...${NC}"
BACKEND_FILES=(
    "backend/package.json"
    "backend/Dockerfile"
    "backend/.env"
    "backend/src/server.js"
    "backend/src/config/database.js"
    "backend/src/middleware/auth.js"
    "backend/src/middleware/errorHandler.js"
    "backend/src/middleware/notFound.js"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file - MISSING"
        ((ERRORS++))
    fi
done

# Check route files
echo -e "\n${YELLOW}[3/10] Checking route files...${NC}"
ROUTE_FILES=(
    "backend/src/routes/auth.js"
    "backend/src/routes/resumes.js"
    "backend/src/routes/resumeData.js"
    "backend/src/routes/versions.js"
    "backend/src/routes/ai.js"
    "backend/src/routes/upload.js"
    "backend/src/routes/subscriptions.js"
    "backend/src/routes/providers.js"
    "backend/src/routes/coupons.js"
    "backend/src/routes/faq.js"
)

for file in "${ROUTE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file - MISSING"
        ((ERRORS++))
    fi
done

# Check migration and seed files
echo -e "\n${YELLOW}[4/10] Checking database files...${NC}"
DB_FILES=(
    "backend/migrations/001_initial_schema.sql"
    "backend/migrations/run.js"
    "backend/seeds/run.js"
    "backend/scripts/create-admin.js"
)

for file in "${DB_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file - MISSING"
        ((ERRORS++))
    fi
done

# Check frontend files
echo -e "\n${YELLOW}[5/10] Checking frontend files...${NC}"
FRONTEND_FILES=(
    "frontend/package.json"
    "frontend/Dockerfile"
    "frontend/nginx.conf"
    "frontend/src/api/apiClient.js"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file - MISSING"
        ((ERRORS++))
    fi
done

# Check Docker files
echo -e "\n${YELLOW}[6/10] Checking Docker configuration...${NC}"
if [ -f "docker-compose.yml" ]; then
    echo -e "  ${GREEN}✓${NC} docker-compose.yml"
else
    echo -e "  ${RED}✗${NC} docker-compose.yml - MISSING"
    ((ERRORS++))
fi

# Check environment files exist
echo -e "\n${YELLOW}[7/10] Checking environment files...${NC}"
if [ -f ".env" ]; then
    echo -e "  ${GREEN}✓${NC} .env exists"
else
    echo -e "  ${RED}✗${NC} .env - MISSING"
    ((ERRORS++))
fi

if [ -f "backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} backend/.env exists"
else
    echo -e "  ${RED}✗${NC} backend/.env - MISSING"
    ((ERRORS++))
fi

# Validate environment variables (without showing values)
echo -e "\n${YELLOW}[8/10] Validating environment variables...${NC}"

if [ -f ".env" ]; then
    # Check if JWT_SECRET is not the default
    if grep -q "JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING" .env; then
        echo -e "  ${RED}✗${NC} JWT_SECRET not configured in .env"
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✓${NC} JWT_SECRET configured in .env"
    fi

    # Check if OpenAI key is set
    if grep -q "OPENAI_API_KEY=sk-your-openai-key-here" .env; then
        echo -e "  ${RED}✗${NC} OPENAI_API_KEY not configured in .env"
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY configured in .env"
    fi

    # Check DB password
    if grep -q "DB_PASSWORD=" .env; then
        echo -e "  ${GREEN}✓${NC} DB_PASSWORD set in .env"
    else
        echo -e "  ${RED}✗${NC} DB_PASSWORD missing in .env"
        ((ERRORS++))
    fi
fi

if [ -f "backend/.env" ]; then
    # Check backend env
    if grep -q "JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING" backend/.env; then
        echo -e "  ${RED}✗${NC} JWT_SECRET not configured in backend/.env"
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✓${NC} JWT_SECRET configured in backend/.env"
    fi

    if grep -q "OPENAI_API_KEY=sk-your-openai-key-here" backend/.env; then
        echo -e "  ${RED}✗${NC} OPENAI_API_KEY not configured in backend/.env"
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY configured in backend/.env"
    fi
fi

# Check Docker
echo -e "\n${YELLOW}[9/10] Checking Docker availability...${NC}"
if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Docker installed"
    docker --version
else
    echo -e "  ${RED}✗${NC} Docker not found"
    ((ERRORS++))
fi

if command -v docker-compose &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Docker Compose installed"
    docker-compose --version
else
    echo -e "  ${RED}✗${NC} Docker Compose not found"
    ((ERRORS++))
fi

# Check Node.js
echo -e "\n${YELLOW}[10/10] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js installed"
    node --version
else
    echo -e "  ${YELLOW}⚠${NC} Node.js not found (needed for local dev)"
    ((WARNINGS++))
fi

if command -v npm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} npm installed"
    npm --version
else
    echo -e "  ${YELLOW}⚠${NC} npm not found (needed for local dev)"
    ((WARNINGS++))
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Validation Summary          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Perfect! Everything is ready!${NC}\n"
    echo -e "Next steps:"
    echo -e "  1. Run: ${YELLOW}docker-compose up -d${NC}"
    echo -e "  2. Run: ${YELLOW}docker-compose exec backend npm run migrate${NC}"
    echo -e "  3. Run: ${YELLOW}docker-compose exec backend npm run seed${NC}"
    echo -e "  4. Run: ${YELLOW}docker-compose exec backend npm run create-admin${NC}\n"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with ${WARNINGS} warning(s)${NC}"
    echo -e "You can proceed with Docker deployment.\n"
    exit 0
else
    echo -e "${RED}✗ Found ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
    echo -e "Please fix the errors above before proceeding.\n"
    exit 1
fi
