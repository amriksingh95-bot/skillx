/**
 * DemoMerchantProfile — /demo/merchant/:id (Phase 3).
 *
 * Demo-only page: reads merchants straight from the in-memory store via
 * useDemo() (no adapter/backend changes). Shows the merchant's offers,
 * geo-validated Directions (utils/geo.js, opens in a new tab), and the
 * earn/redeem SimulatorModal. The real pages/merchant/MerchantProfile.jsx
 * is intentionally NOT reused here.
 */
import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Store,
  Tag,
  Ticket
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { buildDirectionsUrl } from '../../utils/geo';
import SimulatorModal from '../../components/demo/SimulatorModal';

function formatValidUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DemoMerchantProfile() {
  const { id } = useParams();
  const { store } = useDemo();
  const merchants = useMemo(() => store.getMerchants(), [store]);
  const merchant = merchants.find((m) => m.id === id);
  const [simOpen, setSimOpen] = useState(false);

  if (!merchant) {
    return (
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-center">
        <Store className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1">Merchant not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          This demo merchant does not exist or is no longer active.
        </p>
        <Link
          to="/demo/partners"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Find Partners
        </Link>
      </div>
    );
  }

  const directionsUrl = buildDirectionsUrl(merchant.latitude, merchant.longitude);
  const offers = Array.isArray(merchant.offers) ? merchant.offers : [];

  return (
    <div className="space-y-6">
      <Link
        to="/demo/partners"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Find Partners
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              {merchant.category}
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {merchant.businessName}
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Owner: {merchant.ownerName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </a>
            )}
            <button
              onClick={() => setSimOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors btn-press"
            >
              Simulate earning / redeeming
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span>{merchant.address}</span>
              {merchant.city && (
                <span className="block text-slate-400 dark:text-slate-500 font-medium text-xs">
                  {merchant.city}
                </span>
              )}
              {merchant.landmark && (
                <span className="block text-slate-400 dark:text-slate-500 text-[11px]">
                  Near: {merchant.landmark}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <a
              href={`tel:${merchant.user?.mobile || merchant.mobile}`}
              className="font-bold text-primary hover:underline"
            >
              +91 {merchant.user?.mobile || merchant.mobile}
            </a>
          </div>
          {merchant.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="break-all">{merchant.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {merchant.openingTime} – {merchant.closingTime}
              {merchant.workingDays ? ` · ${merchant.workingDays}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Offers card */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-white mb-4">
          <Ticket className="w-4 h-4 text-primary" />
          Current offers
        </h2>
        {offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer, idx) => (
              <div
                key={`${merchant.id}-offer-${idx}`}
                className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {offer.title}
                  </h3>
                  {formatValidUntil(offer.validUntil) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      <CalendarDays className="w-3 h-3" />
                      Valid until {formatValidUntil(offer.validUntil)}
                    </span>
                  )}
                </div>
                {offer.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                    {offer.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Tag className="w-4 h-4" />
            No live offers right now — check back soon.
          </div>
        )}
      </div>

      <SimulatorModal
        isOpen={simOpen}
        onClose={() => setSimOpen(false)}
        merchantId={merchant.id}
      />
    </div>
  );
}
