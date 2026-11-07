'use strict';
const motion = window.PortfolioMotion;
let catalog = [];
try {
  catalog = JSON.parse(document.querySelector('#portfolio-projects')?.textContent || '[]');
} catch (error) {
  console.warn('[design-lab:catalog] The project links could not be read.', error);
}

// The preview tools belong to the study. Embedded comparisons hide them.
const preview = document.querySelector('.preview-controls');
const restore = document.querySelector('[data-show-preview]');
if (new URLSearchParams(location.search).has('embed')) {
  if (preview) preview.hidden = true;
} else {
  document.querySelector('[data-hide-preview]')?.addEventListener('click', () => {
    preview.hidden = true;
    restore.hidden = false;
    restore.focus();
  });
  restore?.addEventListener('click', () => {
    preview.hidden = false;
    restore.hidden = true;
    preview.querySelector('a').focus();
  });
}

// A bounded portfolio command parser. These commands never run a system shell.
const terminalForm = document.querySelector('#terminal-form');
if (terminalForm) {
  const input = document.querySelector('#terminal-command');
  const output = document.querySelector('#terminal-output');
  const history = [];
  let historyPosition = 0;
  const descriptions = {
    help: 'Available commands:\n  whoami  — name and role\n  about   — professional focus\n  skills  — technologies\n  work    — project links\n  cv      — open the CV link\n  clear   — clear this output',
    whoami: 'Ivan Kramarchuk\nPrincipal Software Engineer\nVancouver, Canada',
    about: 'I build useful tools and work on high-performance endpoint DLP systems: data movement, data classification, and policy enforcement.',
    skills: 'macOS · C++ · Swift · Objective-C\nEndpoint Security · System Extensions\nXPC · Code Signing · Privileged Helpers\nSwiftUI · Instruments · Unified Logging',
  };
  function runCommand(raw) {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    history.push(raw.trim());
    historyPosition = history.length;
    input.value = '';
    if (command === 'clear') {
      output.replaceChildren();
      return;
    }
    const block = document.createElement('div');
    const prompt = document.createElement('p');
    prompt.className = 'command-line';
    prompt.textContent = '~ % ' + raw.trim();
    block.append(prompt);
    const result = document.createElement('p');
    if (command === 'work') {
      catalog.forEach((app, index) => {
        const link = document.createElement('a');
        link.href = app.href;
        link.textContent = `${String(index + 1).padStart(2, '0')} / ${app.name}`;
        link.style.textDecoration = 'underline';
        result.append(link, document.createElement('br'));
      });
    } else if (command === 'cv') {
      const link = document.createElement('a');
      link.href = 'assets/Ivan_Kramarchuk_CV.pdf';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Read the current CV (PDF)';
      link.style.textDecoration = 'underline';
      result.append(link);
    } else {
      result.textContent = descriptions[command] || `Unknown command: ${raw.trim()}\nType help to see the available commands.`;
    }
    block.append(result);
    output.append(block);
    motion?.enter(block, {distance: 4, duration: 180});
    // Keep repeated use from making a long or heavy live region.
    while (output.children.length > 10) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  terminalForm.addEventListener('submit', event => {
    event.preventDefault();
    runCommand(input.value);
  });
  document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('click', () => runCommand(button.dataset.command));
  });
  input.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !history.length) return;
    event.preventDefault();
    historyPosition = Math.max(0, Math.min(history.length, historyPosition + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[historyPosition] || '';
  });
}

// Both tab sets support pointer, keyboard, and accessible selected state.
function setupTabs(selector, activate) {
  const tabs = [...document.querySelectorAll(selector)];
  if (!tabs.length) return;
  function select(tab, focus = false) {
    if (tab.getAttribute('aria-selected') === 'true') {
      if (focus) tab.focus();
      return;
    }
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    activate(tab);
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(tabs[next], true);
      }
    });
  });
}
setupTabs('[data-focus]', tab => {
  document.querySelectorAll('.focus-panel').forEach(panel => {
    panel.hidden = panel.id !== 'focus-' + tab.dataset.focus;
    if (!panel.hidden) motion?.enter(panel, {distance: 5, duration: 230});
  });
});

const products = ['workbundle', 'medicine-notes', 'translation-books'].map(slug => catalog.find(app => app.slug === slug));
let productRequest = 0;
let displayedProduct = 0;
setupTabs('[data-product]', async tab => {
  const request = ++productRequest;
  const index = Number(tab.dataset.product);
  const product = products[index];
  if (!product) return;
  const image = document.querySelector('#showcase-image');
  const panel = document.querySelector('#showcase-panel');
  motion?.cancel(image);
  // Fast tab changes keep the last choice. The current image stays usable while loading.
  if (index === displayedProduct) return;
  const source = product.shot;
  const preload = new Image();
  try {
    await new Promise((resolve, reject) => {
      preload.onload = resolve;
      preload.onerror = () => reject(new Error(`Cannot load ${product.name} preview`));
      preload.src = source;
    });
  } catch (error) {
    if (request !== productRequest) return;
    document.querySelectorAll('[data-product]').forEach(button => {
      const selected = Number(button.dataset.product) === displayedProduct;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelector('#showcase-caption').textContent = 'Preview could not load. Please try again.';
    console.warn('[design-lab:showcase] Kept the current preview after a load failure.', error);
    return;
  }
  if (request !== productRequest) return;
  const outgoing = motion?.animate(image, [{opacity: 1}, {opacity: 0}], {duration: 130, easing: 'ease-out', fill: 'forwards'});
  if (outgoing) await outgoing.finished.catch(() => {});
  if (request !== productRequest) return;
  image.src = source;
  image.alt = `${product.name} application screenshot`;
  panel.dataset.product = String(index);
  panel.setAttribute('aria-labelledby', tab.id);
  const link = document.querySelector('#showcase-link');
  link.href = product.href;
  link.setAttribute('aria-label', `Open ${product.name}`);
  document.querySelector('#showcase-caption').textContent = `0${index + 1} / ${product.name}`;
  document.querySelector('#showcase-platform').textContent = product.platform;
  displayedProduct = index;
  motion?.cancel(image);
  motion?.enter(image, {distance: 4, duration: 240});
});
