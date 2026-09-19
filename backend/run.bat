@echo off
echo Freeing port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
call .venv\Scripts\activate.bat
uvicorn app.main:app --reload
