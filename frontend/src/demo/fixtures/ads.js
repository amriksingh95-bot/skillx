/**
 * Demo advertisements fixture.
 * Mirrors GET /api/ads/active (backend/src/controllers/merchantController.js:926-964):
 * full ad row + nested merchant { businessName, address, city, landmark,
 * latitude, longitude, googleMapsUrl }. Merchant names align with the
 * merchants fixture. AdCard additionally reads icon, ctaText, showDirections,
 * bg, accent, trustText, slide2Caption, slide2ImageUrl, description (AdCard.jsx:40-59).
 */

export const DEMO_ADS = [
  {
    id: 'demo-ad-01',
    merchantId: 'demo-m-03',
    title: 'Grocery runs that pay you back',
    description: 'Every ₹10 spent at NovaMart Grocery earns 1 loyalty point — redeemable across SkillXT partners.',
    imageUrl: null,
    slide2ImageUrl: null,
    slide2Caption: '₹9,950 lifetime spend already banked in this demo wallet',
    trustText: 'Verified SkillXT partner',
    icon: '🛒',
    ctaText: 'Earn Points',
    ctaLink: null,
    showDirections: true,
    status: 'live',
    startDate: null,
    endDate: null,
    bg: 'linear-gradient(110deg,#0a2a0a,#0f4d1a)',
    accent: '#1fba64',
    merchant: {
      businessName: 'NovaMart Grocery',
      address: '55 Mall Road, Civil Lines',
      city: 'Amritsar',
      landmark: 'Beside Post Office',
      latitude: 31.6362,
      longitude: 74.8748,
      googleMapsUrl: null
    }
  },
  {
    id: 'demo-ad-02',
    merchantId: 'demo-m-09',
    title: 'Stronger every rep — now with rewards',
    description: 'Join Iron Peak Gym and earn points on every membership payment and trainer session.',
    imageUrl: null,
    slide2ImageUrl: null,
    slide2Caption: 'Quarterly membership comes with a free month of diet planning',
    trustText: 'Verified SkillXT partner',
    icon: '🏋️',
    ctaText: 'Join & Earn',
    ctaLink: null,
    showDirections: true,
    status: 'live',
    startDate: null,
    endDate: null,
    bg: 'linear-gradient(110deg,#1a0a30,#3a1060)',
    accent: '#ce93d8',
    merchant: {
      businessName: 'Iron Peak Gym',
      address: '27 Attari Road, Rajpura Road',
      city: 'Amritsar',
      landmark: 'Near Rajpura Bus Stop',
      latitude: 31.6488,
      longitude: 74.8815,
      googleMapsUrl: null
    }
  },
  {
    id: 'demo-ad-03',
    merchantId: 'demo-m-02',
    title: 'Coffee, croissants, cashback in points',
    description: 'Morning Brew Deal at Lotus Leaf Cafe — second coffee at half price, points on every bill.',
    imageUrl: null,
    slide2ImageUrl: null,
    slide2Caption: 'Open 8 AM–10 PM, all week',
    trustText: 'Verified SkillXT partner',
    icon: '☕',
    ctaText: 'Learn More',
    ctaLink: null,
    showDirections: true,
    status: 'live',
    startDate: null,
    endDate: null,
    bg: 'linear-gradient(110deg,#1a2a0a,#2a4d0f)',
    accent: '#8bc34a',
    merchant: {
      businessName: 'Lotus Leaf Cafe',
      address: '8 Grand Trunk Road, Model Town',
      city: 'Jalandhar',
      landmark: 'Opposite Bus Stand',
      latitude: 31.3285,
      longitude: 75.5791,
      googleMapsUrl: null
    }
  }
];
