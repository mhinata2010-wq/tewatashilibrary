import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
for(const page of ['index.html','rental.html']){
 const html=readFileSync(join(root,page),'utf8');
 assert.match(html,/<html\s+lang="ja"/i, `${page}: Japanese page language`);
 assert.match(html,/name="viewport"/,`${page}: viewport`);
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const [,href] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.has(href),`${page}: missing #${href}`);
 for(const [, ,asset] of html.matchAll(/(?:src|poster)="(\.\/)?(assets\/images\/[^"?#]+)"/g)){
  if(asset.endsWith('tewatashitosyokan.mp4')){
   assert(html.includes('id="video-fallback"'),`${page}: missing fallback for pending video`);
   if(!existsSync(join(root,asset))) console.warn('MEDIA_BLOCKER: MP4 missing from repository:',asset);
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
const navTargets=['#about-intro','#news','#promises','#calendar','rental.html','#access'];
for(const target of navTargets)assert(index.includes('href="'+target+'"'),'missing nav target: '+target);
assert(index.includes('class="hero-video-link"'),'intro video CTA');
assert(index.includes('id="intro-video"'),'video player');
execFileSync('node',['--check',join(root,'redesign.js')]);
const rental=readFileSync(join(root,'rental.html'),'utf8');
assert(rental.includes('旧サイトのプレ期間価格'),'price disclaimer missing');
assert(rental.includes('instagram.com/kitanarashino.tewatashi.lib'),'contact missing');
console.log('PASS: site structure, references, existing functions, video fallback, JavaScript syntax');
