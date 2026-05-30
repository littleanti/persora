@echo off
echo.
echo  ===================================
echo   Persona Mirror 시작 중...
echo  ===================================
echo.

:: 의존성 설치 (최초 실행 시)
if not exist node_modules (
    echo  의존성 설치 중...
    call npm install
)

:: 프로덕션 빌드
echo  빌드 중...
call npm run build
if errorlevel 1 (
    echo.
    echo  [오류] 빌드에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo  서버 주소: http://localhost:8000
echo  휴대폰에서 접속: http://[이 PC의 IP]:8000
echo  (IP 확인: ipconfig 명령어 실행)
echo.
echo  종료하려면 Ctrl+C 를 누르세요.
echo.

call npm start
