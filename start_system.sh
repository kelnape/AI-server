#!/bin/bash

echo "🚀 Spouštím AI systém..."

BASE_DIR=~/moje_prostredi
FRONTEND_DIR=$BASE_DIR/frontend

# Aktivace python prostředí
echo "🐍 Aktivuji Python prostředí..."
source $BASE_DIR/venv/bin/activate

# Backend
echo "⚙️ Spouštím FastAPI backend..."
cd $BASE_DIR
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &

BACKEND_PID=$!

# Frontend
echo "🎨 Spouštím React frontend..."
cd $FRONTEND_DIR
npm run dev > frontend.log 2>&1 &

FRONTEND_PID=$!

# Cloudflare tunnel (pokud existuje)
if command -v cloudflared &> /dev/null
then
  echo "🌐 Spouštím Cloudflare tunnel..."
  cloudflared tunnel run muj-tunel > tunnel.log 2>&1 &
  TUNNEL_PID=$!
fi

echo ""
echo "✅ Systém běží:"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Logy:"
echo "backend.log"
echo "frontend.log"
echo "tunnel.log"
echo ""

wait
