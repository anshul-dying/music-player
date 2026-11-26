# Chrome Web Store Submission Guide — GaneGan Companion Extension

Package: `@mp/extension` (`frontend/extension`)
Manifest Config: [wxt.config.ts](file:///home/anshuldying/Project/music-player/frontend/extension/wxt.config.ts)

---

## 1. Store Listing Copy

- **Extension Name:** `GaneGan — YouTube Music Bridge`
- **Category:** `Music & Audio` / `Entertainment`
- **Short Description (≤ 132 chars):**
  `Bridges your YouTube session to GaneGan for ad-free music, personalized mixes, and synced playlists.` (99 chars)
- **Detailed Description:**
  > GaneGan Companion Extension connects your browser's existing YouTube Music session directly to the GaneGan web player—enabling direct CDN audio playback, high-fidelity Opus/AAC streaming, and two-way sync for your Liked Songs, Playlists, and Personalized Mixes.
  >
  > **What this extension does:**
  > - Direct client-side audio streaming without server-side proxying or latency.
  > - Syncs your existing YouTube Music library (Liked Songs, Playlists, Home Feed) when signed into YouTube.
  > - Scoped strictly to requests initiated by the GaneGan web app—never alters native `youtube.com` or `music.youtube.com` browsing.
  >
  > **Privacy First:**
  > - Zero tracking, zero analytics, zero third-party data sharing.
  > - All session tokens (`SAPISIDHASH`) are computed locally in your browser via Web Crypto SHA-1 and never sent to GaneGan's servers.

---

## 2. Permission Justifications (CWS Review Form)

| Permission / Host | Justification |
| :--- | :--- |
| **`cookies`** | Reads YouTube session cookies (`SAPISID`, `__Secure-3PAPISID`, `__Secure-1PAPISID`) locally in the background service worker solely to compute `SAPISIDHASH` authorization headers when the user explicitly connects their YouTube account. Cookies are never persisted or transmitted to any third-party or GaneGan server. |
| **`declarativeNetRequest`** | Applies scoped `Origin` / `Referer` header rules (`initiatorDomains` restricted to GaneGan app origins only, excluding `youtube.com` / `music.youtube.com`) so InnerTube API and `googlevideo.com` audio byte-range requests succeed directly from the client. |
| **`storage`** | Stores local extension connection state and cached client preferences via `chrome.storage.local`. |
| **`host_permissions`** (`music.youtube.com`, `youtube.com`, `*.googlevideo.com`) | Required for the background worker to execute user-initiated InnerTube metadata/library fetches and direct audio stream requests on behalf of the connected GaneGan web app. |
| **`externally_connectable` / `content_scripts`** | Restricted strictly to configured GaneGan app origins (`VITE_APP_ORIGINS`) for the `window.postMessage` / `runtime.onMessageExternal` bridge. |

---

## 3. Data Usage & Privacy Disclosures

- **Single Purpose:** Connect the GaneGan web music player to YouTube Music endpoints and `googlevideo.com` audio streams directly from the user's browser.
- **Data Collection:** None. Does not collect, store, or sell personally identifiable information, browsing history, or web activity.
- **Remote Code:** None. All code is bundled locally in the WXT MV3 build.

---

## 4. Graphic Assets & Packaging Checklist

- [x] Store Icon (`128×128` PNG): `frontend/extension/public/icons/icon-128.png`
- [x] Toolbar Icons (`16×16`, `32×32`, `48×48` PNG): `frontend/extension/public/icons/`
- [ ] Screenshots (`1280×800` or `640×400` PNG/JPEG, 2–5 images): Capture GaneGan Player, Full-Screen Synced Lyrics, and Connected Extension Modal.
- [ ] Small Promo Tile (`440×280` PNG)

### Build & Zip for Upload
```bash
VITE_APP_ORIGINS="https://your-production-domain.com" pnpm --filter @mp/extension zip
# Upload the generated .zip from frontend/extension/.output/ to Chrome Web Store Developer Dashboard
```
Once published, set `NEXT_PUBLIC_CHROME_WEB_STORE_URL` in your web environment so `/extension` shows the **Add to Chrome** CTA.
