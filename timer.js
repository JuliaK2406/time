// Screen 2: the countdown with the mosaic.
// The timer counts from the moment it must end (Date.now() plus what is left), so it stays
// right when the tab sits in the background during a Zoom call and its timers are slowed.
(function () {
  'use strict';

  var TILE_COUNT = 40; // 8 x 5
  var MIN_MINUTES = 1;
  var MAX_MINUTES = 120;
  var DEFAULT_MINUTES = 5;
  var TILE_ALPHAS = [0.22, 0.32, 0.45, 0.55, 0.7, 0.8, 0.9, 1];
  var CHAMPAGNE_TILES = 2;

  var root = document.documentElement;
  var digitsEl = document.getElementById('digits');
  var mosaicEl = document.getElementById('mosaic');
  var toggleBtn = document.getElementById('toggle');
  var resetBtn = document.getElementById('reset');
  var fullscreenBtn = document.getElementById('fullscreen');
  var customInput = document.getElementById('custom');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));

  var tiles = [];
  var order = [];        // the shuffled order in which the tiles come in
  var shown = 0;         // how many tiles are on the screen now
  var durationMs = 0;
  var remainingMs = 0;   // what is left while idle or paused
  var endAt = 0;         // the moment the running timer ends
  var status = 'idle';   // idle | running | paused | done
  var loopId = null;

  // ---------- mosaic ----------

  function shuffled(count) {
    var list = [];
    for (var i = 0; i < count; i++) list.push(i);
    for (var j = count - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = list[j];
      list[j] = list[k];
      list[k] = tmp;
    }
    return list;
  }

  function buildTiles() {
    for (var i = 0; i < TILE_COUNT; i++) {
      var tile = document.createElement('span');
      tile.className = 'tile';
      mosaicEl.appendChild(tile);
      tiles.push(tile);
    }
  }

  // Empties the mosaic and deals a new order and new shades for the next run.
  function clearMosaic() {
    var champagne = shuffled(TILE_COUNT).slice(0, CHAMPAGNE_TILES);
    tiles.forEach(function (tile, index) {
      tile.classList.remove('is-on');
      if (champagne.indexOf(index) !== -1) {
        tile.style.background = 'var(--champagne)';
      } else {
        var alpha = TILE_ALPHAS[Math.floor(Math.random() * TILE_ALPHAS.length)];
        tile.style.background = 'rgba(var(--aubergine-rgb), ' + alpha + ')';
      }
    });
    order = shuffled(TILE_COUNT);
    shown = 0;
  }

  function showTiles(count) {
    while (shown < count) {
      tiles[order[shown]].classList.add('is-on');
      shown++;
    }
  }

  // ---------- timer ----------

  function leftNow() {
    return status === 'running' ? Math.max(0, endAt - Date.now()) : remainingMs;
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function render() {
    var left = leftNow();
    if (status === 'running' && left <= 0) {
      status = 'done';
      remainingMs = 0;
      stopLoop();
    }

    var seconds = Math.ceil(left / 1000);
    var text = pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60);
    if (digitsEl.textContent !== text) digitsEl.textContent = text;

    // Tile number 40 comes in exactly at 00:00.
    var done = status === 'done';
    showTiles(done ? TILE_COUNT : Math.floor(((durationMs - left) / durationMs) * TILE_COUNT));

    var label = status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';
    if (toggleBtn.textContent !== label) toggleBtn.textContent = label;
    toggleBtn.disabled = done;
    if (root.getAttribute('data-state') !== status) root.setAttribute('data-state', status);
  }

  function startLoop() {
    stopLoop();
    loopId = setInterval(render, 100);
  }

  function stopLoop() {
    if (loopId !== null) clearInterval(loopId);
    loopId = null;
  }

  function start() {
    if (status !== 'idle' && status !== 'paused') return;
    endAt = Date.now() + remainingMs;
    status = 'running';
    startLoop();
    render();
  }

  function pause() {
    if (status !== 'running') return;
    remainingMs = Math.max(0, endAt - Date.now());
    status = 'paused';
    stopLoop();
    render();
  }

  function toggle() {
    if (status === 'running') pause();
    else start();
  }

  function reset() {
    stopLoop();
    status = 'idle';
    remainingMs = durationMs;
    clearMosaic();
    render();
  }

  // ---------- duration ----------

  // Whole minutes from 1 to 120, or null when the text is not a number.
  function toMinutes(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return null;
    return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
  }

  function setMinutes(minutes) {
    durationMs = minutes * 60000;
    var onChip = false;
    chips.forEach(function (chip) {
      var match = Number(chip.getAttribute('data-min')) === minutes;
      chip.setAttribute('aria-pressed', match ? 'true' : 'false');
      if (match) onChip = true;
    });
    customInput.value = onChip ? '' : String(minutes);
    reset();
  }

  function applyCustom() {
    var minutes = toMinutes(customInput.value);
    if (minutes === null) {
      customInput.value = '';
      return;
    }
    setMinutes(minutes);
  }

  // ---------- full screen ----------

  var requestFull = root.requestFullscreen || root.webkitRequestFullscreen;
  var exitFull = document.exitFullscreen || document.webkitExitFullscreen;

  function fullscreenNow() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function toggleFullscreen() {
    if (!requestFull) return;
    var result = fullscreenNow() ? exitFull.call(document) : requestFull.call(root);
    if (result && result.catch) result.catch(function () {});
  }

  function syncFullscreen() {
    root.classList.toggle('is-fullscreen', !!fullscreenNow());
  }

  // ---------- wiring ----------

  function isTyping(target) {
    return target === customInput;
  }

  toggleBtn.addEventListener('click', toggle);
  resetBtn.addEventListener('click', reset);
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  if (!requestFull) fullscreenBtn.hidden = true;

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      setMinutes(Number(chip.getAttribute('data-min')));
    });
  });

  customInput.addEventListener('change', applyCustom);
  customInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') customInput.blur(); // blur fires "change" and frees the keys
  });

  // Keys go by the physical key (event.code), so they also work on a Russian layout.
  document.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
    var key = (event.key || '').toLowerCase();
    if (event.code === 'Space' || key === ' ') {
      event.preventDefault(); // no page scroll, no second click on a focused button
      if (!event.repeat) toggle();
    } else if (event.code === 'KeyR' || key === 'r') {
      if (!event.repeat) reset();
    } else if (event.code === 'KeyF' || key === 'f') {
      if (!event.repeat) toggleFullscreen();
    }
  });

  // A focused button would also click itself when the space bar goes up.
  document.addEventListener('keyup', function (event) {
    if ((event.code === 'Space' || event.key === ' ') && !isTyping(event.target)) event.preventDefault();
  });

  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) render();
  });

  // ---------- start: timer.html?min=5 sets five minutes ----------

  buildTiles();
  var fromUrl = toMinutes(new URLSearchParams(window.location.search).get('min'));
  setMinutes(fromUrl === null ? DEFAULT_MINUTES : fromUrl);
})();
