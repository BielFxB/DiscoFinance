@echo off
title DiscFinanci - Servidor Ativo (Portas 8002 e 3002)
cd /d "%~dp0"
echo ================================================================
echo           DISCFINANCI - SISTEMA DE CONTROLE FINANCEIRO
echo ================================================================
echo   Mantenha esta janela aberta enquanto utiliza o sistema.
echo   Caso precise fechar o sistema, basta fechar esta janela.
echo ================================================================
echo.
node start.js
pause
