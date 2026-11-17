@echo off
setlocal
cd /d "%~dp0"

where dotnet >nul 2>nul
if errorlevel 1 (
  echo ERRORE: .NET 8 SDK non trovato.
  echo Installa: winget install Microsoft.DotNet.SDK.8
  echo Poi chiudi e riapri il Prompt dei comandi.
  pause
  exit /b 1
)

dotnet --list-sdks | findstr /r "^[89]\. ^[1-9][0-9]\." >nul
if errorlevel 1 goto :sdk_error

echo Compilazione di ScreenAI 1.9.1 per Windows 64 bit...
dotnet publish ".\src\ScreenAI\ScreenAI.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=None -p:DebugSymbols=false --source https://api.nuget.org/v3/index.json
if errorlevel 1 (
  echo.
  echo Compilazione non riuscita. Leggi il messaggio sopra.
  pause
  exit /b 1
)

set "OUTPUT_DIR=.\src\ScreenAI\bin\Release\net8.0-windows\win-x64\publish"
if not exist "%OUTPUT_DIR%\ScreenAI.exe" goto :output_error
copy /Y ".\open.env.example" "%OUTPUT_DIR%\open.env.example" >nul
if exist ".\open.env" (
  copy /Y ".\open.env" "%OUTPUT_DIR%\open.env" >nul
  if errorlevel 1 goto :copy_error
  echo open.env copiato accanto a ScreenAI.exe.
) else (
  echo NOTA: open.env non trovato nella cartella del progetto.
  echo Copialo manualmente accanto a ScreenAI.exe prima dell'avvio.
)

echo.
echo COMPLETATO.
echo Programma: src\ScreenAI\bin\Release\net8.0-windows\win-x64\publish\ScreenAI.exe
start "" "%OUTPUT_DIR%"
pause
exit /b 0

:sdk_error
echo ERRORE: installa .NET 8 SDK con: winget install Microsoft.DotNet.SDK.8
pause
exit /b 1

:output_error
echo ERRORE: ScreenAI.exe non e' stato generato.
pause
exit /b 1

:copy_error
echo ERRORE: impossibile copiare open.env. Copialo manualmente accanto all'EXE.
pause
exit /b 1
