import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, MapPin, Phone, Mail, Store, ShoppingCart, Navigation,
  Coffee, Scissors, Stethoscope, Pill, Shirt, BookOpen, 
  Dumbbell, Wrench, Hotel, GraduationCap, Info, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/Badge';

export default function FindPartners() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'category' | 'newest'

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const res = await api.get('/api/customer/merchants');
        setMerchants(res.data.data);
      } catch (err) {
        toast.error('Failed to load platform merchants.');
      } finally {
        setLoading(false);
      }
    };
    fetchMerchants();
  }, []);

  // Category filter list
  const categoryPills = [
    { id: 'all', label: '?? All' },
    { id: 'grocery', label: '?? Grocery' },
    { id: 'cafe', label: '? Cafe & Restaurant' },
    { id: 'beauty', label: '?? Beauty & Salon' },
    { id: 'doctor', label: '?? Doctor & Clinic' },
    { id: 'pharmacy', label: '?? Pharmacy' },
    { id: 'fashion', label: '?? Fashion & Clothing' },
    { id: 'stationery', label: '?? Stationery & Books' },
    { id: 'gym', label: '??? Gym & Fitness' },
    { id: 'electronics', label: '?? Electronics & Repair' },
    { id: 'hotel', label: '?? Hotel & Travel' },
    { id: 'education', label: '?? Education' }
  ];

  // Extract unique cities from merchants
  const uniqueCities = [...new Set(merchants.map(m => m.city).filter(Boolean))].sort();

  const getCategoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'grocery') return <ShoppingCart className="w-4 h-4 shrink-0" />;
    if (c === 'cafe') return <Coffee className="w-4 h-4 shrink-0" />;
    if (c === 'beauty') return <Scissors className="w-4 h-4 shrink-0" />;
    if (c === 'doctor') return <Stethoscope className="w-4 h-4 shrink-0" />;
    if (c === 'medical' || c === 'pharmacy') return <Pill className="w-4 h-4 shrink-0" />;
    if (c === 'fashion') return <Shirt className="w-4 h-4 shrink-0" />;
    if (c === 'stationery') return <BookOpen className="w-4 h-4 shrink-0" />;
    if (c === 'gym') return <Dumbbell className="w-4 h-4 shrink-0" />;
    if (c === 'electronics') return <Wrench className="w-4 h-4 shrink-0" />;
    if (c === 'hotel') return <Hotel className="w-4 h-4 shrink-0" />;
    if (c === 'education') return <GraduationCap className="w-4 h-4 shrink-0" />;
    return <Store className="w-4 h-4 shrink-0" />;
  };

  const getCardTheme = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'grocery') return { border: 'border-l-4 border-l-emerald-500', glow: 'hover:shadow-emerald-500/5' };
    if (c === 'cafe') return { border: 'border-l-4 border-l-amber-500', glow: 'hover:shadow-amber-500/5' };
    if (c === 'beauty') return { border: 'border-l-4 border-l-pink-500', glow: 'hover:shadow-pink-500/5' };
    if (c === 'doctor') return { border: 'border-l-4 border-l-blue-500', glow: 'hover:shadow-blue-500/5' };
    if (c === 'medical' || c === 'pharmacy') return { border: 'border-l-4 border-l-teal-500', glow: 'hover:shadow-teal-500/5' };
    if (c === 'fashion') return { border: 'border-l-4 border-l-purple-500', glow: 'hover:shadow-purple-500/5' };
    return { border: 'border-l-4 border-l-slate-400 dark:border-l-slate-600', glow: 'hover:shadow-slate-500/5' };
  };

  const matchesCategory = (merchantCat, selectedPill) => {
    if (selectedPill === 'all') return true;
    const cat = merchantCat.toLowerCase();
    if (selectedPill === 'grocery') return cat === 'grocery';
    if (selectedPill === 'cafe') return cat === 'cafe';
    if (selectedPill === 'doctor') return cat === 'doctor';
    if (selectedPill === 'pharmacy') return cat === 'medical' || cat === 'pharmacy';
    if (selectedPill === 'fashion') return cat === 'fashion';
    if (selectedPill === 'electronics') return cat === 'electronics';
    if (selectedPill === 'beauty') return cat === 'beauty';
    if (selectedPill === 'stationery') return cat === 'stationery';
    if (selectedPill === 'gym') return cat === 'gym';
    if (selectedPill === 'hotel') return cat === 'hotel';
    if (selectedPill === 'education') return cat === 'education';
    return cat === selectedPill;
  };

  const filteredMerchants = merchants
    .filter((m) => {
      const query = search.toLowerCase();
      const matchesSearch =
        m.businessName.toLowerCase().includes(query) ||
        (m.category || '').toLowerCase().includes(query) ||
        (m.address || '').toLowerCase().includes(query) ||
        (m.city || '').toLowerCase().includes(query);
      const matchesPill = matchesCategory(m.category, selectedCategory);
      const matchesCity = selectedCity === 'all' || m.city === selectedCity;
      return matchesSearch && matchesPill && matchesCity;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.businessName.localeCompare(b.businessName);
      }
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
        </div>
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-full w-24 shrink-0 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              <div className="h-px bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Find Partners</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Discover SkillXT merchants near you � earn and redeem points at all listed outlets
        </p>
      </div>

      {/* SECTION 1 � SEARCH BAR */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="Search by name, category or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* SECTION 1.5 � CITY FILTER DROPDOWN */}
      {uniqueCities.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">City:</span>
          <select
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-xs font-bold"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="all">All Cities</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}

      {/* SECTION 2 � CATEGORY FILTER PILLS */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none'
        }}
      >
        {categoryPills.map((pill) => {
          const isActive = selectedCategory === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setSelectedCategory(pill.id)}
              className={`px-4 py-2 text-xs font-bold rounded-full border shrink-0 transition-all ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/10'
                  : 'bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              } btn-press`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 3 � RESULTS COUNT + SORT */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/40 pt-4 flex-wrap gap-3">
        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
          Showing {filteredMerchants.length} {filteredMerchants.length === 1 ? 'partner' : 'partners'}
        </span>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400">Sort by:</span>
          <select
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-xs font-bold capitalize"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Name A-Z</option>
            <option value="category">Category</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* SECTION 4 � MERCHANT CARDS GRID */}
      {filteredMerchants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMerchants.map((m) => {
            const theme = getCardTheme(m.category);
            return (
              <div
                key={m.id}
                className={`bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 shadow-sm transition-all card-fadeIn flex flex-col justify-between ${theme.border} ${theme.glow}`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                      {m.category}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">{m.businessName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Owner: {m.ownerName}</p>
                  </div>
                  
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    {getCategoryIcon(m.category)}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200 dark:bg-slate-700/60 my-4" />

                {/* Body Details */}
                <div className="space-y-2 mb-4">
                  {m.address && (
                    <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span>{m.address}</span>
                        {m.city && (
                          <span className="block text-slate-400 dark:text-slate-500 font-medium">
                            {m.city}
                          </span>
                        )}
                        {m.landmark && (
                          <span className="block text-slate-400 dark:text-slate-500 text-[10px]">
                            Near: {m.landmark}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 text-xs">
                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <a
                      href={`tel:${m.user?.mobile || m.mobile}`}
                      className="text-primary hover:underline font-bold"
                    >
                      +91 {m.user?.mobile || m.mobile}
                    </a>
                  </div>

                  {m.email && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{m.email}</span>
                    </div>
                  )}

                  {(m.googleMapsUrl || (m.latitude && m.longitude) || m.address) && (
                    <a
                      href={m.googleMapsUrl || (m.latitude ? `https://www.google.com/maps?q=${m.latitude},${m.longitude}` : `https://www.google.com/maps/search/${encodeURIComponent(m.address)}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Get Directions
                    </a>
                  )}
                </div>

                {/* Card Footer strip */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between text-[10px] flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black tracking-wider uppercase">
                    SkillXT Partner
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold tracking-tight">
                    Earn & Redeem points here
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SECTION 5 � EMPTY STATE */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6">
          <div className="p-4 bg-slate-100 dark:bg-slate-800/40 text-slate-400 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">No partners found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Try a different category or search term
          </p>
        </div>
      )}
    </div>
  );
}
