@echo off
chcp 65001 >nul
title Entrada InHouse - Envio para o GitHub
color 0b
echo ========================================================
echo    🚀 ENVIANDO CODIGO PARA O GITHUB (zmath-r)
echo ========================================================
echo.
echo Conectando ao repositorio https://github.com/zmath-r/entrada-inhouse.git ...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo    🎉 SUCESSO! CODIGO ENVIADO PARA O SEU GITHUB!
    echo    Acesse: https://github.com/zmath-r/entrada-inhouse
    echo ========================================================
) else (
    echo ========================================================
    echo    ⚠️ Se a janela de login do GitHub abrir no navegador,
    echo    clique em 'Authorize' para confirmar.
    echo ========================================================
)
echo.
pause
