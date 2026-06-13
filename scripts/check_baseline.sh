#!/usr/bin/env bash
set -euo pipefail

required_symbols=(
  "REAL_SUBTITLE_DATA_URL"
  "REAL_OBSTACLE_DATA_URL"
  "loadRealEpisodeData"
  "activeDataSource"
  "initApp"
)

for symbol in "${required_symbols[@]}"; do
  if ! grep -qF "$symbol" script.js; then
    echo "Baseline check failed: missing required symbol: $symbol" >&2
    exit 1
  fi
done

forbidden_phrases=(
  "If you enjoyed this lecture"
  "Can you give me a hand"
  "I was pulled off the project"
  "Let's call it a day"
)

for phrase in "${forbidden_phrases[@]}"; do
  if grep -qF "$phrase" script.js; then
    echo "Baseline check failed: forbidden demo phrase found: $phrase" >&2
    exit 1
  fi
done

echo "Baseline check passed."
