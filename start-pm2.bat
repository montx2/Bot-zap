@echo off
chcp 65001 >nul
title Bot View Once - PM2 (background)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Rode install.bat primeiro.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
)

where pm2 >nul 2>nul
if errorlevel 1 (
  echo PM2 nao encontrado. Instalando globalmente...
  call npm install -g pm2
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel instalar o PM2.
    echo Tente abrir o PowerShell/CMD como Administrador e rode:
    echo   npm install -g pm2
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando bot com PM2 (roda em segundo plano)...
call pm2 start ecosystem.config.cjs
call pm2 save

echo.
echo ============================================
echo   Bot rodando em segundo plano via PM2
echo ============================================
echo.
echo Comandos uteis (abra um CMD nesta pasta):
echo   pm2 logs viewonce-bot     - ver logs / QR Code na 1a vez
echo   pm2 status                - status
echo   pm2 restart viewonce-bot  - reiniciar
echo   pm2 stop viewonce-bot     - parar
echo   pm2 delete viewonce-bot   - remover do PM2
echo.
echo IMPORTANTE na primeira execucao:
echo   Rode:  pm2 logs viewonce-bot
echo   Escaneie o QR Code que aparecer.
echo.
echo Para o bot subir sozinho apos reiniciar o Windows, veja o README
echo (secao "Iniciar com o Windows").
echo.
pause
