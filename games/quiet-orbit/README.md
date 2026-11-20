# Quiet Orbit

A calm tap game about building a solar system, from dust clouds out to galaxy superclusters. The colors are dim and nothing flashes, so it's easy on the eyes.

- `web/quiet-orbit.html` is the game itself: one self-contained page.
- `app/` is the Android app, an Expo (SDK 58) wrapper that shows the game in a WebView.

## Changing the game

Edit `web/quiet-orbit.html`, then regenerate the bundled copy the app uses:

```bash
cd app
node build-html.js
```

## Building the Android APK

### Option 1: EAS cloud build

This needs free build credits on the `hambones-team` Expo account.

```bash
cd app
npm install
npx eas-cli build -p android --profile preview      # APK for sideloading
npx eas-cli build -p android --profile production   # .aab for Google Play
```

### Option 2: Local build

This needs the Android SDK (platform 37, build-tools 37.0.0, NDK 27.1.12297006, CMake 3.22.1) and JDK 17.

```bash
cd app
npm install
CI=1 npx expo prebuild -p android --no-install
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleRelease --init-script ../build-tools/mirror.init.gradle
# Output: android/app/build/outputs/apk/release/app-release.apk
```

`mirror.init.gradle` points Gradle at Google's copy of Maven Central. Use it if Maven Central rejects downloads with HTTP 429 (too many requests).

The local release build is signed with the Android debug key. That's fine for sideloading, but Google Play needs a real upload key, such as the one EAS manages.
