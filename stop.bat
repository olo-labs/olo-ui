@echo off
setlocal
echo Stopping olo-be and olo-ui...

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :8082 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped process on port 8082 ^(olo-be^). PID: %%a
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped process on port 3000 ^(olo-ui^). PID: %%a
)

echo Done.
endlocal
