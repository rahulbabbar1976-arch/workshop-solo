@echo off
:: Batch script to run the ANPR helper module from the workshop-solo directory

:: Path to the anpr_module.py located in the sibling "workshop" folder
set SCRIPT_PATH=%~dp0..\workshop\anpr_module.py

:: First try the Python launcher (py)
py -3 "%SCRIPT_PATH%" %*
if %errorlevel%==0 goto :eof

:: Then try a typical Python installation path (adjust if needed)
set PY_EXE=C:\\Users\\rahul\\AppData\\Local\\Programs\\Python\\Python311\\python.exe
if exist "%PY_EXE%" (
    "%PY_EXE%" "%SCRIPT_PATH%" %*
    exit /b %errorlevel%
)

:: If Python is still not found, display an error message
echo Error: Python interpreter not found. Install Python from https://www.python.org/downloads/ and ensure "Add Python to PATH" is enabled.
exit /b 1
