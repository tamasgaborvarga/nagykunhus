/* =============================================================================
   Rendelési lista (kosár) — KÖZÖS modul.

   Korábban a kosár a megrendeles.js-ben élt, és a 422 tételes terméklista két
   oldalon is fel volt sorakoztatva. Mostantól egy lista van (Termékeink), és a
   rendelési lap csak a kosarat, az űrlapot és a levél előnézetét tartalmazza.
   Ez a modul tartja a kosár állapotát, rajzolja a panelt, és mindkét oldal ezt
   használja.

   A lista a böngésző localStorage-ában él, szerverre semmi nem kerül.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.NkhTermek;
  if (!T) return;

  var TAROLO_KULCS = 'nkh-rendeles-v1';

  var el = {
    panel: document.getElementById('kosar-panel'),
    zar: document.getElementById('kosar-zar'),
    db: document.getElementById('kosar-db'),
    nyit: document.getElementById('kosar-nyit'),
    tovabb: document.getElementById('kosar-tovabb'),
    sav: document.getElementById('kosar-sav'),
    savSzoveg: document.getElementById('kosar-sav-szoveg')
  };

  /* A lista több helyen is megjelenhet (csúszó panel ÉS a rendelési lap oldala),
     ezért nem azonosítóra, hanem jelölőkre dolgozunk:
       [data-kosar-lista]  — ide rajzoljuk a tételeket
       [data-kosar-ures]   — üres listánál látszik
       [data-kosar-van]    — nem üres listánál látszik
       [data-kosar-urit]   — lista ürítése gomb */
  function mind(jelolo) {
    return Array.prototype.slice.call(document.querySelectorAll(jelolo));
  }

  var kosar = betolt();
  var osszes = [];            // a terméktábla a bélyegképek kikereséséhez
  var figyelok = [];          // frissítéskor értesítendő függvények
  var csapdaKi = null;
  var utolsoFokusz = null;

  /* ------------------------------------------------------------------ Tárolás */
  function betolt() {
    try {
      var nyers = localStorage.getItem(TAROLO_KULCS);
      var lista = nyers ? JSON.parse(nyers) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function ment() {
    try { localStorage.setItem(TAROLO_KULCS, JSON.stringify(kosar)); } catch (e) { /* nem kritikus */ }
  }

  function index(cikk) {
    for (var i = 0; i < kosar.length; i++) { if (kosar[i].c === cikk) return i; }
    return -1;
  }

  /* -------------------------------------------------------------- Műveletek */
  function hozzaad(t, mennyiseg, egyseg) {
    var i = index(t.c);
    if (i === -1) {
      kosar.push({ c: t.c, n: t.n, db: mennyiseg, e: egyseg });
    } else {
      // Egységváltáskor az összeg is az ÚJ egység szabálya szerint kerekül.
      kosar[i].db = T.mennyisegIgazit(kosar[i].db + mennyiseg, egyseg);
      kosar[i].e = egyseg;
    }
    ment();
    frissit();
  }

  function torol(cikk) {
    var i = index(cikk);
    if (i !== -1) { kosar.splice(i, 1); ment(); frissit(); }
  }

  function urit() {
    if (!kosar.length) return false;
    kosar = [];
    ment();
    frissit();
    return true;
  }

  /* ----------------------------------------------------------------- Rajzolás */
  function tetelElem(tetel, elotag) {
    var li = document.createElement('li');
    li.className = 'kosar-tetel';

    /* A kosár csak cikkszámot és nevet tárol; a fotót a betöltött terméktáblából
       keressük ki, hogy a mentett lista ne avuljon el. */
    var termek = null;
    for (var j = 0; j < osszes.length; j++) {
      if (osszes[j].c === tetel.c) { termek = osszes[j]; break; }
    }
    var kepJel = termek && termek.k > 0
      ? '<img class="kosar-tetel__kep" src="' + T.kepUt(termek, false, 0) + '" alt="" ' +
        'width="56" height="56" loading="lazy" decoding="async">'
      : '<span class="kosar-tetel__kep kosar-tetel__kep--nincs" aria-hidden="true">' +
        '<svg class="ikon"><use href="#i-lista"/></svg></span>';

    li.innerHTML =
      '<div class="kosar-tetel__fo">' +
        kepJel +
        '<span class="kosar-tetel__szoveg">' +
          '<span class="kosar-tetel__nev">' + T.esc(tetel.n) + '</span>' +
          '<span class="kosar-tetel__meta">Cikkszám: ' + T.esc(tetel.c) + '</span>' +
        '</span>' +
      '</div>';

    var mezo = document.createElement('div');
    mezo.className = 'kosar-tetel__mennyiseg';

    var azon = elotag + '-db-' + tetel.c;
    var cimke = document.createElement('label');
    cimke.className = 'vizualisan-rejtett';
    cimke.setAttribute('for', azon);
    cimke.textContent = tetel.n + ' mennyisége';

    var input = document.createElement('input');
    input.type = 'number';
    input.id = azon;
    input.min = T.lepeskoz(tetel.e);
    input.step = T.lepeskoz(tetel.e);
    input.inputMode = T.oszthato(tetel.e) ? 'decimal' : 'numeric';
    input.value = String(tetel.db);
    input.addEventListener('change', function () {
      var ertek = T.mennyisegIgazit(parseFloat(input.value.replace(',', '.')), tetel.e);
      if (!ertek) { input.value = String(tetel.db); return; }
      tetel.db = ertek;
      input.value = String(ertek);
      ment();
      ertesit();
    });

    var egyseg = document.createElement('span');
    egyseg.className = 'kosar-tetel__egyseg';
    egyseg.textContent = tetel.e;

    var torolGomb = document.createElement('button');
    torolGomb.type = 'button';
    torolGomb.className = 'kosar-tetel__torol';
    torolGomb.setAttribute('aria-label', tetel.n + ' törlése a listáról');
    torolGomb.innerHTML = '<svg class="ikon" aria-hidden="true"><use href="#i-kuka"/></svg>';
    torolGomb.addEventListener('click', function () { torol(tetel.c); });

    mezo.appendChild(cimke);
    mezo.appendChild(input);
    mezo.appendChild(egyseg);
    mezo.appendChild(torolGomb);
    li.appendChild(mezo);
    return li;
  }

  function ertesit() {
    figyelok.forEach(function (fn) { try { fn(kosar); } catch (e) { /* egy figyelő hibája ne állítsa meg a többit */ } });
  }

  function frissit() {
    var db = kosar.length;

    // fejléc- és mobilsáv-számlálók (minden oldalon ott a fejléc gombja)
    Array.prototype.forEach.call(document.querySelectorAll('[data-kosarszam]'), function (x) {
      x.textContent = db;
      x.hidden = db === 0;
    });

    if (el.db) el.db.textContent = db;
    mind('[data-kosar-ures]').forEach(function (x) { x.hidden = db !== 0; });
    mind('[data-kosar-van]').forEach(function (x) { x.hidden = db === 0; });
    mind('[data-kosar-lista]').forEach(function (lista, i) {
      var elotag = lista.id || ('kosar' + i);
      lista.innerHTML = '';
      kosar.forEach(function (tetel) { lista.appendChild(tetelElem(tetel, elotag)); });
    });
    if (el.sav) {
      el.sav.hidden = db === 0;
      if (el.savSzoveg) el.savSzoveg.textContent = db + ' tétel a listán';
    }

    ertesit();
  }

  /* -------------------------------------------------------------- Kosárpanel */
  function panelNyit() {
    if (!el.panel) return;
    utolsoFokusz = document.activeElement;
    el.panel.dataset.nyitva = 'igen';
    el.panel.setAttribute('aria-hidden', 'false');
    if (el.nyit) el.nyit.setAttribute('aria-expanded', 'true');
    document.body.dataset.menuNyitva = 'igen';
    if (typeof window.nkhFokuszCsapda === 'function') {
      csapdaKi = window.nkhFokuszCsapda(el.panel);
    }
    if (el.zar) el.zar.focus();
  }

  function panelZar() {
    if (!el.panel || el.panel.dataset.nyitva !== 'igen') return;
    el.panel.dataset.nyitva = 'nem';
    el.panel.setAttribute('aria-hidden', 'true');
    if (el.nyit) el.nyit.setAttribute('aria-expanded', 'false');
    delete document.body.dataset.menuNyitva;
    if (csapdaKi) { csapdaKi(); csapdaKi = null; }
    var cel = (utolsoFokusz && utolsoFokusz !== document.body && document.contains(utolsoFokusz))
      ? utolsoFokusz : el.nyit;
    if (cel && cel.focus) cel.focus();
  }

  if (el.panel) {
    if (el.nyit) el.nyit.addEventListener('click', panelNyit);
    if (el.zar) el.zar.addEventListener('click', panelZar);
    el.panel.addEventListener('click', function (e) {
      if (e.target === el.panel) panelZar();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') panelZar();
    });
    if (el.sav) {
      var savGomb = el.sav.querySelector('button');
      if (savGomb) savGomb.addEventListener('click', panelNyit);
    }
  }

  mind('[data-kosar-urit]').forEach(function (gomb) {
    gomb.addEventListener('click', function () {
      if (urit() && window.NkhKosar.uritesUtan) window.NkhKosar.uritesUtan();
    });
  });

  /* A „Tovább a megrendeléshez" a rendelési lapon az űrlapra görget, máshol
     egyszerű hivatkozásként átvisz oda — ezért az oldal állítja be. */
  if (el.tovabb) {
    el.tovabb.addEventListener('click', function () {
      if (window.NkhKosar.tovabbKezelo) window.NkhKosar.tovabbKezelo();
    });
  }

  window.NkhKosar = {
    tetelek: function () { return kosar; },
    hozzaad: hozzaad,
    torol: torol,
    urit: urit,
    frissit: frissit,
    panelNyit: panelNyit,
    panelZar: panelZar,
    /* A terméktábla beadása után a bélyegképek is megjelennek a listán. */
    termekek: function (lista) { osszes = lista || []; frissit(); },
    figyel: function (fn) { figyelok.push(fn); },
    tovabbKezelo: null,
    uritesUtan: null
  };

  frissit();
})();
