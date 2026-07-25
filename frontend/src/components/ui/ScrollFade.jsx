import { useRef, useState, useLayoutEffect, useCallback } from 'react';

export default function ScrollFade({
  children,
  className = '',
  fadeWidth = 24,
  peekPadding = 16,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    let timer;
    const raf = requestAnimationFrame(() => {
      checkScroll();
      timer = setTimeout(checkScroll, 200);
    });

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    let ro;
    const contentEl = el.firstElementChild;
    if (typeof ResizeObserver !== 'undefined' && contentEl) {
      ro = new ResizeObserver(() => checkScroll());
      ro.observe(contentEl);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (ro) ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto scrollbar-none relative ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      <div style={{ paddingRight: peekPadding }}>
        {children}
      </div>
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 pointer-events-none scroll-fade-left"
          style={{ width: fadeWidth }}
        />
      )}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none scroll-fade-right"
          style={{ width: fadeWidth }}
        />
      )}
    </div>
  );
}
