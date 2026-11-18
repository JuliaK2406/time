// Screen 1: the clock. Time is taken in the Europe/Amsterdam zone through Intl,
// not in the zone of the computer that shows the page.
(function () {
  'use strict';

  var ZONE = 'Europe/Amsterdam';

  var hmEl = document.getElementById('hm');
  var secEl = document.getElementById('sec');
  var zoneEl = document.getElementById('zone');
  var dateEl = document.getElementById('date');

  // Words for the screen: weekday and month names, two-digit time on the 24 hour clock.
  var wordsFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hourCycle: 'h23',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Plain numbers, only to work out the offset from UTC (winter +1, summer +2).
  var numbersFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  function partsOf(format, date) {
    var out = {};
    format.formatToParts(date).forEach(function (part) {
      out[part.type] = part.value;
    });
    return out;
  }

  function offsetMinutes(date) {
    var p = partsOf(numbersFormat, date);
    var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUtc - date.getTime()) / 60000);
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function render() {
    var now = new Date();
    var p = partsOf(wordsFormat, now);
    var summer = offsetMinutes(now) === 120;

    setText(hmEl, p.hour + ':' + p.minute);
    setText(secEl, p.second);
    setText(zoneEl, summer ? 'Central European Summer Time · CEST' : 'Central European Time · CET');
    setText(dateEl, p.weekday + ', ' + p.day + ' ' + p.month);
  }

  // Wake up just after each whole second, so the seconds never skip or lag.
  function tick() {
    render();
    setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) render();
  });

  tick();
})();
