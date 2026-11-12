# Tap Café

A cute two-minute boba-shop tap game for mobile browsers. No install, no account.
Built from the "Tap Café — Game Spec (v1)" doc. Everyone gets the same customers each day (Daily #1 = Nov 11, 2026).

- Play locally: `powershell -ExecutionPolicy Bypass -File serve.ps1`, then open http://localhost:8123
- Or just open `index.html` in a browser.
- Tuning numbers (round lengths, patience, prices, star cutoffs) are all in `js/core.js` under `TC.CFG`.
- Static files only, so it hosts directly on GitHub Pages.
