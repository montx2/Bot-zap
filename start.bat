@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Bot View Once - WhatsApp
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( pause & exit /b 1 )
if not exist "node_modules\@whiskeysockets\baileys" call "%~dp0install.bat"
if not exist "node_modules\@whiskeysockets\baileys" ( pause & exit /b 1 )
if not exist "index.js" ( pause & exit /b 1 )
:loop
call node index.js
set EXITCODE=%ERRORLEVEL%
timeout /t 5 /nobreak >nul
goto loop
