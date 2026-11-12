/* Tap Café — share card (picture first, text as backup). */
(function () {
  'use strict';
  const TC = window.TC;
  const INK = '#4A2B3D';
  const FONT = 'Fredoka, ui-rounded, system-ui, sans-serif';

  function svgImg(svg, w, h) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      const s = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `);
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(ctx, cx, cy, R, on) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? R * 0.45 : R, a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = on ? '#FFE3A3' : '#EFE3CF';
    ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  }

  // Returns a canvas 1080 x 1350.
  TC.drawShareCard = async function (daily, best) {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* fine */ }
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.textAlign = 'center';

    // background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#FFDCE8'); g.addColorStop(1, '#FFC2D6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let y = 40; y < H; y += 90) for (let x = 40 + ((y / 90) % 2) * 45; x < W; x += 90) { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); }

    // logo
    ctx.font = `700 150px ${FONT}`;
    ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillText('Tap Café', W / 2, 190 + 10);
    ctx.lineWidth = 16; ctx.strokeStyle = INK; ctx.strokeText('Tap Café', W / 2, 190);
    ctx.fillStyle = '#F7A8C0'; ctx.fillText('Tap Café', W / 2, 190);

    // daily chip
    const chip = `Daily #${daily.num} · ${TC.prettyDate(daily.ds)}`;
    ctx.font = `600 46px ${FONT}`;
    const cw = ctx.measureText(chip).width + 80;
    rr(ctx, W / 2 - cw / 2, 232, cw, 76, 38);
    ctx.fillStyle = '#BDEBDD'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(chip, W / 2, 286);

    // three of today's customers with their orders
    const three = daily.rounds[0].slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const c = three[i], cx = 200 + i * 340;
      const n = c.order.tops.length;
      const bw = 130 + n * 72, bx = cx - bw / 2, by = 350;
      rr(ctx, bx, by, bw, 150, 46);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
      const cup = await svgImg(TC.cupSVG(c.order.drink, c.order.tops, 1), 100, 120);
      ctx.drawImage(cup, bx + 22, by + 15, 100, 120);
      for (let k = 0; k < n; k++) {
        const ic = await svgImg(TC.topIcon(c.order.tops[k]), 68, 68);
        ctx.drawImage(ic, bx + 122 + k * 72, by + 41, 68, 68);
      }
      const im = await svgImg(TC.customerSVG(c.look, 0), 300, 375);
      ctx.drawImage(im, cx - 150, 500, 300, 375);
    }
    // counter
    ctx.fillStyle = '#BDEBDD'; ctx.fillRect(0, 830, W, 60);
    ctx.fillStyle = INK; ctx.fillRect(0, 826, W, 7);

    // result panel
    ctx.fillStyle = '#FFF7E8'; ctx.fillRect(0, 890, W, H - 890);
    ctx.fillStyle = INK; ctx.fillRect(0, 887, W, 7);

    ctx.font = `600 44px ${FONT}`; ctx.fillStyle = INK; ctx.globalAlpha = 0.75;
    ctx.fillText('Best today', W / 2, 960); ctx.globalAlpha = 1;
    ctx.font = `700 150px ${FONT}`; ctx.fillStyle = '#4FA58C';
    ctx.fillText('$' + best.score, W / 2, 1095);
    const stars = TC.starsFor(best.score);
    for (let i = 0; i < 3; i++) star(ctx, W / 2 - 110 + i * 110, 1160, 46, i < stars);
    ctx.font = `700 54px ${FONT}`; ctx.fillStyle = INK;
    ctx.fillText(TC.CFG.titles[stars], W / 2, 1265);
    ctx.font = `600 40px ${FONT}`; ctx.fillStyle = '#C9557D';
    ctx.fillText('Order up! Can you beat me?', W / 2, 1322);
    return cv;
  };

  TC.isPublicSite = function () {
    return location.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
  };

  TC.shareText = function (daily, best) {
    const stars = TC.starsFor(best.score);
    let t = `Tap Café #${daily.num}, order up! I earned $${best.score} today 🧋${'⭐'.repeat(stars)} ${TC.CFG.titles[stars]}`;
    if (TC.isPublicSite()) t += '\n' + location.origin + location.pathname;
    return t;
  };

  TC.canvasBlob = function (cv) {
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  };
})();

