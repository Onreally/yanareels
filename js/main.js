gsap.from(".hero-text", {
  opacity: 0,
  y: 40,
  duration: 1.25
});

function addSwipeNavigation(element, onSwipeLeft, onSwipeRight, threshold = 60) {
  if (!element) return;

  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let isLocked = false;
  let resetTimer = null;

  element.addEventListener('touchstart', (event) => {
    if (isLocked) return;

    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isDragging = false;
    element.style.transition = 'none';
  }, { passive: true });

  element.addEventListener('touchmove', (event) => {
    if (isLocked) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);

    if (!isDragging) {
      if (!isHorizontalGesture || Math.abs(deltaX) < 8) return;
      isDragging = true;
    }

    event.preventDefault();
    element.style.transform = `translate3d(${deltaX}px, 0, 0)`;
  }, { passive: false });

  const finishSwipe = (event) => {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    if (!isDragging || isLocked) {
      element.style.transition = 'transform 220ms ease';
      element.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isSwiped = isHorizontalSwipe && Math.abs(deltaX) >= threshold;

    if (!isSwiped) {
      element.style.transition = 'transform 220ms ease';
      element.style.transform = 'translate3d(0, 0, 0)';
      isDragging = false;
      return;
    }

    isLocked = true;
    const direction = deltaX < 0 ? 'left' : 'right';
    const exitDistance = Math.max(window.innerWidth * 0.22, 90);
    const exitOffset = direction === 'left' ? -exitDistance : exitDistance;

    element.style.transition = 'transform 220ms ease, opacity 220ms ease';
    element.style.transform = `translate3d(${exitOffset}px, 0, 0)`;
    element.style.opacity = '0.72';

    resetTimer = window.setTimeout(() => {
      if (direction === 'left') {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }

      element.style.transition = 'none';
      element.style.transform = `translate3d(${direction === 'left' ? '24px' : '-24px'}, 0, 0)`;
      element.style.opacity = '1';
      element.offsetHeight;

      requestAnimationFrame(() => {
        element.style.transition = 'transform 220ms ease';
        element.style.transform = 'translate3d(0, 0, 0)';
      });

      isDragging = false;
      isLocked = false;
    }, 220);
  };

  element.addEventListener('touchend', finishSwipe, { passive: true });
  element.addEventListener('touchcancel', finishSwipe, { passive: true });
}

// Функция для мобильной анимации тарифов
function initMobileServicesAnimation() {
  // Проверяем, мобильное ли устройство
  const isMobile = window.innerWidth <= 932;
  
  if (!isMobile) return; // Выходим, если не мобильное устройство
  
  console.log('Инициализация анимации для мобильных');
  
  // Регистрируем плагин ScrollTrigger
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Очищаем старые триггеры если они есть
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    
    // Анимация для каждой колонки с тарифами
    const columns = document.querySelectorAll('.services-column');
    
    if (columns.length > 0) {
      columns.forEach((column, index) => {
        // Сначала скрываем колонки
        gsap.set(column, {
          opacity: 0,
          y: 50
        });
        
        // Анимация появления при скролле
        gsap.to(column, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: index * 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: column,
            start: "top 100%",
            toggleActions: "play none none none",
            once: true
          }
        });
      });
      
      console.log('Анимация для', columns.length, 'колонок настроена');
    }
  } else {
    console.error('ScrollTrigger не загружен');
  }
}

