# Android Build Guide - Inside Inspiration Academy

## Prerequisites

### 1. Java 17
```bash
sudo pacman -S jdk17-openjdk
sudo archlinux-java set java-17-openjdk
java -version  # Should show Java 17
```

### 2. Android SDK & NDK
- Android SDK installed at `/home/sutirtha_05/Android/Sdk`
- NDK version 27.1.12297006 (will be installed automatically if missing)

## Quick Build Commands

### Debug Build (Recommended for Testing)
```bash
# Using the build script
./build-android-debug.sh

# Or manually
cd android
./gradlew assembleDebug
```

### Release Build (For Distribution)
```bash
# Using Gradle directly
cd android
./gradlew assembleRelease
```

## Build Types

### Debug APK
- **Purpose**: Development and testing
- **Signed**: Yes (with debug key)
- **Debugging**: Enabled
- **Optimization**: Minimal
- **Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK
- **Purpose**: Production distribution
- **Signed**: Debug key (change for Play Store)
- **Debugging**: Disabled
- **Optimization**: Enabled
- **Location**: `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Common Issues

#### 1. NDK Version Mismatch
```bash
# Install correct NDK version
cd /home/sutirtha_05/Android/Sdk/cmdline-tools/latest/bin
./sdkmanager "ndk;27.1.12297006"
```

#### 2. Java Version Issues
```bash
# Check Java version
java -version

# Switch to Java 17 if needed
sudo archlinux-java set java-17-openjdk
```

#### 3. Permission Issues
```bash
# Make gradlew executable
chmod +x android/gradlew
```

#### 4. Clean Build
```bash
cd android
./gradlew clean
./gradlew assembleDebug  # or assembleRelease
```

## Build Configuration

### Current Settings
- **Package**: `com.anonymous.inside_inpiration_academy`
- **Min SDK**: 24
- **Target SDK**: 35
- **Compile SDK**: 35
- **NDK**: 27.1.12297006
- **Build Tools**: 35.0.0

### Environment Variables
The build includes Supabase configuration:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Build Scripts

### Debug Build Script (`build-android-debug.sh`)
- Checks prerequisites
- Creates Android project if needed
- Builds debug APK
- Copies APK to root directory

### Usage
```bash
chmod +x build-android-debug.sh
./build-android-debug.sh
```

## Output Locations

After successful build:
- **Debug APK**: `inside-inspiration-academy-debug.apk`
- **Release APK**: `inside-inspiration-academy-release.apk`
- **Original locations**: `android/app/build/outputs/apk/[debug|release]/`

## Production Builds

For Play Store distribution:
1. Generate a proper signing key
2. Configure signing in `android/app/build.gradle`
3. Use release build variant
4. Test thoroughly before distribution

## EAS Build (Alternative)

The project also supports EAS builds:
```bash
eas build --platform android --profile debug     # For debug
eas build --platform android --profile production # For release
```

---

**Note**: First builds take longer due to dependency downloads. Subsequent builds are much faster.
