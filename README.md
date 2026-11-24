# The Enthusiast Collective mobile app

Cross-platform Expo/React Native project for the TEC member app. Android is the first release target; the iOS bundle identifier is reserved for a later App Store release.

## Application identity

- Android package: `com.teccarclub.app`
- iOS bundle identifier: `com.teccarclub.app`
- Display name: The Enthusiast Collective

## Local setup

1. Install Node.js 22.13 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add the existing public Supabase URL and publishable key.
4. Run `npx expo start`.

Without environment values, the application runs as an interactive development preview and stores RSVP selections locally.

## Android builds

- On Windows, open PowerShell in the extracted project folder and run `powershell -ExecutionPolicy Bypass -File .\build-android-windows.ps1`.
- Install EAS CLI: `npm install -g eas-cli`
- Authenticate: `eas login`
- Link the project: `eas init`
- Device-test APK: `eas build --platform android --profile preview`
- Google Play AAB: `eas build --platform android --profile production`

Do not place a signing keystore, service account key, or production secrets in this repository.
