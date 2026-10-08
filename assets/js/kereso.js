/* =============================================================================
   Globális termékkereső — „Mit keres?”

   Minden oldal fejlécéből nyílik (és a `/` billentyűvel). Az adatot csak az
   első megnyitáskor tölti le, a közös termékmodulon át (termekszuro.js), így
   a Termékeinkkel ugyanazt a 422 tételt és ugyanazt a keresési logikát látja.

   Billentyűzet: ↓/↑ a találatok között, Enter megnyitja, Esc bezár.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.NkhTermek;
  var panel = document.getElementById('keresopanel');
  if (!T || !panel) return;

  var mezo = document.getElementById('globalis-kereso');
  var lista = panel.querySelector('[data-kereso-lista]');
  var allapot = document.getElementById('keresopanel-allapot');
  var mind = panel.querySelector('[data-kereso-mind]');
  var javaslatok = panel.querySelector('[data-kereso-javaslatok]');
  var MAX = 8;

  var osszes = null;
  var csapdaKi = null;
  var utolsoFokusz = null;
  var mindAlap = mind ? mind.getAttribute('href') : '';

  /* Javaslat-pillek: a termékcsoport-szűrők közül a leggyakoribb keresések.
     Ugyanazok a valódi terméknév-szűrők, mint a Termékeinken. */
  var JAVASLAT = ['Kolbász', 'Szalámi', 'Sonka', 'Szalonna', 'Párizsi', 'Füstölt', 'Szója- és gluténmentes'];
  if (javaslatok) {
    javaslatok.innerHTML = JAVASLAT.map(function (j) {
      return '<button type="button" class="pill" data-javaslat="' + T.esc(j) + '">' + T.esc(j) + '</button>';
    }).join('');
    javaslatok.addEventListener('click', function (e) {
      var b = e.target.closest('[data-javaslat]');
      if (!b) return;
      /* A „Szója- és gluténmentes” a névben „gluténmentes”-ként szerepel. */
      mezo.value = b.getAttribute('data-javaslat') === 'Szója- és gluténmentes' ? 'gluténmentes' : b.getAttribute('data-javaslat');
      keres();
      mezo.focus();
    });
  }

  function kiemel(nev, kif) {
    if (!kif) return T.esc(nev);
    var n = T.ekezetlen(nev);
    var i = n.indexOf(kif);
    if (i === -1) return T.esc(nev);
    return T.esc(nev.slice(0, i)) + '<mark>' + T.esc(nev.slice(i, i + kif.length)) + '</mark>' +
      T.esc(nev.slice(i + kif.length));
  }

  function keres() {
    if (!osszes) return;
    var nyers = mezo.value.trim();
    var kif = T.ekezetlen(nyers);

    if (mind) {
      mind.setAttribute('href', mindAlap + (nyers ? '?q=' + encodeURIComponent(nyers) : ''));
    }
    if (!kif) {
      lista.innerHTML = '';
      allapot.textContent = 'Írjon be terméknevet, cikkszámot vagy vonalkódot.';
      panel.removeAttribute('data-van-talalat');
      return;
    }

    var talalat = T.szur(osszes, { kifejezes: nyers });
    /* A névvel KEZDŐDŐ és a fotós találatok előre — gyorsabban felismerhető. */
    talalat.sort(function (a, b) {
      var ak = a._n.indexOf(kif) === 0 ? 0 : 1;
      var bk = b._n.indexOf(kif) === 0 ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return (b.k ? 1 : 0) - (a.k ? 1 : 0);
    });

    var html = talalat.slice(0, MAX).map(function (t) {
      var kep = t.k
        ? '<img src="' + T.kepUt(t, false, 0) + '" alt="" width="64" height="48" loading="lazy" decoding="async">'
        : '<span class="kereso-talalat__nincs" aria-hidden="true"></span>';
      return '<li><a class="kereso-talalat" href="' + T.termekUrl(t) + '">' + kep +
        '<span class="kereso-talalat__szoveg">' +
          '<span class="kereso-talalat__nev">' + kiemel(t.n, kif) + '</span>' +
          '<span class="kereso-talalat__meta">' + T.esc(T.csoportNev(t.c)) + ' &middot; ' + T.esc(t.c) + '</span>' +
        '</span>' +
        '<svg class="ikon" aria-hidden="true"><use href="#i-nyil-jobbra"/></svg></a></li>';
    }).join('');

    lista.innerHTML = html;
    panel.toggleAttribute('data-van-talalat', talalat.length > 0);
    if (!talalat.length) {
      allapot.textContent = 'Nincs találat erre: „' + nyers + '”. Próbálja tágabb szóval, vagy cikkszámmal.';
    } else if (talalat.length > MAX) {
      allapot.textContent = talalat.length + ' találat — az első ' + MAX + ' látszik.';
    } else {
      allapot.textContent = talalat.length + ' találat.';
    }
  }

  var idozito;
  mezo.addEventListener('input', function () {
    clearTimeout(idozito);
    idozito = setTimeout(keres, 90);
  });

  /* Billentyűzetes bejárás: a mezőből ↓ az első találatra, a találatok között
     ↑/↓, a legfelsőről ↑ vissza a mezőbe. Enter a mezőben az első találatot nyitja. */
  panel.addEventListener('keydown', function (e) {
    var linkek = Array.prototype.slice.call(lista.querySelectorAll('a'));
    var i = linkek.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      if (!linkek.length) return;
      e.preventDefault();
      (i === -1 ? linkek[0] : linkek[Math.min(i + 1, linkek.length - 1)]).focus();
    } else if (e.key === 'ArrowUp' && i !== -1) {
      e.preventDefault();
      (i === 0 ? mezo : linkek[i - 1]).focus();
    } else if (e.key === 'Enter' && document.activeElement === mezo) {
      e.preventDefault();
      if (linkek.length) { location.href = linkek[0].href; }
      else if (mind && mezo.value.trim()) { location.href = mind.href; }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      zar();
    }
  });

  function nyit() {
    if (panel.dataset.nyitva === 'igen') return;
    /* A mobilmenüből nyitva előbb azt zárjuk (az a saját zárásakor feloldaná
       a görgetés-tiltást, ezért ennek kell elsőnek lefutnia). */
    var menu = document.getElementById('mobilmenu');
    if (menu && menu.dataset.nyitva === 'igen') {
      var hb = document.getElementById('hamburger');
      if (hb) hb.click();
    }
    utolsoFokusz = document.activeElement;
    panel.dataset.nyitva = 'igen';
    panel.setAttribute('aria-hidden', 'false');
    document.body.dataset.menuNyitva = 'igen';
    if (typeof window.nkhFokuszCsapda === 'function') csapdaKi = window.nkhFokuszCsapda(panel);
    setTimeout(function () { mezo.focus(); mezo.select(); }, 30);

    if (!osszes) {
      allapot.textContent = 'Terméklista betöltése…';
      T.betolt().then(function (adat) {
        osszes = adat;
        keres();
      }).catch(function () {
        allapot.textContent = 'A terméklista most nem érhető el. Próbálja a Termékeink oldalon.';
      });
    } else {
      keres();
    }
  }

  function zar() {
    if (panel.dataset.nyitva !== 'igen') return;
    panel.dataset.nyitva = 'nem';
    panel.setAttribute('aria-hidden', 'true');
    delete document.body.dataset.menuNyitva;
    if (csapdaKi) { csapdaKi(); csapdaKi = null; }
    if (utolsoFokusz && document.contains(utolsoFokusz) && typeof utolsoFokusz.focus === 'function') {
      utolsoFokusz.focus();
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-kereso-nyit]')) { e.preventDefault(); nyit(); return; }
    if (e.target.closest('[data-kereso-zar]') || e.target === panel) zar();
  });

  /* „/” gyorsbillentyű — ha épp nem írnak valahová. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    e.preventDefault();
    nyit();
  });
})();
