// Polaroid Gallery — tiny vanilla-JS library for a mildly messy polaroid effect.
// Usage: add class "polaroid-gallery" to a container and put "polaroid-card"
// children inside. Tweak behaviour via data-polaroid (JSON) or _data/polaroid.yml.
(function () {
  'use strict';

  const defaults = {
    enabled: true,
    messiness: 18,
    maxRotation: 8,
    scale: 0.98,
    width: 280,
    margin: 8,
    shadow: true,
    hoverScale: 1.05
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function parseOptions(raw) {
    if (!raw) return defaults;
    try {
      return Object.assign({}, defaults, JSON.parse(raw));
    } catch (e) {
      return defaults;
    }
  }

  function scatter(container) {
    const opts = parseOptions(container.dataset.polaroid);
    if (opts.enabled === false || opts.enabled === 'false') return;

    const items = container.querySelectorAll('.polaroid-card, .polaroid-item');
    if (!items.length) return;

    container.classList.add('polaroid-scattered');

    items.forEach((item) => {
      const rotation = rand(-opts.maxRotation, opts.maxRotation);
      const offset = rand(-opts.messiness, opts.messiness);
      const scale = opts.scale;

      item.style.width = opts.width + 'px';
      item.style.margin = opts.margin + 'px';
      if (opts.shadow) item.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';

      item.style.transform = `rotate(${rotation}deg) translate(${offset}px, ${offset}px) scale(${scale})`;
      item.style.zIndex = Math.floor(rand(1, 50));
      item.style.transition = 'transform 0.25s ease, z-index 0s, box-shadow 0.25s ease';

      item.addEventListener('mouseenter', () => {
        item.style.zIndex = 999;
        item.style.transform = 'rotate(0deg) translate(0px, 0px) scale(' + opts.hoverScale + ')';
        if (opts.shadow) item.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.zIndex = Math.floor(rand(1, 50));
        item.style.transform = `rotate(${rotation}deg) translate(${offset}px, ${offset}px) scale(${scale})`;
        if (opts.shadow) item.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
      });
    });
  }

  function init() {
    document.querySelectorAll('.polaroid-gallery').forEach(scatter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
