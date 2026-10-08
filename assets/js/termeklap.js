/* =============================================================================
   Termékoldal (termek/<cikkszám>.html) — rendelés-vezérlő és képváltó.

   Az oldal tartalma statikus (build.py írja), ez a modul csak a két
   interaktív elemet kapcsolja be: a „Listára” vezérlőt (közös kosár) és a
   fotócsíkot. JavaScript nélkül is olvasható és rendelhető (a Rendelési lap
   gombja ott marad tartaléknak).
   ========================================================================== */
(function () {
  'use strict';

  var lap = document.querySelector('[data-termeklap]');
  if (!lap) return;
  var cikk = lap.getAttribute('data-termeklap');

  /* ------------------------------------------------------------ Képváltó */
  var fokep = document.getElementById('termeklap-fokep');
  var csik = lap.querySelector('.kepcsik');
  if (fokep && csik) {
    csik.addEventListener('click', function (e) {
      var gomb = e.target.closest('.kepcsik__elem');
      if (!gomb) return;
      fokep.src = gomb.getAttribute('data-kep');
      fokep.removeAttribute('srcset');
      Array.prototype.forEach.call(csik.querySelectorAll('.kepcsik__elem'), function (x) {
        x.removeAttribute('aria-current');
      });
      gomb.setAttribute('aria-current', 'true');
    });
  }

  /* --------------------------------------------------- Rendelés-vezérlő */
  var T = window.NkhTermek;
  var hely = lap.querySelector('[data-termeklap-rendeles]');
  if (!T || !hely) return;

  var allapot = document.createElement('p');
  allapot.className = 'vizualisan-rejtett';
  allapot.setAttribute('role', 'status');
  allapot.setAttribute('aria-live', 'polite');
  hely.parentNode.appendChild(allapot);

  T.betolt().then(function (osszes) {
    if (window.NkhKosar) window.NkhKosar.termekek(osszes);
    for (var i = 0; i < osszes.length; i++) {
      if (osszes[i].c === cikk) {
        hely.innerHTML = '';
        hely.appendChild(T.rendelesVezerlo(osszes[i], 'lap-' + cikk, function (s) {
          allapot.textContent = s;
        }));
        return;
      }
    }
  }).catch(function () { /* a tartalék gomb marad a helyén */ });
})();
