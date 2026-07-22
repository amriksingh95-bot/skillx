import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import Modal from './Modal';
import AdCard from './AdCard';

const carouselStyle = (
  <style>{`
    .ad-carousel-wrapper { min-height: 160px; height: 160px; }
    .ad-carousel-inner { padding-left: 44px; padding-right: 44px; }
    @media (max-width: 640px) {
      .ad-carousel-wrapper { min-height: 160px; height: 160px; }
      .ad-carousel-inner { padding-left: 40px; padding-right: 40px; }
    }
  `}</style>
);

const DEMO_ADS = [
  {
    id: 'freshmart-1',
    title: 'Shop fresh, earn real rewards every visit',
    description: null,
    imageUrl: null,
    icon: '🛒',
    ctaText: 'Earn Points',
    showDirections: true,
    merchant: {
      businessName: 'FreshMart Grocery',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#0a2a0a,#0f4d1a)',
    accent: '#1fba64',
  },
  {
    id: 'freshmart-2',
    title: 'Every ₹10 you spend = 1 loyalty point',
    description: 'Redeem points for discounts at any SkillXT partner',
    imageUrl: null,
    icon: '🌾',
    ctaText: 'Join Free',
    showDirections: true,
    merchant: {
      businessName: 'FreshMart Grocery',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#1a2a0a,#2a4d0f)',
    accent: '#8bc34a',
  },
  {
    id: 'freshmart-3',
    title: '8,333 reward points waiting for customers',
    description: 'FreshMart has issued ₹2,338 in savings to loyal shoppers',
    imageUrl: null,
    icon: '🎁',
    ctaText: 'Redeem Now',
    showDirections: true,
    merchant: {
      businessName: 'FreshMart Grocery',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#0a1a2a,#0f3a4d)',
    accent: '#29b6f6',
  },
  {
    id: 'techzone-1',
    title: 'Buy smarter — earn points on every gadget',
    description: null,
    imageUrl: null,
    icon: '📱',
    ctaText: 'Earn Points',
    showDirections: true,
    merchant: {
      businessName: 'TechZone Electronics',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#0a0a2a,#1a1060)',
    accent: '#4a8fff',
  },
  {
    id: 'techzone-2',
    title: '₹36,000+ in electronics — now with loyalty rewards',
    description: 'Every purchase earns you points redeemable anywhere',
    imageUrl: null,
    icon: '💻',
    ctaText: 'Learn More',
    showDirections: true,
    merchant: {
      businessName: 'TechZone Electronics',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#0f0a2a,#2a1060)',
    accent: '#b39ddb',
  },
  {
    id: 'techzone-3',
    title: '5,000 reward points ready — use at any partner store',
    description: 'Shop at TechZone, save money across all of Ludhiana',
    imageUrl: null,
    icon: '⭐',
    ctaText: 'Redeem Now',
    showDirections: true,
    merchant: {
      businessName: 'TechZone Electronics',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#0a1a2a,#0f2a4d)',
    accent: '#f0c040',
  },
  {
    id: 'drsharma-1',
    title: 'Your health visits now earn loyalty rewards',
    description: null,
    imageUrl: null,
    icon: '🩺',
    ctaText: 'Book & Earn',
    showDirections: true,
    merchant: {
      businessName: 'Dr. Sharma Clinic',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#012030,#01577a)',
    accent: '#26c6da',
  },
  {
    id: 'drsharma-2',
    title: 'Every consultation earns points — redeem anywhere',
    description: 'Spend your points at groceries, electronics, and more',
    imageUrl: null,
    icon: '💊',
    ctaText: 'Learn More',
    showDirections: true,
    merchant: {
      businessName: 'Dr. Sharma Clinic',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#012a1a,#015a3a)',
    accent: '#66bb6a',
  },
  {
    id: 'drsharma-3',
    title: '5,000 reward points available for patients right now',
    description: 'Dr. Sharma Clinic — trusted care, real savings on SkillXT',
    imageUrl: null,
    icon: '❤️',
    ctaText: 'Redeem Points',
    showDirections: true,
    merchant: {
      businessName: 'Dr. Sharma Clinic',
      address: 'Main Street',
      city: 'Ludhiana',
      landmark: null,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    bg: 'linear-gradient(110deg,#1a0a30,#3a1060)',
    accent: '#ce93d8',
  },
];

export function getDirectionsUrl(ad) {
  if (!ad) return null;
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
}

function AdSlide({ ad, visible, onBadgeClick, onPrevClick, onNextClick }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        height: 160,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(30px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <AdCard
        ad={ad}
        onBadgeClick={onBadgeClick}
        showArrows={true}
        enableDirections={true}
        style={{ height: '100%', borderRadius: 0 }}
      />
    </div>
  );
}

function AdModal({ ad, onClose }) {
  const directionsUrl = getDirectionsUrl(ad);
  const canShowDirections = ad?.showDirections && directionsUrl;
  const locationText = [ad?.merchant?.address, ad?.merchant?.city].filter(Boolean).join(', ') || 'Location not set';

  return (
    <Modal isOpen={!!ad} onClose={onClose} title={ad?.title || 'Ad Details'} size="md">
      <div className="space-y-4">
        {ad?.imageUrl && (
          <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sponsored</div>
          {ad?.description && (
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, whiteSpace: 'pre-wrap' }}>{ad.description}</p>
          )}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Merchant</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{ad?.merchant?.businessName}</div>
          {locationText !== 'Location not set' && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{locationText}</div>
          )}
          {canShowDirections && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#00bcd4', marginTop: 6, textDecoration: 'none' }}
            >
              Get Directions ↗
            </a>
          )}
          {ad?.ctaLink && (
            <a
              href={ad.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#00bcd4', marginTop: 6, textDecoration: 'none' }}
            >
              {ad.ctaText || 'Visit Offer'} ↗
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AdCarousel({ ads, accent, onBadgeClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef(null);
  const impressionSentRef = useRef(new Set());

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutRef.current);
    };
  }, [ads]);

  useEffect(() => {
    const ad = ads[currentIndex];
    if (!ad?.id || impressionSentRef.current.has(ad.id)) return;
    impressionSentRef.current.add(ad.id);
    api.patch(`/api/merchant/ads/${ad.id}/impression`).catch(() => {});
  }, [currentIndex, ads]);

  const goTo = (index) => {
    clearTimeout(timeoutRef.current);
    setFade(false);
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex(index);
      setFade(true);
    }, 300);
  };

  const goPrev = () => goTo((currentIndex - 1 + ads.length) % ads.length);
  const goNext = () => goTo((currentIndex + 1) % ads.length);

  const ad = ads[currentIndex];
  const currentAccent = ad?.accent || accent || '#f59e0b';

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', marginBottom: 8, position: 'relative' }}>
      <div
        className="ad-carousel-wrapper ad-carousel-inner"
        style={{
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {ads.map((adItem, i) => (
          <AdSlide
            key={adItem.id || i}
            ad={adItem}
            visible={i === currentIndex}
            onBadgeClick={onBadgeClick}
            onPrevClick={goPrev}
            onNextClick={goNext}
          />
        ))}

        {/* Dots */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 5,
          }}
        >
          {ads.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i === currentIndex ? currentAccent : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                transition: 'background 0.3s, transform 0.2s',
                transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdBanner() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAd, setModalAd] = useState(null);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await api.get('/api/ads/active');
        if (res.data.success && res.data.data.length > 0) {
          setAds(res.data.data);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, []);

  const handleBadgeClick = async (ad) => {
    setModalAd(ad);
    try {
      await api.patch(`/api/ads/${ad.id}/click`);
    } catch (err) {
      // ignore tracking failures
    }
  };

  if (loading) return null;

  if (ads.length === 0) {
    return (
      <>
        {carouselStyle}
        <AdCarousel ads={DEMO_ADS} accent="#f59e0b" onBadgeClick={handleBadgeClick} />
      </>
    );
  }

  return (
    <>
      {carouselStyle}
      <AdCarousel ads={ads} onBadgeClick={handleBadgeClick} />
      {modalAd && <AdModal ad={modalAd} onClose={() => setModalAd(null)} />}
    </>
  );
}