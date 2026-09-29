@echo off
chcp 65001 >nul
title RESET SESSAO - CIPHERTEXT fix
cd /d "%~dp0"

echo.
echo ============================================================
echo   RESET COMPLETO DA SESSAO (resolve CIPHERTEXT)
echo ============================================================
echo.
echo No CELULAR (seu numero principal), AGORA:
echo   1. WhatsApp aberto e com internet (WiFi ou 4G)
echo   2. Aparelhos conectados -^> DESCONECTE todos os do PC/bot
echo   3. Deixe o WhatsApp em primeiro plano
echo.
pause

echo.
echo Matando node...
taskkill /F /IM node.exe >nul 2>nul
timeout /t 2 /nobreak >nul

if exist "auth_info\" (
  echo Apagando auth_info...
  rmdir /s /q "auth_info"
  echo OK.
) else (
  echo auth_info ja nao existia.
)

echo.
echo ============================================================
echo   Agora:
echo   1. Rode start.bat
echo   2. Escaneie o QR com o celular ONLINE
echo   3. Espere 60 segundos com o celular desbloqueado
echo   4. Do OUTRO celular mande TEXTO: oi
echo   5. Console deve mostrar: keys=conversation
echo      (pode aparecer CIPHERTEXT antes e conversation depois - OK)
echo   6. Se SO CIPHERTEXT e nunca conversation: repita o reset
echo   7. So entao mande VIEW-ONCE
echo ============================================================
echo.
pause
