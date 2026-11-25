const endpoint = "https://abc.localhost:8443/message";
const form = document.querySelector("form");
const button = form.querySelector("button");
const statusLine = document.querySelector("#status");
const result = document.querySelector("#result");

// Start the network request only when the user submits the form.
button.disabled = !form.dataset.sender;
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (button.disabled) return;
  const from = form.dataset.sender;
  const text = document.querySelector("#message").value.trim();
  if (!text) {
    statusLine.textContent = "Enter a test message.";
    return;
  }
  button.disabled = true;
  result.textContent = "";
  statusLine.textContent = "Waiting for abc.localhost…";
  console.info("Send the test message to the local receiver.", endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ from, text }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const ack = await response.json();
    // Match the returned text and sender to this request before showing success.
    if (ack.from !== from || ack.received !== text || !ack.receipt || typeof ack.reply !== "string") {
      throw new Error("Unexpected reply from the receiver.");
    }
    result.textContent = JSON.stringify(ack, null, 2);
    statusLine.textContent = "Reply from abc.localhost";
    console.info("Received the reply.", ack.receipt);
  } catch (error) {
    const reason = error.name === "AbortError" ? "Timed out." : error.message;
    statusLine.textContent = `Could not reach the receiver. ${reason} Check Caddy, certificate trust, and permission to access this device.`;
    console.error("The HTTPS exchange failed.", error);
  } finally {
    clearTimeout(timer);
    button.disabled = false;
  }
});
