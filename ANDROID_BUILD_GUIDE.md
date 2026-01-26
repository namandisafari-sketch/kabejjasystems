# Android Build Guide with Capacitor

This guide walks you through building the Kabejja Biz Track app for Android using Capacitor.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18+) installed
2. **Android Studio** installed with:
   - Android SDK (API level 33+)
   - Android SDK Build-Tools
   - Android Emulator (optional, for testing)
3. **Java Development Kit (JDK 17)**
4. **Git** for version control

---

## IMPORTANT: Database Setup Order

Before running the app, you must set up the database. Follow this exact order:

### Option A: Using Supabase Cloud (Recommended)
The database is already configured via Lovable Cloud - no action needed.

### Option B: Self-Hosted Supabase
If using a self-hosted instance, run the migration file **BEFORE** building the app:

```bash
# 1. Connect to your Supabase PostgreSQL
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres

# 2. Run the migration (in correct order - the file handles dependencies)
\i MIGRATION_NO_RLS.sql
```

**The migration file handles all dependencies automatically:**
- Extensions are enabled first
- Custom types (enums) are created with duplicate handling
- Helper functions are created before tables that use them
- Tables are created in dependency order (packages → tenants → profiles → etc.)
- Triggers are created after their referenced tables and functions exist
- Indexes are created last for performance

> ⚠️ **No RLS Issues**: The migration file does NOT include Row Level Security policies, so there are no RLS-related errors during execution.

## Step 1: Export Project to GitHub

1. In Lovable, click the **"Export to GitHub"** button in the top-right menu
2. Connect your GitHub account if not already connected
3. Choose a repository name and export

## Step 2: Clone and Setup Locally

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install
```

## Step 3: Capacitor Configuration

The project already has Capacitor configured. Verify `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kabejja.biztrack',
  appName: 'Kabejja Biz Track',
  webDir: 'dist',
  server: {
    // For development - live reload from Lovable preview
    url: 'https://2072fab1-8a8f-4251-98ab-c9fd37f8cc54.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e3a5f',
    },
  },
};

export default config;
```

> **Note**: For production builds, remove or comment out the `server.url` line to use the bundled web assets instead of live reload.

## Step 4: Add Android Platform

```bash
# Add Android platform (if not already added)
npx cap add android

# Update Android dependencies
npx cap update android
```

## Step 5: Build the Web App

```bash
# Build the production web app
npm run build

# Sync web assets to Android
npx cap sync android
```

## Step 6: Open in Android Studio

```bash
# Open the Android project in Android Studio
npx cap open android
```

Or manually open Android Studio and select:
`File > Open > [your-project]/android`

## Step 7: Configure for Production

### Update `capacitor.config.ts` for Production

Comment out the development server URL:

```typescript
const config: CapacitorConfig = {
  appId: 'com.kabejja.biztrack',
  appName: 'Kabejja Biz Track',
  webDir: 'dist',
  // server: {
  //   url: 'https://...', // Comment this for production
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e3a5f',
    },
  },
};
```

Then rebuild and sync:

```bash
npm run build
npx cap sync android
```

### Update App Icons

Replace the default icons in:
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

You can use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) to generate icons.

### Update Splash Screen

Replace splash images in:
- `android/app/src/main/res/drawable-*/splash.png`

## Step 8: Build APK/AAB

### Debug APK (for testing)

In Android Studio:
1. Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`
2. Find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

Or via command line:

```bash
cd android
./gradlew assembleDebug
```

### Release AAB (for Play Store)

1. Generate a signing key:

```bash
keytool -genkey -v -keystore kabejja-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kabejja
```

2. Create/update `android/app/build.gradle` with signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('kabejja-release-key.jks')
            storePassword 'your_store_password'
            keyAlias 'kabejja'
            keyPassword 'your_key_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. Build the release bundle:

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 9: Test on Device/Emulator

### Using Emulator

```bash
npx cap run android
```

### Using Physical Device

1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging**
3. Connect via USB
4. Run:

```bash
npx cap run android --target=YOUR_DEVICE_ID
```

List available devices:

```bash
adb devices
```

## Troubleshooting

### Camera Not Working

Ensure camera permissions are in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### Network/API Issues

For cleartext HTTP traffic (development only), add to `AndroidManifest.xml`:

```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

### Build Errors

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Sync Issues

```bash
# Full clean sync
rm -rf android/app/src/main/assets/public
npx cap sync android
```

## Updating the App

After making changes in Lovable:

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild and sync
npm run build
npx cap sync android
```

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npx cap add android` | Add Android platform |
| `npx cap sync android` | Sync web assets to Android |
| `npx cap update android` | Update native dependencies |
| `npx cap open android` | Open in Android Studio |
| `npx cap run android` | Build and run on device/emulator |
| `npm run build` | Build web assets |

## Publishing to Play Store

1. Create a [Google Play Developer account](https://play.google.com/console) ($25 one-time fee)
2. Create a new app in Play Console
3. Upload your signed AAB file
4. Fill in store listing details (screenshots, description, etc.)
5. Complete content rating questionnaire
6. Set pricing and distribution
7. Submit for review

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Lovable Mobile App Guide](https://docs.lovable.dev/tips-tricks/mobile-development)
