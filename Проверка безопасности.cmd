@echo off
chcp 65001 >nul
title modo security check
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js not found. Install it from https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\@supabase\supabase-js" (
  echo.
  echo   Dependencies are not installed. Run: npm install
  echo.
  pause
  exit /b 1
)

node scripts\security-check.mjs
set CODE=%ERRORLEVEL%

echo.
pause
exit /b %CODE%
