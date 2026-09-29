# =====================================================================
# windows-autostart.ps1
# Cria uma tarefa no Agendador de Tarefas do Windows para iniciar o
# bot automaticamente quando VOCÊ fizer login no Windows.
#
# Como usar (PowerShell):
#   1. Clique com o botao direito na pasta do bot
#   2. "Abrir no Terminal" / PowerShell
#   3. Execute:
#        Set-ExecutionPolicy -Scope Process Bypass
#        .\windows-autostart.ps1
#
# Para remover depois:
#        .\windows-autostart.ps1 -Remove
# =====================================================================

param(
  [switch]$Remove
)

$TaskName = "WhatsApp-ViewOnce-Bot"
$BotDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodeCmd) {
  Write-Host "[ERRO] Node.js nao encontrado no PATH. Instale em https://nodejs.org/" -ForegroundColor Red
  exit 1
}

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Tarefa '$TaskName' removida." -ForegroundColor Yellow
  exit 0
}

# Preferimos PM2 se estiver instalado (mais robusto). Senao, node direto.
$Pm2Cmd = (Get-Command pm2 -ErrorAction SilentlyContinue).Source
if ($Pm2Cmd) {
  $Action = New-ScheduledTaskAction -Execute "cmd.exe" `
    -Argument "/c cd /d `"$BotDir`" && pm2 start ecosystem.config.cjs && pm2 save" `
    -WorkingDirectory $BotDir
  Write-Host "Usando PM2 para o autostart." -ForegroundColor Cyan
} else {
  $Action = New-ScheduledTaskAction -Execute $NodeCmd `
    -Argument "index.js" `
    -WorkingDirectory $BotDir
  Write-Host "PM2 nao encontrado — usando node direto." -ForegroundColor Cyan
  Write-Host "Dica: instale PM2 (npm i -g pm2) para reinicio automatico se o bot cair." -ForegroundColor DarkGray
}

$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 5 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 0)  # sem limite de tempo

# Remove se ja existir, depois registra de novo
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Inicia o bot pessoal de WhatsApp (view-once) no login" | Out-Null

Write-Host ""
Write-Host "OK! Tarefa '$TaskName' criada." -ForegroundColor Green
Write-Host "O bot vai iniciar automaticamente quando voce logar no Windows." -ForegroundColor Green
Write-Host ""
Write-Host "Gerenciar: painel 'Agendador de Tarefas' do Windows." -ForegroundColor DarkGray
Write-Host "Remover:   .\windows-autostart.ps1 -Remove" -ForegroundColor DarkGray
