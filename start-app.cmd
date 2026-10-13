@echo off
setlocal
where code >nul 2>&1
if errorlevel 1 (
  echo VS Code command not found. Open this folder in VS Code manually.
  echo See hht/docs/app-start-guide.md.
  pause
  exit /b 1
)
call code --new-window "%~dp0." "%~dp0hht\typing-app\index.html"
exit /b %errorlevel%
