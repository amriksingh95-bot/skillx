import { useState, useRef } from 'react';
import { getIconEmoji } from '../constants/adThemes';

export default function AdCard({
  ad,
  onBadgeClick,
  showArrows = true,
  enableDirections = false,
  className = '',
  style = {},
}) {
  const [slide, setSlide] = useState(0);
  const [slide1Error, setSlide1Error] = useState(false);
  const [slide2Error, setSlide2Error] = useState(false);
  const touchStartX = useRef(null);

  const accent = ad?.accent || '#f59e0b';
  const slide2Img = ad?.slide2ImageUrl || ad?.imageUrl;
  const trustText = ad?.trustText || 'Verified merchant';
  const slide2Text = ad?.slide2Caption || ad?.description || '';
  const locationText = [ad?.merchant?.address, ad?.merchant?.city].filter(Boolean).join(', ') || 'Location not set';
  const TOTAL_SLIDES = 3;

  const directionsUrl = (() => {
    if (!enableDirections || !ad?.showDirections) return null;
    const m = ad?.merchant;
    if (!m) return null;
    if (m.googleMapsUrl) return m.googleMapsUrl;
    if (m.latitude && m.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`;
    }
    if (m.address || m.city) {
      const addr = [m.address, m.city, m.landmark].filter(Boolean).join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }
    return null;
  })();

  const goNext = (e) => {
    if (e) e.stopPropagation();
    setSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  };

  const goPrev = (e) => {
    if (e) e.stopPropagation();
    setSlide((s) => Math.max(s - 1, 0));
  };

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const handleCtaClick = (e) => {
    e.stopPropagation();
    if (onBadgeClick) onBadgeClick(ad);
  };

  return (
    <div
      className={`ad-card ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        background: ad?.bg || 'linear-gradient(110deg,#0f172a,#1e293b)',
        borderRadius: 12,
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        @keyframes ad-card-pulse {
          0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
      `}</style>

      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: 3, padding: '4px 4px 0' }}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= slide ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Header — logo + two-line text + directions button */}
      <div style={{ padding: '6px 10px', background: 'var(--surface-2, #1e293b)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: accent + '44', border: `1px solid ${accent}88`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, overflow: 'hidden',
        }}>
          {ad?.imageUrl && !slide1Error ? (
            <img src={ad.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setSlide1Error(true)} />
          ) : getIconEmoji(ad?.icon)}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ad?.merchant?.businessName || 'Partner'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {locationText}
          </span>
        </div>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 20, flexShrink: 0,
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontSize: 10, fontWeight: 700, textDecoration: 'none',
              whiteSpace: 'nowrap', lineHeight: 1,
            }}
            title="Get Directions"
          >
            🧭 Directions
          </a>
        )}
      </div>

      {/* Slide area */}
      <div
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'relative', cursor: 'default' }}
      >
        {/* SLIDE 1 — Attraction */}
        {slide === 0 && (
          <div style={{ position: 'relative', width: '100%' }}>
            {ad?.imageUrl && !slide1Error ? (
              <img src={ad.imageUrl} alt={ad.title} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} onError={() => setSlide1Error(true)} />
            ) : (
              <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                {getIconEmoji(ad?.icon)}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 14px', zIndex: 5 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
                {ad?.title}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2 — Product Showcase */}
        {slide === 1 && (
          <div style={{ position: 'relative', width: '100%' }}>
            {slide2Img && !slide2Error ? (
              <img src={slide2Img} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} onError={() => setSlide2Error(true)} />
            ) : (
              <div style={{ width: '100%', height: 200, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                {getIconEmoji(ad?.icon)}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 36, right: 8, background: accent + 'cc', borderRadius: 6, padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {ad?.icon || 'Featured'}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 14px', zIndex: 5 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
                {slide2Text}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3 — Trust + Action */}
        {slide === 2 && (
          <div style={{ width: '100%', height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 16px' }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
              {trustText}
            </div>
            <button
              onClick={handleCtaClick}
              style={{
                background: '#f59e0b',
                color: '#000',
                border: 'none',
                borderRadius: 20,
                padding: '8px 28px',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                animation: onBadgeClick ? 'ad-card-pulse 2s cubic-bezier(0.215,0.61,0.355,1) infinite' : 'none',
                pointerEvents: 'auto',
              }}
            >
              {ad?.ctaText || 'Learn More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
