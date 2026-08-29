@echo off
title Detener Guitar Songs Web App
cd /d "%~dp0"

echo Buscando y deteniendo el servidor Guitar Songs en el puerto 5000...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

if %FOUND%==1 (
    echo.
    echo =======================================================
    echo  [OK] El servidor de Guitar Songs se ha detenido con exito.
    echo =======================================================
) else (
    echo.
    echo [INFO] El servidor no estaba en ejecucion.
)

timeout /t 2 >nul
