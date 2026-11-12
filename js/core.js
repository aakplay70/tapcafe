/* Tap Café — config, seeded random, and all the SVG art. */
(function () {
  'use strict';
  const TC = (window.TC = {});

  // ---------- Tuning numbers (all in one place) ----------
  TC.CFG = {
    epoch: '2026-11-11', // Daily #1
    rounds: [
      { len: 25, gap: [2.9, 3.9], patience: 17, tops: [0.55, 0.45, 0, 0] },
      { len: 40, gap: [2.2, 3.0], patience: 14, tops: [0.20, 0.45, 0.30, 0.05] },
      { len: 40, gap: [1.7, 2.4], patience: 12, tops: [0.05, 0.30, 0.45, 0.20] },
    ],
    maxCustomers: 3,
    firstArrival: 0.4,
    secondGap: 1.0,
    brew: 1.1,
    price: 5,
    perTopping: 1,
    maxTip: 4,
    streakFrom: 3,
    streakBonus: 2,
    upgrades: {
      comfy: { name: 'Comfy seats', price: 15, ico: '🛋️', desc: 'Customers wait 40% longer' },
      turbo: { name: 'Turbo machine', price: 20, ico: '⚡', desc: 'Drinks brew twice as fast' },
      tip: { name: 'Tip jar', price: 25, ico: '🫙', desc: '+$2 on every order' },
    },
    stars: [60, 140, 230],
    titles: ['Boba Newbie', 'Pearl Pal', 'Taro Pro', 'Boba Boss'],
    personalities: {
      chill: { mult: 1.25, greet: 'Heyyy~', impatient: 'Sooo… any update?', grumpy: 'Still vibing… barely.' },
      sleepy: { mult: 1.10, greet: '*yawn* hi…', impatient: 'zzz… huh?', grumpy: 'So… sleepy…' },
      dramatic: { mult: 0.90, greet: 'At last, boba!', impatient: 'This is a tragedy!', grumpy: 'I am wilting!' },
      busy: { mult: 0.85, greet: 'Quick one, pls!', impatient: 'My bus is coming!', grumpy: 'Tick tock, friend!' },
      hyper: { mult: 0.80, greet: 'BOBA TIME!!', impatient: 'HURRY UP!!', grumpy: "I'M GONNA POP!!" },
    },
  };

  TC.DRINKS = ['milk', 'taro', 'mango'];
  TC.DRINK_INFO = {
    milk: { name: 'Milk tea', col: '#A87650' },
    taro: { name: 'Taro', col: '#B79AE0' },
    mango: { name: 'Mango', col: '#FFB830' },
  };
  // A small symbol on each cup, so drinks are not told apart by colour alone.
  const MARKS = {
    milk: '<path d="M50 59 C58 62 58 72 50 77 C42 72 42 62 50 59 Z M50 62 V75" fill="#7BC47F" stroke="#4A2B3D" stroke-width="1.6" stroke-linejoin="round"/>',
    taro: '<path d="M50 76 C40 69 42 60 47 60 C49 60 50 62 50 63 C50 62 51 60 53 60 C58 60 60 69 50 76 Z" fill="#8E6BD6" stroke="#4A2B3D" stroke-width="1.6" stroke-linejoin="round"/>',
    mango: '<path d="M50 58.5 l2.6 5.6 6.1 .7 -4.5 4.2 1.2 6 -5.4 -3 -5.4 3 1.2 -6 -4.5 -4.2 6.1 -.7z" fill="#FF8A3D" stroke="#4A2B3D" stroke-width="1.6" stroke-linejoin="round"/>',
  };
  TC.drinkMark = function (d) {
    return d ? '<circle cx="50" cy="68" r="12" fill="#fff" stroke="#4A2B3D" stroke-width="2"/>' + MARKS[d] : '';
  };
  TC.TOPS = ['pearls', 'jelly', 'popping'];
  TC.TOP_INFO = {
    pearls: { name: 'Pearls' },
    jelly: { name: 'Jelly' },
    popping: { name: 'Popping' },
  };

  // ---------- Seeded random ----------
  TC.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  TC.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---------- Colour helpers ----------
  const INK = '#4A2B3D';
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------- Cups and toppings ----------
  let uid = 0;
  const CUP_BODY = 'M24 34 H76 L69 110 Q68.5 115 64 115 H36 Q31.5 115 31 110 Z';
  const PEARL_POS = [[38, 108], [47, 109], [56, 108], [64, 107], [42, 101], [52, 102], [61, 100]];
  const JELLY_POS = [[36, 91], [50, 93], [62, 90], [43, 84], [57, 83]];
  const POP_POS = [[40, 76], [51, 73], [61, 77], [45, 67], [56, 65]];

  function topInCup(t) {
    if (t === 'pearls') return PEARL_POS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.3" fill="#3B2418"/><circle cx="${x - 1.3}" cy="${y - 1.4}" r="1.1" fill="#8A6A58"/>`).join('');
    if (t === 'jelly') return JELLY_POS.map(([x, y], i) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.6" fill="#9BE15D" stroke="#5FA82E" stroke-width="1.2" transform="rotate(${i * 23 - 20} ${x} ${y})"/>`).join('');
    return POP_POS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#FF8A5B" stroke="#E0562A" stroke-width="1"/><circle cx="${x - 1.2}" cy="${y - 1.4}" r="1.3" fill="#FFE1D3"/>`).join('');
  }

  // A cup. `live` adds hooks so the work-area cup can be updated in place.
  TC.cupSVG = function (drink, tops, fill, live) {
    const id = 'cc' + (++uid);
    const col = drink ? TC.DRINK_INFO[drink].col : '#fff';
    const h = 72 * (fill == null ? 1 : fill);
    const tg = TC.TOPS.map((t) => {
      const on = tops && tops.indexOf(t) >= 0;
      if (!live && !on) return '';
      return `<g class="tg" data-t="${t}"${on ? '' : ' style="display:none"'}>${topInCup(t)}</g>`;
    }).join('');
    return `<svg viewBox="0 0 100 120" class="cupsvg">
<defs><clipPath id="${id}"><path d="${CUP_BODY}"/></clipPath></defs>
<rect x="55" y="2" width="7" height="74" rx="3.5" transform="rotate(10 58 40)" fill="#F7A8C0" stroke="${INK}" stroke-width="2"/>
<path d="${CUP_BODY}" fill="#fff" fill-opacity=".8"/>
<g clip-path="url(#${id})">
<rect class="liq" x="20" width="60" y="${115 - h}" height="${h}" fill="${col}"/>
<rect class="foam" x="20" width="60" y="${115 - h}" height="4" fill="#fff" fill-opacity=".45"/>
${tg}
<rect x="31" y="40" width="5" height="60" rx="2.5" fill="#fff" fill-opacity=".5" transform="rotate(-5 33 70)"/>
</g>
<path d="${CUP_BODY}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<g class="mark">${TC.drinkMark(drink)}</g>
<path d="M22 32 Q50 12 78 32 Z" fill="#fff" fill-opacity=".85" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<rect x="18" y="30" width="64" height="7" rx="3.5" fill="#fff" stroke="${INK}" stroke-width="3"/>
</svg>`;
  };

  TC.topIcon = function (t) {
    let inner;
    if (t === 'pearls') {
      inner = [[8, 9], [16, 9], [12, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#3B2418" stroke="${INK}" stroke-width="1"/><circle cx="${x - 1.3}" cy="${y - 1.4}" r="1.1" fill="#8A6A58"/>`).join('');
    } else if (t === 'jelly') {
      inner = `<rect x="3.5" y="9" width="10" height="10" rx="2" fill="#9BE15D" stroke="${INK}" stroke-width="1.4" transform="rotate(-12 8 14)"/><rect x="11.5" y="4.5" width="9.5" height="9.5" rx="2" fill="#B9F07F" stroke="${INK}" stroke-width="1.4" transform="rotate(14 16 9)"/>`;
    } else {
      inner = `<circle cx="9.5" cy="13.5" r="6" fill="#FF8A5B" stroke="${INK}" stroke-width="1.4"/><circle cx="7.6" cy="11.4" r="1.8" fill="#FFE1D3"/><circle cx="17.5" cy="7.5" r="3.6" fill="#FFB14A" stroke="${INK}" stroke-width="1.3"/><circle cx="16.5" cy="6.4" r="1" fill="#FFF0D6"/><path d="M19 15 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z" fill="#F7A8C0"/>`;
    }
    return `<svg viewBox="0 0 24 24" class="otop">${inner}</svg>`;
  };

  // ---------- Customers ----------
  const SKIN = ['#FFE0C7', '#F6C9A4', '#E2A77C', '#C68658', '#9C6240', '#70442B'];
  const HAIR_NAT = ['#2B1B17', '#4A2F23', '#7A4A2A', '#B07A3C', '#E3C06D', '#1C1C24'];
  const HAIR_DYE = ['#FF6FA5', '#7C6BFF', '#3CC8C0', '#F4F1EA', '#FF8A3D', '#5BB8FF'];
  const CLOTH = ['#FF8FB1', '#7ED6C1', '#FFD166', '#8FA8FF', '#C39BFF', '#FF9F6B', '#F4F1EA', '#3E3A52', '#6CC5F0'];
  const LIPS = ['#E8476A', '#C2385B', '#A84A7A', '#F0705A'];
  const HAIRS = ['short', 'long', 'topknot', 'buns', 'bob', 'curly', 'spiky', 'ponytail', 'buzz', 'quiff'];
  const HAIRS_HAT = ['short', 'long', 'bob', 'curly', 'buzz', 'ponytail'];
  const HEADS = ['none', 'none', 'none', 'hp_on', 'hp_neck', 'beanie', 'cap', 'shades_on', 'shades_up', 'glasses'];

  TC.makeLook = function (rng) {
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const chance = (p) => rng() < p;
    const head = pick(HEADS);
    const hat = head === 'beanie' || head === 'cap';
    const dyed = chance(0.3);
    const outfitCol = pick(CLOTH);
    return {
      skin: pick(SKIN),
      jaw: pick(['soft', 'pointed', 'square']),
      hair: pick(hat ? HAIRS_HAT : HAIRS),
      hairCol: dyed ? pick(HAIR_DYE) : pick(HAIR_NAT),
      streak: !dyed && chance(0.25) ? pick(HAIR_DYE) : null,
      eyes: pick(['almond', 'winged', 'hooded', 'sleepy']),
      mouth: pick(['smile', 'grin', 'smirk', 'lips']),
      lipCol: pick(LIPS),
      freckles: chance(0.25),
      outfit: pick(['tee', 'hoodie', 'jacket', 'collared']),
      outfitCol,
      outfitCol2: pick(CLOTH.filter((c) => c !== outfitCol)),
      chain: chance(0.25),
      earrings: chance(0.35),
      nosering: chance(0.15),
      head,
      headCol: pick(CLOTH),
      pers: pick(Object.keys(TC.CFG.personalities)),
    };
  };

  const JAW = { soft: [78, 72], pointed: [74, 66], square: [82, 78] };

  function hairBack(L) {
    const c = L.hairCol, s = `fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    switch (L.hair) {
      case 'long': return `<path d="M32 58 C28 18 92 18 88 58 L93 112 C82 118 74 106 73 96 L47 96 C46 106 38 118 27 112 Z" ${s}/>`;
      case 'bob': return `<path d="M33 58 C29 20 91 20 87 58 L90 84 C85 91 78 89 76 82 L44 82 C42 89 35 91 30 84 Z" ${s}/>`;
      case 'ponytail': return `<path d="M76 30 C96 18 108 40 99 60 C97 72 89 76 87 66 C92 52 88 40 76 38 Z" ${s}/>`;
      case 'buns': return `<circle cx="36" cy="27" r="11" ${s}/><circle cx="84" cy="27" r="11" ${s}/>`;
      case 'topknot': return `<circle cx="60" cy="19" r="11" ${s}/>`;
      case 'curly': return [[36, 44], [31, 58], [41, 32], [52, 24], [68, 24], [79, 32], [84, 44], [89, 58], [34, 71], [86, 71]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" ${s}/>`).join('');
      default: return '';
    }
  }

  function hairFront(L) {
    const c = L.hairCol, s = `fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    let d;
    switch (L.hair) {
      case 'short': d = 'M35 58 C31 18 89 18 85 58 C83 48 78 42 72 40 C60 46 46 44 40 40 C37 46 36 52 35 58 Z'; break;
      case 'long': d = 'M34 62 C30 18 90 18 86 62 C84 50 76 38 60 34 C44 38 36 50 34 62 Z'; break;
      case 'bob': d = 'M34 60 C30 18 90 18 86 60 L84 46 L36 46 Z'; break;
      case 'spiky': d = 'M35 56 L32 34 L42 40 L44 21 L54 33 L60 14 L68 31 L78 19 L78 38 L89 32 L85 56 C82 44 72 38 60 38 C48 38 38 44 35 56 Z'; break;
      case 'buzz': return `<path d="M36.5 56 C33 21 87 21 83.5 56 C82 44 74 36 60 36 C46 36 38 44 36.5 56 Z" fill="${c}" fill-opacity=".85" stroke="${INK}" stroke-width="2"/>`;
      case 'quiff': d = 'M35 58 C33 30 40 24 50 24 C54 10 82 10 86 34 C88 44 86 52 85 58 C82 46 76 40 66 40 C56 42 42 40 35 58 Z'; break;
      case 'curly': return `<path d="M35 56 C31 18 89 18 85 56 C82 42 72 34 60 34 C48 34 38 42 35 56 Z" fill="${c}"/>` +
        [[37, 45], [43, 36], [53, 31], [64, 30], [75, 34], [82, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" ${s}/>`).join('');
      default: d = 'M35 56 C31 18 89 18 85 56 C82 42 72 34 60 34 C48 34 38 42 35 56 Z';
    }
    return `<path d="${d}" ${s}/>`;
  }

  function eye(L, cx, outer) {
    const cy = 62;
    const base = `<ellipse cx="${cx}" cy="${cy}" rx="5.4" ry="4" fill="#fff"/><circle cx="${cx}" cy="${cy + 0.3}" r="3.1" fill="#3A2A22"/><circle cx="${cx + 1.1}" cy="${cy - 1}" r="1" fill="#fff"/>`;
    const lid = (w) => `<path d="M${cx - 5.8} ${cy - 0.4} Q${cx} ${cy - 5.6} ${cx + 5.8} ${cy - 0.4}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
    const cover = (y) => `<path d="M${cx - 6.5} ${cy - 6} H${cx + 6.5} V${y} H${cx - 6.5} Z" fill="${L.skin}"/><path d="M${cx - 5.8} ${y} H${cx + 5.8}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    if (L.eyes === 'winged') return base + lid(2) + `<path d="M${cx + outer * 5.6} ${cy - 0.6} L${cx + outer * 9} ${cy - 3.8}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    if (L.eyes === 'hooded') return base + cover(cy - 1.8);
    if (L.eyes === 'sleepy') return base + cover(cy - 0.2);
    return base + lid(1.8);
  }

  function brows(L, mood) {
    const col = shade(L.hairCol, -40) === '#000000' ? INK : INK;
    const p = (d) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (mood === 1) return p('M43 51.5 Q48 47.5 55 47.5') + p('M77 51.5 Q72 47.5 65 47.5');
    if (mood === 2) return p('M43 49.5 L55 54.5') + p('M77 49.5 L65 54.5');
    return p('M43 54 Q49 50.5 55 53.5') + p('M77 54 Q71 50.5 65 53.5');
  }

  function mouth(L, mood) {
    const lips = L.mouth === 'lips';
    const col = lips ? L.lipCol : INK;
    const line = (d) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${lips ? 3 : 2.2}" stroke-linecap="round"/>`;
    if (mood === 1) return line('M55 77.5 Q57.5 75.5 60 77.5 Q62.5 79.5 65 77.5');
    if (mood === 2) return line('M53 79.5 Q60 72.5 67 79.5');
    switch (L.mouth) {
      case 'grin': return `<path d="M52 73.5 Q60 84 68 73.5 Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      case 'smirk': return line('M54 76.5 Q62 79.5 67 72.5');
      case 'lips': return `<path d="M53 75 Q60 82.5 67 75 Q60 77.5 53 75 Z" fill="${L.lipCol}" stroke="${shade(L.lipCol, -40)}" stroke-width="1.6" stroke-linejoin="round"/>`;
      default: return line('M53 74.5 Q60 81.5 67 74.5');
    }
  }

  function body(L) {
    const c = L.outfitCol, c2 = L.outfitCol2;
    const sh = 'M16 150 C16 116 32 104 50 100 L70 100 C88 104 104 116 104 150 Z';
    const st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    const neck = `<path d="M52 80 L52 101 Q60 108 68 101 L68 80 Z" fill="${shade(L.skin, -22)}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    let pre = '', b = '';
    switch (L.outfit) {
      case 'hoodie':
        pre = `<ellipse cx="60" cy="97" rx="31" ry="15" fill="${shade(c, -28)}" ${st}/>`;
        b = `<path d="${sh}" fill="${c}" ${st}/>${neck}<path d="M49 100 L60 113 L71 100" fill="none" ${st}/><path d="M55 108 V124 M65 108 V124" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
        break;
      case 'jacket':
        b = `<path d="${sh}" fill="${c2}" ${st}/>${neck}<path d="M50 100 Q60 111 70 100" fill="none" ${st}/>` +
          `<path d="M16 150 C16 116 32 104 50 100 L53 150 Z" fill="${c}" ${st}/><path d="M104 150 C104 116 88 104 70 100 L67 150 Z" fill="${c}" ${st}/>`;
        break;
      case 'collared':
        b = `<path d="${sh}" fill="${c}" ${st}/>${neck}<path d="M50 99 L60 109 L52 116 L45 103 Z" fill="${shade(c, 45)}" ${st}/><path d="M70 99 L60 109 L68 116 L75 103 Z" fill="${shade(c, 45)}" ${st}/>` +
          `<circle cx="60" cy="122" r="1.6" fill="${INK}"/><circle cx="60" cy="133" r="1.6" fill="${INK}"/>`;
        break;
      default:
        b = `<path d="${sh}" fill="${c}" ${st}/>${neck}<path d="M49 100 Q60 113 71 100" fill="none" ${st}/>`;
    }
    return pre + b;
  }

  function headpiece(L) {
    const c = L.headCol, st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    switch (L.head) {
      case 'hp_on': return `<path d="M35 60 C32 12 88 12 85 60" fill="none" stroke="#3E3A52" stroke-width="5.5" stroke-linecap="round"/><rect x="28" y="51" width="11" height="20" rx="5.5" fill="${c}" ${st}/><rect x="81" y="51" width="11" height="20" rx="5.5" fill="${c}" ${st}/>`;
      case 'beanie': return `<path d="M33 48 C31 10 89 10 87 48 Z" fill="${c}" ${st}/><rect x="30" y="41" width="60" height="11" rx="5.5" fill="${shade(c, -30)}" ${st}/>`;
      case 'cap': return `<path d="M34 46 C34 12 86 12 86 46 Z" fill="${c}" ${st}/><path d="M32 43 H88 Q95 51 86 52 H34 Q25 51 32 43 Z" fill="${shade(c, -30)}" ${st}/>`;
      case 'shades_on': return `<rect x="41" y="56.5" width="16" height="11" rx="4.5" fill="#2B2535" ${st}/><rect x="63" y="56.5" width="16" height="11" rx="4.5" fill="#2B2535" ${st}/><path d="M57 60 H63" ${st}/><path d="M44 59.5 L48 59.5 M66 59.5 L70 59.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'shades_up': return `<rect x="41" y="29" width="16" height="10" rx="4.5" fill="#2B2535" ${st}/><rect x="63" y="29" width="16" height="10" rx="4.5" fill="#2B2535" ${st}/><path d="M57 33 H63" ${st}/>`;
      case 'glasses': return `<circle cx="49" cy="62" r="7.4" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="2"/><circle cx="71" cy="62" r="7.4" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="2"/><path d="M56.4 61 H63.6" stroke="${INK}" stroke-width="2"/>`;
      default: return '';
    }
  }

  // mood: 0 happy, 1 worried, 2 angry
  TC.customerSVG = function (L, mood) {
    mood = mood || 0;
    const [a, b] = JAW[L.jaw];
    const st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    const headPath = `M38 56 C38 22 82 22 82 56 L82 64 C82 ${a} ${b} 87 60 87 C${120 - b} 87 38 ${a} 38 64 Z`;
    const p = [];
    p.push(hairBack(L));
    p.push(body(L));
    if (L.chain) p.push(`<path d="M50 105 Q60 122 70 105" fill="none" stroke="#F2B632" stroke-width="2.4" stroke-linecap="round"/>`);
    if (L.head === 'hp_neck') p.push(`<path d="M44 100 Q60 118 76 100" fill="none" stroke="#3E3A52" stroke-width="5.5" stroke-linecap="round"/><rect x="36" y="92" width="11" height="17" rx="5.5" fill="${L.headCol}" ${st}/><rect x="73" y="92" width="11" height="17" rx="5.5" fill="${L.headCol}" ${st}/>`);
    p.push(`<ellipse cx="37.5" cy="63" rx="4.5" ry="6.5" fill="${L.skin}" ${st}/><ellipse cx="82.5" cy="63" rx="4.5" ry="6.5" fill="${L.skin}" ${st}/>`);
    p.push(`<path d="${headPath}" fill="${L.skin}" ${st}/>`);
    p.push(`<ellipse cx="44.5" cy="71" rx="5" ry="3" fill="${mood === 2 ? '#FF5C6C' : '#FF8FA3'}" fill-opacity="${mood === 2 ? 0.6 : 0.4}"/><ellipse cx="75.5" cy="71" rx="5" ry="3" fill="${mood === 2 ? '#FF5C6C' : '#FF8FA3'}" fill-opacity="${mood === 2 ? 0.6 : 0.4}"/>`);
    if (L.freckles) p.push([[43, 68], [46, 69.5], [41.5, 71], [77, 68], [74, 69.5], [78.5, 71]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${shade(L.skin, -55)}"/>`).join(''));
    if (L.head !== 'shades_on') p.push(eye(L, 49, -1) + eye(L, 71, 1));
    p.push(brows(L, mood));
    p.push(`<path d="M60 65.5 L58.6 69.6 L61 70.2" fill="none" stroke="${shade(L.skin, -60)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (L.nosering) p.push(`<path d="M61 70.2 a1.7 1.7 0 1 0 2.2 -1.6" fill="none" stroke="#F2B632" stroke-width="1.3"/>`);
    p.push(mouth(L, mood));
    p.push(hairFront(L));
    if (L.streak) p.push(`<path d="M67 23 C73 27 79 35 81 45" fill="none" stroke="${L.streak}" stroke-width="4" stroke-linecap="round"/>`);
    p.push(headpiece(L));
    if (L.earrings) p.push(`<circle cx="36.5" cy="71" r="2.2" fill="#F2B632" stroke="${INK}" stroke-width="1"/><circle cx="83.5" cy="71" r="2.2" fill="#F2B632" stroke="${INK}" stroke-width="1"/>`);
    if (mood === 1) p.push(`<path class="sweat" d="M93 44 Q98 53 93 55.5 Q88 53 93 44 Z" fill="#7CC8FF" stroke="${INK}" stroke-width="1.5"/>`);
    if (mood === 2) p.push(`<g class="steam" fill="#fff" stroke="${INK}" stroke-width="1.6"><circle cx="97" cy="26" r="5.5"/><circle cx="104" cy="21" r="4.5"/><circle cx="102" cy="30" r="4"/></g><g class="steam" fill="#fff" stroke="${INK}" stroke-width="1.6" style="animation-delay:.5s"><circle cx="23" cy="26" r="5.5"/><circle cx="16" cy="21" r="4.5"/><circle cx="18" cy="30" r="4"/></g>`);
    return `<svg viewBox="0 0 120 150" class="custsvg">${p.join('')}</svg>`;
  };

  // ---------- Daily lineup ----------
  TC.dateStr = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  TC.dailyNum = function (ds) {
    const [y, m, d] = ds.split('-').map(Number);
    const [ey, em, ed] = TC.CFG.epoch.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ey, em - 1, ed)) / 864e5) + 1;
  };
  TC.prettyDate = function (ds) {
    const [y, m, d] = ds.split('-').map(Number);
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] + ' ' + d + ', ' + y;
  };

  // Same customers, orders and upgrade offers for everyone on a given date.
  TC.buildDaily = function (ds) {
    const C = TC.CFG, seed = TC.hash('tapcafe:' + ds);
    const rounds = C.rounds.map((R, ri) => {
      const rng = TC.rng(seed + (ri + 1) * 1013);
      const list = [];
      let t = C.firstArrival;
      const n = Math.ceil(R.len / R.gap[0]) + 4;
      for (let i = 0; i < n; i++) {
        if (i === 1) t += C.secondGap;
        else if (i > 1) t += R.gap[0] + rng() * (R.gap[1] - R.gap[0]);
        const look = TC.makeLook(rng);
        let r = rng(), nt = 0;
        while (nt < 3 && r >= R.tops[nt]) { r -= R.tops[nt]; nt++; }
        const pool = TC.TOPS.slice();
        for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
        const tops = TC.TOPS.filter((x) => pool.slice(0, nt).indexOf(x) >= 0);
        const drink = TC.DRINKS[Math.floor(rng() * 3)];
        list.push({ at: t, look, order: { drink, tops } });
      }
      return list;
    });
    const urng = TC.rng(seed + 7777);
    const keys = Object.keys(C.upgrades);
    const offers = [0, 1].map(() => { const drop = Math.floor(urng() * 3); return keys.filter((_, i) => i !== drop); });
    return { ds, num: TC.dailyNum(ds), rounds, offers };
  };

  TC.starsFor = function (score) {
    return TC.CFG.stars.filter((s) => score >= s).length;
  };
})();

