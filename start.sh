#!/bin/bash

# URDF Editor Start Script
# Starts both backend and frontend servers

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting URDF Editor..."
echo ""

# Start backend
echo "Starting Backend (FastAPI) on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "Starting Frontend (Vite) on http://localhost:5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "URDF Editor is running!"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
