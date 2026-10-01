@echo off
chcp 65001 >nul
title Entrada InHouse - Inicializador do Sistema
color 0b
echo ========================================================
echo    🚀 INICIALIZANDO ENTRADA INHOUSE • SMARTCONDO
echo ========================================================
echo.
echo [1/3] Iniciando Backend Node.js na porta 3000...
start "Entrada InHouse - Backend (Porta 3000)" cmd /k "cd /d "%~dp0..\backend" && color 0a && title Entrada InHouse - Backend && node server.js"

echo [2/3] Aguardando estabilizacao do banco de dados...
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando Frontend Vite na porta 5173 (Host Wi-Fi ativo)...
start "Entrada InHouse - Frontend (Porta 5173)" cmd /k "cd /d "%~dp0..\dashboard" && color 09 && title Entrada InHouse - Frontend && npx vite --host"

echo.
echo Aguardando inicializacao do servidor web...
timeout /t 3 /nobreak >nul

echo Abrindo navegador em http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo    ✅ SISTEMA ATIVO E OPERANTE!
echo.
echo    Computador Local:   http://localhost:5173
echo    Celular (Wi-Fi):    http://192.168.18.14:5173
echo.
echo    Admin:   Master / admin123
echo    Morador: 101 / 101
echo.
echo    Mantenha as janelas do Backend e Frontend abertas.
echo    Para desligar tudo, execute parar_sistema.bat.
echo ========================================================
echo.
pause
