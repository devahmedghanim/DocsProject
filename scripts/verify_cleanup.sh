#!/usr/bin/env bash
set -euo pipefail

API='https://docs.ecss-sa.com/Api/api'
VID='/Users/ahmedghanim/Desktop/Doc NexusPMS/الدليل 1/ar.mp4'
IMG='/tmp/qa-small.jpg'
TS=$(date +%s)
R1="qa-guide-del-$TS"
R2="qa-section-del-$TS"

ffmpeg -y -ss 00:00:01 -i "$VID" -frames:v 1 "$IMG" >/dev/null 2>&1

LOGIN=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' --data '{"username":"ghanim@admin.com","password":"P@ssw0rd4187"}')
TOK=$(printf '%s' "$LOGIN" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.token||'')")
[ -n "$TOK" ]

echo "ROUTES $R1 $R2"
for R in "$R1" "$R2"; do
  curl -sS -X POST "$API/docs/sections/save" -H "Authorization: Bearer $TOK" -F "route=$R" -F "icon=doc" -F "title_ar=$R" -F "title_en=$R" -F 'desc_ar=t' -F 'desc_en=t' >/dev/null
  U=$(curl -sS -X POST "$API/docs/media/upload" -H "Authorization: Bearer $TOK" -F "route=$R" -F 'guideNumber=1' -F 'lang=ar' -F "file=@$VID;type=video/mp4;filename=video.mp4")
  S=$(printf '%s' "$U" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.src||'')")
  T=$(printf '%s' "$U" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.type||'')")
  curl -sS -X POST "$API/docs/guides/save" -H "Authorization: Bearer $TOK" -F "route=$R" -F 'number=1' -F "title_ar=$R" -F "title_en=$R" -F 'desc_ar=t' -F 'desc_en=t' -F "media_src_ar=$S" -F "media_type_ar=$T" >/dev/null
  echo "SETUP_OK $R"
done

echo -n 'BEFORE_REPLACE video '
curl -sSI "https://docs.ecss-sa.com/uploads/$R1/1/ar/video.mp4" | head -n 1

U2=$(curl -sS -X POST "$API/docs/media/upload" -H "Authorization: Bearer $TOK" -F "route=$R1" -F 'guideNumber=1' -F 'lang=ar' -F "file=@$IMG;type=image/jpeg;filename=image.jpg")
S2=$(printf '%s' "$U2" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.src||'')")
T2=$(printf '%s' "$U2" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.type||'')")

curl -sS -X POST "$API/docs/guides/save" -H "Authorization: Bearer $TOK" -F "route=$R1" -F 'number=1' -F "title_ar=$R1" -F "title_en=$R1" -F 'desc_ar=t' -F 'desc_en=t' -F "media_src_ar=$S2" -F "media_type_ar=$T2" >/dev/null

echo -n 'AFTER_REPLACE image '
curl -sSI "https://docs.ecss-sa.com/uploads/$R1/1/ar/image.jpg" | head -n 1
echo -n 'AFTER_REPLACE video '
curl -sSI "https://docs.ecss-sa.com/uploads/$R1/1/ar/video.mp4" | head -n 1

GID=$(curl -sS "https://docs.ecss-sa.com/Api/data/guides/$R1.json" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write((d[0]&&d[0].id)||'')")
D1=$(curl -sS -o /tmp/d1.out -w '%{http_code}' -X POST "$API/docs/guides/delete" -H "Authorization: Bearer $TOK" -F "route=$R1" -F "id=$GID")

echo "DELETE_GUIDE_CODE $D1"
echo -n 'GUIDES_JSON_AFTER '
curl -sS "https://docs.ecss-sa.com/Api/data/guides/$R1.json" | tr -d '\n'
echo
echo -n 'GUIDE_UPLOAD_AFTER '
curl -sSI "https://docs.ecss-sa.com/uploads/$R1/1/ar/image.jpg" | head -n 1

D2=$(curl -sS -o /tmp/d2.out -w '%{http_code}' -X POST "$API/docs/sections/delete" -H "Authorization: Bearer $TOK" -F "route=$R2")

echo "DELETE_SECTION_CODE $D2"
echo -n 'SECTION_GUIDES_AFTER '
curl -sSI "https://docs.ecss-sa.com/Api/data/guides/$R2.json" | head -n 1
echo -n 'SECTION_UPLOAD_AFTER '
curl -sSI "https://docs.ecss-sa.com/uploads/$R2/1/ar/video.mp4" | head -n 1
