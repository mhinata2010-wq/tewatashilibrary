// ====== ユーティリティ ======
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 80;
  const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ====== 初期化 ======
document.addEventListener('DOMContentLoaded', () => {
  // ▼ 背景スライド：クロスフェード & 画像自動検出に対応（HTML/CSS編集不要）
  const topPage = document.getElementById('top-page');
  if (topPage) {
    // スタッキング分離（背景レイヤーを常に下へ）
    if (getComputedStyle(topPage).position === 'static') topPage.style.position = 'relative';
    topPage.style.isolation = 'isolate';
    Object.assign(topPage.style, {
      minHeight: '100vh',
      backgroundColor: '#000'
    });

    // 背景レイヤーを2枚作成（クロスフェード用）
    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    [layerA, layerB].forEach(el => {
      Object.assign(el.style, {
        position: 'absolute',
        inset: '0',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: '0',
        transition: 'opacity 1.2s ease',
        willChange: 'opacity',
        pointerEvents: 'none',
        zIndex: '-1' // コンテンツより背面に固定
      });
      el.className = 'top-bg-layer';
    });
    // 先に挿入された方が手前になるため、順にprepend
    topPage.prepend(layerB);
    topPage.prepend(layerA);

    // 画像リスト：data-属性があれば優先。なければ hero-1..N.(jpeg|jpg|png|webp) を自動探索
    let manualList = [];
    try {
      if (topPage.dataset.heroImages) manualList = JSON.parse(topPage.dataset.heroImages);
    } catch (e) {
      console.warn('data-hero-images のJSONが不正です: ', e);
    }

    const exts = ['jpeg', 'jpg', 'png', 'webp'];
    const MAX_INDEX = 40; // ここまで順番に存在確認
    const base = './assets/images/';
    const prefix = 'hero-';

    const candidates = manualList.length
      ? manualList
      : (() => {
          const list = [];
          for (let i = 1; i <= MAX_INDEX; i++) {
            for (const ext of exts) list.push(`${base}${prefix}${i}.${ext}`);
          }
          return list;
        })();

    const loaded = [];
    let pending = candidates.length;
    let started = false;

    function tryStart() {
      // 2枚以上読み込めたら開始（または探索が完了したら1枚でも開始）
      if (started) return;
      if (loaded.length >= 2 || pending === 0) {
        if (loaded.length === 0) return; // 何も無ければ開始しない
        startSlideshow(loaded);
        started = true;
      }
    }

    // 先読みして存在する画像だけ採用
    candidates.forEach(src => {
      const img = new Image();
      img.onload = () => { loaded.push(src); tryStart(); };
      img.onerror = () => { tryStart(); };
      img.src = src;
    });

    function startSlideshow(images) {
      let i = 0;
      let showingA = true;
      const setBG = (el, src) => { el.style.backgroundImage = `url("${src}")`; };

      // 初期表示
      setBG(layerA, images[i % images.length]);
      layerA.style.opacity = '1';

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const FADE = prefersReduced ? 0 : 1200; // フェード時間(ms)
      const HOLD = 4800; // 表示保持(ms) → 合計約5秒

      setInterval(() => {
        i = (i + 1) % images.length;
        const next = images[i];

        if (showingA) {
          setBG(layerB, next);
          // リフローでトランジションを確実に有効化
          // eslint-disable-next-line no-unused-expressions
          layerB.offsetHeight;
          layerB.style.transitionDuration = FADE + 'ms';
          layerA.style.transitionDuration = FADE + 'ms';
          layerB.style.opacity = '1';
          layerA.style.opacity = '0';
        } else {
          setBG(layerA, next);
          layerA.offsetHeight;
          layerA.style.transitionDuration = FADE + 'ms';
          layerB.style.transitionDuration = FADE + 'ms';
          layerA.style.opacity = '1';
          layerB.style.opacity = '0';
        }
        showingA = !showingA;
      }, FADE + HOLD);
    }
  }

  // モバイルメニュー
  const mobileToggle = qs('#mobile-toggle');
  const mobileOverlay = qs('#mobile-overlay');
  const mobileContent = qs('#mobile-content');
  const mobileBackdrop = qs('#mobile-backdrop');

  function openMenu() {
    mobileOverlay.classList.remove('hidden');
    mobileOverlay.classList.add('visible');
    mobileContent.classList.remove('hidden');
    mobileContent.classList.add('visible');
    document.body.style.overflow = 'hidden';
    mobileToggle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M6 18L18 6M6 6l12 12"/>
      </svg>`;
  }
  function closeMenu() {
    mobileOverlay.classList.add('hidden');
    mobileOverlay.classList.remove('visible');
    mobileContent.classList.add('hidden');
    mobileContent.classList.remove('visible');
    document.body.style.overflow = 'unset';
    mobileToggle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"/>
      </svg>`;
  }
  let menuOpen = false;
  mobileToggle.addEventListener('click', () => {
    menuOpen ? closeMenu() : openMenu();
    menuOpen = !menuOpen;
  });
  mobileBackdrop.addEventListener('click', () => {
    if (menuOpen) { closeMenu(); menuOpen = false; }
  });

  // メニュークリック（デスクトップ／モバイル共通）
  qsa('.top-menu-item,.mobile-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      scrollToSection(id);
      if (menuOpen) { closeMenu(); menuOpen = false; }
    });
  });

  // ロゴでトップへ
  qs('#logo').addEventListener('click', scrollToTop);

  // Instagramポップアップ（3秒後に表示）
  const igPopup = qs('#ig-popup');
  const igClose = qs('#ig-close');
  setTimeout(() => {
    igPopup.classList.remove('hidden');
  }, 3000);
  igClose.addEventListener('click', (e) => {
    e.stopPropagation();
    igPopup.classList.add('hidden');
  });
  igPopup.addEventListener('click', () => {
    window.open('https://www.instagram.com/kitanarashino.tewatashi.lib', '_blank');
  });

  // セクション出現アニメ（必要なら .visible をCSSで利用）
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  qsa('section[id]').forEach(sec => io.observe(sec));
});