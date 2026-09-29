@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Mostrando logs do bot (Ctrl+C para sair)...
call pm2 logs viewonce-bot
