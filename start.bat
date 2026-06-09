@echo off
setlocal
cd /d "%~dp0"

echo Starting olo-be (Spring Boot on port 8082)...
start "olo-be" cmd /k "cd /d "%~dp0olo-be" && gradlew.bat bootRun"

echo Starting olo-ui (Vite on port 3000)...
start "olo-ui" cmd /k "cd /d "%~dp0olo-ui" && npm install && npm run dev"

echo.
echo Both apps started in separate windows.
echo Backend: http://localhost:8082
echo UI:      http://localhost:3000
echo.
echo Close those windows or run stop.bat to stop.
endlocal
