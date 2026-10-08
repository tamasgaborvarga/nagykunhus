/* =============================================================================
   Közös terméklista-logika — a Termékeink és a Rendelési lap is ezt használja.

   Egy helyen él a gyorsszűrők listája, a keresés és a kép-/hivatkozásképzés, hogy
   a két oldal ne csússzon szét. Adatot nem egészít ki: minden mező a hivatalos
   terméktáblából (data/termekek.json) származik.
   ========================================================================== */
(function () {
  'use strict';

  /* Az adatfájl útvonalát a saját <script> helyéből számoljuk, nem a böngészőben
     éppen megnyitott laphoz képest. Így akkor is betölt, ha az oldal nem a
     gyökérben, hanem alkönyvtárban vagy aldomainen fut. */
  function sajatGyoker() {
    var s = document.currentScript;
    if (!s) {
      var mind = document.getElementsByTagName('script');
      for (var i = mind.length - 1; i >= 0; i--) {
        if ((mind[i].src || '').indexOf('termekszuro.js') > -1) { s = mind[i]; break; }
      }
    }
    var src = (s && s.src) || '';
    var vag = src.indexOf('assets/js/termekszuro.js');
    return vag > -1 ? src.slice(0, vag) : '';
  }

  var GYOKER = sajatGyoker();
  var ADATFORRAS = GYOKER + 'data/termekek.json';
  var SPEC_URL = 'https://nagykunhus.hu/products/termekspecifikacio.php';
  var NYELV_NEV = { hu: 'magyar', ro: 'román', sk: 'szlovák', pl: 'lengyel', en: 'angol', de: 'német' };

  /* A gyorsszűrők KIZÁRÓLAG a valódi terméknevekben keresnek szövegrészletet —
     nem hivatalos kategóriák, mert a forrás nem közöl kategóriákat. */
  var GYORSSZURO = [
    { cim: 'Kolbász', kulcs: ['kolbasz'] },
    { cim: 'Szalámi', kulcs: ['szalami'] },
    { cim: 'Párizsi', kulcs: ['parizsi'] },
    { cim: 'Virsli', kulcs: ['virsli'] },
    { cim: 'Felvágott', kulcs: ['felvagott'] },
    { cim: 'Sonka', kulcs: ['sonka'] },
    { cim: 'Szalonna', kulcs: ['szalonna'] },
    { cim: 'Hurka, májas', kulcs: ['hurka', 'majas'] },
    { cim: 'Füstölt', kulcs: ['fustolt'] },
    { cim: 'Pácolt', kulcs: ['pac'] },
    { cim: 'Fagyasztott', kulcs: ['fagyasztott'] },
    { cim: 'Marha', kulcs: ['marha'] },
    { cim: 'Szója- és gluténmentes', kulcs: ['glutenmentes'] }
  ];

  /* ---------------------------------------------------------------- Csoportok
     A forrástábla NEM közöl kategórianevet, viszont a cikkszám első két jegye
     következetesen egy-egy termékcsaládot jelöl. A lenti nevek a mi saját,
     leíró rendezésünk a tényleges terméknevek alapján — nem hivatalos
     kategórianevek, és a főoldali lista ezt ki is írja. A cikkszámok, nevek és
     minden más adat változatlanul a terméktáblából jön. */
  var SAVOK = [
    { id: 'keszitmeny', cim: 'Húskészítmények' },
    { id: 'friss', cim: 'Friss hús és alapanyag' },
    { id: 'fagyasztott', cim: 'Fagyasztott' }
  ];

  /* A `kep` mező opcionális: ha meg van adva, a főoldali csoportfejléc ennek a
     cikkszámnak a fotóját mutatja. Enélkül a csoport első fotós terméke kerül oda,
     ami nem mindig a legjobb kép — ilyenkor ide írjuk be a választott cikkszámot. */
  var CSOPORTOK = [
    { e: '01', cim: 'Párizsi és virsli', sav: 'keszitmeny' },
    { e: '02', cim: 'Felvágottak és sonkák', sav: 'keszitmeny' },
    { e: '03', cim: 'Kolbászok, grill- és főzőkolbászok', sav: 'keszitmeny' },
    { e: '04', cim: 'Hurka, májas, disznósajt', sav: 'keszitmeny', kep: '04037' },
    { e: '05', cim: 'Szalámik és vastag kolbászok', sav: 'keszitmeny' },
    { e: '06', cim: 'Szeletelt készítmények', sav: 'keszitmeny' },
    { e: '08', cim: 'Szója- és gluténmentes készítmények', sav: 'keszitmeny' },
    { e: '09', cim: 'Tepertő, pörc, sertészsír', sav: 'keszitmeny' },
    { e: '10', cim: 'Füstölt és fűszerezett szalonnák', sav: 'keszitmeny', kep: '10012' },
    { e: '11', cim: 'Füstölt és pácolt húsok', sav: 'keszitmeny' },
    { e: '12', cim: 'Nyers szalonna, háj, toka', sav: 'friss', kep: '12008' },
    { e: '13', cim: 'Belsőségek és bél', sav: 'friss' },
    { e: '14', cim: 'Sertés — bontott és darabolt', sav: 'friss' },
    { e: '15', cim: 'Marha és borjú', sav: 'friss' },
    { e: '16', cim: 'Birka', sav: 'friss' },
    { e: '18', cim: 'Fagyasztott sertés', sav: 'fagyasztott' },
    { e: '19', cim: 'Fagyasztott marha', sav: 'fagyasztott' },
    { e: '21', cim: 'Fagyasztott birka', sav: 'fagyasztott' }
  ];

  /* A terméklista szétosztása a fenti csoportokra, a definíciók sorrendjében.
     Ha a forrásban új cikkszám-előtag jelenik meg, külön csoportként a végére
     kerül — nem tűnik el, de nevet sem találunk ki neki. */
  function csoportosit(lista) {
    var szerint = {};
    var sorrend = [];

    CSOPORTOK.forEach(function (cs) {
      szerint[cs.e] = { e: cs.e, cim: cs.cim, sav: cs.sav, tetelek: [] };
      sorrend.push(szerint[cs.e]);
    });

    lista.forEach(function (t) {
      var e = String(t.c).slice(0, 2);
      if (!szerint[e]) {
        szerint[e] = { e: e, cim: e + 'xxx — cikkszámcsoport', sav: '', tetelek: [] };
        sorrend.push(szerint[e]);
      }
      szerint[e].tetelek.push(t);
    });

    return sorrend.filter(function (cs) { return cs.tetelek.length; });
  }

  function ekezetlen(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* i = 0 az alapfotó, a többi -2, -3 utótagot kap. */
  function kepUt(t, nagy, i) {
    var utotag = (i > 0) ? '-' + (i + 1) : '';
    return GYOKER + 'assets/img/' + (nagy ? 'termekek' : 'termekek-thumb') + '/' + t.c + utotag + '.jpg';
  }

  /* Mértékegységek: csak a kilogramm osztható. A darabos egységeknél (RÚD, DB,
     PÁR, CS, KTG, FÉL) a tört mennyiség értelmetlen, ezért ott egész lépésköz jár.
     A szabály egy helyen él, mert a terméklap és a kosár is ugyanezt használja. */
  var OSZTHATO = ['KG'];

  function oszthato(egyseg) {
    return OSZTHATO.indexOf(String(egyseg || '').toUpperCase()) !== -1;
  }

  /* A mezőre érvényes minimum/lépésköz, és az egységhez igazított mennyiség. */
  function lepeskoz(egyseg) {
    return oszthato(egyseg) ? '0.1' : '1';
  }

  function mennyisegIgazit(ertek, egyseg) {
    if (!(ertek > 0)) return null;
    return oszthato(egyseg)
      ? Math.round(ertek * 100) / 100
      : Math.max(1, Math.round(ertek));
  }

  function egysegek(t) {
    return t.m.filter(Boolean).join(' / ');
  }

  /* A termékhez tartozó, ténylegesen létező mennyiségi egységek — duplikáció nélkül. */
  function egyseglista(t) {
    var ki = [];
    t.m.forEach(function (e) { if (e && ki.indexOf(e) === -1) ki.push(e); });
    return ki;
  }

  /* Egységes specifikáció-blokk MINDEN termékhez — ugyanaz a fejléc, ugyanaz a
     magyarázat, csak a hivatkozások forrása más. Két forrás lehet:
       1. helyben tárolt PDF (assets/spec/<cikkszám>-<nyelv>.pdf) → saját kiszolgáló,
       2. a gyártói végpont → robotellenőrzés után nyílik.
     Ha egy nyelv helyben is megvan, az élvez elsőbbséget. */
  function helyiSpec(cikk) {
    var m = window.NKH_SPEC;
    return (m && m[cikk]) ? m[cikk] : [];
  }

  function specPill(cim, url, helyi) {
    return '<a class="pill" href="' + url + '" target="_blank" rel="noopener">' +
      '<svg class="ikon" aria-hidden="true"><use href="#i-' +
      (helyi ? 'letoltes' : 'kulso') + '"/></svg>' + esc(cim) + '</a>';
  }

  function specBlokk(t) {
    var helyi = helyiSpec(t.c);
    var tavoli = (t.s || []).filter(function (ny) { return helyi.indexOf(ny) === -1; });

    var pillek = helyi.map(function (ny) {
      return specPill(NYELV_NEV[ny] || ny, GYOKER + 'assets/spec/' + t.c + '-' + ny + '.pdf', true);
    }).concat(tavoli.map(function (ny) {
      return specPill(NYELV_NEV[ny] || ny,
        SPEC_URL + '?cikkszam=' + encodeURIComponent(t.c) + '&nyelv=' + encodeURIComponent(ny),
        false);
    })).join('');

    var megjegyzes;
    if (!pillek) {
      megjegyzes = 'Ehhez a tételhez a gyártó nem tett közzé specifikációt.';
    } else if (!tavoli.length) {
      megjegyzes = 'A fájlok a saját kiszolgálónkról töltődnek le.';
    } else if (!helyi.length) {
      megjegyzes = 'A specifikáció a gyártói rendszerben nyílik meg; a megnyitás előtt ' +
        'rövid robotellenőrzés következik.';
    } else {
      megjegyzes = 'A <svg class="ikon" aria-hidden="true"><use href="#i-letoltes"/></svg> jelölt ' +
        'fájlok a saját kiszolgálónkról töltődnek, a ' +
        '<svg class="ikon" aria-hidden="true"><use href="#i-kulso"/></svg> jelöltek a gyártói ' +
        'rendszerben nyílnak meg, robotellenőrzés után.';
    }

    return '<div class="spec">' +
      '<h3 class="spec__cim">Termékspecifikáció</h3>' +
      '<p class="spec__mi">Az összetevőket, az allergéneket és a tápértéket a ' +
        'termékspecifikáció tartalmazza &mdash; ezeket a gyártói adatlap közli, ' +
        'nem a terméktábla.</p>' +
      (pillek ? '<div class="pillek spec__nyelvek">' + pillek + '</div>' : '') +
      '<p class="spec__megjegyzes">' + megjegyzes + '</p>' +
    '</div>';
  }

  /* Szűrés: szabad szöveg (név, cikkszám, vonalkód) + gyorsszűrő + „csak fotóval”. */
  function szur(osszes, allapot) {
    var kif = ekezetlen(allapot.kifejezes || '').trim();
    return osszes.filter(function (t) {
      if (allapot.csakFoto && !t.k) return false;
      if (allapot.aktivSzuro) {
        var talalt = allapot.aktivSzuro.kulcs.some(function (k) { return t._n.indexOf(k) !== -1; });
        if (!talalt) return false;
      }
      if (kif) {
        if (t._n.indexOf(kif) === -1 && t.c.indexOf(kif) === -1 && (t.e || '').indexOf(kif) === -1) {
          return false;
        }
      }
      return true;
    });
  }

  /* Gyorsszűrő-pillek felépítése egy tárolóba; a callback kapja az aktív szűrőt. */
  function pillekEpit(tarolo, valtozott) {
    var aktiv = null;
    GYORSSZURO.forEach(function (sz) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.textContent = sz.cim;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var bekapcsol = aktiv !== sz;
        Array.prototype.forEach.call(tarolo.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        aktiv = bekapcsol ? sz : null;
        b.setAttribute('aria-pressed', String(bekapcsol));
        valtozott(aktiv);
      });
      tarolo.appendChild(b);
    });
    return {
      torol: function () {
        aktiv = null;
        Array.prototype.forEach.call(tarolo.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
      }
    };
  }

  /* Tartalék betöltés: a `data/termekek.js` ugyanazt az adatot adja, csak
     sima <script>-ként. Erre akkor van szükség, ha a lapot nem kiszolgálóról,
     hanem fájlként (file://) nyitják meg — ott a fetch elbukik. */
  function tartalek() {
    return new Promise(function (kesz, hiba) {
      if (window.NKH_TERMEKEK) return kesz(window.NKH_TERMEKEK);
      var sc = document.createElement('script');
      sc.src = GYOKER + 'data/termekek.js';
      sc.onload = function () {
        if (window.NKH_TERMEKEK) kesz(window.NKH_TERMEKEK);
        else hiba(new Error('A tartalék adatfájl üres.'));
      };
      sc.onerror = function () { hiba(new Error('A tartalék adatfájl sem érhető el.')); };
      document.head.appendChild(sc);
    });
  }

  var betoltes = null;
  function betolt() {
    if (!betoltes) {
      betoltes = betoltNyers().catch(function (h) { betoltes = null; throw h; });
    }
    return betoltes;
  }

  function betoltNyers() {
    return fetch(ADATFORRAS).then(function (v) {
      if (!v.ok) throw new Error('HTTP ' + v.status);
      return v.json();
    }).catch(function (elso) {
      if (window.console) console.warn('Terméklista: a fetch elbukott, tartalékra váltunk.', elso);
      return tartalek();
    }).then(function (adat) {
      return adat.termekek.map(function (t) {
        t._n = ekezetlen(t.n);
        return t;
      });
    });
  }

  /* Termékoldal címe. Saját statikus oldalt (build.py) csak a FOTÓS termékek
     kapnak — a fotó nélküli 246 tétel a Termékeinken, cikkszámra szűrve nyílik.
     (A böngészős Cloudflare-feltöltés 1000 fájlos korlátja miatt, 2026-10-07.) */
  function vanOldala(t) { return !!(t && t.k); }

  function termekUrl(t) {
    return vanOldala(t)
      ? GYOKER + 'termek/' + encodeURIComponent(t.c) + '.html'
      : GYOKER + 'termekek.html?q=' + encodeURIComponent(t.c);
  }

  function csoportNev(c) {
    var e = String(c).slice(0, 2);
    for (var i = 0; i < CSOPORTOK.length; i++) {
      if (CSOPORTOK[i].e === e) return CSOPORTOK[i].cim;
    }
    return e + 'xxx — cikkszámcsoport';
  }

  /* Rendelés-vezérlő (mennyiség + egység + Listára) — a Termékeink kártyái és
     a termékoldalak közösen használják. `jelzes(szoveg)` a képernyőolvasós
     visszajelzést kapja. */
  function rendelesVezerlo(t, azonosito, jelzes) {
    var egysLista = egyseglista(t);
    var azonDb = 'db-' + azonosito;
    var azonEgys = 'egys-' + azonosito;
    var elso = egysLista[0] || '';

    var doboz = document.createElement('div');
    doboz.className = 'rendtermek__vezerlo termek__rendeles';
    doboz.innerHTML =
      '<label class="vizualisan-rejtett" for="' + azonDb + '">' + esc(t.n) + ' mennyisége</label>' +
      '<input type="number" id="' + azonDb + '" class="rendtermek__db" min="' + lepeskoz(elso) +
        '" step="' + lepeskoz(elso) + '" value="1" inputmode="' +
        (oszthato(elso) ? 'decimal' : 'numeric') + '">' +
      (egysLista.length > 1
        ? '<label class="vizualisan-rejtett" for="' + azonEgys + '">' + esc(t.n) + ' mennyiségi egysége</label>' +
          '<select id="' + azonEgys + '" class="rendtermek__egyseg">' +
            egysLista.map(function (e) { return '<option>' + esc(e) + '</option>'; }).join('') +
          '</select>'
        : '<span class="rendtermek__egyseg rendtermek__egyseg--fix">' + esc(elso) + '</span>') +
      '<button type="button" class="gomb gomb--elsodleges gomb--kicsi rendtermek__hozzaad">' +
        '<svg class="ikon" aria-hidden="true"><use href="#i-plusz"/></svg>Listára' +
      '</button>';

    var dbMezo = doboz.querySelector('.rendtermek__db');
    var egysMezo = doboz.querySelector('select.rendtermek__egyseg');

    /* Egységváltáskor a mező is átáll: darabos egységnél nincs tört mennyiség. */
    if (egysMezo) {
      egysMezo.addEventListener('change', function () {
        var lep = lepeskoz(egysMezo.value);
        dbMezo.min = lep;
        dbMezo.step = lep;
        dbMezo.inputMode = oszthato(egysMezo.value) ? 'decimal' : 'numeric';
        var mostani = mennyisegIgazit(parseFloat(String(dbMezo.value).replace(',', '.')), egysMezo.value);
        dbMezo.value = String(mostani || 1);
      });
    }

    var hozzaad = doboz.querySelector('.rendtermek__hozzaad');
    hozzaad.addEventListener('click', function () {
      if (!window.NkhKosar) return;
      var egyseg = egysMezo ? egysMezo.value : elso;
      var ertek = mennyisegIgazit(parseFloat(String(dbMezo.value).replace(',', '.')), egyseg);
      if (!ertek) { dbMezo.focus(); return; }
      dbMezo.value = String(ertek);
      window.NkhKosar.hozzaad(t, ertek, egyseg);
      hozzaad.classList.add('rendtermek__hozzaad--kesz');
      if (jelzes) jelzes(t.n + ' a rendelési listára került.');
      setTimeout(function () { hozzaad.classList.remove('rendtermek__hozzaad--kesz'); }, 900);
    });

    return doboz;
  }

  window.NkhTermek = {
    ADATFORRAS: ADATFORRAS,
    SPEC_URL: SPEC_URL,
    NYELV_NEV: NYELV_NEV,
    GYORSSZURO: GYORSSZURO,
    SAVOK: SAVOK,
    CSOPORTOK: CSOPORTOK,
    csoportosit: csoportosit,
    ekezetlen: ekezetlen,
    esc: esc,
    kepUt: kepUt,
    oszthato: oszthato,
    lepeskoz: lepeskoz,
    mennyisegIgazit: mennyisegIgazit,
    egysegek: egysegek,
    egyseglista: egyseglista,
    specBlokk: specBlokk,
    szur: szur,
    pillekEpit: pillekEpit,
    betolt: betolt,
    termekUrl: termekUrl,
    vanOldala: vanOldala,
    csoportNev: csoportNev,
    rendelesVezerlo: rendelesVezerlo
  };
})();
