@echo off
title Entrada InHouse - Sincronizacao com GitHub
color 0b

echo ========================================================
echo    SINCRONIZANDO COM O GITHUB (zmath-r/entrada-inhouse)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando alteracoes locais...
git add -A

git diff --cached --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [2/3] Criando commit com alteracoes recentes...
    git commit -m "update: sincronizacao automatica do projeto"
) else (
    echo [2/3] Nenhuma alteracao pendente para commit.
)

echo.
echo [3/3] Enviando para o repositorio remoto...
git push origin main

if %ERRORLEVEL% EQU 0 goto :SUCESSO
goto :ERRO

:SUCESSO
echo.
echo ========================================================
echo    SUCESSO! O CODIGO ESTA ATUALIZADO NO GITHUB!
echo    Acesse: https://github.com/zmath-r/entrada-inhouse
echo ========================================================
echo.
goto :FIM

:ERRO
echo.
echo ========================================================
echo    FALHA OU REQUISICAO DE AUTORIZACAO
echo    Se a janela do navegador abrir, confirme o login
echo    do GitHub para autorizar o envio.
echo ========================================================
echo.
goto :FIM

:FIM
pause