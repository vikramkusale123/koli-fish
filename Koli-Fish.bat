@echo off
title Koli Fish Management System

cd /d "%~dp0"

echo.
echo ========================================
echo       KOLI FISH MANAGEMENT SYSTEM
echo ========================================
echo.
echo Starting Koli Fish...
echo.

start "" java -jar "target\koli-fish-0.0.1-SNAPSHOT.jar"

echo Waiting for Koli Fish to start...
timeout /t 8 /nobreak >nul

echo Opening Koli Fish in browser...
start "" "http://localhost:8080"

echo.
echo Koli Fish is running.
echo.
echo Keep this window open while using Koli Fish.
echo.

pause