function initInfiniteSnapCarousel({
  sectionSelector,
  viewportSelector,
  trackSelector,
  slideSelector,
  prevSelector,
  nextSelector,
  mediaSelector
}) {
  const section = document.querySelector(sectionSelector);
  if (!section) return;

  const viewport = section.querySelector(viewportSelector);
  const track = section.querySelector(trackSelector);
  const prevBtn = section.querySelector(prevSelector);
  const nextBtn = section.querySelector(nextSelector);
  if (!viewport || !track) return;

  const baseSlides = Array.from(track.querySelectorAll(slideSelector));
  const mediaNodes = mediaSelector ? Array.from(track.querySelectorAll(mediaSelector)) : [];
  if (baseSlides.length === 0) return;

  if (baseSlides.length > 1) {
    const firstClone = baseSlides[0].cloneNode(true);
    const lastClone = baseSlides[baseSlides.length - 1].cloneNode(true);
    firstClone.classList.add('is-clone');
    lastClone.classList.add('is-clone');
    track.appendChild(firstClone);
    track.insertBefore(lastClone, track.firstChild);
  }

  const allSlides = Array.from(track.querySelectorAll(slideSelector));
  const realCount = baseSlides.length;
  let currentIndex = realCount > 1 ? 1 : 0;
  let slideStep = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffset = 0;
  let dragOffset = 0;
  let isDragging = false;
  let activePointerId = null;
  let settleTimer = null;

  function getGap() {
    const computed = window.getComputedStyle(track);
    const gap = parseFloat(computed.gap || computed.columnGap || '0');
    return Number.isFinite(gap) ? gap : 0;
  }

  function getMaxIndex() {
    return realCount > 1 ? realCount + 1 : 0;
  }

  function clampLoopIndex(index) {
    return Math.max(0, Math.min(index, getMaxIndex()));
  }

  function getLogicalIndex(loopIndex) {
    if (realCount <= 1) return 0;
    if (loopIndex === 0) return realCount - 1;
    if (loopIndex === realCount + 1) return 0;
    return loopIndex - 1;
  }

  function measure() {
    if (allSlides.length === 0) return;
    const slideWidth = allSlides[0].getBoundingClientRect().width;
    slideStep = slideWidth + getGap();
  }

  function updateActiveSlide() {
    const logicalIndex = getLogicalIndex(currentIndex);

    allSlides.forEach((slide) => {
      slide.classList.remove('is-active');
    });

    const activeCandidates = Array.from(track.querySelectorAll(`${slideSelector}:not(.is-clone)`));
    if (activeCandidates[logicalIndex]) {
      activeCandidates[logicalIndex].classList.add('is-active');
    }

    if (mediaNodes.length > 0) {
      const activeMedia = mediaNodes.filter((node) => !node.closest('.is-clone'));
      activeMedia.forEach((node, index) => {
        if (index !== logicalIndex && typeof node.pause === 'function') {
          node.pause();
        }
      });
    }
  }

  function render(offset, animate = false, onComplete = null) {
    const target = Math.max(0, Math.min(offset, slideStep * getMaxIndex()));

    if (window.gsap) {
      gsap.killTweensOf(track);
      if (animate) {
        gsap.to(track, {
          x: -target,
          duration: 0.55,
          ease: "power3.out",
          overwrite: true,
          onComplete: () => {
            if (typeof onComplete === 'function') onComplete();
          }
        });
      } else {
        gsap.set(track, { x: -target });
        if (typeof onComplete === 'function') onComplete();
      }
      return;
    }

    track.style.transition = animate ? 'transform 550ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    track.style.transform = `translate3d(${-target}px, 0, 0)`;
    if (typeof onComplete === 'function') {
      if (animate) {
        window.setTimeout(onComplete, 560);
      } else {
        onComplete();
      }
    }
  }

  function normalizeLoopPosition() {
    if (realCount <= 1) return;
    if (currentIndex === 0) {
      currentIndex = realCount;
      dragOffset = currentIndex * slideStep;
      render(dragOffset, false);
    } else if (currentIndex === realCount + 1) {
      currentIndex = 1;
      dragOffset = currentIndex * slideStep;
      render(dragOffset, false);
    }
  }

  function snapTo(index, animate = true) {
    currentIndex = realCount > 1 ? clampLoopIndex(index) : 0;
    dragOffset = currentIndex * slideStep;
    updateActiveSlide();
    render(dragOffset, animate, () => {
      normalizeLoopPosition();
      updateActiveSlide();
    });
  }

  function settleToClosest() {
    const rawIndex = slideStep > 0 ? Math.round(dragOffset / slideStep) : currentIndex;
    snapTo(rawIndex, true);
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }

    activePointerId = event.pointerId;
    isDragging = false;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartOffset = currentIndex * slideStep;
    dragOffset = dragStartOffset;
    track.style.willChange = 'transform';
    track.style.transition = 'none';
    viewport.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (activePointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (!isDragging) {
      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      isDragging = true;
    }

    event.preventDefault();

    const projected = dragStartOffset - deltaX;
    const minOffset = 0;
    const maxOffset = slideStep * getMaxIndex();
    let nextOffset = projected;

    if (nextOffset < minOffset) {
      nextOffset = minOffset + (nextOffset - minOffset) * 0.35;
    } else if (nextOffset > maxOffset) {
      nextOffset = maxOffset + (nextOffset - maxOffset) * 0.35;
    }

    dragOffset = nextOffset;
    render(dragOffset, false);
  }

  function releasePointer(event) {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (!isDragging) {
      snapTo(currentIndex, true);
      return;
    }

    isDragging = false;
    settleToClosest();
    settleTimer = window.setTimeout(() => {
      track.style.willChange = 'auto';
      settleTimer = null;
    }, 650);
  }

  function onPointerCancel(event) {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    isDragging = false;
    snapTo(currentIndex, true);
  }

  function onResize() {
    measure();
    if (realCount > 1) {
      if (currentIndex === 0) currentIndex = realCount;
      if (currentIndex === realCount + 1) currentIndex = 1;
    }
    snapTo(currentIndex, false);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      snapTo(currentIndex - 1, true);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      snapTo(currentIndex + 1, true);
    });
  }

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', releasePointer);
  viewport.addEventListener('pointercancel', onPointerCancel);
  viewport.addEventListener('lostpointercapture', onPointerCancel);
  window.addEventListener('resize', onResize);

  measure();
  snapTo(currentIndex, false);
}

// Функция для видео-карусели
function initVideoCarousel() {
  initInfiniteSnapCarousel({
    sectionSelector: '.portfolio',
    viewportSelector: '.carousel-viewport',
    trackSelector: '.carousel-track',
    slideSelector: '.carousel-slide',
    prevSelector: '.carousel .carousel-btn-prev',
    nextSelector: '.carousel .carousel-btn-next',
    mediaSelector: '.carousel-video'
  });
}

// Функция для карусели отзывов
function initReviewsCarousel() {
  initInfiniteSnapCarousel({
    sectionSelector: '.reviews',
    viewportSelector: '.reviews-viewport',
    trackSelector: '.reviews-track',
    slideSelector: '.review-slide',
    prevSelector: '.reviews-carousel .carousel-btn-prev',
    nextSelector: '.reviews-carousel .carousel-btn-next',
    mediaSelector: null
  });
}

// Основной обработчик загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM загружен, инициализация компонентов');
  
  // Инициализируем карусели
  initVideoCarousel();
  initReviewsCarousel();
  
  // Инициализируем анимацию для тарифов
  initMobileServicesAnimation();
  
  // Добавляем обработчик изменения размера окна
  window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
      console.log('Размер окна изменен, переинициализация анимации');
      initMobileServicesAnimation();
    }, 250);
  });
});

// Также инициализируем при полной загрузке страницы
window.addEventListener('load', function() {
  console.log('Страница полностью загружена');
  initMobileServicesAnimation();
});
