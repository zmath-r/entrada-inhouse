@echo off
chcp 65001 >nul
title Entrada InHouse - Finalizador do Sistema
color 0c
echo ========================================================
echo    🛑 ENCERRANDO SERVICOS ENTRADA INHOUSE
echo ========================================================
echo.
echo Encerrando instancias do Backend e Frontend...

powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"

echo.
echo ========================================================
echo    ✅ SERVICOS FINALIZADOS COM SUCESSO!
echo    Portas 3000 e 5173 estao liberadas.
echo ========================================================
echo.
pause
