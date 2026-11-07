# Portfolio website

This is the public portfolio and application support site for Ivan Kramarchuk.
The production URL is [i0532386223.me](https://i0532386223.me/).

## Structure

The `html/` directory is the complete static site. No build, package install, or server code is needed to publish it.

- `index.html` and `apps.html` show the portfolio and project directory.
- `projects/` contains the current application, help, and privacy pages.
- `MedicineNotes/`, `TranslationBooks/`, `SimpleServersMonitor/`, and `VisualAppLauncher/` retain the existing public application URLs.
- `motion.js`, `terminal-story.js`, and `site.js` control the portfolio effects and commands. Commands use a fixed parser. They do not run a shell.
- `products.js` opens screenshot dialogs. Each screenshot remains a normal image link when JavaScript is off.
- `legacy.js` controls the retained application navigation and English/Russian text. It uses native browser APIs.
- `contact.js` controls all four contact forms. Each form starts closed. Only the Open contact form button can start Turnstile. Focusing other content or opening a page does not start it. It sends a request to the existing Formspree endpoint only after validation and a verification callback. It keeps the text if the request fails or times out. Logs exclude email addresses, messages, and tokens.
- `privacy.html` is the website privacy policy. It covers visits, support messages, Cloudflare hosting and Turnstile, Formspree, the developer's Google email inbox, international processing, retention criteria, and privacy requests. Application policies remain separate and link to the website policy.

## Website privacy

Every contact form has a notice with policy links above its Open contact form button. The notice stays visible when the form opens. It explains that opening loads Turnstile and that sending passes the message to Formspree. The three retained bilingual pages translate both the notice and the open button into Russian. The local portfolio command field also explains that its commands stay in the page.

The site has no general cookie banner or policy acceptance checkbox. The animation control stores only its on/off choice in local storage. The privacy policy describes provider security cookies and signals without promising that every provider configuration is cookie-free.

The policy uses retention criteria rather than an unverified fixed deletion period. Copies in email, provider archives, and backups require account-level management. Provider contracts, transfer safeguards, and retention settings must be kept consistent with the published policy; the repository does not verify those account settings. Delayed loading of Turnstile is an explicit user interaction boundary, not a claim that valid consent has been collected or that every configuration is exempt from consent.

## Assets and hosting

Cloudflare Pages serves `html/`. The `_headers` file defines CSP, frame protection, HSTS, referrer policy, and browser permission limits. Contact sections allow only the existing external services. Keep their CSP separate from the portfolio CSP: matching Cloudflare header rules are combined.

Keep the default Cloudflare cache policy for assets in the retained application sections. A section-wide `Cache-Control: max-age=0` would also apply to its fonts, images, and stylesheets.

The top level `404.html` supplies the missing-page response. Its links start at the site root so that they also work at unknown nested addresses. Its meta CSP protects that content when the requested path has no specific CSP header rule.

Fonts are local WOFF2 files. Original TTF files remain available for cached older stylesheets. The hero background uses WebP. Screenshot previews use `srcset` and a 720 pixel variant. Normal links and dialogs still open the full image. Original image URLs remain available.

To update preview images after a screenshot change, run `python3 scripts/make_previews.py`. This tool needs Pillow and `cwebp`. It creates preview files and updates their content versions in the HTML. It does not change full images.

## Local checks

Run `python3 scripts/check_site.py` to check HTML and CSS references, document IDs, embedded JSON, inline code, and CSP coverage.

Run `python3 scripts/serve_site.py --port 8768` for a local preview. This development server binds to `127.0.0.1`, applies the static header rules, and serves a custom 404 page. It is a test approximation of Cloudflare Pages.

Browser checks need Playwright and, for accessibility checks, axe-core. Keep these packages outside the site. Set `PLAYWRIGHT_MODULE` to the installed Playwright module path, `AXE_SCRIPT` to the axe-core script path, and `CHROME_PATH` if Chrome is at another location. Run `node scripts/test_site.mjs` while the preview server is active. `SITE_BASE_URL` can select another preview URL. `SITE_AUDIT_OUTPUT` sets the screenshot directory.

The browser checks block all real external requests. Contact responses and verification are test doubles. Passing these checks does not confirm real message delivery or the provider account settings.

Privacy changes checked on 7 November 2026:

- Static checks passed for 55 HTML pages and 1,540 HTML/CSS references, including policy links, IDs, JSON, and CSP coverage.
- All 13 browser check groups passed. The policy and seven other main surfaces fit 320, 768, and 1440 pixel viewports. Axe found no WCAG A/AA violations on those eight surfaces.
- All four contact forms stayed closed and made no third-party request before Open contact form. Each opened with one verification script request. Simulated send failures, successful delivery, retries, duplicate submits, and timeouts preserved the expected behavior.
- The policy and English/Russian contact notices were inspected in desktop and mobile screenshots. No real contact message was sent. Provider account settings and production deployment were not part of these local checks.

See [the audit report](AUDIT-2026-11-07.md) for the measured results and verification limits.
