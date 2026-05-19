#!/usr/bin/env bash
set -euo pipefail

ffmpeg -y -stream_loop -1 -i "public/content/videos/track-01-final.mp4" -i "content/Track 1 Pedal ambient, soft.mp3" -c:v copy -c:a aac -b:a 192k -map 0:v -map 1:a -shortest "public/content/videos/track-01-final-full.mp4"
mv "public/content/videos/track-01-final-full.mp4" "public/content/videos/track-01-final.mp4"

ffmpeg -y -stream_loop -1 -i "public/content/videos/track-02-final.mp4" -i "content/Track 2 - Pedal ambient, dark epiphany.mp3" -c:v copy -c:a aac -b:a 192k -map 0:v -map 1:a -shortest "public/content/videos/track-02-final-full.mp4"
mv "public/content/videos/track-02-final-full.mp4" "public/content/videos/track-02-final.mp4"

ffmpeg -y -stream_loop -1 -i "public/content/videos/track-03-final.mp4" -i "content/Track 3 It is or isn't (instrumental)- Haunting, electronic, harp.wav" -c:v copy -c:a aac -b:a 192k -map 0:v -map 1:a -shortest "public/content/videos/track-03-final-full.mp4"
mv "public/content/videos/track-03-final-full.mp4" "public/content/videos/track-03-final.mp4"

ffmpeg -y -stream_loop -1 -i "public/content/videos/track-04-final.mp4" -i "content/Track 4 - Menial Job - Bittersweet.wav" -c:v copy -c:a aac -b:a 192k -map 0:v -map 1:a -shortest "public/content/videos/track-04-final-full.mp4"
mv "public/content/videos/track-04-final-full.mp4" "public/content/videos/track-04-final.mp4"

ffmpeg -y -stream_loop -1 -i "public/content/videos/track-05-final.mp4" -i "content/Track 5 Birthday - sweet, minimal .mp3" -c:v copy -c:a aac -b:a 192k -map 0:v -map 1:a -shortest "public/content/videos/track-05-final-full.mp4"
mv "public/content/videos/track-05-final-full.mp4" "public/content/videos/track-05-final.mp4"

echo "Remux complete"
