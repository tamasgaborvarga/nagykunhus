/* =============================================================================
   Nagykun-Hús Kft. — globális viselkedés
   Minden oldalon fut. Nincs külső függőség.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------- Évszám a láblécben */
  var ev = document.getElementById('ev');
  if (ev) ev.textContent = String(new Date().getFullYear());

  /* ------------------------------------- Rendelési lap tételszáma a gombokon
     A listát a Termékeinken állítja össze a látogató, és a böngésző
     localStorage-ában él. Itt csak KIOLVASSUK, hogy a fejléc gombján minden
     oldalon látszódjon, hány tétel vár elküldésre. Ahol a kosar.js is fut,
     ott az onnantól élőben frissíti ugyanezeket a jelölőket. */
  (function kosarSzamlalo() {
    var jelolok = document.querySelectorAll('[data-kosarszam]');
    if (!jelolok.length) return;
    var db = 0;
    try {
      var nyers = localStorage.getItem('nkh-rendeles-v1');
      var adat = nyers ? JSON.parse(nyers) : [];
      db = Array.isArray(adat) ? adat.length : 0;
    } catch (e) {
      db = 0;   // privát ablak vagy tiltott tárolás
    }
    Array.prototype.forEach.call(jelolok, function (x) {
      x.textContent = db;
      x.hidden = db === 0;
    });
  })();

  /* --------------------------------------------------------------- Fejléc
     Három állapot, mind CSS-ben rajzolva:
       data-gorgetett="igen"  — elhagytuk az oldal tetejét: tömör háttér + finom blur
                                 (a sötét heró/oldalfej fölött addig átlátszó),
       data-tomor="igen"      — lefelé görgetünk: a fejléc kissé összehúzódik,
       felfelé görgetve a tömörítés feloldódik. Nem rejtjük el: a navigáció
       mindig kéznél marad. */
  var fejlec = document.getElementById('fejlec');
  if (fejlec) {
    var utolsoY = window.scrollY;
    var vartFrissites = false;
    var fejlecFrissit = function () {
      vartFrissites = false;
      var y = window.scrollY;
      fejlec.dataset.gorgetett = y > 12 ? 'igen' : 'nem';
      if (Math.abs(y - utolsoY) > 6) {
        fejlec.dataset.tomor = (y > utolsoY && y > 160) ? 'igen' : 'nem';
        utolsoY = y;
      }
    };
    fejlecFrissit();
    window.addEventListener('scroll', function () {
      if (!vartFrissites) { vartFrissites = true; requestAnimationFrame(fejlecFrissit); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------- Mobilmenü */
  var hamburger = document.getElementById('hamburger');
  var menu = document.getElementById('mobilmenu');
  var menuZar = document.getElementById('mobilmenu-zar');

  if (hamburger && menu) {
    var utolsoFokusz = null;

    var fokuszalhatoak = function () {
      return Array.prototype.filter.call(
        menu.querySelectorAll('a[href], button:not([disabled])'),
        function (el) { return el.offsetParent !== null; }
      );
    };

    var nyit = function () {
      utolsoFokusz = document.activeElement;
      menu.dataset.nyitva = 'igen';
      menu.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Menü bezárása');
      document.body.dataset.menuNyitva = 'igen';
      var elso = fokuszalhatoak()[0];
      if (elso) elso.focus();
    };

    var zar = function () {
      menu.dataset.nyitva = 'nem';
      menu.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Menü megnyitása');
      delete document.body.dataset.menuNyitva;
      // A fókusz oda tér vissza, ahonnan a menü nyílt; ha az elveszett, a hamburgerre.
      var cel = (utolsoFokusz && utolsoFokusz !== document.body && document.contains(utolsoFokusz))
        ? utolsoFokusz : hamburger;
      if (cel && typeof cel.focus === 'function') cel.focus();
    };

    hamburger.addEventListener('click', function () {
      if (menu.dataset.nyitva === 'igen') { zar(); } else { nyit(); }
    });
    if (menuZar) menuZar.addEventListener('click', zar);

    // Navigációs linkre kattintva záruljon (azonos oldali horgonyoknál is).
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) zar();
    });

    // ESC + egyszerű fókuszcsapda a nyitott menüben.
    document.addEventListener('keydown', function (e) {
      if (menu.dataset.nyitva !== 'igen') return;
      if (e.key === 'Escape') { e.preventDefault(); zar(); return; }
      if (e.key !== 'Tab') return;

      var elemek = fokuszalhatoak();
      if (!elemek.length) return;
      var elso = elemek[0];
      var utolso = elemek[elemek.length - 1];
      if (e.shiftKey && document.activeElement === elso) { e.preventDefault(); utolso.focus(); }
      else if (!e.shiftKey && document.activeElement === utolso) { e.preventDefault(); elso.focus(); }
    });

    // Asztali méretre váltáskor ne maradjon zárolt a törzs.
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && menu.dataset.nyitva === 'igen') zar();
    });
  }

  /* ------------------------------------------------ Megosztott fókuszcsapda
     A termék-modális és a képnagyító közösen használja: a háttér `inert` lesz
     (így se egérrel, se Tabbal nem érhető el), a Tab pedig körbejár a panelen.
     Az `inert` nélküli régebbi böngészőkben a Tab-kezelő önmagában is elegendő. */
  var HATTER = '.felso-sav, .fejlec, #fotartalom, .lablec';

  /* A párbeszédpanelek a `pages/` forrásban a törzs végén állnak, így a generált
     oldalon a `<main id="fotartalom">`-on BELÜL kötnek ki. A fókuszcsapda viszont
     épp a `#fotartalom`-ot teszi `inert`-té — ezzel a benne ülő panel is inertté
     válna, és a bezárógomb nem fogadna kattintást. Ezért nyitás előtt, egyszer,
     a `<body>` közvetlen gyerekévé emeljük őket. Mindhárom panel `position: fixed`,
     így az áthelyezés a megjelenésen nem változtat. */
  Array.prototype.forEach.call(
    document.querySelectorAll('[role="dialog"]'),
    function (panel) {
      if (panel.parentNode !== document.body) document.body.appendChild(panel);
    }
  );

  function fokuszalhatoElemek(panel) {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
  }

  function tabKezelo(panel) {
    return function (e) {
      if (e.key !== 'Tab') return;
      var elemek = fokuszalhatoElemek(panel);
      if (!elemek.length) return;
      var elso = elemek[0];
      var utolso = elemek[elemek.length - 1];
      if (e.shiftKey && document.activeElement === elso) { e.preventDefault(); utolso.focus(); }
      else if (!e.shiftKey && document.activeElement === utolso) { e.preventDefault(); elso.focus(); }
      else if (!panel.contains(document.activeElement)) { e.preventDefault(); elso.focus(); }
    };
  }

  window.nkhFokuszCsapda = function (panel) {
    var hatter = Array.prototype.slice.call(document.querySelectorAll(HATTER));
    hatter.forEach(function (el) { el.inert = true; });
    var kezelo = tabKezelo(panel);
    document.addEventListener('keydown', kezelo, true);

    return function kikapcsol() {
      document.removeEventListener('keydown', kezelo, true);
      hatter.forEach(function (el) { el.inert = false; });
    };
  };

  /* ----------------------------------------------------- Mozgásrendszer
     Egyetlen IntersectionObserver kezeli az összes görgetésre induló mozgást:
       [data-megjelen]  — szekció/blokk: opacity + 20px felúszás (MEDIUM),
                          a közvetlen gyerekek CSS-ben lépcsőznek (--i, 70ms),
       [data-feltar]    — nagy kép: clip-path feltárás + finom méretezés (SLOW),
       [data-szamlalo]  — szám: visszafogott count-up (SLOW, ease-out),
       [data-idovonal]  — a függőleges vonal a görgetéssel együtt rajzolódik.
     Csökkentett mozgásnál minden azonnal a végállapotban van. */
  var mozgasCsokkentes = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vanIO = 'IntersectionObserver' in window;

  /* Lépcsőzés-index a csoportok gyerekeinek (a CSS a --i-ből számol késleltetést). */
  Array.prototype.forEach.call(document.querySelectorAll('[data-megjelen]'), function (cs) {
    Array.prototype.forEach.call(cs.children, function (gy, i) {
      gy.style.setProperty('--i', String(Math.min(i, 8)));
    });
  });

  function szamlal(el) {
    var cel = parseFloat(el.getAttribute('data-szamlalo'));
    var utotag = el.getAttribute('data-utotag') || '';
    if (isNaN(cel)) return;
    if (mozgasCsokkentes) { el.textContent = cel + utotag; return; }
    var hossz = 1400;
    var kezd = null;
    var lepes = function (ido) {
      if (kezd === null) kezd = ido;
      var p = Math.min(1, (ido - kezd) / hossz);
      var k = 1 - Math.pow(1 - p, 3);            // ease-out cubic
      el.textContent = Math.round(cel * k) + utotag;
      if (p < 1) requestAnimationFrame(lepes);
    };
    requestAnimationFrame(lepes);
  }

  var figyelt = document.querySelectorAll('[data-megjelen], [data-feltar], [data-szamlalo], [data-idopont]');
  if (mozgasCsokkentes || !vanIO) {
    Array.prototype.forEach.call(figyelt, function (el) {
      if (el.hasAttribute('data-megjelen')) el.dataset.megjelen = 'lathato';
      if (el.hasAttribute('data-feltar')) el.dataset.feltar = 'lathato';
      if (el.hasAttribute('data-idopont')) el.dataset.idopont = 'lathato';
      if (el.hasAttribute('data-szamlalo')) {
        el.textContent = el.getAttribute('data-szamlalo') + (el.getAttribute('data-utotag') || '');
      }
    });
  } else if (figyelt.length) {
    /* A számlálók a kezdőértékről indulnak — de csak ha JS fut, így JS nélkül a
       valós szám látszik. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-szamlalo]'), function (el) {
      el.textContent = '0' + (el.getAttribute('data-utotag') || '');
    });
    var figyelo = new IntersectionObserver(function (bejegyzesek) {
      bejegyzesek.forEach(function (b) {
        if (!b.isIntersecting) return;
        var c = b.target;
        if (c.hasAttribute('data-megjelen')) c.dataset.megjelen = 'lathato';
        if (c.hasAttribute('data-feltar')) c.dataset.feltar = 'lathato';
        if (c.hasAttribute('data-idopont')) c.dataset.idopont = 'lathato';
        if (c.hasAttribute('data-szamlalo')) szamlal(c);
        figyelo.unobserve(c);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(figyelt, function (el) { figyelo.observe(el); });
  }

  /* Idővonal: a kitöltő vonal a lista görgetési haladásával nő (scaleY).
     Csak transform — nincs layout. */
  var idovonalak = document.querySelectorAll('[data-idovonal]');
  if (idovonalak.length && !mozgasCsokkentes) {
    var vartIdo = false;
    var idoFrissit = function () {
      vartIdo = false;
      var vh = window.innerHeight;
      Array.prototype.forEach.call(idovonalak, function (lista) {
        var r = lista.getBoundingClientRect();
        var p = (vh * 0.62 - r.top) / Math.max(1, r.height);
        p = Math.max(0, Math.min(1, p));
        lista.style.setProperty('--haladas', p.toFixed(4));
      });
    };
    idoFrissit();
    window.addEventListener('scroll', function () {
      if (!vartIdo) { vartIdo = true; requestAnimationFrame(idoFrissit); }
    }, { passive: true });
    window.addEventListener('resize', idoFrissit);
  } else {
    Array.prototype.forEach.call(idovonalak, function (l) { l.style.setProperty('--haladas', '1'); });
  }
})();

/* ---------------------------------------------- Térkép: betöltés csak kattintásra
   A Google Maps beágyazás alapból nem töltődik be, így a látogató IP-címe nem jut
   el a Google-hez addig, amíg erre maga nem ad utasítást. Lásd adatkezeles.html. */
(function () {
  'use strict';

  var doboz = document.querySelector('[data-terkep]');
  if (!doboz) return;

  var gomb = doboz.querySelector('[data-terkep-betolt]');
  if (!gomb) return;

  gomb.addEventListener('click', function () {
    var keret = document.createElement('iframe');
    keret.src = doboz.getAttribute('data-terkep-src');
    keret.title = doboz.getAttribute('data-terkep-cim');
    keret.loading = 'lazy';
    keret.referrerPolicy = 'no-referrer-when-downgrade';
    keret.setAttribute('allowfullscreen', '');
    doboz.innerHTML = '';
    doboz.appendChild(keret);
  });
})();
