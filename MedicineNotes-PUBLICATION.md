# Medicine Notes support pages

Added on October 25, 2026. The static pages in `html/MedicineNotes/` use the Medicine Notes iPhone/iPad app palette, icon, and native screenshots with synthetic data.

- `index.html`: product page, FAQ, support contact.
- `privacy_policy.html`: app and website data practices.
- `consumer-health-data.html`: health-data-specific privacy notice.
- `medical-information.html`: sources, safety and limitations.
- `help.html`: instructions and safe use.
- `terms.html`: service notices, copyright, trademarks and Apple EULA.

No advertising or analytics scripts are added to these pages. The existing Formspree support endpoint and Cloudflare Turnstile site key are reused; the contact script loads Turnstile only after the visitor opens the form. No support messages are sent by setup or validation. Delivery must be checked by the owner.

The journal is local-only; the pages do not claim iCloud sync, medical validation or regulatory approval. No App Store download link is invented before an actual product URL exists.

The reviewed content and generators are in the Medicine project: `Release/Content/en.json`, `Scripts/PrepareAppStoreContent.py`, and `Release/APP-STORE-GUIDE-ru.md`. Regenerate there, review changes, then copy this directory. `html/apps.html` has an additive Medicine Notes entry; other app content is unchanged.

These are local source files. A local copy does not confirm public deployment. Publish through the website's existing hosting workflow and verify the HTTPS URLs before submitting the iOS app.
