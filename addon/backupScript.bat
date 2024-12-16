@echo off

set URL=https://api.tutla.net/cc/reg.json
set "BACKUP_DIR=%USERPROFILE%\Documents\AddonBackup"
set "FILENAME=reg.json"
set "SCHEDULE_TASK_NAME=AddonBackupTask"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Downloading %URL%...
powershell -Command "(New-Object System.Net.WebClient).DownloadFile('%URL%', '%BACKUP_DIR%\%FILENAME%')"

if exist "%BACKUP_DIR%\%FILENAME%" (
    echo File downloaded successfully to "%BACKUP_DIR%\%FILENAME%"
) else (
    echo Failed to download the file.
    exit /b 1
)

:: Create a scheduled task to run every 4 days
schtasks /query /tn %SCHEDULE_TASK_NAME% >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating scheduled task to run every 4 days...
    schtasks /create /sc daily /mo 4 /tn %SCHEDULE_TASK_NAME% /tr "%~f0" /st 09:00 /f
    echo Scheduled task created successfully.
) else (
    echo Scheduled task already exists.
)

pause
