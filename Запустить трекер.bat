@echo off
chcp 65001 >nul
title Трекер доходов и расходов
cd /d "%~dp0"

rem Если трекер уже запущен — просто открываем его в браузере
curl -s -o nul --max-time 2 http://localhost:3000 && (
  start "" http://localhost:3000
  exit /b
)

echo Собираю трекер, это займёт около 20 секунд...
call npm run build >nul 2>&1
if errorlevel 1 (
  echo Сборка не удалась. Подробности: npm run build
  pause
  exit /b 1
)

rem Браузер откроется через несколько секунд, когда сервер будет готов
start "" cmd /c "timeout /t 4 >nul & start "" http://localhost:3000"

echo.
echo Трекер работает: http://localhost:3000
echo Не закрывайте это окно, пока пользуетесь трекером.
echo.
call npm run start
