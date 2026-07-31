import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Search,
  QrCode,
  User,
  Wallet,
  ArrowUpCircle,
  PlusCircle,
  Camera,
  AlertCircle,
  SwitchCamera,
  ImagePlus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MerchantAddPoints() {
  const [identifier, setIdentifier] = useState('');
  const [customer, setCustomer] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [mockQr, setMockQr] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live points calculator state
  const [estimatedPoints, setEstimatedPoints] = useState(0);

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

  const handleQrScanSuccessRef = useRef(handleQrScanSuccess);
  handleQrScanSuccessRef.current = handleQrScanSuccess;

  const handleFlipCamera = async () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempScanner = new Html5Qrcode('qr-reader-temp');
      const result = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleQrScanSuccessRef.current(result);
    } catch (err) {
      toast.error('No QR code found in the selected image.');
    }
    e.target.value = '';
  };

  // Setup HTML5 QR Scanner (dynamic import to avoid Bun segfault)
  useEffect(() => {
    if (!showScanner) return;

    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: cameraFacing },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            scanner.clear();
            setIsScanning(false);
            handleQrScanSuccessRef.current(decodedText);
          }).catch(() => {});
        },
        () => {}
      ).then(() => {
        if (!cancelled) setIsScanning(true);
      }).catch((err) => {
        console.warn('QR camera start failed:', err);
        toast.error('Could not start camera. Try uploading from gallery.');
      });
    }).catch((err) => {
      console.error('Failed to load QR scanner:', err);
      toast.error('QR scanner failed to load. Please enter details manually.');
      setShowScanner(false);
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch (_) {}
        try { scannerRef.current.clear(); } catch (_) {}
        scannerRef.current = null;
        setIsScanning(false);
      }
    };
  }, [showScanner, cameraFacing]);

  // Live preview calculator using the actual reward rate from the server
  useEffect(() => {
    if (!purchaseAmount || isNaN(purchaseAmount)) {
      setEstimatedPoints(0);
      return;
    }
    const pointsPerRupee = customer?.rewardSettings?.pointsPerRupee ?? 0.10;
    const points = Math.floor(parseFloat(purchaseAmount) * pointsPerRupee);
    setEstimatedPoints(points);
  }, [purchaseAmount, customer?.rewardSettings?.pointsPerRupee]);

  // Submit earn points transaction
  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!customer) return;
    if (!purchaseAmount || isNaN(purchaseAmount) || parseFloat(purchaseAmount) < 1) {
      return toast.error('Please enter a valid purchase amount.');
    }

    setIsLoading(true);
    const amountAllocated = parseFloat(purchaseAmount);
    try {
      const res = await api.post('/api/merchant/earn', {
        customerId: customer.id,
        purchaseAmount: amountAllocated
      });
      
      const { transaction } = res.data.data;
      toast.success(`Allocated ${transaction.points} points successfully!`);
      
      // Update customer balance on UI
      setCustomer(prev => ({
        ...prev,
        balance: res.data.data.customer.newBalance
      }));

      setPurchaseAmount('');

    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to allocate points.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Issue Loyalty Points</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Award points based on purchase transaction values ({customer?.rewardSettings?.pointsPerRupee ? `₹${(1 / customer.rewardSettings.pointsPerRupee).toFixed(0)} spent = 1 Point` : 'Rate configured by admin'}).
        </p>
      </div>

      {/* Lookup Card */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-base text-slate-800 dark:text-white">Identify Customer</h3>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
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
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
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
              } btn-press`}
            >
              <QrCode className="w-4 h-4" />
              {showScanner ? 'Close Scanner' : 'Scan QR'}
            </button>
          </div>
        </form>

        {/* Real camera scanner container */}
        {showScanner && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-primary" />
              Camera Video Feed
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-border bg-black">
              <div
                id="qr-reader-container"
                className="w-full max-w-md mx-auto aspect-square cursor-pointer"
                onClick={() => {
                  if (!isScanning && scannerRef.current) {
                    scannerRef.current.start(
                      { facingMode: cameraFacing },
                      { fps: 10, qrbox: { width: 250, height: 250 } },
                      (decodedText) => {
                        scannerRef.current.stop().then(() => {
                          scannerRef.current.clear();
                          setIsScanning(false);
                          handleQrScanSuccessRef.current(decodedText);
                        }).catch(() => {});
                      },
                      () => {}
                    ).then(() => setIsScanning(true)).catch(() => {});
                  }
                }}
              />
              <button
                type="button"
                onClick={handleFlipCamera}
                className="absolute top-3 right-3 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              Upload from gallery
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <div id="qr-reader-temp" className="hidden" />
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
              className="px-4 py-2 bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold btn-press"
            >
              Mock Scan
            </button>
          </form>
        )}


      </div>

      {/* Customer Info and Points Allocation form */}
      {customer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Info Card */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Customer Details</h3>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{customer.name}</span>
                <span className="block text-xs text-slate-400 mt-0.5">+91 {customer.mobile}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-dark-border">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Available Balance</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  {customer.balance} pts
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Lifetime Earned</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                  {customer.lifetimeEarned} pts
                </span>
              </div>
            </div>
          </div>

          {/* Issue Points Form */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Issue Loyalty Points</h3>
            
            <form onSubmit={handleAllocate} className="space-y-4 my-auto py-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                  Purchase Invoice Value (INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-bold text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-lg"
                    placeholder="Enter bill amount spent"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Estimate Points box */}
              {estimatedPoints > 0 ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between text-sm animate-fadeIn">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Award Est. Points:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">+{estimatedPoints} SkillXT Points</span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-center text-xs text-slate-400 border border-slate-100 dark:border-dark-border">
                  Earn Rate: {customer?.rewardSettings?.pointsPerRupee ? `₹${(1 / customer.rewardSettings.pointsPerRupee).toFixed(0)} spent = 1 SkillXT Point` : 'Rate configured by admin'}. Enter an amount to calculate.
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={handleAllocate}
              disabled={isLoading || !purchaseAmount || parseFloat(purchaseAmount) < 1}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <PlusCircle className="w-4 h-4" />}
              Confirm Allocation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
