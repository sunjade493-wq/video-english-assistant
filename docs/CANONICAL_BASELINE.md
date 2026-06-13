# Current Canonical Baseline

Baseline:
V29 real data startup baseline

Source:
main after PR #71 and PR #75

Runtime requirements:
- REAL_SUBTITLE_DATA_URL
- REAL_OBSTACLE_DATA_URL
- loadRealEpisodeData()
- activeDataSource
- initApp()

Runtime must load:
- output_text/v28d_bilingual_subtitles.json
- output_text/v29a_obstacles.json

Runtime state:
- activeDataSource must be real after successful JSON loading

Forbidden:
- Do not restore old demo startup subtitles
- Do not restore:
  If you enjoyed this lecture
  Can you give me a hand
  I was pulled off the project
  Let's call it a day
- Do not restore 00:14 demo timeline
- Do not restore remaining 4 / 5 demo obstacle state
- Do not checkout historical script.js
- Do not regenerate script.js from old commits
- Future work must modify the current main script.js in place with minimal edits
