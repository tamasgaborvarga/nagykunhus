/* =============================================================================
   Galéria — lightbox (billentyűzettel is) és kattintásra betöltődő videók.
   A videók csak kattintás után töltenek be YouTube-ról: így az oldal gyorsan
   renderel, és nem tölt be harmadik felet kérés nélkül.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- Lightbox */
  var doboz = document.getElementById('lightbox');

  if (doboz) {
    var kep = doboz.querySelector('img');
    var felirat = doboz.querySelector('.lightbox__felirat');
    var gombok = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    var aktiv = -1;
    var utolsoFokusz = null;
    var csapdaKi = null;

    var mutat = function (i) {
      if (i < 0) i = gombok.length - 1;
      if (i >= gombok.length) i = 0;
      aktiv = i;
      var g = gombok[i];
      kep.src = g.dataset.lightbox;
      kep.alt = g.dataset.alt || '';
      felirat.textContent = (g.dataset.felirat || '') + '  (' + (i + 1) + ' / ' + gombok.length + ')';
    };

    var nyit = function (i) {
      utolsoFokusz = document.activeElement;
      mutat(i);
      doboz.dataset.nyitva = 'igen';
      doboz.setAttribute('aria-hidden', 'false');
      document.body.dataset.menuNyitva = 'igen';
      if (typeof window.nkhFokuszCsapda === 'function') {
        csapdaKi = window.nkhFokuszCsapda(doboz);
      }
      doboz.querySelector('.lightbox__zar').focus();
    };

    var zar = function () {
      doboz.dataset.nyitva = 'nem';
      doboz.setAttribute('aria-hidden', 'true');
      delete document.body.dataset.menuNyitva;
      if (csapdaKi) { csapdaKi(); csapdaKi = null; }
      kep.removeAttribute('src');
      if (utolsoFokusz && typeof utolsoFokusz.focus === 'function') utolsoFokusz.focus();
    };

    gombok.forEach(function (g, i) {
      g.addEventListener('click', function () { nyit(i); });
    });

    doboz.addEventListener('click', function (e) {
      if (e.target === doboz) zar();
      if (e.target.closest('.lightbox__zar')) zar();
      if (e.target.closest('.lightbox__elozo')) mutat(aktiv - 1);
      if (e.target.closest('.lightbox__kovetkezo')) mutat(aktiv + 1);
    });

    document.addEventListener('keydown', function (e) {
      if (doboz.dataset.nyitva !== 'igen') return;
      if (e.key === 'Escape') { e.preventDefault(); zar(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mutat(aktiv - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); mutat(aktiv + 1); }
    });
  }

  /* ------------------------------------------------ Videó: kattintásra töltünk */
  Array.prototype.forEach.call(document.querySelectorAll('[data-video]'), function (gomb) {
    gomb.addEventListener('click', function () {
      var azon = gomb.dataset.video;
      var keret = gomb.closest('.video__keret');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(azon) + '?autoplay=1&rel=0';
      iframe.title = gomb.dataset.cim || 'Videó';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      keret.innerHTML = '';
      keret.appendChild(iframe);
    });
  });
})();
