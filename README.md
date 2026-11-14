# Tap Café

A cute two-minute boba-shop tap game for mobile browsers. No install, no account.
Everyone gets the same customers each day (Daily #1 = Nov 11, 2026).

**Play:** https://tapcafe.web.app

- Play locally: `powershell -ExecutionPolicy Bypass -File serve.ps1`, then open http://localhost:8123
- Tuning numbers (round lengths, patience, prices, star cutoffs) are all in `js/core.js` under `TC.CFG`.
- Deploy: `firebase.cmd deploy --only hosting` (Firebase project `tapcafe-game`). The GitHub Pages copy just forwards to the Firebase link.
- Link-preview image and icon (`img/og.png`, `img/icon.png`) are screenshots of `tools/og.html` and `tools/og.html#icon`
  taken with a headless browser at 1200x630 and 512x512.
- Analytics (`js/analytics.js`) only runs on the Firebase site, and only once Google Analytics is enabled on the project.
