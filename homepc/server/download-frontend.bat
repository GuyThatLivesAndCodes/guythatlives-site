@echo off
echo Downloading frontend files...
echo.

if not exist "frontend" mkdir frontend

echo [1/2] Downloading index.html...
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/GuyThatLivesAndCodes/guythatlives-site/claude/remote-pc-web-control-YblmU/homepc/index.html' -OutFile 'frontend/index.html'"

echo [2/2] Downloading remote-client.js...
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/GuyThatLivesAndCodes/guythatlives-site/claude/remote-pc-web-control-YblmU/homepc/remote-client.js' -OutFile 'frontend/remote-client.js'"

echo.
echo Frontend files downloaded successfully!
echo.
echo You can now access the control interface at:
echo   http://localhost:8080
echo   or http://YOUR_IP:8080
echo.
pause
