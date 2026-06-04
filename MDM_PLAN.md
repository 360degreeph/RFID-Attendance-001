# MDM Deployment Roadmap (RFID Attendance)

> [!NOTE]
> This plan is to be executed once the app development is 100% complete.

## Recommended Providers
1. **Esper.io**: Best for dedicated kiosks and remote APK management.
2. **ManageEngine MDM Plus**: Free for up to 25 devices; robust feature set.

## Pre-Deployment Checklist
- [ ] **Release Signing**: Ensure a consistent `.keystore` is used for all builds.
- [ ] **Version Management**: Increment `versionCode` in `android/app/build.gradle` for every update.
- [ ] **Provisioning**: Enroll devices via Android Enterprise (QR Code or 6-tap method) before shipping to remote sites.

## Remote Update Workflow
1. Build signed Release APK.
2. Upload APK to MDM Dashboard.
3. Push to devices over-the-air (OTA).
4. Monitor installation status via MDM console.

## Current Technical State
- Backend: Render API (`https://rfid-sentinel-api.onrender.com`)
- Database: Google Sheets ("Attendance Log_v1")
- App Framework: Capacitor (React)
