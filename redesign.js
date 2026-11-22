document.addEventListener("DOMContentLoaded",()=>{const toggle=document.querySelector(".menu-toggle"),nav=document.querySelector(".nav");if(toggle&&nav){toggle.addEventListener("click",()=>{const opened=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(opened));toggle.textContent=opened?"閉じる":"メニュー";});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー"}));document.addEventListener("keydown",e=>{if(e.key==="Escape"){nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.textContent="メニュー"}})}document.querySelectorAll("img[data-fallback]").forEach(img=>{const fallback=()=>{img.hidden=true;img.style.display="none";const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=false};img.addEventListener("error",fallback);if(img.complete&&!img.naturalWidth)fallback();else img.addEventListener("load",()=>{const label=img.parentElement.querySelector(".image-fallback");if(label)label.hidden=true})})});
// Play once on entering the viewport; replay is explicitly controlled by the visitor.
document.addEventListener("DOMContentLoaded", () => {
  const scene = document.querySelector(".door-scene");
  const replay = document.querySelector(".door-replay");
  if (!scene) return;
  let replayTimer;
  const open = () => scene.classList.add("is-open");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        open();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(scene);
  } else open();
  replay?.addEventListener("click", () => {
    clearTimeout(replayTimer);
    scene.classList.remove("is-open");
    replay.disabled = true;
    replayTimer = setTimeout(() => {
      open();
      replay.disabled = false;
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1800);
  });
});
