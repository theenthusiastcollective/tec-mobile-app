$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "THE ENTHUSIAST COLLECTIVE - ANDROID BUILD" -ForegroundColor Red
Write-Host "Installing project dependencies..." -ForegroundColor Gray
npm install

Write-Host ""
Write-Host "Signing in to Expo..." -ForegroundColor Gray
npx eas-cli@latest login --browser

Write-Host ""
Write-Host "Connecting the TEC mobile project to Expo..." -ForegroundColor Gray
npx eas-cli@latest init

Write-Host ""
Write-Host "Starting the Android test APK build..." -ForegroundColor Gray
$env:EAS_NO_VCS = "1"
npx eas-cli@latest build --platform android --profile preview

Write-Host ""
Write-Host "Expo will display a link when the APK is ready." -ForegroundColor Green
