#!/bin/bash

git checkout preLaunch
git pull origin preLaunch

echo " Starting individual commits..."

for file in $(git status --porcelain | awk '{print $2}')
do
  echo "➕ Adding $file"
  git add "$file"

  echo "��� Committing $file"
  git commit -m "update: $file"

done

echo " Pushing all commits..."
git push origin preLaunch

echo "✅ Done! All files committed individually."
