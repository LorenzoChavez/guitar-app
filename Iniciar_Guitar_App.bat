@echo off
title Guitar Songs Web App
cd /d "%~dp0"

echo Iniciando servidor Guitar Songs...

:: Verificar si el servidor ya esta en ejecucion en el puerto 5000
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    if exist ".venv\Scripts\python.exe" (
        start "" ".venv\Scripts\python.exe" server.py
    ) else (
        start "" python server.py
    )
    timeout /t 2 /nobreak >nul
)

:: Abrir en el navegador web predeterminado
start "" "http://127.0.0.1:5000"
