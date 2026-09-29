@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Instalacao - Bot View Once
cd /d "%~dp0"

if not exist "package.json" (
 echo [ERRO] O arquivo package.json nao foi encontrado nesta pasta.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo [ERRO] Node.js nao encontrado.
 pause
 exit /b 1
)
call node -v
call npm -v
if exist "node_modules" rmdir /s /q "node_modules" 2>nul
if exist "package-lock.json" del /f /q "package-lock.json" 2>nul
call npm install --no-fund --no-audit
if errorlevel 1 ( pause & exit /b 1 )
if not exist "node_modules\@whiskeysockets\baileys" ( pause & exit /b 1 )
echo Instalacao concluida com sucesso!
pause
