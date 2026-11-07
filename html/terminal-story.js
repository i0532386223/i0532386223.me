'use strict';

// This is a finite introduction. It never delays or simulates a user command.
(() => {
  const terminal = document.querySelector('.terminal');
  const intro = document.querySelector('.terminal-intro');
  const motion = window.PortfolioMotion;
  if (!terminal || !intro || !motion) return;

  const rows = [...intro.querySelectorAll('[data-type-row]')];
  if (!rows.length) return;
  const segments = rows.map(row => {
    const target = row.querySelector('[data-type-text]');
    return {row, target, text: target.textContent, kind: target.dataset.typeText, count: 0};
  });
  let visible = false;
  let pageActive = true;
  let done = false;
  let index = 0;
  let timer = 0;
  let dueAt = 0;
  let remaining = 650;

  function stopTimer() {
    if (timer) {
      remaining = Math.max(0, dueAt - performance.now());
      clearTimeout(timer);
    }
    timer = 0;
  }

  function finish(reason) {
    stopTimer();
    done = true;
    segments.forEach(segment => {
      segment.target.textContent = segment.text;
      delete segment.row.dataset.typeState;
    });
    intro.dataset.typingState = 'complete';
    console.info('[design-lab:terminal] Show the complete introduction. ' + reason);
  }

  function updateSegment(segment) {
    segment.ink.textContent = segment.text.slice(0, segment.count);
    segment.rest.textContent = segment.text.slice(segment.count);
  }

  function schedule(delay) {
    remaining = delay;
    if (done || !visible || document.hidden || !pageActive || !motion.enabled) return;
    dueAt = performance.now() + delay;
    timer = setTimeout(step, delay);
  }

  function step() {
    timer = 0;
    if (!visible || document.hidden || !pageActive) { remaining = 80; return; }
    if (!motion.enabled) { finish('Motion is off.'); return; }
    const segment = segments[index];
    segment.row.dataset.typeState = 'active';
    intro.dataset.typingState = 'typing';
    segment.count++;
    updateSegment(segment);
    if (segment.count >= segment.text.length) {
      segment.row.dataset.typeState = 'done';
      index++;
      if (index >= segments.length) { finish('The sequence is finished.'); return; }
      schedule(segment.kind === 'command' ? 480 : segments[index].kind === 'command' ? 850 : 240);
    } else {
      const char = segment.text[segment.count - 1];
      schedule((segment.kind === 'command' ? 105 : 39) + (char === ' ' ? 28 : 0));
    }
  }

  function reconcile() {
    stopTimer();
    if (done) return;
    if (!motion.enabled) { finish('Motion is off.'); return; }
    intro.dataset.typingState = visible && !document.hidden && pageActive ? 'typing' : 'paused';
    schedule(remaining);
  }

  try {
    if (!motion.enabled) { finish('Use the static introduction.'); return; }
    segments.forEach(segment => {
      segment.ink = document.createElement('span');
      segment.ink.className = 'typing-ink';
      segment.rest = document.createElement('span');
      segment.rest.className = 'typing-rest';
      segment.rest.setAttribute('aria-hidden', 'true');
      segment.target.replaceChildren(segment.ink, segment.rest);
      segment.row.dataset.typeState = 'pending';
      updateSegment(segment);
    });
    intro.dataset.typingState = 'waiting';
    console.info('[design-lab:terminal] Start a single slow introduction when the console is visible. Input remains available.');
    // A user can take control at any time, including before the first character.
    terminal.querySelector('form')?.addEventListener('focusin', () => { if (!done) finish('The user is ready to type.'); });
    terminal.querySelectorAll('[data-command]').forEach(button => {
      button.addEventListener('click', () => { if (!done) finish('The user selected a command.'); });
    });
    document.addEventListener('portfolio:motionchange', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('pagehide', () => { pageActive = false; reconcile(); });
    window.addEventListener('pageshow', () => { pageActive = true; reconcile(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        reconcile();
      }, {threshold: 0.15}).observe(terminal);
    } else {
      visible = true;
      reconcile();
    }
  } catch (error) {
    finish('The animation could not start.');
    console.warn('[design-lab:terminal] Kept the introduction readable.', error);
  }
})();
