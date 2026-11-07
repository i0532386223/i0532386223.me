// Run with an external Playwright installation. The site has no runtime packages.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_BASE_URL || 'http://127.0.0.1:8768';
const output = process.env.SITE_AUDIT_OUTPUT || '/tmp/portfolio-browser-check';
const axePath = process.env.AXE_SCRIPT;
const root = path.resolve(import.meta.dirname, '../html');
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({
  executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,
});
let checks = 0;
const pass = message => { checks++; console.log(`PASS: ${message}`); };
const surfaces = ['/', '/apps.html', '/privacy.html', '/projects/workbundle/', '/MedicineNotes/', '/TranslationBooks/', '/SimpleServersMonitor/', '/VisualAppLauncher/'];
const forms = ['/MedicineNotes/', '/TranslationBooks/', '/SimpleServersMonitor/', '/VisualAppLauncher/'];
const captchaStub = `
window.turnstile = {
 render(element, options) { window.auditCaptcha=options; window.auditWidget=element; return 'audit-widget'; },
 reset() { if(window.auditResetFails) throw new Error('Audit reset failure'); },
 remove() { window.auditCaptcha=null; }
};`;

async function context(width=390, reducedMotion='reduce') {
  const ctx = await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768,reducedMotion,serviceWorkers:'block'});
  // Default policy: no remote service is reachable from an audit page.
  await ctx.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === new URL(base).origin ? route.continue() : route.abort();
  });
  return ctx;
}

async function files(dir) {
  const found=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) found.push(...await files(file));
    else if(entry.name.endsWith('.html')) found.push(file);
  }
  return found;
}

