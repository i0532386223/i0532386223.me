'use strict';

// All contact pages use the same validation, retry, and delivery states.
// Never log a visitor's email, message, or verification token.
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const openButton = document.querySelector('#open-contact');
  const status = form.querySelector('[role="status"]');
  const sendButton = form.querySelector('[type="submit"]');
  const widget = form.querySelector('[data-spam-check]');
  if (!openButton || !status || !sendButton || !widget) {
    console.error('[portfolio:contact] Cannot start: a required form control is missing.');
    return;
  }
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = sendButton.className;
  retry.textContent = 'Retry spam protection';
  retry.hidden = true;
  widget.after(retry);
  let widgetId;
  let loading = false;
  let sending = false;
  let token = '';
  let hasResult = false;
  let opened = false;
  sendButton.disabled = true;

  function verificationMessage(message) {
    sendButton.disabled = sending || !token;
    // A late verification callback must not hide the delivery result.
    if (!sending && !hasResult) status.textContent = message;
  }

  function startProtection() {
    // Only an explicit form-open action can enable the external verification service.
    if (!opened || form.hidden || loading || widgetId !== undefined) return;
    loading = true;
    retry.hidden = true;
    token = '';
    verificationMessage('Loading spam protection…');
    console.info('[portfolio:contact] The visitor opened the form. Load spam protection.');
    let script;
    let settled = false;
    const timeout = setTimeout(() => fail('Spam protection timed out. Check your connection and try again.'), 15000);

    function fail(message) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      loading = false;
      script?.remove();
      retry.hidden = false;
      verificationMessage(message);
      console.warn('[portfolio:contact] Spam protection is unavailable. Keep the form and offer a retry.');
    }

    function render() {
      if (settled) return;
      try {
        if (!window.turnstile?.render) throw new Error('The verification API is not available.');
        widgetId = window.turnstile.render(widget, {
          sitekey: widget.dataset.sitekey,
          size: widget.clientWidth < 300 ? 'compact' : 'flexible',
          callback: value => {
            token = value;
            verificationMessage('Ready to send.');
          },
          'expired-callback': () => {
            token = '';
            verificationMessage('Please complete the spam check again.');
          },
          'error-callback': () => {
            token = '';
            retry.hidden = false;
            verificationMessage('The spam check failed. Try the spam protection again.');
          },
        });
        settled = true;
        clearTimeout(timeout);
        loading = false;
      } catch (error) {
        fail('Spam protection could not start. Please try again.');
      }
    }

    if (window.turnstile?.render) {
      render();
    } else {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = render;
      script.onerror = () => fail('Spam protection could not load. Check your connection and try again.');
      document.head.append(script);
    }
  }

  retry.addEventListener('click', () => {
    if (sending) return;
    try {
      if (widgetId !== undefined) window.turnstile.remove(widgetId);
      widgetId = undefined;
      startProtection();
    } catch (error) {
      console.warn('[portfolio:contact] Cannot restart the verification widget.', error.name);
      status.textContent = 'Spam protection could not restart. Keep your message and reload the page.';
    }
  });
  openButton.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    form.hidden = false;
    openButton.hidden = true;
    openButton.setAttribute('aria-expanded', 'true');
    startProtection();
    form.querySelector('[type="email"]').focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!opened || form.hidden || sending || !form.reportValidity()) return;
    if (!token) {
      hasResult = false;
      verificationMessage('Please complete the spam check before sending.');
      startProtection();
      return;
    }
    const data = new FormData(form);
    data.set('cf-turnstile-response', token);
    sending = true;
    hasResult = false;
    sendButton.disabled = true;
    retry.hidden = true;
    // Keep the submitted text unchanged until the service confirms delivery.
    const fields = [...form.querySelectorAll('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled)')];
    fields.forEach(field => { field.disabled = true; });
    status.textContent = 'Sending your message…';
    console.info('[portfolio:contact] Send one message. Wait up to 20 seconds for confirmation.');
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: data, headers: {Accept: 'application/json'}, signal: abort.signal,
      });
      if (!response.ok) throw new Error(`Contact service status: ${response.status}`);
      form.reset();
      status.textContent = 'Your message was sent. Thank you.';
      console.info('[portfolio:contact] The service accepted the message. Clear the submitted fields.');
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'The request timed out. Delivery is not confirmed. Your text is still here. Try again later.'
        : 'Your message could not be sent. Your text is still here. Check your connection and try again.';
      console.warn('[portfolio:contact] Delivery is not confirmed. Keep the fields for a retry.', error.name);
    } finally {
      clearTimeout(timeout);
      hasResult = true;
      sending = false;
      fields.forEach(field => { field.disabled = false; });
      token = '';
      sendButton.disabled = true;
      try {
        if (widgetId !== undefined) window.turnstile.reset(widgetId);
      } catch (error) {
        retry.hidden = false;
        console.warn('[portfolio:contact] Cannot reset verification. Keep the delivery result and offer a retry.', error.name);
      }
    }
  });
})();
