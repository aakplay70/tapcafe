/* Tap Café — game loop, screens and input. */
(function () {
  'use strict';
  const TC = window.TC, C = TC.CFG;
  const $ = (s) => document.querySelector(s);
  const app = $('#app'), overlay = $('#overlay'), banner = $('#banner'), hand = $('#hand');
  const slotEls = Array.prototype.slice.call(document.querySelectorAll('.slot'));
  const cupEl = $('#cup');
  const hudRound = $('#hudRound'), hudTime = $('#hudTime'), hudCash = $('#hudCash'), tbar = $('#tbar');
  const drinkBtns = {}, topBtns = {};

  // ---------- storage (browser only) ----------
  const store = {
    get(k) { try { return localStorage.getItem('tapcafe.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('tapcafe.' + k, v); } catch (e) { /* private mode */ } },
  };
  function getBest(ds) {
    try {
      const b = JSON.parse(store.get('best.' + ds));
      return b && typeof b.score === 'number' ? b : null;
    } catch (e) { return null; } // a damaged save should never block the title screen
  }

  // ---------- state ----------
  let daily = TC.buildDaily(TC.dateStr());
  const G = { playing: false };
  let cupLiq, cupFoam, cupGroups = {};
  let countdownTimer = 0;

  function fit() {
    const s = Math.min(window.innerWidth / 390, window.innerHeight / 720);
    document.documentElement.style.fontSize = Math.max(8, 16 * s) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------- stations ----------
  function buildStations() {
    TC.DRINKS.forEach((d) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'st drink';
      b.innerHTML = TC.cupSVG(d, [], 1) + '<span>' + TC.DRINK_INFO[d].name + '</span>';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); pickDrink(d); });
      $('#drinks').appendChild(b); drinkBtns[d] = b;
    });
    TC.TOPS.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'st top';
      b.innerHTML = TC.topIcon(t) + '<span>' + TC.TOP_INFO[t].name + '</span>';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleTop(t); });
      $('#tops').appendChild(b); topBtns[t] = b;
    });
    $('#toss').addEventListener('pointerdown', (e) => { e.preventDefault(); if (G.playing) { if (G.cup.drink || G.cup.tops.length) TC.audio.sfx('toss'); resetCup(); } });
    // The whole column above the counter is the tap target, not just the character.
    slotEls.forEach((s, i) => s.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const c = G.slots && G.slots[i];
      if (c) tapCustomer(c);
    }));
    cupEl.innerHTML = TC.cupSVG(null, [], 0, true);
    cupLiq = cupEl.querySelector('.liq'); cupFoam = cupEl.querySelector('.foam');
    cupEl.querySelectorAll('.tg').forEach((g) => { cupGroups[g.dataset.t] = g; });
  }

  function renderUps() {
    $('#ups').innerHTML = Object.keys(C.upgrades).filter((k) => G.ups[k]).map((k) =>
      '<span class="upb" title="' + C.upgrades[k].name + '">' + C.upgrades[k].ico + (G.ups[k] > 1 ? '×' + G.ups[k] : '') + '</span>').join('');
  }

  function brewTime() { return C.brew / Math.pow(2, G.ups.turbo); }

  function resetCup() {
    G.cup = { drink: null, tops: [], brew: 0 };
    TC.audio.stopPour();
    renderCup();
  }
  function pickDrink(d) {
    if (!G.playing || G.cup.drink === d) return;
    G.cup.drink = d; G.cup.brew = 0;
    TC.audio.sfx('drink', TC.DRINKS.indexOf(d));
    TC.audio.sfx('pour', brewTime());
    renderCup();
  }
  function toggleTop(t) {
    if (!G.playing) return;
    const i = G.cup.tops.indexOf(t);
    TC.audio.sfx('top', i < 0);
    if (i >= 0) G.cup.tops.splice(i, 1);
    else {
      G.cup.tops.push(t);
      const g = cupGroups[t];
      g.classList.remove('drop'); void g.getBoundingClientRect(); g.classList.add('drop');
    }
    renderCup();
  }
  function renderCup() {
    const cup = G.cup;
    if (G.pending && !matches(G.pending)) clearPending();
    TC.DRINKS.forEach((d) => drinkBtns[d].classList.toggle('on', cup.drink === d));
    TC.TOPS.forEach((t) => {
      const on = cup.tops.indexOf(t) >= 0;
      topBtns[t].classList.toggle('on', on);
      cupGroups[t].style.display = on ? '' : 'none';
    });
    if (cup.drink) cupLiq.setAttribute('fill', TC.DRINK_INFO[cup.drink].col);
    cupEl.querySelector('.mark').innerHTML = TC.drinkMark(cup.drink);
    renderFill();
  }
  function renderFill() {
    const cup = G.cup, h = cup.drink ? 72 * cup.brew : 0;
    cupLiq.setAttribute('y', 115 - h); cupLiq.setAttribute('height', h);
    cupFoam.setAttribute('y', 115 - h); cupFoam.setAttribute('height', h > 4 ? 4 : 0);
  }

  // ---------- customers ----------
  function orderHTML(o) {
    return TC.cupSVG(o.drink, o.tops, 1).replace('class="cupsvg"', 'class="cupsvg ocup"') + (o.tops.length ? '<span class="otops">' + o.tops.map(TC.topIcon).join('') + '</span>' : '');
  }

  function spawn(def, slot) {
    const P = C.personalities[def.look.pers];
    const max = C.rounds[G.round].patience * P.mult * (1 + 0.4 * G.ups.comfy);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'cust enter';
    el.innerHTML = '<div class="order">' + orderHTML(def.order) + '</div><div class="fig">' + TC.customerSVG(def.look, 0) + '</div><div class="pbar"><i></i></div>';
    const c = { def, look: def.look, order: def.order, P, slot, max, patience: max, mood: 0, state: 'wait', el,
      fig: el.querySelector('.fig'), pbar: el.querySelector('.pbar'), bar: el.querySelector('.pbar i') };
    slotEls[slot].appendChild(el);
    G.slots[slot] = c;
    say(c, P.greet);
    TC.audio.sfx('bell');
    return c;
  }

  function say(c, text) {
    const s = slotEls[c.slot];
    const old = s.querySelector('.speech'); if (old) old.remove();
    const b = document.createElement('div');
    b.className = 'speech'; b.textContent = text;
    b.addEventListener('animationend', () => b.remove());
    s.appendChild(b);
  }
  function pop(c, text, cls) {
    const p = document.createElement('div');
    p.className = 'pop ' + (cls || ''); p.textContent = text;
    p.addEventListener('animationend', () => p.remove());
    slotEls[c.slot].appendChild(p);
  }
  function coins(c) {
    for (let i = 0; i < 7; i++) {
      const k = document.createElement('div');
      k.className = 'coin';
      const a = Math.PI * (0.15 + 0.7 * Math.random()) + Math.PI;
      const r = 2.2 + Math.random() * 2;
      k.style.setProperty('--dx', (Math.cos(a) * r).toFixed(2) + 'rem');
      k.style.setProperty('--dy', (Math.sin(a) * r).toFixed(2) + 'rem');
      k.addEventListener('animationend', () => k.remove());
      slotEls[c.slot].appendChild(k);
    }
  }
  function leave(c, cls, ms) {
    c.state = 'leaving';
    if (G.pending === c) G.pending = null;
    c.el.classList.remove('enter', 'nope', 'tut', 'next');
    c.el.classList.add(cls);
    setTimeout(() => {
      c.el.remove();
      if (G.slots[c.slot] === c) G.slots[c.slot] = null;
    }, ms);
  }
  function nudge(el, cls) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 320);
  }

  function matches(c) {
    const cup = G.cup;
    return cup.drink === c.order.drink && cup.tops.length === c.order.tops.length &&
      c.order.tops.every((t) => cup.tops.indexOf(t) >= 0);
  }

  function clearPending() {
    if (G.pending) G.pending.el.classList.remove('next');
    G.pending = null;
  }

  function tapCustomer(c) {
    if (!G.playing || c.state !== 'wait') return;
    const cup = G.cup;
    if (!cup.drink) { nudge(cupEl, 'shake'); return; }
    if (!matches(c)) { say(c, 'Not mine!'); nudge(c.el, 'nope'); TC.audio.sfx('wrong'); return; }
    if (cup.brew < 1) {
      // Tap-ahead: remember the customer and serve the moment the brew is done.
      clearPending();
      G.pending = c; c.el.classList.add('next');
      TC.audio.sfx('queue');
      return;
    }
    serve(c);
  }

  function serve(c) {
    clearPending();
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* no haptics */ } }
    const tip = Math.round(C.maxTip * Math.max(0, c.patience / c.max));
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    const bonus = G.streak >= C.streakFrom ? C.streakBonus : 0;
    const pay = C.price + C.perTopping * c.order.tops.length + tip + 2 * G.ups.tip + bonus;
    G.cash += pay; G.earned += pay; G.served++;
    say(c, ['Yum!', 'Thanks!', 'So good!', 'Yesss!'][G.served % 4]);
    TC.audio.sfx('serve', G.streak);
    pop(c, 'Order up!');
    pop(c, '+$' + pay, 'cash');
    if (bonus) pop(c, '+bonus', 'bonus');
    coins(c);
    c.fig.innerHTML = TC.customerSVG(c.look, 0);
    leave(c, 'served', 760);
    resetCup();
    renderHud(true);
    if (G.tutorial) endTutorial();
  }

  function walkout(c) {
    G.walkouts++; G.streak = 0;
    TC.audio.sfx('walkout');
    say(c, "hmph… I'm out");
    leave(c, 'walk', 900);
  }

  // ---------- tutorial ----------
  function endTutorial() {
    G.tutorial = false;
    hand.hidden = true;
    store.set('tutorialSeen', '1');
  }
  function placeHand() {
    const c = G.slots.find((x) => x && x.state === 'wait');
    if (!c) { hand.hidden = true; return; }
    const cup = G.cup;
    let target = null;
    if (cup.drink !== c.order.drink) target = drinkBtns[c.order.drink];
    else {
      const miss = c.order.tops.find((t) => cup.tops.indexOf(t) < 0);
      const extra = cup.tops.find((t) => c.order.tops.indexOf(t) < 0);
      if (miss) target = topBtns[miss];
      else if (extra) target = topBtns[extra];
      else if (cup.brew >= 1) target = c.fig;
    }
    if (!target) { hand.hidden = true; return; }
    const r = target.getBoundingClientRect(), a = app.getBoundingClientRect();
    hand.style.left = (r.left + r.width / 2 - a.left) + 'px';
    hand.style.top = (r.top + r.height * 0.62 - a.top) + 'px';
    hand.hidden = false;
  }

  // ---------- rounds ----------
  function showBanner(text, ms) {
    banner.textContent = text;
    banner.hidden = false;
    banner.style.animation = 'none'; void banner.offsetWidth; banner.style.animation = '';
    banner.style.animationDuration = ms + 'ms';
    setTimeout(() => { banner.hidden = true; }, ms);
  }

  function startGame() {
    clearInterval(countdownTimer);
    daily = TC.buildDaily(TC.dateStr());
    Object.assign(G, {
      round: 0, cash: 0, earned: 0, spent: 0, served: 0, walkouts: 0, streak: 0, bestStreak: 0,
      ups: { comfy: 0, turbo: 0, tip: 0 }, slots: [null, null, null], tutorial: false, playing: false,
    });
    slotEls.forEach((s) => { s.innerHTML = ''; });
    G.pending = null;
    renderUps();
    TC.track('game_start', { daily: daily.num });
    overlay.hidden = true;
    startRound();
  }

  function startRound() {
    G.time = 0; G.q = 0; G.lastSpawn = -9;
    resetCup();
    renderHud();
    showBanner('Round ' + (G.round + 1), 1100);
    TC.audio.sfx('round', G.round + 1);
    TC.audio.music('r' + (G.round + 1));
    setTimeout(() => {
      G.playing = true;
      if (G.round === 0 && !store.get('tutorialSeen')) {
        // Guided first customer: clock and patience wait until the first serve.
        G.tutorial = true;
        const c = spawn(daily.rounds[0][G.q++], 1);
        c.el.classList.add('tut');
        G.lastSpawn = 0;
      }
    }, 1000);
  }

  function endRound() {
    G.playing = false;
    hand.hidden = true;
    G.slots.forEach((c) => { if (c && c.state === 'wait') leave(c, 'bye', 700); });
    resetCup();
    showBanner("Time's up!", 1000);
    TC.audio.sfx('timeup');
    setTimeout(() => {
      if (G.round < C.rounds.length - 1) showUpgrade();
      else showEnd();
    }, 1050);
  }

  function update(dt) {
    const cup = G.cup;
    if (cup.drink && cup.brew < 1) {
      cup.brew = Math.min(1, cup.brew + dt / brewTime());
      renderFill();
      if (cup.brew >= 1) {
        nudge(cupEl, 'ding');
        TC.audio.sfx('ready');
        const p = G.pending;
        if (p && p.state === 'wait' && matches(p)) serve(p);
      }
    }
    if (G.tutorial) return;

    const R = C.rounds[G.round];
    G.time += dt;

    // patience
    for (let i = 0; i < G.slots.length; i++) {
      const c = G.slots[i];
      if (!c || c.state !== 'wait') continue;
      c.patience -= dt;
      const f = Math.max(0, c.patience / c.max);
      c.bar.style.transform = 'scaleX(' + f.toFixed(3) + ')';
      const mood = f > 0.55 ? 0 : f > 0.25 ? 1 : 2;
      if (mood !== c.mood) {
        c.mood = mood;
        c.fig.innerHTML = TC.customerSVG(c.look, mood);
        c.pbar.className = 'pbar m' + mood;
        say(c, mood === 1 ? c.P.impatient : c.P.grumpy);
        TC.audio.sfx('impatient', mood);
      }
      if (c.patience <= 0) walkout(c);
    }

    // arrivals
    const list = daily.rounds[G.round];
    while (G.q < list.length && list[G.q].at <= G.time && G.time - G.lastSpawn >= 0.5 && R.len - G.time > 1.5) {
      const s = G.slots.indexOf(null);
      if (s < 0) break;
      spawn(list[G.q++], s);
      G.lastSpawn = G.time;
    }

    renderClock();
    if (G.time >= R.len) endRound();
  }

  function renderClock() {
    const R = C.rounds[G.round], left = Math.max(0, R.len - G.time);
    const t = String(Math.ceil(left));
    if (hudTime.textContent !== t) hudTime.textContent = t;
    tbar.style.transform = 'scaleX(' + (left / R.len).toFixed(3) + ')';
  }
  function renderHud(bump) {
    hudRound.textContent = 'Round ' + (G.round + 1) + '/' + C.rounds.length;
    hudCash.textContent = '$' + G.cash;
    if (bump) nudge(hudCash, 'bump');
    renderClock();
  }

  // ---------- screens ----------
  function show(html) {
    overlay.innerHTML = '<div class="card">' + html + '</div>';
    overlay.hidden = false;
  }
  function starsHTML(n) {
    return '<div class="stars">' + [0, 1, 2].map((i) => (i < n ? '<b>★</b>' : '★')).join('') + '</div>';
  }

  function showTitle() {
    TC.audio.music('lobby');
    daily = TC.buildDaily(TC.dateStr());
    const best = getBest(daily.ds);
    const heroes = daily.rounds[0].slice(0, 3).map((c) => TC.customerSVG(c.look, 0)).join('');
    show(
      '<div class="logo">Tap Café</div><div class="tagline">“Order up!”</div>' +
      '<div class="heroes">' + heroes + '</div>' +
      '<div class="daily">Daily #' + daily.num + ' · ' + TC.prettyDate(daily.ds) + '</div>' +
      '<div class="muted">' + (best ? 'Your best today: <b>$' + best.score + '</b>' : 'Make the drink. Tap the customer. Two minutes!') + '</div>' +
      '<div class="row"><button class="btn" id="bPlay" type="button">Play</button></div>' +
      '<div class="muted fine">Anonymous play stats help improve the game.</div>'
    );
    $('#bPlay').addEventListener('click', startGame);
  }

  function showUpgrade() {
    TC.audio.music('lobby');
    const offers = daily.offers[G.round];
    const cards = offers.map((k) => {
      const U = C.upgrades[k], own = G.ups[k];
      return '<button class="up" type="button" data-k="' + k + '"' + (G.cash < U.price ? ' disabled' : '') + '>' +
        '<span class="ico">' + U.ico + '</span><span class="nm">' + U.name + '</span><span class="ds">' + U.desc + '</span>' +
        '<span class="pr">$' + U.price + '</span><span class="own">' + (own ? 'You have ' + own : '') + '</span></button>';
    }).join('');
    show(
      '<div class="h2">Round ' + (G.round + 1) + ' done!</div>' +
      '<div class="muted">You have <b>$' + G.cash + '</b>. Buy one upgrade, or save your cash.</div>' +
      '<div class="ups">' + cards + '</div>' +
      '<div class="row"><button class="btn alt" id="bSkip" type="button">Skip</button></div>'
    );
    const next = () => { overlay.hidden = true; G.round++; startRound(); };
    overlay.querySelectorAll('.up').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k, U = C.upgrades[k];
      if (G.cash < U.price) return;
      G.cash -= U.price; G.spent += U.price; G.ups[k]++;
      TC.audio.sfx('buy');
      renderUps();
      next();
      setTimeout(() => showBanner(U.ico + ' ' + U.name + '!', 1000), 1150);
    }));
    $('#bSkip').addEventListener('click', next);
  }

  function countdownText() {
    const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let s = Math.max(0, Math.floor((mid - now) / 1000));
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const p = (n) => String(n).padStart(2, '0');
    return p(h) + ':' + p(m) + ':' + p(s);
  }

  function showEnd() {
    const score = G.earned, stars = TC.starsFor(score);
    TC.audio.music('lobby');
    TC.audio.sfx('fanfare', stars);
    TC.track('game_end', { daily: daily.num, score, stars, served: G.served, walkouts: G.walkouts });
    const prev = getBest(daily.ds);
    const isBest = !prev || score > prev.score;
    if (isBest) store.set('best.' + daily.ds, JSON.stringify({ score }));
    const best = isBest ? { score } : prev;
    show(
      '<div class="muted">Daily #' + daily.num + ' · you earned</div>' +
      '<div class="big">$' + score + '</div>' + starsHTML(stars) +
      '<div class="title-chip">' + C.titles[stars] + '</div>' +
      '<div class="stats"><div><b>' + G.served + '</b>served</div><div><b>' + G.walkouts + '</b>walkouts</div><div><b>' + G.bestStreak + '</b>best streak</div></div>' +
      '<div class="muted">Spent on upgrades: $' + G.spent + ' · ' + (isBest ? 'New best today!' : 'Best today: $' + best.score) + '</div>' +
      '<div class="row"><button class="btn alt" id="bAgain" type="button">Replay</button><button class="btn" id="bShare" type="button">Share</button></div>' +
      '<div class="row"><button class="btn alt sm" id="bHome" type="button">Home</button></div>' +
      '<div class="muted" style="margin-top:.8rem">Next challenge in <b id="cd">' + countdownText() + '</b></div>'
    );
    $('#bAgain').addEventListener('click', startGame);
    $('#bHome').addEventListener('click', () => { clearInterval(countdownTimer); showTitle(); });
    $('#bShare').addEventListener('click', () => { TC.track('share_open', { daily: daily.num }); showShare(best); });
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => { const e = $('#cd'); if (e) e.textContent = countdownText(); }, 1000);
  }

  async function showShare(best) {
    clearInterval(countdownTimer);
    const d = daily;
    show('<div class="h2">Share</div><div class="muted" id="shInfo">Drawing your card…</div><div id="shBody"></div>' +
      '<div class="toast" id="shToast"></div><div class="row"><button class="btn alt sm" id="bBack" type="button">Back</button></div>');
    $('#bBack').addEventListener('click', showTitle);
    const toast = (t) => { const e = $('#shToast'); if (e) e.textContent = t; };
    const text = TC.shareText(d, best);
    let cv, blob, file;
    try {
      cv = await TC.drawShareCard(d, best);
      blob = await TC.canvasBlob(cv);
      file = new File([blob], 'tap-cafe-' + d.num + '.png', { type: 'image/png' });
    } catch (e) { /* picture failed: text backup still works */ }
    const body = $('#shBody'); if (!body) return;
    const canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }) && TC.isPublicSite());
    const canCopyPic = !!(blob && navigator.clipboard && window.ClipboardItem);
    $('#shInfo').textContent = !cv ? 'Could not draw the picture here. You can still copy the text.' :
      canShareFile ? 'Send your card to friends.' : 'Press and hold the picture to save or share it.';
    body.innerHTML = (cv ? '<img class="sharepic" alt="Tap Café share card" src="' + cv.toDataURL('image/png') + '">' : '') +
      '<div class="row">' +
      (canShareFile ? '<button class="btn sm" id="bPic" type="button">Share picture</button>' :
        canCopyPic ? '<button class="btn sm" id="bPic" type="button">Copy picture</button>' : '') +
      '<button class="btn alt sm" id="bText" type="button">Copy text</button></div>';
    const bPic = $('#bPic');
    if (bPic) bPic.addEventListener('click', async () => {
      try {
        if (canShareFile) await navigator.share({ files: [file], text });
        else { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Picture copied!'); }
      } catch (e) { if (e && e.name !== 'AbortError') toast('That did not work here. Press and hold the picture instead.'); }
    });
    $('#bText').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); toast('Text copied!'); }
      catch (e) { window.prompt('Copy this:', text); }
    });
  }

  // ---------- main loop (pauses while the tab is hidden) ----------
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts;
    if (document.hidden) return;
    if (G.playing) {
      update(dt);
      if (G.tutorial) placeHand();
    }
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  const muteBtn = $('#mute');
  const paintMute = () => { muteBtn.textContent = TC.audio.isMuted() ? '🔇' : '🔊'; };
  muteBtn.addEventListener('click', () => { TC.audio.unlock(); TC.audio.toggleMute(); paintMute(); });
  paintMute();
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.btn')) TC.audio.sfx('tap'); });

  buildStations();
  Object.assign(G, { round: 0, cash: 0, time: 0, ups: { comfy: 0, turbo: 0, tip: 0 }, slots: [null, null, null], cup: { drink: null, tops: [], brew: 0 } });
  renderHud();
  showTitle();
  requestAnimationFrame(frame);
})();
