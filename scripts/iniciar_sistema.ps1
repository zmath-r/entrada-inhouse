# Script PowerShell para Inicializacao do Sistema Entrada InHouse
$Host.UI.RawUI.WindowTitle = "Entrada InHouse - Inicializador"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   🚀 INICIALIZANDO ENTRADA INHOUSE • SMARTCONDO" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $rootPath "backend"
$dashboardPath = Join-Path $rootPath "dashboard"

Write-Host "[1/3] Iniciando Backend Node.js (Porta 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; `$Host.UI.RawUI.WindowTitle = 'Backend (Porta 3000)'; node server.js"

Start-Sleep -Seconds 2

Write-Host "[2/3] Iniciando Frontend Vite (Porta 5173 - Host Wi-Fi)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dashboardPath'; `$Host.UI.RawUI.WindowTitle = 'Frontend (Porta 5173)'; npx vite --host"

Start-Sleep -Seconds 3

Write-Host "[3/3] Abrindo navegador web..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   ✅ SISTEMA ATIVO E PRONTO PARA TESTES!" -ForegroundColor Green
Write-Host "   Computador: http://localhost:5173" -ForegroundColor White
Write-Host "   Celular:    http://192.168.18.14:5173" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
