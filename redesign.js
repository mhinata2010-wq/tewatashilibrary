document.addEventListener("DOMContentLoaded",()=>{const toggle=document.querySelector(".menu-toggle"),nav=document.querySelector(".nav");if(toggle&&nav){toggle.addEventListener("click",()=>{const opened=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(opened));toggle.textContent=opened?"閉じる":"メニュー";});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー"}));document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("is-open")){nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー";toggle.focus()}})}document.querySelectorAll("img[data-fallback]").forEach(img=>{const fallback=()=>{img.hidden=true;img.style.display="none";const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=false};img.addEventListener("error",fallback);if(img.complete&&!img.naturalWidth)fallback();else img.addEventListener("load",()=>{const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=true})})});
// Intro CTA and splash: never block navigation indefinitely, including on broken images.
(function(){
 const intro=document.getElementById('open-about'), content=document.getElementById('about-content');
 function expandAbout(scroll){if(!content)return;content.hidden=false;content.classList.add('is-opening');if(intro)intro.setAttribute('aria-expanded','true');if(scroll)requestAnimationFrame(()=>{const heading=content.querySelector('h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}document.getElementById('about')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
 // Deep links into collapsed facility content must reveal it before scrolling.
 const facilityLink=document.querySelector('a[href="#facilities"]');
 const revealFacilities=()=>{
   expandAbout(false);
   requestAnimationFrame(()=>{
     const el=document.getElementById('facilities');if(!el)return;
     const header=document.querySelector('.site-header');
     const offset=(header?.getBoundingClientRect().height||0)+14;
     const y=Math.max(0,window.scrollY+el.getBoundingClientRect().top-offset);
     window.scrollTo({top:y,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
     history.replaceState(null,'','#facilities');
   });
 };
 facilityLink?.addEventListener('click',event=>{event.preventDefault();revealFacilities()});
 if(location.hash==='#facilities')revealFacilities();
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
 const retry=document.getElementById('video-retry');
 if(!video||!fallback||!video.querySelector('source'))return;
 let timer=null, terminalError=false;
 const showFallback=()=>{video.hidden=true;video.style.display='none';fallback.hidden=false};
 const showPlayer=()=>{if(terminalError)return;clearTimeout(timer);video.hidden=false;video.style.removeProperty('display');fallback.hidden=true};
 const armTimeout=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(video.readyState===0)showFallback()},8000)};
 const fail=()=>{terminalError=true;clearTimeout(timer);showFallback()};
 video.addEventListener('error',fail);
 video.querySelector('source').addEventListener('error',fail);
 video.addEventListener('loadedmetadata',showPlayer);
 video.addEventListener('canplay',showPlayer);
 retry?.addEventListener('click',()=>{
   terminalError=false;
   retry.disabled=true;
   retry.textContent='読み込み中…';
   video.load();
   armTimeout();
   const restore=()=>{retry.disabled=false;retry.textContent='動画を再読み込み'};
   video.addEventListener('loadedmetadata',restore,{once:true});
   video.addEventListener('error',restore,{once:true});
   setTimeout(restore,8500);
 });
 armTimeout();
})();

// Accessible section navigation: smooth movement, fixed header offset, and active underline.
(function initSectionNavigation(){
 const nav=document.getElementById('primary-nav');
 const header=document.querySelector('.site-header');
 if(!nav||!header)return;
 const anchors=[...nav.querySelectorAll('a[href^="#"]')];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const sections=anchors.map(a=>({a,section:document.getElementById(a.hash.slice(1))})).filter(x=>x.section);
 const setActive=target=>{
   anchors.forEach(a=>{
     const active=a.hash===target;
     a.classList.toggle('is-active',active);
     if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
   });
 };
 const goTo=(id,updateHistory=true)=>{
   const el=document.getElementById(id);
   if(!el)return;
   const offset=header.getBoundingClientRect().height+14;
   const y=Math.max(0,window.scrollY+el.getBoundingClientRect().top-offset);
   window.scrollTo({top:y,behavior:reduced.matches?'instant':'smooth'});
   setActive('#'+id);
   if(updateHistory && location.hash!=='#'+id)history.pushState(null,'','#'+id);
 };
 anchors.forEach(a=>a.addEventListener('click',event=>{
   const id=a.hash.slice(1);
   if(!document.getElementById(id))return;
   event.preventDefault();goTo(id);
 }));
 document.querySelectorAll('a.hero-video-link[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
   const id=a.hash.slice(1);if(!document.getElementById(id))return;
   event.preventDefault();goTo(id);
 }));
 let scheduled=false;
 const update=()=>{
   scheduled=false;
   const line=header.getBoundingClientRect().height+Math.min(160,window.innerHeight*.22);
   let current=null;
   sections.forEach(item=>{if(item.section.getBoundingClientRect().top<=line)current=item});
   setActive(current?.a.hash||'');
   header.classList.toggle('is-scrolled',window.scrollY>16);
 };
 window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
 window.addEventListener('resize',update,{passive:true});
 window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(id&&document.getElementById(id))goTo(id,false);else window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});});
 update();
 if(location.hash&&document.getElementById(location.hash.slice(1))){
   window.addEventListener('load',()=>goTo(location.hash.slice(1),false),{once:true});
 }
})();
