@echo off
setlocal
cd /d "%~dp0"
dotnet restore ".\tests\ScreenAI.CoreTests.csproj" --source https://api.nuget.org/v3/index.json
if errorlevel 1 goto :failed
dotnet run --project ".\tests\ScreenAI.CoreTests.csproj" --no-restore
if errorlevel 1 goto :failed
echo Verifica offline completata.
pause
exit /b 0
:failed
echo Verifica non riuscita. Leggi il messaggio sopra.
pause
exit /b 1
