#!/bin/sh
set -eu

PRE_RELEASE=${PRE_RELEASE:-false}  # Default to false if not set

# UUIDv5 of the given name in the namespace of the given UUID. Built from openssl and printf
# because the shell runner is not known to have uuidgen or python3.
uuid_v5() {
    namespace=$1
    name=$2
    hash=$(
        {
            for byte in $(printf '%s' "$namespace" | tr -d '-' | sed 's/../& /g'); do
                printf "\\$(printf '%03o' "0x$byte")"
            done
            printf '%s' "$name"
        } | openssl dgst -sha1 -r | cut -c 1-32
    )
    variant=$(printf '%x' $(( (0x$(echo "$hash" | cut -c 17) & 3) | 8 )))
    printf '%s-%s-5%s-%s%s-%s\n' \
        "$(echo "$hash" | cut -c 1-8)" \
        "$(echo "$hash" | cut -c 9-12)" \
        "$(echo "$hash" | cut -c 14-16)" \
        "$variant" \
        "$(echo "$hash" | cut -c 18-20)" \
        "$(echo "$hash" | cut -c 21-32)"
}

CONFIG_INPUT=build/DailymotionConfig.json

# Determine deployment directory
if [ "$PRE_RELEASE" = "true" ]; then
    RELATIVE_PATH="unstable/Dailymotion"

    # A separate id lets the unstable build be installed next to the stable one.
    UNSTABLE_ID=$(uuid_v5 "$(jq -r .id "$CONFIG_INPUT")" unstable)
    STAGED_CONFIG=$(mktemp)
    trap 'rm -f "$STAGED_CONFIG"' EXIT
    jq --arg id "$UNSTABLE_ID" '.id = $id | .name += " (Unstable)"' "$CONFIG_INPUT" > "$STAGED_CONFIG"
    CONFIG_INPUT=$STAGED_CONFIG
else
    RELATIVE_PATH="Dailymotion"
fi

sh "$(dirname "$0")/publish-r2.sh" "$RELATIVE_PATH" "$CONFIG_INPUT" DailymotionConfig.json build/DailymotionScript.js build/DailymotionIcon.png
