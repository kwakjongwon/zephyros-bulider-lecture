# 에셋 요청서 — 밤항구 (템플릿 04 · 밤의 디오라마)

지금 페이지의 모든 그림은 `main.js`의 `// ── SPRITES ──` 구역에서 코드로 그린 임시 도트입니다.
실제 파일을 이 `assets/` 폴더에 넣고 `main.js` 맨 위 `ASSETS` 객체에 경로만 적으면 코드 그림 대신 파일이 쓰입니다.
(예: `apprenticeSheet: 'assets/apprentice-sheet.png'`)

## 공통 도트 규칙
- **팔레트 7색만 사용**: `#111D2B`(외곽선·가장 어두운 남색) `#20364A`(그림자) `#2E4A60`(안개·달빛 면) `#1D4D4F`(짙은 청록) `#2F7F7A`(청록) `#E2B66C`(불빛) `#F2EBDD`(크림·하이라이트)
- 외곽선 1px `#111D2B`, 명암 3단계(그림자 → 기본 → 하이라이트), 빛은 왼쪽 위(달). 따뜻한 `#E2B66C`는 창문·등불 같은 **불빛에만**.
- 1px = 1도트 원본 크기로 PNG 저장(안티앨리어싱·반투명 가장자리 금지). 확대는 페이지가 정수 배율로 합니다.

## 이미지 에셋

| 파일명 | 용도(위치) | 규격 | 우선순위 | 연결 방법 |
|---|---|---|---|---|
| `apprentice-sheet.png` | 히어로·스크린샷의 견습생 | 12×16 프레임 4개 가로 = **48×16**, 순서: 대기1·대기2(등불 깜빡임)·걷기1·걷기2, 투명 PNG | 필수 | `ASSETS.apprenticeSheet` |
| `portrait-apprentice.png` `portrait-keeper.png` `portrait-cat.png` `portrait-fisher.png` | 등장인물 탭·상세 초상 | 각 **32×32**, 배경 투명(페이지가 `#2E4A60` 바탕을 깔아 줌) | 필수 | `ASSETS.sprites.portraitApprentice` / `portraitKeeper` / `portraitCat` / `portraitFisher` |
| `screenshot-1.png` ~ `screenshot-3.png` | 영상·스크린샷 섹션 3칸 (우체국·언덕길·등대) | 16:9, 실제 게임 화면(1920×1080 또는 도트 원본 320×180) PNG/WebP | 필수 | `ASSETS.screenshots[0~2]` — 넣으면 도트 비네트 대신 `<img>`로 바뀜. 위에 얹힌 HUD 문구(index.html)는 화면에 맞게 수정 |
| `trailer.mp4` 또는 YouTube embed 주소 | 트레일러 대화상자 | 1920×1080 H.264 mp4, 또는 `https://www.youtube.com/embed/...` | 필수(공개 시) | `ASSETS.trailer` — 설정되면 히어로 ‘트레일러 보기’도 바로 재생 |
| `trailer-poster.png` | 트레일러 썸네일 | 1920×1080 PNG/WebP | 권장 | `ASSETS.trailerPoster` |
| `hero-sky.png` `hero-far.png` `hero-village.png` `hero-near.png` | 히어로 풍경(가로 화면) 4층 — 시차 이동 | 각 **440×200** 논리 px, sky만 불투명·나머지 투명. 아래·왼쪽 기준으로 놓임, 글 영역(왼쪽 위 45%)은 비워 둘 것 | 권장 | `ASSETS.heroLayers.sky/far/village/near` |
| `hero-*-mobile.png` (같은 4층) | 히어로 풍경(세로 화면) | 각 **160×300**, 위쪽 45%는 글 자리라 하늘만 | 권장 | `ASSETS.heroLayersMobile.*` |
| (좌표 목록) | village PNG의 창문 위치 — 스크롤에 따라 하나씩 켜짐 | `[[x, y, w, h], ...]` PNG 좌표, 창문은 **꺼진 상태로** 그릴 것 | village PNG 사용 시 필수 | `ASSETS.heroWindows` |
| `logo-mark.png` | 머리글·바닥글 등대 로고 | **12×16** 투명 PNG | 권장 | `ASSETS.sprites.logo` (파비콘은 index.html의 data URI SVG 교체) |
| `icon-letter.png` `icon-lamp.png` `icon-talk.png` | 핵심 경험 카드 아이콘 (lamp는 퍼즐 등불에도 사용) | 각 **16×16** | 선택 | `ASSETS.sprites.iconLetter` / `iconLamp` / `iconTalk` |
| `face-fisher.png` | 대화 상자 얼굴 | **16×16** | 선택 | `ASSETS.sprites.faceFisher` |

물결·등대 빛·밤배·고양이 눈 깜빡임·창문 불빛은 코드로 움직입니다. 레이어 PNG를 넣어도 이 움직임은 그대로 유지됩니다.
`near` 레이어를 바꿀 때는 견습생이 걷는 잔교 윗면을 **수평선 아래 19도트**(세로 화면은 17도트)에, 고양이가 앉는 상자를 부두 왼쪽 끝 근처에 두면 코드로 그리는 인물과 맞습니다.

## 이미지 외에 받아야 할 것
- 게임 정식 명칭(한/영)과 로고 표기 규칙, 개발사명·문의 메일·개인정보 처리방침 링크
- 출시 시기·플랫폼 확정 정보, 스토어 위시리스트 주소 → `ASSETS.wishlistUrl`
- 시스템 사양, 지원 언어 표, 가격·할인 정책, FAQ 답변 (현재 문구는 예시)
- 세계관·인물 설정 문구 검수 (이름 누리·보름·우표·달수, 마을 이름 바람곶은 임시)
- 뉴스레터 실제 전송처(폼 서비스 주소) — 지금은 화면에서만 접수 메시지를 보여 주는 데모
- 음악을 소개하려면 사운드트랙 음원(mp3/ogg)과 사용 허락 범위 — 현재 페이지에는 소리가 없음
