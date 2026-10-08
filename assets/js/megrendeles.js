/* =============================================================================
   Rendelési lap — megrendelői adatok és a kész levél összeállítása.

   FONTOS: ez NEM webshop. A gyártó nyilvános terméktáblája nem közöl árat, és a cég
   közlése szerint a megrendeléseket kizárólag e-mailben fogadja. A lap ezért nem
   számol árat, nem vesz fel fizetést és nem köt szerződést — csak összeállítja a
   tételsort, amit a felhasználó elküld a rendeles@nagykunhus.hu címre.

   A terméklista NEM itt van: egyetlen lista létezik, a Termékeink oldalon. Onnan
   kerülnek a tételek a rendelési listára. A kosarat a közös assets/js/kosar.js
   kezeli, ez a modul csak az űrlapot, az előnézetet és a beküldési ágakat viszi.
   ========================================================================== */
(function () {
  'use strict';

  var K = window.NkhKosar;
  if (!K) return;

  var CEL_EMAIL = 'rendeles@nagykunhus.hu';

  var el = {
    allapot: document.getElementById('rendeles-allapot'),
    kosarTukor: document.getElementById('kosar-db-tukor'),

    urlap: document.getElementById('rendeles-urlap'),
    elonezet: document.getElementById('rendeles-elonezet'),
    kuldes: document.getElementById('rendeles-kuldes'),
    masolas: document.getElementById('rendeles-masolas'),
    letoltes: document.getElementById('rendeles-letoltes'),
    valasz: document.getElementById('rendeles-valasz')
  };

  if (!el.urlap) return;

  /* ------------------------------------------------------- Levél összeállítása */
  function urlapErtek(nev) {
    var m = el.urlap && el.urlap.elements[nev];
    return m ? m.value.trim() : '';
  }

  function tetelsor() {
    return K.tetelek().map(function (t, i) {
      return (i + 1) + '. ' + t.c + ' — ' + t.n + ' — ' + t.db + ' ' + t.e;
    }).join('\n');
  }

  function levelTorzs() {
    var sorok = [
      'MEGRENDELÉS – a nagykunhus.hu rendelési lapjáról',
      '',
      'Megrendelő: ' + (urlapErtek('nev') || '[nincs megadva]'),
      'Cég / intézmény: ' + (urlapErtek('ceg') || '[nincs megadva]'),
      'Telefon: ' + (urlapErtek('telefon') || '[nincs megadva]'),
      'E-mail: ' + (urlapErtek('email') || '[nincs megadva]'),
      'Szállítási cím: ' + (urlapErtek('cim') || '[nincs megadva]'),
      'Kívánt átvételi idő: ' + (urlapErtek('idopont') || '[nincs megadva]'),
      '',
      'TÉTELEK (' + K.tetelek().length + ' db):',
      tetelsor(),
      ''
    ];
    var megj = urlapErtek('megjegyzes');
    if (megj) { sorok.push('Megjegyzés:', megj, ''); }
    sorok.push('Kérem a megrendelés visszaigazolását és az árajánlatot.');
    return sorok.join('\n');
  }

  /* A lista bármely változása ide fut be: az előnézet, a tükörszámláló és a
     beküldő gombok állapota mindig a kosárral együtt mozog. */
  function listaValtozott() {
    var db = K.tetelek().length;
    if (el.kosarTukor) el.kosarTukor.textContent = db;
    if (el.kuldes) el.kuldes.disabled = db === 0;
    if (el.masolas) el.masolas.disabled = db === 0;
    if (el.letoltes) el.letoltes.disabled = db === 0;
    elonezetFrissit();
  }

  function elonezetFrissit() {
    if (!el.elonezet) return;
    var db = K.tetelek().length;
    el.elonezet.textContent = db ? levelTorzs() : '';
    el.elonezet.hidden = db === 0;
  }

  function valaszUzenet(html) {
    el.valasz.hidden = false;
    el.valasz.innerHTML = html;
  }

  /* ------------------------------------------------------------- Beküldés-ág */
  var KOTELEZO = {
    nev: 'Kérjük, adja meg a nevét.',
    telefon: 'Kérjük, adjon meg egy telefonszámot.',
    email: 'Kérjük, adjon meg egy érvényes e-mail címet.',
    cim: 'Kérjük, adja meg a szállítási vagy átvételi címet.'
  };

  function urlapEllenoriz() {
    var elsoHibas = null;
    Object.keys(KOTELEZO).forEach(function (nev) {
      var mezo = el.urlap.elements[nev];
      var ertek = mezo.value.trim();
      var rendben = nev === 'email'
        ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ertek)
        : (nev === 'telefon' ? ertek.replace(/\D/g, '').length >= 6 : ertek.length >= 2);
      var hibaElem = document.getElementById(nev + '-hiba');
      mezo.setAttribute('aria-invalid', rendben ? 'false' : 'true');
      if (hibaElem) hibaElem.textContent = rendben ? '' : KOTELEZO[nev];
      if (!rendben && !elsoHibas) elsoHibas = mezo;
    });
    if (elsoHibas) { elsoHibas.focus(); return false; }
    return true;
  }

  Array.prototype.forEach.call(el.urlap.querySelectorAll('input, textarea'), function (mezo) {
    mezo.addEventListener('input', elonezetFrissit);
    mezo.addEventListener('blur', function () {
      if (mezo.getAttribute('aria-invalid') === 'true') urlapEllenoriz();
    });
  });

  el.urlap.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!K.tetelek().length) return;
    if (!urlapEllenoriz()) { el.valasz.hidden = true; return; }

    var targy = 'Megrendelés – ' + (urlapErtek('ceg') || urlapErtek('nev'));
    var mailto = 'mailto:' + CEL_EMAIL +
      '?subject=' + encodeURIComponent(targy) +
      '&body=' + encodeURIComponent(levelTorzs());

    // A mailto hossza böngészőnként korlátos; hosszú listánál a letöltés a biztos út.
    if (mailto.length > 1900) {
      valaszUzenet(
        '<strong>Ez a lista túl hosszú a levelezőprogram automatikus megnyitásához.</strong>' +
        '<p style="margin:.5rem 0 .75rem">Töltse le vagy másolja ki a listát, és csatolja/illessze be ' +
        'egy levélbe a <a href="mailto:' + CEL_EMAIL + '">' + CEL_EMAIL + '</a> címre.</p>');
      el.valasz.setAttribute('tabindex', '-1');
      el.valasz.focus();
      return;
    }

    window.location.href = mailto;
    valaszUzenet(
      '<strong>A levél összeállt.</strong>' +
      '<p style="margin:.5rem 0 .75rem">Ha a levelezőprogram nem nyílt meg, töltse le vagy másolja ki ' +
      'a listát, és küldje el a <a href="mailto:' + CEL_EMAIL + '">' + CEL_EMAIL + '</a> címre. ' +
      'A megrendelés a cég visszaigazolásával válik véglegessé.</p>');
    el.valasz.setAttribute('tabindex', '-1');
    el.valasz.focus();
  });

  el.masolas.addEventListener('click', function () {
    var szoveg = levelTorzs();
    var kesz = function () {
      valaszUzenet('<strong>A lista a vágólapra került.</strong>' +
        '<p style="margin:.5rem 0 0">Illessze be egy levélbe a <a href="mailto:' + CEL_EMAIL + '">' +
        CEL_EMAIL + '</a> címre.</p>');
    };
    /* Tartalék: a vágólap-API csak fókuszált, biztonságos környezetben megy, és
       engedély híján némán elutasít. Ilyenkor a régi execCommand még működik. */
    var tartalek = function () {
      var mezo = document.createElement('textarea');
      mezo.value = szoveg;
      mezo.setAttribute('readonly', '');
      mezo.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(mezo);
      mezo.select();
      var sikerult = false;
      try { sikerult = document.execCommand('copy'); } catch (e) { sikerult = false; }
      document.body.removeChild(mezo);
      if (sikerult) kesz();
      else valaszUzenet('<strong>A másolás nem sikerült.</strong>' +
        '<p style="margin:.5rem 0 0">Jelölje ki az alábbi előnézetet, és másolja ki kézzel, ' +
        'vagy használja a <em>Letöltés (.txt)</em> gombot.</p>');
    };

    /* Óra a vágólap-API-ra: ha a dokumentum nincs fókuszban, a Chrome ígérete
       némán függőben maradhat — ilyenkor a gomb halottnak látszana. Ezért
       fókuszt ellenőrzünk, és időkorláttal a tartalékra váltunk. Mindkét ág
       csak egyszer üzenhet. */
    var lezart = false;
    var egyszer = function (fn) { return function () { if (!lezart) { lezart = true; fn(); } }; };

    if (navigator.clipboard && navigator.clipboard.writeText && document.hasFocus()) {
      var ora = setTimeout(egyszer(tartalek), 700);
      navigator.clipboard.writeText(szoveg).then(
        egyszer(function () { clearTimeout(ora); kesz(); }),
        egyszer(function () { clearTimeout(ora); tartalek(); })
      );
    } else {
      egyszer(tartalek)();
    }
  });

  el.letoltes.addEventListener('click', function () {
    var blob = new Blob([levelTorzs()], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var ma = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'nagykun-hus-megrendeles-' + ma + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    valaszUzenet('<strong>A lista letöltve.</strong>' +
      '<p style="margin:.5rem 0 0">Csatolja egy levélhez a <a href="mailto:' + CEL_EMAIL + '">' +
      CEL_EMAIL + '</a> címre.</p>');
  });

  /* ------------------------------------------------------------------ Indítás */
  K.figyel(listaValtozott);

  /* A panel „Tovább a megrendeléshez" gombja ezen az oldalon az űrlapra visz. */
  K.tovabbKezelo = function () {
    K.panelZar();
    var mezo = document.getElementById('nev');
    if (mezo) setTimeout(function () { mezo.focus(); }, 120);
  };

  K.uritesUtan = function () {
    if (el.valasz) el.valasz.hidden = true;
    if (el.allapot) el.allapot.textContent = 'A rendelési lap kiürítve.';
  };

  /* A bélyegképekhez kell a terméktábla; ha nem tölt be, a lista szöveggel megy. */
  if (window.NkhTermek) {
    window.NkhTermek.betolt().then(function (adat) {
      K.termekek(adat);
    }).catch(function (hiba) {
      if (window.console) console.warn('Rendelési lap: a terméktábla nem töltött be.', hiba);
      listaValtozott();
    });
  }

  listaValtozott();
})();
