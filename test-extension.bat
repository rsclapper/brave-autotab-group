@echo off
echo ========================================
echo  Brave Auto-Tab Group Extension
echo  Development Helper Script
echo ========================================
echo.

echo Current directory contents:
dir /b
echo.

echo Extension files status:
if exist "manifest.json" (
    echo [✓] manifest.json found
) else (
    echo [✗] manifest.json missing
)

if exist "background.js" (
    echo [✓] background.js found
) else (
    echo [✗] background.js missing
)

if exist "popup\popup.html" (
    echo [✓] popup files found
) else (
    echo [✗] popup files missing
)

if exist "options\options.html" (
    echo [✓] options files found
) else (
    echo [✗] options files missing
)

if exist "utils\storage.js" (
    echo [✓] utility files found
) else (
    echo [✗] utility files missing
)

echo.
echo ========================================
echo  Installation Instructions:
echo ========================================
echo 1. Open Brave browser
echo 2. Go to brave://extensions/
echo 3. Enable "Developer mode" (top-right toggle)
echo 4. Click "Load unpacked" button
echo 5. Select this folder: %~dp0
echo.
echo ========================================
echo  Testing Steps:
echo ========================================
echo 1. After installation, click the extension icon
echo 2. Enable auto-grouping if needed
echo 3. Open some tabs (social media, news, etc.)
echo 4. Check if tabs get grouped automatically
echo 5. Try the "Group All Tabs" button
echo 6. Visit Options page to configure rules
echo.

pause