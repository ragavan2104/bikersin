@echo off
echo.
echo 🏍️ Bikers Management System - Development Server
echo ==================================================

echo.
echo 🚀 Starting Backend Server (Port 5000)...
start /b cmd /c "cd server && npm run dev"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo 👑 Starting Superadmin App (Port 3000)...
start /b cmd /c "cd apps/superadmin && npm run dev"

echo.
echo 🏢 Starting Tenant App (Port 3001)...
start /b cmd /c "cd apps/tenant && npm run dev"

echo.
echo ✅ All services started!
echo =================================
echo 📱 Backend API:     http://localhost:5000
echo 👑 Superadmin App:  http://localhost:3000
echo 🏢 Tenant App:      http://localhost:3001
echo.
echo 💾 API Documentation: http://localhost:5000/api
echo.
echo Press any key to stop all Node.js processes...
pause >nul

echo.
echo 🛑 Shutting down all services...
taskkill /f /im node.exe >nul 2>&1
echo ✅ All services stopped.
pause