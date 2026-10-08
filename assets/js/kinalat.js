/* =============================================================================
   Teljes kínálat — a főoldalba ágyazott, csoportba rendezett terméklista.

   A 422 tételes terméktábla (data/termekek.json) böngészhető formában: sávszűrő,
   keresés, kinyitható csoportok. Minden megjelenített mező a hivatalos
   terméktáblából származik; a csoportnevek a közös modulban élnek
   (assets/js/termekszuro.js), és a lista lábjegyzete jelzi, hogy a csoportosítás
   a mi rendezésünk, nem hivatalos kategória.

   Egy tételre kattintva a Termékeink oldal nyílik meg a termék adatlapjánál
   (termek/CIKKSZÁM.html), ahol a fotók és a specifikációk is elérhetők.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.NkhTermek;
  if (!T) return;

  var gyoker = document.getElementById('kinalat');
  if (!gyoker) return;

  var el = {
    kereso: document.getElementById('kinalat-kereso'),
    savok: document.getElementById('kinalat-savok'),
    lista: document.getElementById('kinalat-lista'),
    talalat: document.getElementById('kinalat-talalat'),
    kinyit: document.getElementById('kinalat-kinyit'),
    ures: document.getElementById('kinalat-ures'),
    allapot: document.getElementById('kinalat-allapot')
  };

  var esc = T.esc;
  var osszes = [];
  var aktivSav = '';        // üres = mind
  var mindKinyitva = false;
  var nyitott = {};         // előtag -> igaz/hamis, a felhasználó kézi állapota

  /* --------------------------------------------------------------- Szűrés */
  function szurtLista() {
    var kif = T.ekezetlen((el.kereso && el.kereso.value) || '').trim();
    return osszes.filter(function (t) {
      if (aktivSav && t._sav !== aktivSav) return false;
      if (!kif) return true;
      return t._n.indexOf(kif) !== -1 || t.c.indexOf(kif) !== -1 || (t.e || '').indexOf(kif) !== -1;
    });
  }

  /* ---------------------------------------------------------- Megjelenítés */
  function tetelSor(t) {
    var meta = [];
    if (t.sz) meta.push(esc(t.sz) + ' nap');
    var egyseg = T.egysegek(t);
    if (egyseg) meta.push(esc(egyseg));

    return '<li>' +
      '<a class="ktetel" href="' + T.termekUrl(t) + '">' +
        '<span class="ktetel__cikk">' + esc(t.c) + '</span>' +
        '<span class="ktetel__nev">' + esc(t.n) + '</span>' +
        (meta.length ? '<span class="ktetel__meta">' + meta.join(' &middot; ') + '</span>' : '') +
      '</a></li>';
  }

  /* Csoport-bélyegkép: a cikkszám-előtag helyett a csoport első, fotóval
     rendelkező terméke jelenik meg. A képviselőt a TELJES listából választjuk,
     nem a szűrt találatokból, hogy keresés közben ne ugráljon. Ahol egyetlen
     tételnek sincs hivatalos fotója, ott marad az előtag-jel. */
  var kepviselok = {};

  function kepviselokEpit() {
    kepviselok = {};

    // 1. kézzel választott kép, ha a csoport definíciójában szerepel
    var valasztott = {};
    T.CSOPORTOK.forEach(function (cs) { if (cs.kep) valasztott[cs.kep] = cs.e; });

    // 2. alapértelmezés: a csoport első fotós terméke
    osszes.forEach(function (t) {
      var e = String(t.c).slice(0, 2);
      if (!kepviselok[e] && t.k > 0) kepviselok[e] = t;
    });

    // 3. a kézi választás felülír — a lista sorrendjétől függetlenül
    osszes.forEach(function (t) {
      if (valasztott[t.c] && t.k > 0) kepviselok[valasztott[t.c]] = t;
    });
  }

  function csoportElem(cs, keresesAktiv) {
    var azon = 'csoport-' + cs.e;
    var nyitva = keresesAktiv || mindKinyitva || nyitott[cs.e] === true;

    var szak = document.createElement('section');
    szak.className = 'csoport';
    szak.dataset.elotag = cs.e;
    szak.dataset.nyitva = nyitva ? 'igen' : 'nem';

    szak.innerHTML =
      '<h3 style="margin:0">' +
        '<button type="button" class="csoport__fej" aria-expanded="' + nyitva + '" aria-controls="' + azon + '">' +
          (kepviselok[cs.e]
            ? '<img class="csoport__kep" src="' + T.kepUt(kepviselok[cs.e], false, 0) + '" alt=""' +
              ' width="52" height="52" loading="lazy" decoding="async">'
            : '<span class="csoport__jel" aria-hidden="true">' + esc(cs.e) + '</span>') +
          '<span class="csoport__szoveg">' +
            '<span class="csoport__nev">' + esc(cs.cim) + '</span>' +
            '<span class="csoport__meta">' + esc(cs.e) + 'xxx kezdetű cikkszámok</span>' +
          '</span>' +
          '<span class="csoport__db">' + cs.tetelek.length + '</span>' +
          '<span class="csoport__nyil" aria-hidden="true"><svg class="ikon"><use href="#i-nyil-le"/></svg></span>' +
        '</button>' +
      '</h3>' +
      '<div class="csoport__test" id="' + azon + '"' + (nyitva ? '' : ' hidden') + '>' +
        '<ul class="csoport__tetelek" style="--oszlop2:' + Math.min(2, Math.ceil(cs.tetelek.length / 4)) +
          ';--oszlop3:' + Math.min(3, Math.ceil(cs.tetelek.length / 4)) + '">' +
          cs.tetelek.map(tetelSor).join('') + '</ul>' +
      '</div>';

    var fej = szak.querySelector('.csoport__fej');
    var test = szak.querySelector('.csoport__test');
    fej.addEventListener('click', function () {
      var uj = test.hidden;
      test.hidden = !uj;
      fej.setAttribute('aria-expanded', String(uj));
      szak.dataset.nyitva = uj ? 'igen' : 'nem';
      nyitott[cs.e] = uj;
    });

    return szak;
  }

  function rajzol() {
    var lista = szurtLista();
    var keresesAktiv = !!((el.kereso && el.kereso.value.trim()) || aktivSav);
    var csoportok = T.csoportosit(lista);

    var toredek = document.createDocumentFragment();
    csoportok.forEach(function (cs) {
      toredek.appendChild(csoportElem(cs, keresesAktiv && lista.length <= 120));
    });

    el.lista.innerHTML = '';
    el.lista.appendChild(toredek);

    el.ures.hidden = lista.length !== 0;
    el.talalat.innerHTML = lista.length === osszes.length
      ? '<strong>' + osszes.length + ' tétel</strong> ' + csoportok.length + ' csoportban'
      : '<strong>' + lista.length + ' tétel</strong> a ' + osszes.length + '-ból, ' +
        csoportok.length + ' csoportban';
    el.allapot.textContent = lista.length + ' találat.';
  }

  /* -------------------------------------------------------------- Vezérlők */
  function savokEpit() {
    var darabszam = {};
    osszes.forEach(function (t) { darabszam[t._sav] = (darabszam[t._sav] || 0) + 1; });

    var gombok = [{ id: '', cim: 'Mind', db: osszes.length }].concat(
      T.SAVOK.map(function (s) { return { id: s.id, cim: s.cim, db: darabszam[s.id] || 0 }; })
        .filter(function (s) { return s.db > 0; })
    );

    gombok.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.innerHTML = esc(s.cim) + ' <span style="color:var(--szoveg-halk)">' + s.db + '</span>';
      b.setAttribute('aria-pressed', String(s.id === aktivSav));
      b.addEventListener('click', function () {
        aktivSav = s.id;
        Array.prototype.forEach.call(el.savok.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
        nyitott = {};
        rajzol();
      });
      el.savok.appendChild(b);
    });
  }

  if (el.kereso) {
    var idozito;
    el.kereso.addEventListener('input', function () {
      clearTimeout(idozito);
      idozito = setTimeout(function () { nyitott = {}; rajzol(); }, 160);
    });
  }

  if (el.kinyit) {
    el.kinyit.addEventListener('click', function () {
      mindKinyitva = !mindKinyitva;
      nyitott = {};
      el.kinyit.textContent = mindKinyitva ? 'Csoportok becsukása' : 'Összes csoport kinyitása';
      el.kinyit.setAttribute('aria-pressed', String(mindKinyitva));
      rajzol();
    });
  }

  var torlo = document.getElementById('kinalat-torles');
  if (torlo) {
    torlo.addEventListener('click', function () {
      if (el.kereso) el.kereso.value = '';
      aktivSav = '';
      nyitott = {};
      Array.prototype.forEach.call(el.savok.querySelectorAll('button'), function (x, i) {
        x.setAttribute('aria-pressed', String(i === 0));
      });
      rajzol();
      if (el.kereso) el.kereso.focus();
    });
  }

  /* --------------------------------------------------------------- Indítás */
  var savSzerint = {};
  T.CSOPORTOK.forEach(function (cs) { savSzerint[cs.e] = cs.sav; });

  T.betolt()
    .then(function (adat) {
      osszes = adat.map(function (t) {
        t._sav = savSzerint[String(t.c).slice(0, 2)] || '';
        return t;
      });
      kepviselokEpit();
      savokEpit();
      rajzol();
    })
    .catch(function (hiba) {
      el.talalat.textContent = '';
      el.lista.innerHTML =
        '<p class="jegyzet"><span class="jegyzet__ikon" aria-hidden="true">' +
        '<svg class="ikon"><use href="#i-figyelem"/></svg></span>' +
        '<span><strong>A terméklista most nem érhető el.</strong>' +
        'Nézze meg a <a href="termekek.html">Termékeink</a> oldalt, vagy keressen minket a ' +
        '<a href="mailto:rendeles@nagykunhus.hu">rendeles@nagykunhus.hu</a> címen.</span></p>';
      if (window.console) console.error('Teljes kínálat:', hiba);
    });
})();
