#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting On-Chain Trading Platform...${NC}"

# Check if dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and npm."
    exit 1
fi

# Check for Rust
if ! command -v rustc &> /dev/null; then
    echo "Rust is not installed. Please install Rust and Cargo."
    exit 1
fi

# Check for Solana CLI
if ! command -v solana &> /dev/null; then
    echo "Solana CLI is not installed. It's recommended for deploying contracts."
    echo "You can continue without it, but you won't be able to deploy contracts."
    read -p "Continue without Solana CLI? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
fi

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    cp backend/.env.example backend/.env
    echo "Please update the .env file with your configuration."
fi

# Start the backend in a new terminal
echo -e "${GREEN}Starting backend server...${NC}"
gnome-terminal --tab --title="Backend Server" -- bash -c "cd backend && npm run dev; exec bash" || \
xterm -T "Backend Server" -e "cd backend && npm run dev; exec bash" || \
open -a Terminal.app backend && cd backend && npm run dev || \
echo "Could not open a new terminal. Please start the backend manually with: cd backend && npm run dev"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 5

# Start the frontend in a new terminal
echo -e "${GREEN}Starting frontend server...${NC}"
gnome-terminal --tab --title="Frontend Server" -- bash -c "cd frontend && npx serve; exec bash" || \
xterm -T "Frontend Server" -e "cd frontend && npx serve; exec bash" || \
open -a Terminal.app frontend && cd frontend && npx serve || \
echo "Could not open a new terminal. Please start the frontend manually with: cd frontend && npx serve"

echo -e "${GREEN}On-Chain Trading Platform is running!${NC}"
echo -e "Backend: http://localhost:3000"
echo -e "Frontend: http://localhost:5000"
echo -e "Press Ctrl+C to stop the servers."

# Keep the script running
wait