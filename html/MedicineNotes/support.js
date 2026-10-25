"use strict";
// External contact services load only after the visitor chooses to open the form.
const openButton = document.getElementById("open-contact");
const form = document.getElementById("contact-form");
const status = document.getElementById("contact-status");
const sendButton = document.getElementById("send-contact");
let widgetId;
let sending = false;
openButton.addEventListener("click", () => {
  form.hidden = false;
  openButton.hidden = true;
  openButton.setAttribute("aria-expanded", "true");
  document.getElementById("email").focus();
  status.textContent = "Loading spam protection…";
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.onload = () => {
    if (!window.turnstile) {
      status.textContent = "Spam protection is unavailable. Reload the page and try again.";
      return;
    }
    window.turnstile.ready(() => {
      widgetId = window.turnstile.render("#spam-check", {
        sitekey: "0x4AAAAAADsm5y_Mrsrrty1F",
        callback: () => { sendButton.disabled = sending; status.textContent = "Ready to send."; },
        "expired-callback": () => { sendButton.disabled = true; status.textContent = "Please complete the spam check again."; },
        "error-callback": () => { sendButton.disabled = true; status.textContent = "The spam check failed. Reload the page or try another connection."; }
      });
    });
  };
  script.onerror = () => { status.textContent = "Spam protection could not load. Check your connection and reload the page."; };
  document.head.appendChild(script);
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  const data = new FormData(form);
  if (!data.get("cf-turnstile-response")) {
    status.textContent = "Please complete the spam check before sending.";
    return;
  }
  sending = true;
  sendButton.disabled = true;
  status.textContent = "Sending your message…";
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 20000);
  try {
    const response = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: abort.signal });
    if (!response.ok) throw new Error("The contact service did not accept this message.");
    form.reset();
    status.textContent = "Your message was sent. Thank you. Keep a note of the issue while you wait for a reply.";
  } catch (error) {
    status.textContent = error.name === "AbortError"
      ? "The request timed out. Delivery is not confirmed. Keep your message and try again later."
      : "Your message could not be sent. Your text is still here. Check your connection and try again.";
  } finally {
    clearTimeout(timeout);
    sending = false;
    if (window.turnstile && widgetId !== undefined) window.turnstile.reset(widgetId);
  }
});
