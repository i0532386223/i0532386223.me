const hostStatus = document.querySelector("#host");
function showHost(inOutlook) {
  hostStatus.textContent = inOutlook ? "Running in Outlook." : "Browser preview of the Outlook pane.";
  const paneForm = document.querySelector("form");
  paneForm.dataset.sender = inOutlook ? "Outlook" : "Outlook preview";
  paneForm.querySelector("button").disabled = false;
  document.querySelector("#install").hidden = inOutlook;
}

// Office supplies the host name. This demo does not need a mailbox item.
if (typeof globalThis.Office?.onReady === "function") {
  Office.onReady().then(info => showHost(info.host === Office.HostType.Outlook)).catch(error => {
    hostStatus.textContent = "Outlook could not initialize Office.js.";
    console.error("Office initialization failed.", error);
  });
} else {
  hostStatus.textContent = "Office.js could not load. Check access to the Microsoft CDN.";
  document.querySelector("#install").hidden = false;
}
