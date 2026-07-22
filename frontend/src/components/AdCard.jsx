import { useState } from 'react';
import { getIconEmoji } from '../constants/adThemes';

export default function AdCard({
  ad,
  onBadgeClick,
  showArrows = true,
  enableDirections = false,
  className = '',
  style = {},
}) {
  const [imgError, setImgError] = useState(false);
  const accent = ad?.accent || '#f59e0b';
  const locationText = [ad?.merchant?.address, ad?.merchant?.city].filter(Boolean).join(', ') || 'Location not set';

  const directionsUrl = (() => {
    if (!enableDirections || !ad?.showDirections) return null;
    const m = ad.merchant;
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

  return (
    <div
      className={`ad-card ${showArrows ? 'ad-card-arrows' : 'ad-card-no-arrows'} ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: showArrows ? '36px 1fr auto 36px' : '1fr auto',
        gap: '12px',
        padding: '0 12px',
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
        @media (max-width: 640px) {
          .ad-card.ad-card-arrows {
            grid-template-columns: 28px 1fr auto 28px !important;
            grid-template-rows: 1fr !important;
          }
          .ad-card.ad-card-arrows > .ad-card-badge > div {
            width: min(64px, 18vw) !important;
            height: min(64px, 18vw) !important;
            font-size: 10px !important;
            padding: 4px !important;
          }
          .ad-card.ad-card-no-arrows {
            grid-template-columns: 1fr auto !important;
            grid-template-rows: 1fr !important;
          }
          .ad-card.ad-card-no-arrows > .ad-card-badge > div {
            width: min(64px, 18vw) !important;
            height: min(64px, 18vw) !important;
            font-size: 10px !important;
            padding: 4px !important;
          }
        }
      `}</style>

      {showArrows && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1, backdropFilter: 'blur(4px)',
          }}>‹</div>
        </div>
      )}

      <div className="ad-card-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: directionsUrl ? 'pointer' : 'default' }}
          onClick={directionsUrl ? () => window.open(directionsUrl, '_blank', 'noopener,noreferrer') : undefined}
          role={directionsUrl ? 'button' : undefined}
          tabIndex={directionsUrl ? 0 : undefined}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: accent + '33',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
            border: `1px solid ${accent}66`, overflow: 'hidden',
          }}>
            {ad?.imageUrl && !imgError ? (
              <img src={ad.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} onError={() => setImgError(true)} />
            ) : getIconEmoji(ad?.icon)}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {ad?.merchant?.businessName || 'Partner'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', whiteSpace: 'normal', wordBreak: 'break-word', marginTop: 1 }}>
              {locationText}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1.3, textAlign: 'center' }}>
          {ad?.title}
        </div>

        {ad?.description && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {ad.description}
          </div>
        )}
      </div>

      <div className="ad-card-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          onClick={onBadgeClick ? () => onBadgeClick(ad) : undefined}
          style={{
            width: 'min(88px, 22vw)', height: 'min(88px, 22vw)',
            borderRadius: '50%', background: '#f59e0b', color: '#000',
            fontWeight: 800, fontSize: (ad?.ctaText || 'Learn More').length > 10 ? 11 : 13,
            lineHeight: 1.15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: 8,
            cursor: onBadgeClick ? 'pointer' : 'default',
            whiteSpace: 'normal', wordBreak: 'break-word', flexShrink: 0,
            ...(onBadgeClick ? { animation: 'ad-card-pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' } : {}),
          }}
        >
          {ad?.ctaText || 'Learn More'}
        </div>
      </div>

      {showArrows && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1, backdropFilter: 'blur(4px)',
          }}>›</div>
        </div>
      )}
    </div>
  );
}
