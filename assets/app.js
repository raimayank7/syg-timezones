/* timezones: live clocks, city search, table filter, converter and meeting planner. Everything runs in the browser. */
(function () {
  'use strict';
  var d = document, S = window.SYG, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var KEY = 'syg-timezones-recent';
  var ALIAS = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Rangoon': 'Asia/Yangon', 'Europe/Kiev': 'Europe/Kyiv', 'Asia/Dacca': 'Asia/Dhaka',
    'America/Buenos_Aires': 'America/Argentina/Buenos_Aires', 'Asia/Thimbu': 'Asia/Thimphu', 'Atlantic/Faeroe': 'Atlantic/Faroe', 'Pacific/Truk': 'Pacific/Chuuk', 'America/Indianapolis': 'America/Indiana/Indianapolis' };
  var MY = 'UTC';
  try { MY = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; MY = ALIAS[MY] || MY; } catch (e) {}
  var plain = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  var fcache = {};
  var fmtr = function (zone) {
    if (!fcache[zone]) fcache[zone] = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' });
    return fcache[zone];
  };
  /* wall-clock parts of an instant in a zone */
  var parts = function (zone, date) {
    var o = {};
    fmtr(zone).formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: o.weekday };
  };
  var offset = function (zone, date) {   /* minutes ahead of UTC */
    var p = parts(zone, date);
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var t12 = function (h, mi, s) { return (h % 12 || 12) + ':' + (mi < 10 ? '0' : '') + mi + (s == null ? '' : ':' + (s < 10 ? '0' : '') + s) + (h < 12 ? ' am' : ' pm'); };
  var dstr = function (p) { return p.wd + ', ' + p.d + ' ' + MON[p.m - 1]; };
  var utc = function (m) { return m === 0 ? 'UTC' : 'UTC' + (m > 0 ? '+' : '−') + Math.floor(Math.abs(m) / 60) + (Math.abs(m) % 60 ? ':' + ('0' + Math.abs(m) % 60).slice(-2) : ''); };
  var dur = function (m) { m = Math.abs(m); var h = Math.floor(m / 60), r = m % 60; return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (h && r ? ' ' : '') + (r ? r + ' minutes' : ''); };
  var ok = function (zone) { try { fmtr(zone); return true; } catch (e) { return false; } };
  var rel = function (zone, base, name, baseName) {
    var now = new Date(), df = offset(zone, now) - offset(base, now);
    return df === 0 ? name + ' has the same time as ' + baseName : name + ' is ' + dur(df) + (df > 0 ? ' ahead of ' : ' behind ') + baseName;
  };

  /* ---- live values */
  function tick() {
    var now = new Date();
    $$('[data-clock]').forEach(function (el) { try { var p = parts(el.getAttribute('data-clock'), now); el.textContent = t12(p.h, p.mi, el.classList.contains('big') ? p.s : null); } catch (e) { el.textContent = 'not available'; } });
    $$('[data-date]').forEach(function (el) { try { el.textContent = dstr(parts(el.getAttribute('data-date'), now)); } catch (e) {} });
    $$('[data-off]').forEach(function (el) { var t = new Date(now.getTime() + el.getAttribute('data-off') * 60000); el.textContent = t12(t.getUTCHours(), t.getUTCMinutes()); });
    var loc = $('[data-local]');
    if (loc) { loc.textContent = t12(now.getHours(), now.getMinutes(), now.getSeconds()); }
  }
  function once() {
    var now = new Date();
    $$('[data-zname]').forEach(function (el) {
      try { var n = new Intl.DateTimeFormat('en-GB', { timeZone: el.getAttribute('data-zname'), timeZoneName: 'long' }).formatToParts(now).filter(function (p) { return p.type === 'timeZoneName'; })[0].value; if (n && !/^GMT[+-]/.test(n)) el.textContent = n + ' (' + el.textContent + ')'; } catch (e) {}
    });
    $$('[data-diff]').forEach(function (el) {
      var z = el.getAttribute('data-diff');
      try { el.textContent = z === MY ? 'This is your own time zone' : rel(z, MY, 'It', 'your time') + ' (' + MY.replace(/_/g, ' ') + ')'; } catch (e) { el.textContent = 'not available'; }
    });
    $$('[data-pair]').forEach(function (el) { var a = el.getAttribute('data-pair').split('|'); try { el.textContent = rel(a[1], a[0], a[2], 'India'); } catch (e) {} });
    var lz = $('[data-local-zone]');
    if (lz) { try { lz.textContent = dstr(parts(MY, now)) + ' · ' + MY.replace(/_/g, ' ') + ' · ' + utc(offset(MY, now)); } catch (e) {} }
  }
  tick(); once(); setInterval(tick, 1000);

  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-now]'); if (!b) return;
    var z = b.getAttribute('data-copy-now'), now = new Date(), p = parts(z, now);
    S.copy('Time in ' + b.getAttribute('data-label') + ': ' + t12(p.h, p.mi) + ', ' + dstr(p) + ' (' + utc(offset(z, now)) + ')');
  });

  /* zone page: remember it */
  var art = $('[data-z]');
  if (art && art.getAttribute('data-z')) S.recent(KEY, { u: '/zone/' + art.getAttribute('data-z') + '/', t: art.getAttribute('data-name') });

  /* ---- home search */
  var q = $('#q'), sug = $('#sug'), hit = $('#hit');
  if (q && sug && hit) {
    var CITY = null, ZN = null, loading = false;
    var load = function () {
      if (CITY || loading) return; loading = true;
      Promise.all([S.json('/data/cities.json'), S.json('/data/zones.json')]).then(function (r) { CITY = r[0]; ZN = r[1]; paint(); }).catch(function () { loading = false; sug.hidden = false; sug.innerHTML = '<li class="none">The city list could not be loaded. Check your connection.</li>'; });
    };
    var show = function (name, zi) {
      var z = ZN[zi], now = new Date();
      sug.hidden = true;
      hit.innerHTML = '<h2>Time in ' + S.esc(name) + '</h2><p class="big"><span class="ck big" data-clock="' + z[0] + '"></span></p><p><span data-date="' + z[0] + '"></span> · ' + utc(offset(z[0], now)) + ' · ' +
        S.esc(z[0] === MY ? 'your own time zone' : rel(z[0], MY, 'it', 'your time').replace(/^it /, '')) + '</p><div class="acts"><a class="btn sm" href="/zone/' + z[2] + '/">More about this time zone</a><a class="btn sm ghost" href="/converter/?to=' + z[0] + '">Convert a time</a></div>';
      hit.hidden = false; tick();
      S.recent(KEY, { u: '/zone/' + z[2] + '/', t: name });
    };
    var paint = function () {
      var v = plain(q.value.trim());
      if (!v) { sug.hidden = true; return; }
      if (!CITY) { load(); return; }
      var out = [], seen = {};
      ZN.forEach(function (z, i) { if (plain(z[1]).indexOf(v) === 0 && out.length < 4) { out.push([z[1], i]); seen[z[1]] = 1; } });
      for (var i = 0; i < CITY.length && out.length < 9; i++) {
        var c = CITY[i], n = plain(c[0]), a = c[1] ? c[1].toLowerCase() : n;
        if (n.indexOf(v) === 0 || a.indexOf(v) === 0) { var lab = c[0] + ', ' + c[2]; if (!seen[lab]) { seen[lab] = 1; out.push([lab, c[3]]); } }
      }
      if (out.length < 9) ZN.forEach(function (z, i) { if (out.length < 9 && !seen[z[1]] && plain(z[1]).indexOf(v) > 0) { out.push([z[1], i]); seen[z[1]] = 1; } });
      sug.innerHTML = out.length ? out.map(function (o) { return '<li><button type="button" data-zi="' + o[1] + '" data-n="' + S.esc(o[0]) + '">' + S.esc(o[0]) + '</button></li>'; }).join('') :
        '<li class="none">No place matches. Try a large city nearby or the country name.</li>';
      sug.hidden = false;
    };
    q.addEventListener('focus', load); q.addEventListener('input', paint);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var b = $('button', sug); if (b && !sug.hidden) show(b.getAttribute('data-n'), +b.getAttribute('data-zi')); } if (e.key === 'Escape') sug.hidden = true; });
    sug.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.getAttribute('data-n'), +b.getAttribute('data-zi')); });
    var rec = S.recent(KEY);
    if (rec.length) { $('#recent-list').innerHTML = rec.map(function (r) { return '<a href="' + S.esc(r.u) + '">' + S.esc(r.t) + '</a>'; }).join(''); $('#recent').hidden = false; }
  }

  /* ---- table filter */
  var lq = $('#lq'), ft = $('table.filt');
  if (lq && ft) {
    var rows = $$('tbody tr', ft), cnt = $('#lcount');
    lq.addEventListener('input', function () {
      var v = plain(lq.value.trim()), n = 0;
      rows.forEach(function (r) { var show = !v || plain(r.getAttribute('data-q')).indexOf(v) > -1; r.hidden = !show; if (show) n++; });
      cnt.textContent = v ? (n ? n + ' of ' + rows.length + ' rows shown' : 'Nothing matches. Check the spelling.') : '';
    });
  }

  /* ---- converter */
  var cf = $('#cfrom');
  if (cf) {
    var cd = $('#cdate'), ct = $('#ctime'), cadd = $('#cadd'), cto = $('#cto'), res = $('#cres'), plan = $('#cplan'), planT = $('#cplan-t');
    var names = {}; $$('option', cf).forEach(function (o) { names[o.value] = o.textContent; });
    var TO = [];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var toInstant = function (zone, y, m, dd, h, mi) {   /* the instant at which the zone's wall clock shows this date and time */
      var guess = Date.UTC(y, m - 1, dd, h, mi), o1 = offset(zone, new Date(guess)), t = guess - o1 * 60000, o2 = offset(zone, new Date(t));
      return new Date(o2 === o1 ? t : guess - o2 * 60000);
    };
    var setNow = function () { var p = parts(cf.value, new Date()); cd.value = p.y + '-' + pad(p.m) + '-' + pad(p.d); ct.value = pad(p.h) + ':' + pad(p.mi); };
    var chips = function () { cto.innerHTML = TO.map(function (z) { return '<button type="button" data-z="' + z + '" aria-label="Remove ' + S.esc(names[z]) + '">' + S.esc(names[z]) + '</button>'; }).join(''); };
    var draw = function () {
      var dm = /^(\d{4})-(\d\d)-(\d\d)$/.exec(cd.value), tm = /^(\d\d):(\d\d)/.exec(ct.value);
      if (!dm || !tm || !TO.length) { res.hidden = false; plan.hidden = true; res.innerHTML = '<p>' + (!TO.length ? 'Add at least one place to convert to.' : 'Choose a date and a time.') + '</p>'; return; }
      var from = cf.value, inst = toInstant(from, +dm[1], +dm[2], +dm[3], +tm[1], +tm[2]), fp = parts(from, inst), fo = offset(from, inst);
      var lines = [t12(fp.h, fp.mi) + ', ' + dstr(fp) + ' in ' + names[from]];
      var html = '<h2>' + t12(fp.h, fp.mi) + ', ' + dstr(fp) + ' in ' + S.esc(names[from]) + ' is</h2><dl class="facts">';
      TO.forEach(function (z) {
        var p = parts(z, inst), o = offset(z, inst), df = o - fo;
        html += '<dt>' + S.esc(names[z]) + '</dt><dd><span class="ck">' + t12(p.h, p.mi) + '</span>, ' + dstr(p) + ' <small>(' + utc(o) + ', ' + (df === 0 ? 'same time' : dur(df) + (df > 0 ? ' ahead' : ' behind')) + ')</small></dd>';
        lines.push(t12(p.h, p.mi) + ', ' + dstr(p) + ' in ' + names[z]);
      });
      var link = location.origin + '/converter/?from=' + from + '&to=' + TO.join(',') + '&t=' + cd.value + 'T' + ct.value;
      var txt = lines[0] + ' = ' + lines.slice(1).join(' = ');
      res.innerHTML = html + '</dl><div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(txt) + '">Copy result</button><button class="btn sm ghost" type="button" data-wa="' + S.esc(txt) + '">WhatsApp</button>' +
        '<button class="btn sm ghost" type="button" data-copy="' + S.esc(link) + '" data-done="Link copied">Copy link</button></div>';
      res.hidden = false;
      var zs = [from].concat(TO), t = '<table class="plan"><thead><tr>' + zs.map(function (z) { return '<th>' + S.esc(names[z].split(',')[0]) + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (var h = 0; h < 24; h++) {
        var it = toInstant(from, +dm[1], +dm[2], +dm[3], h, 0), good = true, cells = '';
        zs.forEach(function (z, i) {
          var p = parts(z, it); if (p.h < 8 || p.h >= 21) good = false;
          var shift = i ? Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(+dm[1], +dm[2] - 1, +dm[3])) / 86400000) : 0;
          cells += '<td>' + t12(p.h, p.mi) + (shift ? ' <small>' + (shift > 0 ? '+' : '−') + Math.abs(shift) + ' day</small>' : '') + '</td>';
        });
        t += '<tr' + (good ? ' class="good"' : '') + '>' + cells + '</tr>';
      }
      planT.innerHTML = t + '</tbody></table>'; plan.hidden = false;
      try { history.replaceState(null, '', link.replace(location.origin, '')); } catch (e) {}
    };
    var ps = new URLSearchParams(location.search), pf = ALIAS[ps.get('from')] || ps.get('from');
    cf.value = names[pf] ? pf : names[MY] ? MY : 'Asia/Kolkata';
    (ps.get('to') || '').split(',').forEach(function (z) { z = ALIAS[z] || z; if (names[z] && z !== cf.value && TO.indexOf(z) < 0 && TO.length < 6) TO.push(z); });
    if (!TO.length) ['Asia/Kolkata', 'Europe/London', 'America/New_York'].forEach(function (z) { if (z !== cf.value && TO.length < 2) TO.push(z); });
    var pt = /^(\d{4}-\d\d-\d\d)T(\d\d:\d\d)$/.exec(ps.get('t') || '');
    if (pt) { cd.value = pt[1]; ct.value = pt[2]; } else setNow();
    chips(); draw();
    [cf, cd, ct].forEach(function (el) { el.addEventListener('change', draw); el.addEventListener('input', draw); });
    cadd.addEventListener('change', function () {
      var z = cadd.value; cadd.value = '';
      if (!z) return;
      if (TO.length >= 6) { S.toast('Six places at most. Remove one first.'); return; }
      if (z !== cf.value && TO.indexOf(z) < 0) { TO.push(z); chips(); draw(); }
    });
    cto.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; TO = TO.filter(function (z) { return z !== b.getAttribute('data-z'); }); chips(); draw(); });
    $('#cnow').addEventListener('click', function () { setNow(); draw(); });
  }
})();
