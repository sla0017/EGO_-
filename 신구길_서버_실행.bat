@echo off
title Shingu Gil Dev Server
cd /d "%~dp0"
echo ==============================================
echo  Shingu-gil Development Server is Starting...
echo  Browser Address: http://localhost:8443
echo ==============================================
npm run dev
pause
