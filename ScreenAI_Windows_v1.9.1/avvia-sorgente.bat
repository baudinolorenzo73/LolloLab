@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>nul || (
  echo .NET 8 SDK non trovato. Installa con: winget install Microsoft.DotNet.SDK.8
  pause
  exit /b 1
)
dotnet run --project ".\src\ScreenAI\ScreenAI.csproj"
