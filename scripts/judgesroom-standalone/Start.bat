@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  Judges Room Standalone Server
echo  =============================
echo  v{{VERSION}}
echo  Local server for your event network.
echo.
echo  Open one of these URLs on this computer. You and the judges must use the same one.
echo  If more than one appears, use the Wi-Fi address the judges are on.
echo  That is usually 192.168.... Try it on a judge's phone. If it does not load, try the next URL.
echo  Do it before you create the room. Never start on localhost.
echo.

powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Docker|Hyper-V|Loopback|Bluetooth|Virtual' } | ForEach-Object { Write-Output ('    {0,-20} http://{1}:8787' -f $_.InterfaceAlias, $_.IPAddress) }"

echo.
echo  If Windows Firewall asks, allow access on Private networks.
echo  Close this window or press x to stop.
echo.

set "WRANGLER_SEND_METRICS=false"

"%~dp0{{NODE_BIN}}" "%~dp0{{WRANGLER_JS}}" dev --config "%~dp0worker\wrangler.jsonc" --env production --ip 0.0.0.0 --port 8787 --persist-to "%~dp0data"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo  Judges Room Standalone Server stopped.
pause
exit /b %EXIT_CODE%
