'use strict';

// Motion adds emphasis. The HTML stays visible if this file or an API fails.
(() => {
  const preferenceKey = 'me.i0532386223.design-lab.motion';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const toggle = document.querySelector('[data-motion-toggle]');
  let userPaused = false;
  let enabled = false;
  try {
    userPaused = localStorage.getItem(preferenceKey) === 'off';
  } catch (error) {
    console.info('[design-lab:motion] Preferences are not available. Use session controls.', error.name);
  }

  function cancel(element) {
    for (const animation of [...active]) {
      if (!element || animation.effect?.target === element) animation.cancel();
    }
  }

  function animate(element, frames, options = {}) {
    if (!element || !enabled || document.hidden || !element.animate) return null;
    cancel(element);
    try {
      const animation = element.animate(frames, {
        duration: 520,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'backwards',
        ...options,
      });
      active.add(animation);
      animation.addEventListener('cancel', () => active.delete(animation), {once: true});
      animation.finished.then(() => {
        // A short outgoing image fade holds its final frame until the image swap.
        if (options.fill !== 'forwards') animation.cancel();
      }).catch(() => {}); // Cancellation is expected when motion is disabled.
      return animation;
    } catch (error) {
      console.warn('[design-lab:motion] The effect was skipped; content stays visible.', error);
      return null;
    }
  }

  function enter(element, {distance = 10, delay = 0, duration = 560, opacity = 0} = {}) {
    return animate(element, [
      {opacity, transform: `translateY(${distance}px)`},
      {opacity: 1, transform: 'translateY(0)'},
    ], {duration, delay});
  }

  function syncPreference() {
    enabled = !reduced.matches && !userPaused;
    document.documentElement.dataset.motion = reduced.matches ? 'reduced' : userPaused ? 'off' : 'full';
    if (!enabled) {
      cancel();
    }
    if (toggle) {
      const label = reduced.matches ? 'Animation is off in system settings' : enabled ? 'Pause animation' : 'Enable animation';
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
      toggle.querySelector('img').src = `assets/icons/${enabled ? 'pause' : 'play'}.svg`;
    }
    document.dispatchEvent(new CustomEvent('portfolio:motionchange', {detail: {enabled}}));
  }

  window.PortfolioMotion = {animate, enter, cancel, get enabled() { return enabled; }};
  syncPreference();
  reduced.addEventListener('change', syncPreference);
  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    try {
      localStorage.setItem(preferenceKey, userPaused ? 'off' : 'on');
    } catch (error) {
      console.info('[design-lab:motion] The choice applies to this page only.', error.name);
    }
    syncPreference();
  });
  window.addEventListener('storage', event => {
    if (event.key !== preferenceKey) return;
    userPaused = event.newValue === 'off';
    syncPreference();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
  });
  // Keyboard focus must never wait for an entrance effect.
  document.addEventListener('focusin', event => {
    for (const animation of [...active]) {
      if (animation.effect?.target?.contains(event.target)) animation.cancel();
    }
  });

  function sequence(selector, options = {}) {
    document.querySelectorAll(selector).forEach((element, index) => {
      enter(element, {...options, delay: (options.delay || 0) + Math.min(index, 5) * (options.step || 65)});
    });
  }

  // Generic entrance effects finish once. Each special scene owns its animation.
  if (window.scrollY < 80 && (!location.hash || location.hash === '#top')) {
    enter(document.querySelector('.site-header'), {distance: 0, duration: 450});
    if (document.body.classList.contains('horizon')) {
      sequence('.hero-copy > *', {distance: 12, duration: 760, step: 60});
      enter(document.querySelector('.horizon-caption'), {distance: 0, delay: 320, duration: 700});
    } else if (document.body.classList.contains('signal')) {
      sequence('.signal-word', {distance: 24, duration: 640, step: 85, opacity: .15});
      sequence('.signal-intro > *', {distance: 6, delay: 130, duration: 500, step: 55});
    } else if (document.body.classList.contains('field-notes')) {
      sequence('.field-intro > *', {distance: 6, duration: 680, step: 65});
      enter(document.querySelector('.field-hero figure'), {distance: 8, delay: 90, duration: 850});
    } else if (document.body.classList.contains('systems-lab')) {
      sequence('.lab-intro > *', {distance: 8, duration: 600, step: 70});
      enter(document.querySelector('.terminal'), {distance: 10, delay: 70, duration: 650});
    } else if (document.body.classList.contains('object-studio')) {
      sequence('.studio-intro > *', {distance: 10, duration: 650, step: 60});
      enter(document.querySelector('.studio-showcase'), {distance: 12, delay: 90, duration: 800});
    }
  }

  // Reveal a section only when it is first reached. Unobserved content stays visible.
  const targets = document.querySelectorAll([
    'section > .section-label', '.split-statement > *', '.horizon-skills > span',
    '.horizon-work > h2', '.app-row', '.horizon-contact > h2',
    '.signal-section-head', '.signal-project', '.signal-about > div > *',
    '.field-heading', '.field-project', '.field-about > *',
    '.lab-work > h2', '.lab-project', '.lab-about > h2', '.focus-explorer',
    '.studio-section-heading', '.studio-product', '.studio-about > div > *',
  ].join(','));
  if ('IntersectionObserver' in window) {
    const siblingCount = new WeakMap();
    const delays = new WeakMap();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.dataset.motionReveal = 'done';
        const anchored = location.hash && entry.target.closest(location.hash === '#main' ? 'main' : '[id]')?.id === location.hash.slice(1);
        if (entry.boundingClientRect.top >= 0 && !anchored) {
          enter(entry.target, {
            distance: document.body.classList.contains('field-notes') ? 6 : 10,
            duration: document.body.classList.contains('field-notes') ? 680 : 560,
            delay: delays.get(entry.target),
          });
        }
      }
    }, {threshold: .06, rootMargin: '0px 0px -3% 0px'});
    targets.forEach(element => {
      const index = siblingCount.get(element.parentElement) || 0;
      siblingCount.set(element.parentElement, index + 1);
      delays.set(element, Math.min(index, 3) * 55);
      element.dataset.motionReveal = 'waiting';
      observer.observe(element);
    });
  }

})();
