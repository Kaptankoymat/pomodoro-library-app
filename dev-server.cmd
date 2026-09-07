@echo off
cd /d "%~dp0"
node.exe "%CD%\node_modules\next\dist\bin\next" dev --hostname 0.0.0.0 --port 3000 > dev-server.log 2> dev-server.err.log
