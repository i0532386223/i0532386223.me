'use strict';

// Screens remain ordinary image links when the dialog API is not available.
(() => {
  const dialog = document.querySelector('.image-dialog');
  if (!dialog?.showModal) return;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  let source;
  const close = () => dialog.close();
  document.querySelectorAll('[data-screenshot]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      source = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      caption.textContent = link.dataset.caption;
      dialog.showModal();
      dialog.querySelector('button').focus();
    });
  });
  dialog.querySelector('[data-close-image]').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }
  });
  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
    source?.focus();
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paused = () => {
    try { return localStorage.getItem('me.i0532386223.design-lab.motion') === 'off'; }
    catch { return false; }
  };
  if (reduced.matches || paused() || !('IntersectionObserver' in window)) return;
  const animations = new Set();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (reduced.matches || paused() || document.hidden) return;
      const animation = entry.target.animate?.([{opacity:.65,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:460,easing:'cubic-bezier(.22,1,.36,1)'});
      if (animation) {
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
      }
    });
  }, {threshold:.1});
  document.querySelectorAll('.product-intro,.product-art,.section-heading,.feature-grid article,.screenshot-gallery figure,.workflow li,.privacy-section>div,.support-card').forEach(el => observer.observe(el));
  const cancel = () => animations.forEach(animation => animation.cancel());
  reduced.addEventListener('change', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  window.addEventListener('storage', cancel);
  document.addEventListener('focusin', event => animations.forEach(animation => {
    if (animation.effect?.target?.contains(event.target)) animation.cancel();
  }));
})();
