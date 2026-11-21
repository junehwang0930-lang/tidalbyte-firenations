@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js 22 or later, then open this launcher again. & pause & exit /b 1)
start "" http://localhost:4173
node server.js
pause
