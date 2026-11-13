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
  await check(device+' about expands', async () => {
    await page.locator('#open-about').click();
    assert(await page.locator('#about-content').isVisible());
    assert.equal(await page.locator('#open-about').getAttribute('aria-expanded'),'true');
  });
  await check(device+' video is playable or has accessible fallback', async () => {
    const video=page.locator('#intro-video'),fallback=page.locator('#video-fallback');
    const result=await page.evaluate(async()=>{
      const video=document.querySelector('#intro-video');
      const url=video?.querySelector('source')?.getAttribute('src');
      if(!url)return 'missing';
      try{const response=await fetch(url,{method:'HEAD'});return response.ok?'available':'missing'}
      catch{return 'missing'}
    });
    if(result==='missing'){
      await fallback.waitFor({state:'visible',timeout:8000});
      assert(await fallback.locator('img').evaluate(el=>el.naturalWidth)>0,'fallback image must load');
      assert(await fallback.getByRole('link',{name:'写真を見る'}).isVisible(),'photo CTA visible');
      assert(!(await video.isVisible()),'missing media player must be hidden');
    }else{
      assert(await video.isVisible(),'available video should be visible');
      await video.evaluate(el=>el.load());
      await page.waitForFunction(()=>document.querySelector('#intro-video')?.readyState>=1,null,{timeout:10000});
      const media=await video.evaluate(el=>({duration:el.duration,videoWidth:el.videoWidth,videoHeight:el.videoHeight}));
      assert(Number.isFinite(media.duration)&&media.duration>0,'video metadata duration');
      assert(media.videoWidth>0&&media.videoHeight>0,'video frames');
    }
  });
  await check(device+' official promises render', async () => {
    for (const title of ['あいさつをしよう','相手も想おう','街を楽しくしよう']) {
      assert(await page.getByRole('heading',{name:title}).isVisible(),title);
    }
  });
  await check(device+' typography diagnostics and fallback', async () => {
    const result=await page.evaluate(async()=>{
      await document.fonts.ready;
      const body=getComputedStyle(document.body);
      const title=getComputedStyle(document.querySelector('#hero-heading'));
      const adobeStyle=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>x.href.includes('use.typekit.net'));
      const remote=performance.getEntriesByType('resource').filter(x=>x.name.includes('use.typekit.net')).map(x=>({name:x.name,status:x.responseStatus||null}));
      return {bodyFont:body.fontFamily,titleFont:title.fontFamily,adobeKit:adobeStyle?.href||null,remote,loadedFonts:[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family)};
    });
    console.log('FONT_DIAGNOSTICS',device,JSON.stringify(result));
    assert(result.bodyFont.length>0,'computed body font missing');
    assert(result.titleFont.length>0,'computed title font missing');
    assert(result.adobeKit?.includes('kqc5rmz'),'Adobe kit link missing');
    // A kit link does not prove that its font-family is actually applied.
    // Keep actual Adobe font-family verification open until the kit CSS and browser render are checked.
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
    });
  }
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
