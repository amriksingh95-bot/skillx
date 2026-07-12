import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Settings, Save, AlertCircle, RefreshCw, Info, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

export default function AdminRewardSettings() {
  const [pointsPerRupee, setPointsPerRupee] = useState('0.01');
  const [rupeesPerPoint, setRupeesPerPoint] = useState('0.10');
  const [minRedeemPoints, setMinRedeemPoints] = useState('100');
  const [pointsExpiryDays, setPointsExpiryDays] = useState('365');
  const [redemptionFeePercent, setRedemptionFeePercent] = useState('5.00');

  // Currently saved settings in DB
  const [savedSettings, setSavedSettings] = useState({
    pointsPerRupee: 0.01,
    rupeesPerPoint: 0.10,
    minRedeemPoints: 100,
    pointsExpiryDays: 365,
    redemptionFeePercent: 5.00
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/reward-settings');
      const data = res.data.data;
      const loaded = {
        pointsPerRupee: parseFloat(data.pointsPerRupee),
        rupeesPerPoint: parseFloat(data.rupeesPerPoint),
        minRedeemPoints: parseInt(data.minRedeemPoints),
        pointsExpiryDays: parseInt(data.pointsExpiryDays) || 365,
        redemptionFeePercent: parseFloat(data.redemptionFeePercent) || 5.00
      };
      setSavedSettings(loaded);
      
      // Initialize inputs
      setPointsPerRupee(String(loaded.pointsPerRupee));
      setRupeesPerPoint(String(loaded.rupeesPerPoint));
      setMinRedeemPoints(String(loaded.minRedeemPoints));
      setPointsExpiryDays(String(loaded.pointsExpiryDays));
      setRedemptionFeePercent(String(loaded.redemptionFeePercent));
    } catch (err) {
      toast.error('Failed to load loyalty settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const inputPP = parseFloat(pointsPerRupee) || 0;
  const inputRP = parseFloat(rupeesPerPoint) || 0;
  const inputMR = parseInt(minRedeemPoints) || 0;
  const inputPED = parseInt(pointsExpiryDays) || 365;
  const inputRF = parseFloat(redemptionFeePercent) || 0;

  const isPPRModified = inputPP !== savedSettings.pointsPerRupee;
  const isRPRModified = inputRP !== savedSettings.rupeesPerPoint;
  const isMRModified = inputMR !== savedSettings.minRedeemPoints;
  const isPEDModified = inputPED !== savedSettings.pointsExpiryDays;
  const isRFModified = inputRF !== savedSettings.redemptionFeePercent;

  const hasUnsavedChanges = isPPRModified || isRPRModified || isMRModified || isPEDModified || isRFModified;

  const handleResetToSaved = () => {
    setPointsPerRupee(String(savedSettings.pointsPerRupee));
    setRupeesPerPoint(String(savedSettings.rupeesPerPoint));
    setMinRedeemPoints(String(savedSettings.minRedeemPoints));
    setPointsExpiryDays(String(savedSettings.pointsExpiryDays));
    setRedemptionFeePercent(String(savedSettings.redemptionFeePercent));
    toast.success('Restored to active database settings.');
  };

  const handleResetToDefaults = () => {
    setShowConfirmReset(true);
  };

  const handleConfirmResetDefaults = () => {
    setPointsPerRupee('0.01');
    setRupeesPerPoint('0.10');
    setMinRedeemPoints('100');
    setPointsExpiryDays('365');
    setRedemptionFeePercent('5.00');
    setShowConfirmReset(false);
    toast.success('Reset to system defaults. Remember to click Save Settings.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (inputPP <= 0 || inputRP <= 0 || inputMR <= 0) {
      return toast.error('All ratios must be positive numbers greater than 0.');
    }
    if (inputPED < 1 || inputPED > 3650) {
      return toast.error('Points expiry days must be between 1 and 3650.');
    }
    if (inputRF < 0 || inputRF > 100) {
      return toast.error('Redemption fee percent must be between 0 and 100.');
    }

    setIsSaving(true);
    try {
      const res = await api.put('/api/admin/reward-settings', {
        pointsPerRupee: inputPP,
        rupeesPerPoint: inputRP,
        minRedeemPoints: inputMR,
        pointsExpiryDays: inputPED,
        redemptionFeePercent: inputRF
      });
      
      const newSaved = {
        pointsPerRupee: inputPP,
        rupeesPerPoint: inputRP,
        minRedeemPoints: inputMR,
        pointsExpiryDays: inputPED,
        redemptionFeePercent: inputRF
      };
      setSavedSettings(newSaved);
      toast.success(res.data.message || 'Loyalty settings updated successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update settings.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-xs font-bold text-slate-400 mt-3">Loading reward parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Loyalty Rules & Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Adjust global conversion factors, earning coefficients, and redemption ceilings.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold btn-press"
          title="Reload active settings"
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Inputs Form */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-white">
              <Settings className="w-5 h-5 text-primary" />
              Adjust Parameters
            </div>
            
            <button
              onClick={handleResetToDefaults}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl text-xs font-bold transition-all btn-press"
            >
              Reset to Defaults
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Points Per Rupee Spent (accumulation rate)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  required
                  style={{ color: isPPRModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isPPRModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  value={pointsPerRupee}
                  onChange={(e) => setPointsPerRupee(e.target.value)}
                />
                {isPPRModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Rupees Per Point Redeemed (cash equivalent)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  required
                  style={{ color: isRPRModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isRPRModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  value={rupeesPerPoint}
                  onChange={(e) => setRupeesPerPoint(e.target.value)}
                />
                {isRPRModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Minimum Redemption Points Ceiling
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  required
                  style={{ color: isMRModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isMRModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  value={minRedeemPoints}
                  onChange={(e) => setMinRedeemPoints(e.target.value)}
                />
                {isMRModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Points Expiry (Days)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="3650"
                  required
                  style={{ color: isPEDModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isPEDModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  value={pointsExpiryDays}
                  onChange={(e) => setPointsExpiryDays(e.target.value)}
                />
                {isPEDModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Number of days before earned points expire (1-3650). Default: 365 days (1 year).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Redemption Fee Percent (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  style={{ color: isRFModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isRFModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  value={redemptionFeePercent}
                  onChange={(e) => setRedemptionFeePercent(e.target.value)}
                />
                {isRFModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Platform fee charged on redemptions (0-100%). Default: 5%.</p>
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsavedChanges && (
              <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-xs text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-yellow-600 dark:text-yellow-400 shrink-0" style={{ color: '#facc15' }} />
                <span style={{ color: '#facc15' }}>You have unsaved changes</span>
              </div>
            )}

            {/* Save / Reset buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResetToSaved}
                disabled={!hasUnsavedChanges}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 btn-press"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Saved
              </button>
              <button
                type="submit"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press"
              >
                {isSaving ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </form>

          {/* Form inputs legend */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>Grey dot = original data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
              <span>Yellow dot = modified by admin</span>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Section A: Currently Active Settings (Green) */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Currently Active Settings
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100/20">
                <span className="text-xs font-bold text-slate-400">Earning Rules</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  ₹100 spent = {(100 * savedSettings.pointsPerRupee).toFixed(2)} pts
                </span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100/20">
                <span className="text-xs font-bold text-slate-400">Redemption Rate</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  100 pts = ₹{(100 * savedSettings.rupeesPerPoint).toFixed(2)} cash discount
                </span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100/20">
                <span className="text-xs font-bold text-slate-400">Min Redemption</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  {savedSettings.minRedeemPoints} pts
                </span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100/20">
                <span className="text-xs font-bold text-slate-400">Points Expiry</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  {savedSettings.pointsExpiryDays} days
                </span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100/20">
                <span className="text-xs font-bold text-slate-400">Platform Fee</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  {savedSettings.redemptionFeePercent}% on redemptions
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Preview of Changes (Blue/Indigo) */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between min-h-[200px]">
            <div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Preview of Changes
              </h3>
              
              {!hasUnsavedChanges ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 font-bold text-sm">
                  <Info className="w-8 h-8 mb-2 text-indigo-400" />
                  No changes made
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100/20">
                    <span className="text-xs font-bold text-slate-400">New Earning Preview</span>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">
                      ₹100 spent = {(100 * inputPP).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100/20">
                    <span className="text-xs font-bold text-slate-400">New Redemption Preview</span>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">
                      100 pts = ₹{(100 * inputRP).toFixed(2)} cash discount
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100/20">
                    <span className="text-xs font-bold text-slate-400">New Min Redemption</span>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">
                      {inputMR} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100/20">
                    <span className="text-xs font-bold text-slate-400">New Points Expiry</span>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">
                      {inputPED} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-indigo-100/20">
                    <span className="text-xs font-bold text-slate-400">New Platform Fee</span>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">
                      {inputRF}% on redemptions
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 p-4 bg-white/60 dark:bg-slate-800/40 border border-indigo-100/20 dark:border-dark-border rounded-2xl text-[11px] text-indigo-900 dark:text-slate-400">
              <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
              <span>
                Historical transactions are preserved. The active settings above govern points computation in all future checkouts.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM SYSTEM DEFAULT RESET MODAL */}
      <Modal
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        title="Confirm Default Parameters Reset"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold text-center">
            This will overwrite your current settings with system defaults. Are you sure?
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmReset(false)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all btn-press"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResetDefaults}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 btn-press"
            >
              Yes, Reset Defaults
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
