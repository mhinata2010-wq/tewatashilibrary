document.addEventListener("DOMContentLoaded",()=>{const toggle=document.querySelector(".menu-toggle"),nav=document.querySelector(".nav");if(toggle&&nav){toggle.addEventListener("click",()=>{const opened=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(opened));toggle.textContent=opened?"閉じる":"メニュー";});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー"}));document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("is-open")){nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー";toggle.focus()}})}document.querySelectorAll("img[data-fallback]").forEach(img=>{const fallback=()=>{img.hidden=true;img.style.display="none";const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=false};img.addEventListener("error",fallback);if(img.complete&&!img.naturalWidth)fallback();else img.addEventListener("load",()=>{const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=true})})});
// Intro CTA and splash: never block navigation indefinitely, including on broken images.
(function(){
 const intro=document.getElementById('open-about'), content=document.getElementById('about-content');
 function expandAbout(scroll){if(!content)return;content.hidden=false;content.classList.add('is-opening');if(intro)intro.setAttribute('aria-expanded','true');if(scroll)requestAnimationFrame(()=>{const heading=content.querySelector('h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}document.getElementById('about')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
 intro?.addEventListener('click',()=>expandAbout(true));
 document.querySelectorAll('a[href="#about"]').forEach(a=>a.addEventListener('click',()=>expandAbout(false)));
 if(location.hash==='#about')expandAbout(false);
 const splash=document.getElementById('splash');if(!splash)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const started=performance.now();let released=false;
 function finish(){if(released)return;released=true;const remaining=reduced?0:Math.max(0,650-(performance.now()-started));setTimeout(()=>{splash.classList.add('is-leaving');setTimeout(()=>splash.remove(),reduced?0:700)},remaining)}
 const hero=document.querySelector('.hero-image img');
 if(!hero||hero.complete){finish()}else{hero.addEventListener('load',finish,{once:true});hero.addEventListener('error',finish,{once:true})}
 window.addEventListener('load',finish,{once:true});setTimeout(finish,2800);
})();

// Public Instagram post permalinks only. Add approved /p/ or /reel/ URLs to this list.
// Profile links are not embeddable posts. No scraping, login tokens, or unverifiable images.
const instagramPostUrls=[];
(function renderInstagramPosts(){
  const feed=document.getElementById('instagram-feed'),empty=document.getElementById('instagram-empty');
  if(!feed)return;
  const verified=instagramPostUrls.filter(url=>/^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/.test(url));
  verified.forEach(url=>{
    const card=document.createElement('blockquote');card.className='instagram-media';
    card.setAttribute('data-instgrm-permalink',url);card.setAttribute('data-instgrm-version','14');
    const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Instagram投稿を表示';
    card.append(link);feed.append(card);
  });
  if(verified.length){if(empty)empty.hidden=true;
    const script=document.createElement('script');script.async=true;script.src='https://www.instagram.com/embed.js';script.onload=()=>window.instgrm?.Embeds?.process();feed.after(script);
  }
})();

// Avoid showing a broken HTML5 video player while the media is not yet uploaded.
(function verifyIntroVideo(){
  const video=document.getElementById('intro-video'),fallback=document.getElementById('video-fallback');
  const url=video?.querySelector('source')?.getAttribute('src');
  if(!video||!fallback||!url)return;
  const showFallback=()=>{video.hidden=true;video.style.display='none';fallback.hidden=false};
  video.addEventListener('error',showFallback,{once:true});
  video.querySelector('source')?.addEventListener('error',showFallback,{once:true});
  // A HEAD request can be rejected (405/403) even when the video is playable.
  // Trust the media element's error event rather than the HTTP HEAD response.
  // Keep a bounded fallback for media that never loads or errors.
  const mediaTimeout=setTimeout(()=>{
    if(video.readyState===0 && video.networkState===HTMLMediaElement.NETWORK_NO_SOURCE)showFallback();
  },8000);
  video.addEventListener('loadedmetadata',()=>clearTimeout(mediaTimeout),{once:true});
  video.addEventListener('error',()=>clearTimeout(mediaTimeout),{once:true});
})();
