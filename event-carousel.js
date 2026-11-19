// Native horizontal scrolling remains usable without JavaScript (touch, trackpad).
// This module adds mouse dragging, accessible navigation buttons and keyboard controls.
(() => {
  const track = document.getElementById('event-carousel-track');
  const prev = document.getElementById('event-scroll-prev');
  const next = document.getElementById('event-scroll-next');
  if (!track || !prev || !next) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stepSize = () => {
    const card = track.querySelector('.event-carousel-card');
    if (!card) return track.clientWidth;
    const styles = getComputedStyle(track);
    return card.getBoundingClientRect().width + parseFloat(styles.columnGap || styles.gap || '0');
  };
  const updateButtons = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };
  const move = (direction) => track.scrollBy({
    left: direction * stepSize(),
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  });
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons, { passive: true });

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      track.scrollTo({
        left: event.key === 'Home' ? 0 : track.scrollWidth,
        behavior: reducedMotion.matches ? 'instant' : 'smooth',
      });
    }
  });

  // Let the browser handle native touch swipes; only augment mouse-pointer drag.
  let drag = null;
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft };
    track.style.scrollSnapType = 'none';
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (Math.abs(event.clientX - drag.x) > 3) event.preventDefault();
    track.scrollLeft = drag.left - (event.clientX - drag.x);
  });
  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    drag = null;
    track.style.removeProperty('scroll-snap-type');
    track.classList.remove('is-dragging');
    updateButtons();
  };
  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    track.style.removeProperty('scroll-snap-type');
    track.classList.remove('is-dragging');
    updateButtons();
  });
  requestAnimationFrame(updateButtons);
})();