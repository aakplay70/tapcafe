/* Tap Café — anonymous play stats via Firebase / Google Analytics.
   Only loads on the Firebase-hosted site (it uses Hosting's built-in config), so local
   play and the GitHub copy send nothing. Does nothing if Do Not Track is on. */
(function () {
  'use strict';
  const TC = window.TC || (window.TC = {});
  const queue = [];
  let ready = false;

  TC.track = function (name, params) {
    try {
      if (ready) window.firebase.analytics().logEvent(name, params || {});
      else if (queue.length < 30) queue.push([name, params]);
    } catch (e) { /* analytics must never break the game */ }
  };

  const host = location.hostname;
  const onFirebase = /\.(web\.app|firebaseapp\.com)$/.test(host);
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';
  if (!onFirebase || dnt) return;

  const V = '10.14.1';
  function load(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = false; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  load('/__/firebase/' + V + '/firebase-app-compat.js')
    .then(() => load('/__/firebase/' + V + '/firebase-analytics-compat.js'))
    .then(() => load('/__/firebase/init.js'))
    .then(() => {
      // init.js only has a measurement ID once Google Analytics is enabled on the project.
      if (!window.firebase || !window.firebase.apps.length || !window.firebase.app().options.measurementId) return;
      ready = true;
      queue.splice(0).forEach((q) => TC.track(q[0], q[1]));
    })
    .catch(() => { /* offline or blocked: ignore */ });
})();
