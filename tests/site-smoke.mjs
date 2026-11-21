import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync,openSync,readSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
for(const page of ['index.html','rental.html']){
 const html=readFileSync(join(root,page),'utf8');
 assert.match(html,/<html\s+lang="ja"/i, `${page}: Japanese page language`);
 assert.match(html,/name="viewport"/,`${page}: viewport`);
 const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(allIds).size,allIds.length,`${page}: duplicate HTML id values`);
 const ids=new Set(allIds);
 for(const [,href] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.has(href),`${page}: missing #${href}`);
 for(const [, ,asset] of html.matchAll(/(?:src|poster)="(\.\/)?(assets\/images\/[^"?#]+)"/g)){
  if(asset.endsWith('tewatashitosyokan.mp4')){
   assert(html.includes('id="video-fallback"'),`${page}: missing fallback for pending video`);
   if(!existsSync(join(root,asset))){
    const message='MEDIA_BLOCKER: MP4 missing from repository: '+asset;
    if(process.env.REQUIRE_REAL_MEDIA==='1') assert.fail(message);
    console.warn(message+' (set REQUIRE_REAL_MEDIA=1 to require actual video)');
   }
   else {
    const path=join(root,asset);
    assert(statSync(path).size>=1024,`${page}: MP4 file is unexpectedly small`);
    const fd=openSync(path,'r'), header=Buffer.alloc(12);
    try{assert.equal(readSync(fd,header,0,12,0),12,`${page}: MP4 header too short`);}
    finally{closeSync(fd);}
    assert.equal(header.toString('ascii',4,8),'ftyp',`${page}: invalid MP4 container header`);
   }
   continue;
  }
  assert(existsSync(join(root,asset)),`${page}: missing image ${asset}`);
 }
 assert(!html.includes('figma.com/api/mcp/asset/'),`${page}: temporary Figma asset URL`);
}
const index=readFileSync(join(root,'index.html'),'utf8');
for(const phrase of ['あいさつをしよう','相手も想おう','街を楽しくしよう','あなたなら<br>何をする？']) assert(index.includes(phrase),`missing Figma copy: ${phrase}`);
for(const requirement of ['kqc5rmz','id="splash"','id="instagram-feed"','librarylife.net','calendar.google.com','maps/embed']) assert(index.includes(requirement),`missing required feature: ${requirement}`);
const js=readFileSync(join(root,'redesign.js'),'utf8');
assert(js.includes('setTimeout(finish,2800)'),'splash timeout');
assert(js.includes('verifyIntroVideo'),'video fallback');
assert(index.includes('id="video-retry"'),'video retry button');
assert(js.includes("video.load()"),'video retry reload');
assert(js.includes('if(video.readyState===0)showFallback()'),'stalled video timeout fallback');
assert(js.includes("video.addEventListener('loadedmetadata',showPlayer)"),'late metadata must recover video player');
assert(js.includes("video.addEventListener('canplay',showPlayer)"),'late playable media must recover video player');
assert(js.includes("retry?.addEventListener('click'"),'retry action listener');
assert(js.includes('retry.disabled=true'),'retry button must prevent duplicate requests');
assert(js.includes('retryCleanup?.()'),'retry must clear previous listeners and timer');
assert(js.includes("video.removeEventListener('loadedmetadata',onLoaded)"),'retry removes metadata listener');
assert(js.includes("video.removeEventListener('error',onError)"),'retry removes error listener');
assert(js.includes('clearTimeout(timeout)'),'retry timeout must be cancelled');
assert(js.includes('if(terminalError)return'),'terminal media errors must not recover player');
assert(js.includes('initSectionNavigation'),'section navigation listener');
assert(js.includes('aria-current'),'active navigation accessibility');
assert(js.includes('scrollTo('),'navigation movement');
const navTargets=['#about-intro','#video','#news','#promises','#calendar','rental.html','#access'];
for(const target of navTargets)assert(index.includes('href="'+target+'"'),'missing nav target: '+target);
assert(index.includes('class="hero-video-link"'),'intro video CTA');
assert(index.includes('id="intro-video"'),'video player');
execFileSync('node',['--check',join(root,'redesign.js')]);
const rental=readFileSync(join(root,'rental.html'),'utf8');
assert.match(rental,/<main\s+id="rental-main"\s+tabindex="-1">/, 'rental skip-link target must be programmatically focusable');
assert(rental.includes('旧サイトのプレ期間価格'),'price disclaimer missing');
assert(rental.includes('instagram.com/kitanarashino.tewatashi.lib'),'contact missing');
// Protect the legacy rental booking journey and make historical pricing unmistakable.
assert(rental.includes('id="rental-pricing"'), 'rental pricing section missing');
for (const amount of ['¥3,000〜','¥1,500〜']) assert(rental.includes(amount), 'historical rental price missing: '+amount);
assert(rental.includes('旧サイトのプレ期間価格'), 'historical prices must be disclosed as non-current');
assert(rental.includes('現行料金・利用可能日時・利用条件は予約時にご確認ください'), 'rental pricing requires current-terms disclaimer');
assert(rental.includes('id="rental-howto"'), 'rental inquiry instructions missing');
assert(rental.includes('Instagram DMから相談する'), 'rental inquiry flow missing');
assert.match(rental, /href="https:\/\/www\.instagram\.com\/kitanarashino\.tewatashi\.lib\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/, 'external Instagram inquiry link must be safe');
assert.match(rental, /<iframe[^>]*title="てわたし図書館の開館カレンダー"[^>]*src="https:\/\/calendar\.google\.com\//, 'rental Google Calendar embed missing');

console.log('PASS: site structure, references, existing functions, video fallback, JavaScript syntax');

// Gallery must never render a broken-image icon when a source is unavailable.
for(const name of ['hero-figma.png','about-figma.png','kitchen-figma.png','piano-figma.png']){
 const escaped=name.replaceAll('.', '\\.');
 const gallery=index.split('id="gallery"')[1]?.split('</section>')[0]||'';
 assert.match(gallery,new RegExp('<figure><span class="image-fallback" hidden>写真を準備中</span><img data-fallback src="\\./assets/images/'+escaped+'"'),`gallery fallback missing: ${name}`);
}

// Figma video navigation and descriptive facility images must survive future redesigns.
assert.match(index, /<nav[^>]*id="primary-nav"[^>]*>[\s\S]*?<a href="#video">紹介動画<\/a>/, 'Figma introduction-video navigation missing');
assert.match(index, /src="\.\/assets\/images\/piano-figma\.png"[^>]*alt="ピアノのある交流スペース"/, 'piano photo accessible label missing');
assert.match(index, /src="\.\/assets\/images\/kitchen-figma\.png"[^>]*alt="図書館のキッチン"/, 'kitchen photo accessible label missing');

// CSS must respect the HTML hidden attribute for every image placeholder.
const redesignCss=readFileSync(join(root,'redesign.css'),'utf8');
assert.match(redesignCss,/\.image-fallback\[hidden\]\s*\{\s*display\s*:\s*none\s*;?\s*\}/,'hidden fallback labels must not overlay successfully loaded images');

// News categories are labels, not fabricated publication dates.
for(const category of ['お知らせ','カレンダー','レンタル']) assert(index.includes('<span class="news-category">'+category+'</span>'), 'missing news category: '+category);
assert(!/<time\s+datetime="2026-11">/.test(index), 'placeholder dates must not be presented as real publication dates');
assert(redesignCss.includes('.news-row .news-category{'), 'news category label style missing');

// A facilities anchor lives inside a collapsed About panel; both click and direct URL must reveal it.
assert(index.includes('href="#facilities"'), 'facilities CTA missing');
assert(js.includes("facilityLink?.addEventListener('click'"), 'facilities CTA must expand collapsed About panel');
assert(js.includes("if(location.hash==='#facilities')expandAbout(false)"), 'direct facilities deep link must expand About panel without creating a history entry');
assert(js.includes("if(location.hash!=='#facilities')history.pushState(null,'','#facilities')"), 'facilities navigation must create a navigable browser history entry without duplicates');

// Reduced-motion scrolling must use a standard ScrollBehavior value.
assert(!/behavior\s*:\s*[^,}\n]*['\"]instant['\"]/.test(js), 'nonstandard instant scroll behavior');
assert(js.includes("reduced.matches?'auto':'smooth'"), 'reduced-motion section navigation must use auto');

// History restoration must expand nested sections without synthesizing clicks or new entries.
assert(js.includes("if(id==='facilities'||id==='about')"), 'history must reveal collapsed About content');
assert(js.includes("goTo(id,false,true)"), 'popstate must restore without pushing history or smooth-scroll race');
assert(js.includes("const goTo=(id,updateHistory=true,restore=false)=>"), 'history restore mode must be explicit');

// Instagram must show a truthful empty state until official post URLs are verified.
assert(index.includes('id="instagram-feed"'), 'Instagram feed container missing');
assert(index.includes('id="instagram-empty"'), 'Instagram empty-state message missing');
assert(index.includes('Instagramの個別投稿への連携は準備中です'), 'unverified Instagram posts must be disclosed');
assert(index.includes('https://www.instagram.com/kitanarashino.tewatashi.lib'), 'official Instagram destination missing');
assert(!/href="https?:\/\/www\.instagram\.com\/p\/[^"]+"/.test(index), 'individual Instagram post links require verification');


// Keep the official video source explicit and report its release-blocking status.
// A successful fallback test must never be interpreted as successful MP4 playback.
assert(index.includes('<source src="./assets/images/tewatashitosyokan.mp4" type="video/mp4">'), 'official MP4 source must not silently disappear');
const officialVideo=join(root,'assets/images/tewatashitosyokan.mp4');
if (!existsSync(officialVideo)) {
 console.warn('RELEASE_BLOCKER: official introduction MP4 is not registered; fallback is not video playback');
} else {
 console.log('MEDIA_PRESENT: official MP4 exists; actual playback still requires browser E2E');
}

// Rental inquiry must continue to use the official Instagram account, not an unverified post or placeholder.
assert(rental.includes('https://www.instagram.com/kitanarashino.tewatashi.lib/'), 'rental Instagram inquiry link missing');
for (const [pageName, pageHtml] of [['index.html', index], ['rental.html', rental]]) {
 assert(!/href=["']https?:\/\/www\.instagram\.com\/(?:p|reel|tv)\/[^"']+["']/.test(pageHtml), pageName+': unverified Instagram content URL');
}


// Accessibility regression: embedded services need descriptive titles, and external
// new-tab links must prevent opener access. This checks both published pages.
for (const page of ['index.html', 'rental.html']) {
 const html = readFileSync(join(root,page),'utf8');
 for (const iframe of html.matchAll(/<iframe\b[^>]*>/gi)) {
  assert.match(iframe[0], /\btitle="[^"]+"/i, page+': iframe missing accessible title');
 }
 for (const anchor of html.matchAll(/<a\b[^>]*>/gi)) {
  if (!/\btarget="_blank"/i.test(anchor[0])) continue;
  assert.match(anchor[0], /\brel="[^"]*\bnoopener\b[^"]*"/i, page+': new-tab link missing noopener');
 }
}
console.log('PASS: embedded-service titles and safe new-tab links');

// Image accessibility regression: meaningful photos must have an alt attribute.
// An empty alt is allowed for decorative images, but missing alt is not.
for (const page of ['index.html', 'rental.html']) {
 const html = readFileSync(join(root,page),'utf8');
 for (const image of html.matchAll(/<img\\b[^>]*>/gi)) {
  assert.match(image[0], /\\balt=(?:"[^"]*"|'[^']*')/i, page+': image missing alt attribute');
 }
}
console.log('PASS: all image elements declare alternative text');
