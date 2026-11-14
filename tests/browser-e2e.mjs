import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless:true});
let failures = [];
async function check(name, fn) {
  try { await fn(); console.log('PASS', name); }
  catch (error) { failures.push({name,error:String(error)}); console.error('FAIL',name,error); }
}
for (const device of ['desktop','mobile']) {
  const context = await browser.newContext(device === 'mobile' ? devices['iPhone 13'] : {viewport:{width:1440,height:900}});
  const page = await context.newPage();
  await check(device+' home loads and splash releases', async () => {
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#splash').waitFor({state:'detached',timeout:7000});
    assert(await page.locator('#hero-heading').isVisible());
    assert((await page.locator('.hero-image img').evaluate(el=>el.naturalWidth))>0,'Hero image must load');
  });
  await check(device+' navigation moves to sections and tracks active item',async()=>{
    const nav=page.locator('#primary-nav');
    if(device==='mobile')await page.locator('.menu-toggle').click();
    await nav.locator('a[href="#news"]').click();
    await page.waitForFunction(()=>document.querySelector('#primary-nav a[href="#news"]')?.getAttribute('aria-current')==='location');
    await page.waitForFunction(()=>Math.abs(document.querySelector('#news').getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height)<45);
    assert.equal(await page.locator('#primary-nav a[href="#news"]').getAttribute('aria-current'),'location');
    const videoLink=page.locator('.hero-video-link');
    assert(await videoLink.count()===1,'missing video CTA');
    await videoLink.click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('#video').getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height)<45);
  });
  await check(device+' nav browser back restores previous section',async()=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#splash').waitFor({state:'detached',timeout:7000});
    assert.equal(await page.locator('#primary-nav a[aria-current="location"]').count(),0,'hero should not highlight a section');
    if(device==='mobile')await page.locator('.menu-toggle').click();
    await page.locator('#primary-nav a[href="#news"]').click();
    assert.equal(new URL(page.url()).hash,'#news');
    if(device==='mobile')await page.locator('.menu-toggle').click();
    await page.locator('#primary-nav a[href="#calendar"]').click();
    assert.equal(new URL(page.url()).hash,'#calendar');
    await page.goBack({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>location.hash==='#news'&&document.querySelector('#primary-nav a[href="#news"]')?.getAttribute('aria-current')==='location');
  });
  await check(device+' about expands', async () => {
    await page.locator('#open-about').click();
    assert(await page.locator('#about-content').isVisible());
    assert.equal(await page.locator('#open-about').getAttribute('aria-expanded'),'true');
    await page.waitForFunction(()=>document.activeElement?.closest('#about-content')!==null);
    assert.equal(await page.locator('#about-content h2').first().getAttribute('tabindex'),'-1');
  });
  await check(device+' equipment link reveals collapsed facilities',async()=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#splash').waitFor({state:'detached',timeout:7000});
    assert(!(await page.locator('#about-content').isVisible()),'facilities initially collapsed');
    await page.getByRole('link',{name:'図書館の設備を見る'}).click();
    assert(await page.locator('#about-content').isVisible(),'facility content revealed');
    assert(await page.getByRole('heading',{name:'施設・設備'}).isVisible(),'facility heading visible');
    await page.waitForFunction(()=>Math.abs(document.querySelector('#facilities').getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().height)<45);
    assert.equal(await page.locator('#open-about').getAttribute('aria-expanded'),'true');
  });
  await check(device+' skip link reaches main content', async () => {
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#splash').waitFor({state:'detached',timeout:7000});
    await page.keyboard.press('Tab');
    assert(await page.getByRole('link',{name:'本文へ移動'}).evaluate(el=>document.activeElement===el),'skip link should be first keyboard target');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content');
  });
  await check(device+' video is playable or has accessible fallback', async () => {
    const video=page.locator('#intro-video'),fallback=page.locator('#video-fallback');
    // Do not use HEAD as a proxy for media playback: some hosts reject HEAD.
    await page.waitForFunction(()=>{
      const v=document.querySelector('#intro-video');
      const f=document.querySelector('#video-fallback');
      return (v?.readyState>=1)||(f && !f.hidden);
    },null,{timeout:11000});
    if(await fallback.isVisible()){
      assert(await fallback.locator('img').evaluate(el=>el.naturalWidth)>0,'fallback image must load');
      assert(await fallback.getByRole('link',{name:'写真を見る'}).isVisible(),'photo CTA visible');
      assert(!(await video.isVisible()),'failed media player must be hidden');
    }else{
      assert(await video.isVisible(),'loaded video should be visible');
      const media=await video.evaluate(el=>({duration:el.duration,videoWidth:el.videoWidth,videoHeight:el.videoHeight}));
      assert(Number.isFinite(media.duration)&&media.duration>0,'video metadata duration');
      assert(media.videoWidth>0&&media.videoHeight>0,'video frames');
      // Metadata alone does not prove playback. Check the actual media clock when MP4 exists.
      await video.evaluate(el=>{el.muted=true;});
      await video.evaluate(async el=>{await el.play();});
      await page.waitForFunction(()=>document.querySelector('#intro-video')?.currentTime>0.1,null,{timeout:12000});
      assert((await video.evaluate(el=>el.currentTime))>0.1,'video must advance beyond metadata');
      await video.evaluate(el=>el.pause());
    }
  });
  await check(device+' missing video can retry without duplicate clicks',async()=>{
    // The repository has no MP4 yet. Do not mistake fallback success for video playback.
    const source=page.locator('#intro-video source');
    const src=await source.getAttribute('src');
    const response=await page.request.get(new URL(src,base+'/').toString());
    if(response.ok()){
      console.log('VIDEO_PRESENT: retry fallback branch not applicable; playback checked separately');
      return;
    }
    const fallback=page.locator('#video-fallback');
    await fallback.waitFor({state:'visible',timeout:11000});
    const retry=page.locator('#video-retry');
    assert(await retry.isVisible(),'retry button should be visible when video missing');
    await retry.click();
    assert(await retry.isDisabled(),'retry should disable during loading');
    await page.waitForFunction(()=>!document.querySelector('#video-retry')?.disabled,null,{timeout:11000});
    assert(await retry.isEnabled(),'retry should recover after timeout/error');
    assert(await fallback.isVisible(),'fallback should remain available after unsuccessful retry');
  });
  await check(device+' official promises render', async () => {
    for (const title of ['あいさつをしよう','相手も想おう','街を楽しくしよう']) {
      assert(await page.getByRole('heading',{name:title}).isVisible(),title);
    }
  });
  await check(device+' Figma promise circles are responsive and round',async()=>{
    const circles=await page.locator('#promises .promise').evaluateAll(elements=>elements.map(el=>{
      const rect=el.getBoundingClientRect();
      return {width:rect.width,height:rect.height,radius:getComputedStyle(el).borderTopLeftRadius};
    }));
    assert.equal(circles.length,3,'three official promises');
    for(const circle of circles){
      assert(Math.abs(circle.width-circle.height)<2,'promise panel must be circular: '+JSON.stringify(circle));
      assert(circle.radius==='50%','promise panel radius must be circular');
      assert(circle.width>=(device==='desktop'?300:250),'promise circle too small: '+circle.width);
    }
  });
  await check(device+' typography diagnostics and fallback', async () => {
    const result=await page.evaluate(async()=>{
      await document.fonts.ready;
      const body=getComputedStyle(document.body);
      const title=getComputedStyle(document.querySelector('#hero-heading'));
      const adobeStyle=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>x.href.includes('use.typekit.net'));
      const remote=performance.getEntriesByType('resource').filter(x=>x.name.includes('use.typekit.net')).map(x=>({name:x.name,status:x.responseStatus||null}));
      const declared=title.fontFamily.split(',').map(x=>x.trim().replace(/^["']|["']$/g,''));
      const adobeCandidates=declared.filter(x=>/^(ads-akari|fot-tsukuardgothic-std)$/i.test(x));
      const adobeFaces=[...document.fonts].filter(x=>adobeCandidates.some(f=>f.toLowerCase()===x.family.replace(/^["']|["']$/g,'').toLowerCase()));
      const adobeLoaded=adobeFaces.filter(x=>x.status==='loaded').map(x=>({family:x.family,weight:x.weight}));
      const adobeCheck=adobeCandidates.map(f=>({family:f,available:document.fonts.check('24px "'+f+'"','日本語')}));
      return {bodyFont:body.fontFamily,titleFont:title.fontFamily,adobeKit:adobeStyle?.href||null,remote,loadedFonts:[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family),adobeCandidates,adobeLoaded,adobeCheck,adobeStatus:adobeLoaded.length?'font-face-loaded':'unverified-or-fallback'};
    });
    console.log('FONT_DIAGNOSTICS',device,JSON.stringify(result));
    assert(result.bodyFont.length>0,'computed body font missing');
    assert(result.titleFont.length>0,'computed title font missing');
    assert(result.adobeKit?.includes('kqc5rmz'),'Adobe kit link missing');
    // Report a clear status instead of treating the Adobe stylesheet link as proof of rendering.
    // An actual loaded FontFace is necessary but still not sufficient to prove glyph-level use.
    if(result.adobeStatus!=='font-face-loaded')console.warn('ADOBE_FONT_NOT_VERIFIED',device,JSON.stringify(result.adobeCheck));
  });
  await check(device+' no horizontal overflow', async () => {
    const dims=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert(dims.doc<=dims.viewport+2,JSON.stringify(dims));
  });
  if (device==='mobile') {
    await check('mobile menu opens and closes',async()=>{
      const toggle=page.locator('.menu-toggle');
      await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      await page.locator('#primary-nav a[href="#promises"]').click();
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      await toggle.click();await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert(await toggle.evaluate(el=>document.activeElement===el),'Escape restores focus to menu toggle');
    });
  }
  await check(device+' legacy service links and embeds remain intact',async()=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#splash').waitFor({state:'detached',timeout:7000});
    const book=page.getByRole('link',{name:'蔵書を検索する'});
    await page.locator('#open-about').click();
    assert((await book.getAttribute('href')).includes('librarylife.net/booksearch/'),'book search destination changed');
    const calendar=page.getByTitle('てわたし図書館 開館カレンダー');
    assert((await calendar.getAttribute('src')).startsWith('https://calendar.google.com/calendar/'),'calendar embed changed');
    const map=page.getByTitle('北習志野てわたし図書館の地図');
    assert((await map.getAttribute('src')).startsWith('https://www.google.com/maps/embed'),'map embed changed');
    const instagram=page.getByRole('link',{name:'公式Instagram'});
    assert((await instagram.getAttribute('href')).includes('instagram.com/kitanarashino.tewatashi.lib'),'Instagram profile changed');
    assert(await page.getByRole('link',{name:'レンタルスペース詳細'}).isVisible(),'rental navigation missing');
  });
  await check(device+' rental page and CTA',async()=>{
    await page.goto(base+'/rental.html',{waitUntil:'domcontentloaded'});
    assert(await page.getByRole('heading',{level:1}).isVisible());
    assert(await page.locator('a[href*="instagram.com"]').count()>0);
  });
  await context.close();
}
await browser.close();
if (failures.length) { console.error(JSON.stringify(failures,null,2));process.exit(1); }
console.log('All browser E2E checks passed');
