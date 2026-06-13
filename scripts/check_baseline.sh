#!/usr/bin/env bash
set -euo pipefail

TARGET="script.js"

required_symbols=(
  "REAL_SUBTITLE_DATA_URL"
  "REAL_OBSTACLE_DATA_URL"
  "loadRealEpisodeData"
  "activeDataSource"
  "initApp"
)

legacy_demo_phrases=(
  "If you enjoyed this lecture"
  "Can you give me a hand"
  "I was pulled off the project"
  "Let's call it a day"
)

for symbol in "${required_symbols[@]}"; do
  if ! grep -Fq -- "$symbol" "$TARGET"; then
    echo "ERROR: Missing required real data symbol in ${TARGET}: ${symbol}" >&2
    exit 1
  fi
done

for phrase in "${legacy_demo_phrases[@]}"; do
  if grep -Fq -- "$phrase" "$TARGET"; then
    echo "ERROR: Found legacy demo copy in ${TARGET}: ${phrase}" >&2
    exit 1
  fi
done

echo "Baseline check passed."
