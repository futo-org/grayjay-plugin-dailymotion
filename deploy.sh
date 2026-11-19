#!/bin/sh
set -eu

PRE_RELEASE=${PRE_RELEASE:-false}  # Default to false if not set

# Determine deployment directory
if [ "$PRE_RELEASE" = "true" ]; then
    RELATIVE_PATH="pre-release/Dailymotion"
else
    RELATIVE_PATH="Dailymotion"
fi

sh "$(dirname "$0")/publish-r2.sh" "$RELATIVE_PATH" build/DailymotionConfig.json DailymotionConfig.json build/DailymotionScript.js build/DailymotionIcon.png
