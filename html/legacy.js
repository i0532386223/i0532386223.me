'use strict';

// Keep the original page styles. Native browser APIs replace the old plugins.
(() => {
  const toggle = document.querySelector('.navbar-toggle');
  const menu = document.querySelector('.navbar-collapse');
  function closeMenu(focus = false) {
    menu.classList.remove('in');
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const expanded = menu.classList.toggle('in');
    toggle.setAttribute('aria-expanded', String(expanded));
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('in')) closeMenu(true);
  });
  const header = document.querySelector('.navbar');
  const syncHeader = () => header.classList.toggle('navbar-shrink', window.scrollY > 300);
  window.addEventListener('scroll', syncHeader, {passive: true});
  syncHeader();

  let translations;
  try {
    translations = JSON.parse(document.querySelector('#legacy-translations').textContent);
  } catch (error) {
    console.warn('[portfolio:legacy] Cannot read translations. Keep the initial page text.', error.name);
    return;
  }
  function translate(language) {
    const values = translations[language];
    if (!values) return;
    document.documentElement.lang = language;
    document.querySelectorAll('[key]').forEach(element => {
      // English is the fallback for any missing translation.
      const text = values[element.getAttribute('key')] ?? translations.en[element.getAttribute('key')];
      if (text !== undefined) element.textContent = text;
    });
    document.querySelectorAll('.lang').forEach(link => {
      if (link.id === language) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('.lang').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    translate(link.id);
  }));
  translate('en');

  document.querySelectorAll('.floating-label-form-group').forEach(group => {
    const field = group.querySelector('input,textarea');
    if (!field) return;
    const sync = () => group.classList.toggle('floating-label-form-group-with-value', Boolean(field.value));
    field.addEventListener('input', sync);
    field.addEventListener('focus', () => group.classList.add('floating-label-form-group-with-focus'));
    field.addEventListener('blur', () => group.classList.remove('floating-label-form-group-with-focus'));
    field.form.addEventListener('reset', () => requestAnimationFrame(sync));
    sync();
  });
})();
