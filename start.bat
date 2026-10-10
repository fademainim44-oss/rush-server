@echo off
title Rush Client VDS Server
color 0b
echo =========================================
echo  Rush Client Dedicated Server Baslatiliyor
echo =========================================
echo.

if not exist node_modules (
    echo Paketler yukleniyor...
    call npm install
)

node server.js
pause
