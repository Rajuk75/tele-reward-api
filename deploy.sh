#!/bin/bash

echo "🚀 Starting deployment..."

cd ~/adshamper_api || exit

# Fetch latest changes

git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

# Check if new commit exists

if [ "$LOCAL" = "$REMOTE" ]; then
echo "✅ No new commits. Skipping deployment."
exit 0
fi

echo "📥 New commit found! Deploying..."

# Pull latest code

git pull origin main

# Install dependencies ONLY if package.json changed

if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
echo "📦 package.json changed → running npm install..."
npm install
else
echo "📦 No dependency changes → skipping npm install"
fi

# Restart app

echo "🔄 Restarting PM2..."
pm2 restart adshamper-api || pm2 start app.js --name adshamper-api

pm2 save

echo "✅ Deployment completed!"
# Get commit details safely
COMMIT_ID=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | tr '\n' ' ')
AUTHOR=$(git log -1 --pretty=%an)

echo "📧 Sending deployment email..."
node sendEmail.cjs "$COMMIT_ID" "$COMMIT_MSG" "$AUTHOR"
