#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏍️  Bikers Management System - Development Server${NC}"
echo "=================================================="

# Function to kill processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down all services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}

# Set up signal handler
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}🚀 Starting Backend Server (Port 5000)...${NC}"
cd server
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start superadmin frontend
echo -e "${GREEN}👑 Starting Superadmin App (Port 3000)...${NC}"
cd ../apps/superadmin
npm run dev &
SUPERADMIN_PID=$!

# Start tenant frontend
echo -e "${YELLOW}🏢 Starting Tenant App (Port 3001)...${NC}"
cd ../tenant
npm run dev &
TENANT_PID=$!

echo -e "\n${GREEN}✅ All services started!${NC}"
echo "================================="
echo -e "${BLUE}📱 Backend API:${NC}     http://localhost:5000"
echo -e "${GREEN}👑 Superadmin App:${NC}  http://localhost:3000"
echo -e "${YELLOW}🏢 Tenant App:${NC}      http://localhost:3001"
echo ""
echo -e "${BLUE}💾 API Documentation:${NC} http://localhost:5000/api"
echo ""
echo -e "${RED}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait $BACKEND_PID $SUPERADMIN_PID $TENANT_PID