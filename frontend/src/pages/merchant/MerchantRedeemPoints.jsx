import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Search,
  QrCode,
  User,
  Wallet,
  ArrowDownCircle,
  Gift,
  Camera,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MerchantRedeemPoints() {
  const [identifier, setIdentifier] = useState('');
  const [customer, setCustomer] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [mockQr, setMockQr] = useState('');

  // Live cash discount calculator state
  const [estimatedDiscount, setEstimatedDiscount] = useState(0);
  const [feePreview, setFeePreview] = useState({ grossDiscount: 0, platformFee: 0, netAmount: 0 });

  // Calculations for limits
  const rate = customer?.rewardSettings?.rupeesPerPoint || 0.10;
  const feePercent = customer?.rewardSettings?.redemptionFeePercent !== undefined && customer?.rewardSettings?.redemptionFeePercent !== null
    ? parseFloat(customer.rewardSettings.redemptionFeePercent)
    : 5;
  // 20% cap: points can cover at most 20% of the invoice value
  const maxDiscountAllowed = purchaseAmount && !isNaN(purchaseAmount) ? parseFloat(purchaseAmount) * 0.20 : 0;
  const maxPointsByPurchase = purchaseAmount && !isNaN(purchaseAmount) ? Math.floor(maxDiscountAllowed / rate) : (customer?.balance || 0);
  const maxRedeemablePoints = customer ? Math.min(customer.balance, maxPointsByPurchase) : 0;
  const maxDiscount = maxRedeemablePoints * rate;

  // Auto-fill points to redeem based on purchase amount
  useEffect(() => {
    if (!customer) return;
    if (purchaseAmount && !isNaN(purchaseAmount)) {
      setPointsToRedeem(maxRedeemablePoints.toString());
    } else {
      setPointsToRedeem('');
    }
  }, [purchaseAmount, customer]);

  // Search Customer by mobile/ID
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!identifier) return toast.error('Enter a mobile number or customer ID.');

    setIsSearching(true);
    setCustomer(null);
    setPurchaseAmount('');
    try {
      const res = await api.get(`/api/merchant/customer/${identifier}`);
      setCustomer(res.data.data);
      toast.success('Customer found.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Customer not found.';
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // QR Scanning Success Callback
  const handleQrScanSuccess = async (decodedText) => {
    setShowScanner(false);
    setIsSearching(true);
    setCustomer(null);
    setPurchaseAmount('');
    try {
      const res = await api.post('/api/merchant/customer/scan', { qrCode: decodedText });
      setCustomer(res.data.data);
      setIdentifier(res.data.data.mobile);
      toast.success(`QR Verified: ${res.data.data.name}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid QR code scan.';
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Manual mock scan for testing convenience
  const handleMockScanSubmit = (e) => {
    e.preventDefault();
    if (!mockQr) return toast.error('Paste a QR string first.');
    handleQrScanSuccess(mockQr);
  };

  // Setup HTML5 QR Scanner
  const handleQrScanSuccessRef = useRef(handleQrScanSuccess);
  handleQrScanSuccessRef.current = handleQrScanSuccess;

  useEffect(() => {
    let scanner = null;
    let cancelled = false;
    if (showScanner) {
      (async () => {
        try {
          const { Html5QrcodeScanner: Html5QrcodeScannerCls } = await import('html5-qrcode');
          if (cancelled) return;
          scanner = new Html5QrcodeScannerCls(
            'qr-reader-container',
            { fps: 10, qrbox: 250 },
            /* verbose= */ false
          );
          scanner.render(
            (text) => {
              scanner.clear();
              handleQrScanSuccessRef.current(text);
            },
            (err) => {
              console.warn('QR scan error:', err);
            }
          );
        } catch (e) {
          console.warn('QR init error:', e);
        }
      })();
    }

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [showScanner]);

  // Live preview calculator
  useEffect(() => {
    if (!pointsToRedeem || isNaN(pointsToRedeem)) {
      setEstimatedDiscount(0);
      setFeePreview({ grossDiscount: 0, platformFee: 0, netAmount: 0 });
      return;
    }
    const rate = customer?.rewardSettings?.rupeesPerPoint || 0.10;
    const feePct = customer?.rewardSettings?.redemptionFeePercent !== undefined && customer?.rewardSettings?.redemptionFeePercent !== null
      ? parseFloat(customer.rewardSettings.redemptionFeePercent)
      : 5;
    const grossDiscount = parseFloat(pointsToRedeem) * rate;
    const platformFee = grossDiscount * (feePct / 100);
    const netAmount = grossDiscount - platformFee;
    setEstimatedDiscount(grossDiscount);
    setFeePreview({
      grossDiscount: parseFloat(grossDiscount.toFixed(2)),
      platformFee: parseFloat(platformFee.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2))
    });
  }, [pointsToRedeem, customer]);

  const handlePointsChange = (val) => {
    if (val === '') {
      setPointsToRedeem('');
      return;
    }
    const points = parseInt(val) || 0;
    if (points > maxRedeemablePoints) {
      setPointsToRedeem(maxRedeemablePoints.toString());
    } else {
      setPointsToRedeem(val);
    }
  };

  // Submit redeem points transaction
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!customer) return;

    const points = parseInt(pointsToRedeem);
    const minLimit = customer?.rewardSettings?.minRedeemPoints || 100;

    if (!pointsToRedeem || isNaN(points) || points < 1) {
      return toast.error('Please enter a valid points amount.');
    }

    if (points < minLimit) {
      return toast.error(`Minimum points limit to redeem is ${minLimit} points.`);
    }

    if (points > customer.balance) {
      return toast.error(`Insufficient balance. Customer only has ${customer.balance} points.`);
    }

    if (points > maxRedeemablePoints) {
      return toast.error(`Points to redeem cannot exceed maximum allowed (${maxRedeemablePoints} points).`);
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/merchant/redeem', {
        customerId: customer.id,
        pointsToRedeem: points,
        purchaseAmount: purchaseAmount && !isNaN(purchaseAmount) ? parseFloat(purchaseAmount) : undefined
      });
      
      const { transaction, redemptionCap } = res.data.data;
      const actualFee = transaction.platformFee || 0;
      const actualNet = transaction.netAmount || transaction.purchaseAmount || 0;
      
      if (redemptionCap?.capped) {
        toast.success(
          `Capped! Redeemed ${transaction.points} pts (from ${redemptionCap.requestedPoints} requested) = ₹${actualNet} discount on ₹${redemptionCap.invoiceAmount} bill`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `Redeemed ${transaction.points} points! Gross: ₹${transaction.purchaseAmount} | Fee: ₹${actualFee} | Net: ₹${actualNet}`
        );
      }
      
      // Update customer balance on UI
      setCustomer(prev => ({
        ...prev,
        balance: res.data.data.customer.newBalance
      }));

      setPointsToRedeem('');
      setPurchaseAmount('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to redeem points.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Redeem Points</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Deduct customer points to apply cash discount ({customer?.rewardSettings?.minRedeemPoints ?? 100} Points = ₹{((customer?.rewardSettings?.minRedeemPoints ?? 100) * (customer?.rewardSettings?.rupeesPerPoint ?? 0.10)).toFixed(0)} Discount).
        </p>
      </div>

      {/* Lookup Card */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-base text-slate-800 dark:text-white">Identify Customer</h3>
        
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Enter mobile (10 digits) or customer UUID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Lookup
          </button>
          <button
            type="button"
            onClick={() => setShowScanner(!showScanner)}
            className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              showScanner
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-dark-border dark:text-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4" />
            {showScanner ? 'Close Scanner' : 'Scan QR'}
          </button>
        </form>

        {/* Real camera scanner container */}
        {showScanner && (
          <div className="border border-slate-100 dark:border-dark-border rounded-2xl p-4 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <Camera className="w-4 h-4 text-primary" />
              Camera Video Feed
            </div>
            <div id="qr-reader-container" className="w-full max-w-md mx-auto overflow-hidden rounded-xl bg-white dark:bg-dark-card" />
          </div>
        )}

        {/* Mock QR helper for testing */}
        {showScanner && (
          <form onSubmit={handleMockScanSubmit} className="pt-4 border-t border-dashed border-slate-200 dark:border-dark-border flex gap-2">
            <input
              type="text"
              placeholder="Or paste QR string (e.g. SKILLXT-8000000001)"
              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-lg text-xs"
              value={mockQr}
              onChange={(e) => setMockQr(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold"
            >
              Mock Scan
            </button>
          </form>
        )}
      </div>

      {/* Customer Info and Redemption form */}
      {customer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info Card */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Customer Details</h3>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{customer.name}</span>
                <span className="block text-xs text-slate-400 mt-0.5">+91 {customer.user?.mobile || customer.mobile}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Available Balance</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-secondary" />
                  {customer.balance} pts
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Lifetime Redeemed</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white mt-1 block flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-amber-500" />
                  {customer.lifetimeRedeemed} pts
                </span>
              </div>
            </div>

            {customer.balance < (customer?.rewardSettings?.minRedeemPoints || 100) && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Insufficient points. Customer needs at least {customer?.rewardSettings?.minRedeemPoints || 100} points to redeem. Current balance: {customer.balance} points.
                </span>
              </div>
            )}
          </div>

          {/* Issue Points Form */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Redeem Points</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                Max 20% of Bill
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
              Loyalty points can only cover up to 20% of the total invoice value.
            </p>
            
             <form onSubmit={handleRedeem} className="space-y-4 my-auto py-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                  Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-bold text-lg"
                  placeholder="e.g. 250"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                />
                {purchaseAmount && !isNaN(purchaseAmount) && (
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Points can cover max 20% of invoice (₹{maxDiscountAllowed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                    </div>
                    <div>Maximum redeemable: {maxRedeemablePoints} points = ₹{maxDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} discount</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                  Points to Redeem (Min: {customer?.rewardSettings?.minRedeemPoints || 100})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="1"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-bold text-lg"
                  placeholder="e.g. 100, 200, 500"
                  value={pointsToRedeem}
                  onChange={(e) => handlePointsChange(e.target.value)}
                />
              </div>

              {/* Fee Breakdown Preview */}
              {estimatedDiscount > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-2">
                  {purchaseAmount && !isNaN(purchaseAmount) && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 border-b border-emerald-200/50 dark:border-emerald-800/30">
                      <span>Invoice Amount:</span>
                      <span className="font-bold">₹{parseFloat(purchaseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Gross Discount:</span>
                    <span className="font-bold text-slate-800 dark:text-white">₹{feePreview.grossDiscount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      Platform Fee ({feePercent}%):
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">₹{feePreview.platformFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-white">Customer Saves:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">₹{feePreview.netAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {purchaseAmount && !isNaN(purchaseAmount) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/30">
                      Covers <span className="font-bold text-emerald-600 dark:text-emerald-400">{((feePreview.netAmount / parseFloat(purchaseAmount)) * 100).toFixed(1)}%</span> of the bill (max 20%)
                    </div>
                  )}
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={handleRedeem}
              disabled={isLoading || !pointsToRedeem || customer.balance < (customer?.rewardSettings?.minRedeemPoints || 100)}
              className="w-full py-3 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-secondary/20 hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Gift className="w-4 h-4" />}
              Confirm Redemption
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