try {
  if (process.env.SITE_AUDIT_ONLY !== 'failures') {
  console.log('Intent: inspect every HTML page with the deployed CSP rules. Block all remote services.');
  const ctx = await context();
  const page = await ctx.newPage();
  let pageErrors=[];
  let failed=[];
  page.on('pageerror', error=>pageErrors.push(error.message));
  page.on('requestfailed', request=>failed.push(request.url()));
  for(const file of await files(root)) {
    const url='/'+path.relative(root,file).split(path.sep).join('/');
    pageErrors=[]; failed=[];
    const response=await page.goto(base+url,{waitUntil:'networkidle'});
    assert.equal(response.status(),200,url);
    const layout=await page.evaluate(()=>({
      width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
      broken:[...document.images].filter(img=>img.hasAttribute('src')&&img.complete&&!img.naturalWidth).map(img=>img.src),
    }));
    assert.deepEqual(pageErrors,[],url);
    assert.deepEqual(failed,[],url);
    assert.deepEqual(layout.broken,[],url);
    assert.ok(layout.overflow<=1,`${url}: horizontal overflow ${layout.overflow}px`);
    if(await page.locator('title').count()) assert.ok(layout.width<=391,`${url}: mobile viewport is missing`);
  }
  pass('all HTML pages load without failed requests, uncaught errors, broken images, or mobile overflow');
  for(const width of [320,768,1440]) {
    await page.setViewportSize({width,height:900});
    for(const url of surfaces) {
      await page.goto(base+url,{waitUntil:'networkidle'});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1),`${url}: overflow at ${width}px`);
      if(width===1440) await page.screenshot({path:path.join(output,(url.split('/').filter(Boolean).join('-')||'home')+'-desktop.png')});
    }
  }
  pass('eight main surfaces fit 320, 768, and 1440 pixel viewports');
  if(axePath) {
    await page.setViewportSize({width:390,height:844});
    for(const url of surfaces) {
      await page.goto(base+url,{waitUntil:'networkidle'});
      await page.evaluate(await fs.readFile(axePath,'utf8'));
      const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
      assert.deepEqual(violations,[],url);
      await page.screenshot({path:path.join(output,(url.split('/').filter(Boolean).join('-')||'home')+'-mobile.png')});
    }
    pass('axe finds no WCAG A/AA violations on the eight main surfaces');
  }
  await page.goto(base+'/does-not-exist-audit',{waitUntil:'networkidle'}).then(response=>assert.equal(response.status(),404));
  assert.match(await page.title(),/Page not found/);
  pass('missing routes return the custom 404 page');

  await page.goto(base+'/',{waitUntil:'networkidle'});
  const input=page.locator('#terminal-command');
  const payload='<img src=x onerror=window.auditInjection=1>';
  await input.fill(payload);
  await input.press('Enter');
  assert.ok((await page.locator('#terminal-output').textContent()).includes(payload));
  assert.equal(await page.evaluate(()=>window.auditInjection),undefined);
  assert.equal(await page.locator('#terminal-output img').count(),0);
  await input.fill('work'); await input.press('Enter');
  assert.equal(await page.locator('#terminal-output a').count(),10);
  await page.locator('#focus-tab-security').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#focus-tab-platform').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#focus-platform').isVisible(),true);
  assert.equal(await page.locator('[data-motion-toggle]').isDisabled(),true);
  pass('terminal input stays text, project commands work, keyboard tabs work, and reduced motion is respected');
  await page.goto(base+'/projects/workbundle/',{waitUntil:'networkidle'});
  await page.locator('[data-screenshot]').first().click();
  assert.equal(await page.locator('.image-dialog').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.image-dialog').isVisible(),false);
  assert.equal(await page.locator('[data-screenshot]').first().evaluate(e=>document.activeElement===e),true);
  pass('screenshot dialog closes with Escape and returns keyboard focus');
  for(const url of forms.slice(1)) {
    await page.goto(base+url,{waitUntil:'networkidle'});
    for(const language of ['ru','en']) {
      await page.locator('.navbar-toggle').click();
      await page.locator('#'+language).click();
      assert.equal(await page.locator('html').getAttribute('lang'),language);
    }
    assert.equal(await page.locator('[key="photos"]').first().textContent(),'Screenshots');
    await page.locator('.navbar-toggle').click();
    await page.locator('a[href="#portfolio"]').click();
    const headingTop=await page.locator('#portfolio h2').evaluate(e=>e.getBoundingClientRect().top);
    const headerBottom=await page.locator('.navbar').evaluate(e=>e.getBoundingClientRect().bottom);
    assert.ok(headingTop>=headerBottom,`${url}: the fixed header covers the section heading`);
  }
  pass('legacy navigation opens and both languages restore the correct document language and text');
  await ctx.close();

  const animated=await context(1440,'no-preference');
  const animationPage=await animated.newPage();
  await animationPage.goto(base+'/',{waitUntil:'networkidle'});
  await animationPage.locator('[data-motion-toggle]').click();
  assert.equal(await animationPage.locator('[data-motion-toggle]').getAttribute('aria-pressed'),'false');
  assert.equal(await animationPage.locator('.terminal-intro').getAttribute('data-typing-state'),'complete');
  await animationPage.reload({waitUntil:'networkidle'});
  assert.equal(await animationPage.locator('[data-motion-toggle]').getAttribute('aria-pressed'),'false');
  pass('the animation control stops typing and saves the preference');
  await animated.close();

  console.log('Intent: simulate contact responses. No message can leave the browser test.');
  for(const url of forms) {
    const ctx=await context(320);
    let mode='error',posts=0,captchaLoads=0;
    await ctx.route('**/*',async route=>{
      const host=new URL(route.request().url()).hostname;
      if(host==='challenges.cloudflare.com') {
        captchaLoads++;
        return route.fulfill({contentType:'application/javascript',body:captchaStub});
      }
      if(host==='formspree.io') {
        posts++;
        await new Promise(resolve=>setTimeout(resolve,100));
        return route.fulfill({status:mode==='error'?503:200,contentType:'application/json',body:mode==='error'?'{}':'{"ok":true}'});
      }
      return new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort();
    });
    const page=await ctx.newPage();
    await page.goto(base+url,{waitUntil:'networkidle'});
    assert.equal(captchaLoads,0);
    assert.equal(await page.locator('input[name="source"]').inputValue(),url.split('/')[1]);
    assert.equal(await page.locator('[data-contact-form]').isVisible(),false);
    assert.equal(await page.locator('#contact-privacy').isVisible(),true);
    assert.match(await page.locator('#contact-privacy a').first().getAttribute('href'),/privacy\.html$/);
    await page.locator('#open-contact').click();
    await page.locator('#email').fill('audit@example.com');
    await page.locator('#message').fill('Retain this message after a failed request.');
    await page.waitForFunction(()=>window.auditCaptcha);
    assert.equal(captchaLoads,1);
    assert.equal(await page.locator('#open-contact').getAttribute('aria-expanded'),'true');
    await page.locator('form[data-contact-form]').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(posts,0);
    await page.evaluate(()=>window.auditCaptcha.callback('audit-token'));
    if(axePath) {
      await page.evaluate(await fs.readFile(axePath,'utf8'));
      await page.locator('button[type=submit]').hover();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('form[data-contact-form]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
      assert.deepEqual(violations,[],`${url}: active form accessibility`);
    }
    await page.locator('button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('could not be sent'));
    assert.equal(await page.locator('#message').inputValue(),'Retain this message after a failed request.');
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    await page.evaluate(()=>window.auditCaptcha.callback('new-audit-token'));
    assert.match(await page.locator('[role=status]').textContent(),/could not be sent/);
    mode='success';
    await page.locator('form[data-contact-form]').evaluate(form=>{
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('was sent'));
    assert.equal(posts,2);
    assert.equal(await page.locator('#message').inputValue(),'');
    assert.equal(await page.locator('#email').isDisabled(),false);
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));
    pass(`${url}: no automatic third party load, no unverified or duplicate send, errors keep text, success clears text`);
    await ctx.close();
  }
  }
  console.log('Intent: exercise unavailable verification, token reset failure, and the delivery timeout.');
  {
    const ctx=await context();
    let failLoad=true;
    let pending;
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='challenges.cloudflare.com') return failLoad?route.abort():route.fulfill({contentType:'application/javascript',body:captchaStub});
      if(url.hostname==='formspree.io') { pending=route; return; }
      return url.origin===new URL(base).origin?route.continue():route.abort();
    });
    const page=await ctx.newPage();
    await page.goto(base+'/MedicineNotes/',{waitUntil:'networkidle'});
    await page.locator('#open-contact').click();
    await page.locator('#message').fill('Keep this text when protection or delivery fails.');
    const retry=page.getByRole('button',{name:'Retry spam protection'});
    await retry.waitFor({state:'visible'});
    failLoad=false;
    await retry.click();
    await page.waitForFunction(()=>window.auditCaptcha);
    assert.equal(await page.locator('#message').inputValue(),'Keep this text when protection or delivery fails.');
    await page.locator('#email').fill('audit@example.com');
    await page.clock.install();
    await page.evaluate(()=>{window.auditResetFails=true;window.auditCaptcha.callback('timeout-token')});
    const requested=page.waitForRequest(request=>new URL(request.url()).hostname==='formspree.io');
    await page.locator('button[type=submit]').click();
    await requested;
    await page.clock.fastForward(20001);
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('timed out'));
    assert.equal(await page.locator('#message').inputValue(),'Keep this text when protection or delivery fails.');
    assert.equal(await retry.isVisible(),true);
    assert.equal(await page.locator('#email').isDisabled(),false);
    if(pending) await pending.abort().catch(()=>{});
    pass('verification can retry without losing text; timeout and reset failure keep text and unlock the fields');
    await ctx.close();
  }
  console.log(`Completed ${checks} check groups. Screenshots: ${output}`);
} finally {
  await browser.close();
}
