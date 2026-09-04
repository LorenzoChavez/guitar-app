@echo off
title Sincronizar WebApp con AndroidApp
cd /d "%~dp0"

echo =======================================================
echo  Sincronizando cambios de WebApp a AndroidApp...
echo =======================================================
echo.

set "ANDROID_DIR=..\AndroidApp"

if not exist "%ANDROID_DIR%\www" (
    echo [ERROR] No se encuentra la carpeta AndroidApp en %ANDROID_DIR%
    pause
    exit /b 1
)

echo 1. Copiando archivos de interfaz (static\* a AndroidApp/www)...
xcopy /Y /S /E "static\*" "%ANDROID_DIR%\www\" >nul

echo 2. Copiando bases de datos (chords_db.json, songs_db.json y strums_db.json)...
if exist "chords_db.json" copy /Y "chords_db.json" "%ANDROID_DIR%\www\" >nul
if exist "songs_db.json" copy /Y "songs_db.json" "%ANDROID_DIR%\www\" >nul
if exist "strums_db.json" copy /Y "strums_db.json" "%ANDROID_DIR%\www\" >nul

echo 3. Ejecutando npx cap sync en AndroidApp...
pushd "%ANDROID_DIR%"
call npx cap sync
popd

echo.
echo =======================================================
echo  [OK] Sincronizacion completada con exito!
echo  La app Android ya tiene los ultimos cambios listos.
echo =======================================================
echo.
ping 127.0.0.1 -n 3 >nul
