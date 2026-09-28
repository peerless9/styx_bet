#!/usr/bin/env bash
# Copies REVERSED_CLIENT_ID from GoogleService-Info.plist into Info.plist's URL scheme
# so the native Google Sign-In sheet can return to the app. Run on a Mac.
set -euo pipefail
cd "$(dirname "$0")/.."
GS="ios/App/App/GoogleService-Info.plist"
INFO="ios/App/App/Info.plist"
if [ ! -f "$GS" ]; then
  echo "Missing $GS — download it from Firebase console → Project settings → Your apps → iOS app, and put it there."
  exit 1
fi
REV=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$GS")
/usr/libexec/PlistBuddy -c "Set :CFBundleURLTypes:0:CFBundleURLSchemes:0 $REV" "$INFO"
echo "Google Sign-In URL scheme set to $REV"
