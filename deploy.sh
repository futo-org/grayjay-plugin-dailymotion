#!/bin/sh
DOCUMENT_ROOT=/var/www/sources

# Take site offline
echo "Taking site offline..."
touch $DOCUMENT_ROOT/maintenance.file

# Swap over the content
echo "Deploying content..."
mkdir -p $DOCUMENT_ROOT/Dailymotion
cp build/DailymotionIcon.png $DOCUMENT_ROOT/Dailymotion
cp build/DailymotionConfig.json $DOCUMENT_ROOT/Dailymotion
cp build/DailymotionScript.js $DOCUMENT_ROOT/Dailymotion
sh sign.sh $DOCUMENT_ROOT/Dailymotion/DailymotionScript.js $DOCUMENT_ROOT/Dailymotion/DailymotionConfig.json

# Notify Cloudflare to wipe the CDN cache
echo "Purging Cloudflare cache for zone $CLOUDFLARE_ZONE_ID..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"files":["https://plugins.grayjay.app/Dailymotion/DailymotionIcon.png", "https://plugins.grayjay.app/Dailymotion/DailymotionConfig.json", "https://plugins.grayjay.app/Dailymotion/DailymotionScript.js"]}'

# Take site back online
echo "Bringing site back online..."
rm $DOCUMENT_ROOT/maintenance.file
