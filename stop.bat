@echo off
setlocal enabledelayedexpansion
echo Stopping olo-be and olo-ui...

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :8082 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped process on port 8082 ^(olo-be^). PID: %%a
)
for %%p in (3000 3001) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /PID %%a /F >nul 2>&1
        echo Stopped process on port %%p ^(olo-ui^). PID: %%a
    )
)

echo Done.
if not defined NONINTERACTIVE pause
endlocal
