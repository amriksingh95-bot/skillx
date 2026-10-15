/**
 * Demo merchants fixture.
 *
 * Shape mirrors GET /api/customer/merchants (backend/src/controllers/customerController.js:377-413):
 *   id, userId, businessName, ownerName, email, address, city, category,
 *   isActive, createdAt (materialized from daysAgo by the store),
 *   latitude, longitude, googleMapsUrl, landmark, openingTime, closingTime,
 *   workingDays, isOpen, user: { id, mobile }, distance: null
 * Plus demo-only `offers: [{ title, description, validUntil }]` (not read by
 * FindPartners today; reserved for demo promo chips).
 *
 * Names are invented and checked against backend/prisma/seed.js:109-115
 * (FreshMart Grocery, MediPlus Pharmacy, BrewBeans Cafe, Dr. Sharma Clinic,
 * TechZone Electronics, StyleHub Fashion, QuickStop General) and
 * frontend/src/components/AdBanner.jsx DEMO_ADS (FreshMart Grocery,
 * TechZone Electronics, Dr. Sharma Clinic). Categories come from
 * frontend/src/constants/categories.js; cities from constants/cities.js.
 * Mobiles are fake 98xxxxxxxx numbers; emails are example.com.
 */

export const DEMO_MERCHANTS = [
  {
    id: 'demo-m-01',
    userId: 'demo-u-01',
    businessName: 'Cedar Kitchen Restaurant',
    ownerName: 'Harpreet Arora',
    email: 'cedarkitchen@example.com',
    address: '21 Cedar Lane, Model Town',
    city: 'Ludhiana',
    category: 'restaurant',
    isActive: true,
    daysAgo: 420,
    latitude: 30.9042,
    longitude: 75.8593,
    googleMapsUrl: null,
    landmark: 'Near Model Town Market',
    openingTime: '11:00',
    closingTime: '23:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-01', mobile: '9800000001' },
    distance: null,
    offers: [
      {
        title: 'Family Feast Combo',
        description: 'Flat 10% off on weekend family thali orders above ₹999.',
        validUntil: '2027-03-31'
      }
    ]
  },
  {
    id: 'demo-m-02',
    userId: 'demo-u-02',
    businessName: 'Lotus Leaf Cafe',
    ownerName: 'Simran Kaur',
    email: 'lotusleaf@example.com',
    address: '8 Grand Trunk Road, Model Town',
    city: 'Jalandhar',
    category: 'cafe',
    isActive: true,
    daysAgo: 380,
    latitude: 31.3285,
    longitude: 75.5791,
    googleMapsUrl: null,
    landmark: 'Opposite Bus Stand',
    openingTime: '08:00',
    closingTime: '22:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-02', mobile: '9800000002' },
    distance: null,
    offers: [
      {
        title: 'Morning Brew Deal',
        description: 'Buy one coffee, get the second at half price before 11 AM.',
        validUntil: '2026-12-31'
      }
    ]
  },
  {
    id: 'demo-m-03',
    userId: 'demo-u-03',
    businessName: 'NovaMart Grocery',
    ownerName: 'Gurpreet Singh',
    email: 'novamart@example.com',
    address: '55 Mall Road, Civil Lines',
    city: 'Amritsar',
    category: 'grocery',
    isActive: true,
    daysAgo: 350,
    latitude: 31.6362,
    longitude: 74.8748,
    googleMapsUrl: null,
    landmark: 'Beside Post Office',
    openingTime: '09:00',
    closingTime: '21:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-03', mobile: '9800000003' },
    distance: null,
    offers: [
      {
        title: 'Monthly Ration Saver',
        description: 'Extra 50 bonus points on grocery bills above ₹2,000.',
        validUntil: '2026-11-30'
      }
    ]
  },
  {
    id: 'demo-m-04',
    userId: 'demo-u-04',
    businessName: 'Glow & Grace Salon',
    ownerName: 'Neha Verma',
    email: 'glowgrace@example.com',
    address: '3 Ferozepur Link Road, Sarabha Nagar',
    city: 'Ludhiana',
    category: 'beauty',
    isActive: true,
    daysAgo: 300,
    latitude: 30.8925,
    longitude: 75.8641,
    googleMapsUrl: null,
    landmark: 'Near Sarabha Nagar Market',
    openingTime: '10:00',
    closingTime: '20:00',
    workingDays: 'Tue-Sun',
    isOpen: true,
    user: { id: 'demo-u-04', mobile: '9800000004' },
    distance: null,
    offers: [
      {
        title: 'Bridal Package',
        description: '₹500 off bridal makeup packages booked a week ahead.',
        validUntil: '2027-01-15'
      }
    ]
  },
  {
    id: 'demo-m-05',
    userId: 'demo-u-05',
    businessName: 'CarePlus Clinic',
    ownerName: 'Dr. Aisha Khan',
    email: 'careplus@example.com',
    address: '14 Kapurthala Road, Model Town',
    city: 'Jalandhar',
    category: 'doctor',
    isActive: true,
    daysAgo: 280,
    latitude: 31.3341,
    longitude: 75.5712,
    googleMapsUrl: null,
    landmark: 'Near Holy Heart School',
    openingTime: '09:30',
    closingTime: '18:00',
    workingDays: 'Mon-Sat',
    isOpen: true,
    user: { id: 'demo-u-05', mobile: '9800000005' },
    distance: null,
    offers: [
      {
        title: 'Health Check Discount',
        description: '15% off preventive health check-up packages.',
        validUntil: '2026-12-15'
      }
    ]
  },
  {
    id: 'demo-m-06',
    userId: 'demo-u-06',
    businessName: 'HealWell Pharmacy',
    ownerName: 'Manish Gupta',
    email: 'healwell@example.com',
    address: '79 GTB Nagar, Chheharta',
    city: 'Amritsar',
    category: 'medical',
    isActive: true,
    daysAgo: 260,
    latitude: 31.6155,
    longitude: 74.9021,
    googleMapsUrl: null,
    landmark: 'Near Chheharta Chowk',
    openingTime: '08:00',
    closingTime: '23:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-06', mobile: '9800000006' },
    distance: null,
    offers: [
      {
        title: 'Generic Medicine Savings',
        description: 'Extra 5% off on all generic medicine strip purchases.',
        validUntil: '2026-12-31'
      }
    ]
  },
  {
    id: 'demo-m-07',
    userId: 'demo-u-07',
    businessName: 'Vogue Threads',
    ownerName: 'Ritika Sharma',
    email: 'voguethreads@example.com',
    address: '46 Fountain Chowk, Sahnewal',
    city: 'Ludhiana',
    category: 'fashion',
    isActive: true,
    daysAgo: 210,
    latitude: 30.9678,
    longitude: 75.9911,
    googleMapsUrl: null,
    landmark: 'Near Fountain Chowk',
    openingTime: '10:30',
    closingTime: '21:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-07', mobile: '9800000007' },
    distance: null,
    offers: [
      {
        title: 'Festive Ethnic Wear',
        description: 'Flat ₹300 off on ethnic wear orders above ₹2,500.',
        validUntil: '2026-11-20'
      }
    ]
  },
  {
    id: 'demo-m-08',
    userId: 'demo-u-08',
    businessName: 'Paper Trail Stationery',
    ownerName: 'Karan Mehta',
    email: 'papertrail@example.com',
    address: '11 Nakodar Road, Urban Estate',
    city: 'Jalandhar',
    category: 'stationery',
    isActive: true,
    daysAgo: 190,
    latitude: 31.3095,
    longitude: 75.5912,
    googleMapsUrl: null,
    landmark: 'Near DAV College',
    openingTime: '09:00',
    closingTime: '20:00',
    workingDays: 'Mon-Sat',
    isOpen: true,
    user: { id: 'demo-u-08', mobile: '9800000008' },
    distance: null,
    offers: [
      {
        title: 'Back to School',
        description: 'Buy 2 stationery kits, get 1 free (select range).',
        validUntil: '2026-10-31'
      }
    ]
  },
  {
    id: 'demo-m-09',
    userId: 'demo-u-09',
    businessName: 'Iron Peak Gym',
    ownerName: 'Vikram Sethi',
    email: 'ironpeak@example.com',
    address: '27 Attari Road, Rajpura Road',
    city: 'Amritsar',
    category: 'gym',
    isActive: true,
    daysAgo: 150,
    latitude: 31.6488,
    longitude: 74.8815,
    googleMapsUrl: null,
    landmark: 'Near Rajpura Bus Stop',
    openingTime: '05:30',
    closingTime: '22:00',
    workingDays: 'Mon-Sun',
    isOpen: true,
    user: { id: 'demo-u-09', mobile: '9800000009' },
    distance: null,
    offers: [
      {
        title: 'Quarterly Membership',
        description: 'Join a 3-month membership and get 1 month of diet planning free.',
        validUntil: '2027-02-28'
      }
    ]
  },
  {
    id: 'demo-m-10',
    userId: 'demo-u-10',
    businessName: 'Circuit City Repairs',
    ownerName: 'Arjun Nair',
    email: 'circuitcity@example.com',
    address: '65 Focal Point, Phase 5',
    city: 'Ludhiana',
    category: 'electronics',
    isActive: true,
    daysAgo: 120,
    latitude: 30.9214,
    longitude: 75.8126,
    googleMapsUrl: null,
    landmark: 'Focal Point Chowk',
    openingTime: '10:00',
    closingTime: '20:00',
    workingDays: 'Mon-Sat',
    isOpen: true,
    user: { id: 'demo-u-10', mobile: '9800000010' },
    distance: null,
    offers: [
      {
        title: 'Screen Replacement Deal',
        description: '₹200 off smartphone screen replacements on all brands.',
        validUntil: '2026-12-31'
      }
    ]
  }
];
