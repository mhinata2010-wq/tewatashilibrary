# Figma / GitHub verification ledger (2026-11-17 10:36 JST)

Scope: [Figma Page 1](https://www.figma.com/design/uuFSMfj60ioWbv8D2R8RgQ/) and Draft PR #10. This is a **static evidence ledger**, not a claim of pixel-perfect comparison or browser E2E success.

## Verified in this run

- Figma Page 1 metadata retrieved. Frame `15:534` (紹介画面) is 600 × 339; nested `15:273` (紹介動画) is approximately 435 × 289; `13:120` is approximately 378 × 213. These are design-space dimensions, not CSS targets validated in a browser.
- Integrated branch `index.html` contains the video source `./assets/images/tewatashitosyokan.mp4` and a photo fallback. GitHub Contents API returned **404** for the MP4 at this branch. Video playback is therefore **not verified**.
- `index.html` references Adobe Fonts kit `kqc5rmz`; `redesign.css` specifies `fot-tsukuardgothic-std` and `ads-akari`. Browser computed font, loaded font faces, and exact family names remain **unverified**.
- HTML retains links for book search, Google Calendar, Google Maps, rental page, equipment, and Instagram profile. This confirms references in source, **not** external availability or E2E operation.
- `tests/browser-e2e.mjs` contains desktop/mobile checks and a video playback-or-fallback check. **Not executed this run**.

## Blocking evidence / next acceptance checks

1. Upload the original authorized MP4 and provided source photographs to the feature branch; confirm paths, image provenance and permission, then verify HTTP 200, media metadata, actual playback and responsive presentation. Do not substitute unrelated photographs.
2. Verify Adobe Fonts kit CSS and `document.fonts` plus computed styles in a browser at desktop and mobile widths; compare to Figma's typography. A CSS declaration alone does not establish actual rendering.
3. Obtain verified Instagram post URLs and facility approval of the exact three promises. Until then retain the current explicit empty state and mark facility approval as pending; do not invent URLs or approval.
4. Run Playwright E2E and capture screenshots for every Figma screen; compare typography, assets, interactions, accessibility and responsive behavior. Record actual test commands and outputs in the PR.

**Release gate:** No main merge, Pages deployment, permission change or publication without explicit owner approval. See Issues #1, #2, #5, #7, #9 and Draft PR #10.
