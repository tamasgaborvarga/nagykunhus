/* =============================================================================
   Termékkatalógus — termékcsoport-sáv, keresés, szűrés, rács/táblázat nézet.

   FONTOS: minden megjelenített adat a hivatalos terméktáblából származik
   (data/termekek.json, forrás: https://nagykunhus.hu/products/).
   A modul semmilyen adatot nem egészít ki és nem következtet ki.

   2026-10-07: minden terméknek saját oldala van (termek/<cikkszám>.html), ezért
   a kártya oda visz; a korábbi részletező modális kivezetve. A régi
   `termekek.html#t-CIKKSZÁM` mélylinkek a termékoldalra irányítanak át.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.NkhTermek;
  if (!T) return;

  /* Régi mélylink (termekek.html#t-CIKK) → termékoldal, vagy fotó nélküli
     terméknél a cikkszámra szűrt lista. A döntéshez az adat kell, ezért a
     betöltés után (lásd lent). */
  var regiCikk = location.hash.indexOf('#t-') === 0 ? decodeURIComponent(location.hash.slice(3)) : '';

  var TETEL_LEPES = 48;

  var el = {
    kereso: document.getElementById('termek-kereso'),
    csoportok: document.getElementById('termek-csoportok'),
    pillek: document.getElementById('termek-pillek'),
    csakFoto: document.getElementById('csak-foto'),
    talalat: document.getElementById('termek-talalat'),
    nezetRacs: document.getElementById('nezet-racs'),
    nezetTabla: document.getElementById('nezet-tabla'),
    racs: document.getElementById('termek-racs'),
    tabla: document.getElementById('termek-tabla'),
    tablaTest: document.getElementById('termek-tabla-test'),
    tovabb: document.getElementById('termek-tovabb'),
    ures: document.getElementById('termek-ures'),
    allapot: document.getElementById('termek-allapot')
  };

  if (!el.racs) return;

  var osszes = [];
  var szurt = [];
  var megjelenitve = 0;
  var aktivSzuro = null;
  var aktivCsoport = '';
  var nezet = 'racs';

  var esc = T.esc;
  var kepUt = T.kepUt;
  var egysegek = T.egysegek;

  function jelez(szoveg) { if (el.allapot) el.allapot.textContent = szoveg; }

  /* ------------------------------------------------------------------ Szűrés */
  function szur() {
    szurt = T.szur(osszes, {
      kifejezes: (el.kereso && el.kereso.value) || '',
      aktivSzuro: aktivSzuro,
      csakFoto: el.csakFoto && el.csakFoto.getAttribute('aria-pressed') === 'true'
    });
    if (aktivCsoport) {
      szurt = szurt.filter(function (t) { return String(t.c).slice(0, 2) === aktivCsoport; });
    }

    megjelenitve = 0;
    el.racs.innerHTML = '';
    el.tablaTest.innerHTML = '';
    rajzol();
    frissitTalalat();
    cimFrissit();
  }

  function frissitTalalat() {
    var db = szurt.length;
    var hol = aktivCsoport ? ' &middot; ' + esc(T.csoportNev(aktivCsoport)) : '';
    el.talalat.innerHTML = '<strong>' + db + '</strong> termék a ' + osszes.length + ' tételes kínálatból' + hol;
    el.ures.hidden = db !== 0;
    jelez(db + ' találat.');
  }

  /* A cím kövesse az állapotot, hogy a szűrt lista megosztható legyen. */
  function cimFrissit() {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    if (aktivCsoport) p.set('csoport', aktivCsoport);
    var q = el.kereso && el.kereso.value.trim();
    if (q) p.set('q', q);
    var uj = location.pathname + (p.toString() ? '?' + p.toString() : '');
    history.replaceState(null, '', uj);
  }

  /* Minden szűrő alaphelyzetbe — az üres állapot gombja hívja. */
  function szurokTorlese() {
    if (el.kereso) el.kereso.value = '';
    if (el.csakFoto) el.csakFoto.setAttribute('aria-pressed', 'false');
    aktivSzuro = null;
    if (pillVezerlo) pillVezerlo.torol();
    csoportValaszt('');
    if (el.kereso) el.kereso.focus();
  }

  /* -------------------------------------------------------- Termékcsoport-sáv
     A csoportok a cikkszám-előtag szerinti SAJÁT rendezésünk (nem hivatalos
     kategória) — a lap lábjegyzete ezt kiírja. */
  function csoportokEpit() {
    if (!el.csoportok) return;
    var db = {};
    osszes.forEach(function (t) {
      var e = String(t.c).slice(0, 2);
      db[e] = (db[e] || 0) + 1;
    });

    var html = '<button type="button" class="csoportsav__elem" data-csoport="" aria-pressed="true">' +
      'Összes<span>' + osszes.length + '</span></button>';
    T.CSOPORTOK.forEach(function (cs) {
      if (!db[cs.e]) return;
      html += '<button type="button" class="csoportsav__elem" data-csoport="' + cs.e + '" aria-pressed="false">' +
        esc(cs.cim) + '<span>' + db[cs.e] + '</span></button>';
    });
    el.csoportok.innerHTML = html;
    el.csoportok.addEventListener('click', function (e) {
      var b = e.target.closest('[data-csoport]');
      if (!b) return;
      csoportValaszt(b.getAttribute('data-csoport'));
    });
  }

  function csoportValaszt(e) {
    aktivCsoport = e || '';
    if (el.csoportok) {
      Array.prototype.forEach.call(el.csoportok.querySelectorAll('[data-csoport]'), function (b) {
        var aktiv = b.getAttribute('data-csoport') === aktivCsoport;
        b.setAttribute('aria-pressed', String(aktiv));
        if (aktiv && b.scrollIntoView && el.csoportok.scrollWidth > el.csoportok.clientWidth) {
          el.csoportok.scrollTo({ left: b.offsetLeft - 16, behavior: 'smooth' });
        }
      });
    }
    /* Csoport választásakor a fotós szűrő ne rejtse el a csoport felét. */
    if (aktivCsoport && el.csakFoto) el.csakFoto.setAttribute('aria-pressed', 'false');
    szur();
  }

  /* ------------------------------------------------------------- Megjelenítés */
  function racsElem(t) {
    var kartya = document.createElement('article');
    kartya.className = 'termek';
    kartya.dataset.cikk = t.c;

    var kep = t.k
      ? '<img src="' + kepUt(t, false, 0) + '"' +
        ' srcset="' + kepUt(t, false, 0) + ' 480w, ' + kepUt(t, true, 0) + ' 1000w"' +
        ' sizes="(min-width: 1100px) 300px, (min-width: 640px) 33vw, 50vw"' +
        ' alt="' + esc(t.n) + ' — termékfotó" loading="lazy" decoding="async"' +
        ' width="480" height="360">'
      : '<span class="termek__nincskep">Nincs termékfotó</span>';

    /* Saját oldala csak a fotós terméknek van; a többi kártya nem link. */
    var link = document.createElement(T.vanOldala(t) ? 'a' : 'div');
    link.className = 'termek__link';
    if (T.vanOldala(t)) link.href = T.termekUrl(t);
    link.innerHTML =
      '<span class="termek__kep">' + kep + '</span>' +
      '<span class="termek__torzs">' +
        '<span class="termek__csoport">' + esc(T.csoportNev(t.c)) + '</span>' +
        '<span class="termek__nev">' + esc(t.n) + '</span>' +
        '<span class="termek__meta">' + esc(t.c) +
          (t.sz ? ' &middot; ' + esc(t.sz) + ' nap' : '') + '</span>' +
        (T.vanOldala(t) ? '<span class="termek__cta">Termék megtekintése<svg class="ikon" aria-hidden="true"><use href="#i-nyil-jobbra"/></svg></span>' : '') +
      '</span>';

    kartya.appendChild(link);
    kartya.appendChild(T.rendelesVezerlo(t, 'racs-' + t.c, jelez));
    return kartya;
  }

  function tablaSor(t) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="szam">' + esc(t.c) + '</td>' +
      '<td>' + (T.vanOldala(t) ? '<a href="' + T.termekUrl(t) + '">' + esc(t.n) + '</a>' : esc(t.n)) + '</td>' +
      '<td class="szam">' + (t.sz ? esc(t.sz) : '—') + '</td>' +
      '<td class="szam">' + (t.e ? esc(t.e) : '—') + '</td>' +
      '<td>' + (egysegek(t) || '—') + '</td>' +
      '<td>' + (t.s && t.s.length ? t.s.map(function (n) { return esc(n.toUpperCase()); }).join(', ') : '—') + '</td>';

    var td = document.createElement('td');
    /* Táblázatos nézetben egy kattintás, alapmennyiséggel — a finomhangolás
       a rendelési listán történik. */
    var listara = document.createElement('button');
    listara.type = 'button';
    listara.className = 'gomb gomb--elsodleges gomb--kicsi';
    listara.textContent = 'Listára';
    listara.addEventListener('click', function () {
      if (!window.NkhKosar) return;
      var egyseg = T.egyseglista(t)[0] || '';
      window.NkhKosar.hozzaad(t, T.mennyisegIgazit(1, egyseg), egyseg);
      jelez(t.n + ' a rendelési listára került.');
    });
    td.appendChild(listara);
    tr.appendChild(td);
    return tr;
  }

  function rajzol() {
    var vege = Math.min(megjelenitve + TETEL_LEPES, szurt.length);
    var toredek = document.createDocumentFragment();

    for (var i = megjelenitve; i < vege; i++) {
      var elem = nezet === 'racs' ? racsElem(szurt[i]) : tablaSor(szurt[i]);
      /* Finom, lépcsőzetes belépés — csak az első adag elejénél, és csak ha
         nem kértek csökkentett mozgást (a CSS gondoskodik róla). */
      if (nezet === 'racs' && i - megjelenitve < 12) {
        elem.classList.add('termek--be');
        elem.style.setProperty('--i', String(i - megjelenitve));
      }
      toredek.appendChild(elem);
    }
    (nezet === 'racs' ? el.racs : el.tablaTest).appendChild(toredek);
    megjelenitve = vege;

    el.tovabb.hidden = megjelenitve >= szurt.length;
    if (!el.tovabb.hidden) {
      el.tovabb.textContent = 'További termékek betöltése (' + (szurt.length - megjelenitve) + ')';
    }
  }

  function valtNezet(uj) {
    if (nezet === uj) return;
    nezet = uj;
    el.nezetRacs.setAttribute('aria-pressed', String(uj === 'racs'));
    el.nezetTabla.setAttribute('aria-pressed', String(uj === 'tabla'));
    el.racs.hidden = uj !== 'racs';
    el.tabla.hidden = uj !== 'tabla';
    megjelenitve = 0;
    el.racs.innerHTML = '';
    el.tablaTest.innerHTML = '';
    rajzol();
  }

  /* ---------------------------------------------------------------- Vezérlők */
  var pillVezerlo = null;
  function epitPillek() {
    pillVezerlo = T.pillekEpit(el.pillek, function (aktiv) {
      aktivSzuro = aktiv;
      szur();
    });
  }

  var idozito;
  if (el.kereso) {
    el.kereso.addEventListener('input', function () {
      clearTimeout(idozito);
      idozito = setTimeout(szur, 140);
    });
  }
  if (el.csakFoto) {
    el.csakFoto.addEventListener('click', function () {
      var uj = el.csakFoto.getAttribute('aria-pressed') !== 'true';
      el.csakFoto.setAttribute('aria-pressed', String(uj));
      szur();
    });
  }
  el.nezetRacs.addEventListener('click', function () { valtNezet('racs'); });
  el.nezetTabla.addEventListener('click', function () { valtNezet('tabla'); });
  el.tovabb.addEventListener('click', rajzol);

  var torloGomb = document.getElementById('szurok-torlese');
  if (torloGomb) torloGomb.addEventListener('click', szurokTorlese);

  /* ------------------------------------------------------------------ Indítás */
  var param = new URLSearchParams(location.search);
  var kezdoCsoport = (param.get('csoport') || '').replace(/[^0-9]/g, '').slice(0, 2);
  var kezdoKif = param.get('q') || '';
  if (regiCikk) kezdoKif = regiCikk;
  if (el.kereso && kezdoKif) el.kereso.value = kezdoKif;
  /* Keresésből vagy csoportlinkről érkezve a teljes lista a mérvadó, nem csak a fotósak. */
  if ((kezdoCsoport || kezdoKif) && el.csakFoto) el.csakFoto.setAttribute('aria-pressed', 'false');

  T.betolt()
    .then(function (adat) {
      osszes = adat;
      if (regiCikk) {
        for (var i = 0; i < adat.length; i++) {
          if (adat[i].c === regiCikk && T.vanOldala(adat[i])) { location.replace(T.termekUrl(adat[i])); return; }
        }
      }
      if (window.NkhKosar) window.NkhKosar.termekek(adat);
      csoportokEpit();
      epitPillek();
      if (kezdoCsoport) { csoportValaszt(kezdoCsoport); } else { szur(); }
    })
    .catch(function (hiba) {
      jelez('A terméklista betöltése nem sikerült.');
      el.racs.innerHTML =
        '<p class="jegyzet" style="grid-column:1/-1"><span class="jegyzet__ikon" aria-hidden="true">!</span>' +
        '<span><strong>A terméklista most nem érhető el.</strong>' +
        'Kérjük, frissítse az oldalt, vagy keressen minket a ' +
        '<a href="mailto:rendeles@nagykunhus.hu">rendeles@nagykunhus.hu</a> címen.</span></p>';
      if (window.console) console.error('Terméklista:', hiba);
    });
})();
