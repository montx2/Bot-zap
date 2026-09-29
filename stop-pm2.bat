@echo off
chcp 65001 >nul
cd /d "%~dp0"
call pm2 stop viewonce-bot
call pm2 delete viewonce-bot
echo Bot parado e removido do PM2.
pause
