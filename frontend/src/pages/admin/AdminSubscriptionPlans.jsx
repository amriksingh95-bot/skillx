import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Plus, Edit2, RefreshCw, CreditCard, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form Fields
  const [planName, setPlanName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [features, setFeatures] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/subscription-plans');
      setPlans(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load subscription plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenAdd = () => {
    setPlanName('');
    setDisplayName('');
    setPrice('');
    setDurationDays('');
    setFeatures('');
    setIsActive(true);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setSelectedPlan(plan);
    setPlanName(plan.name);
    setDisplayName(plan.displayName);
    setPrice(String(plan.price));
    setDurationDays(String(plan.durationDays));
    setFeatures(plan.features ? JSON.stringify(plan.features) : '');
    setIsActive(plan.isActive);
    setIsEditOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!planName.trim() || !displayName.trim() || !price || !durationDays) {
      return toast.error('Please fill in all required fields.');
    }

    setIsSubmitting(true);
    try {
      let parsedFeatures = null;
      if (features.trim()) {
        try {
          parsedFeatures = JSON.parse(features);
        } catch {
          // If not JSON, treat as comma-separated
          parsedFeatures = features.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      await api.post('/api/admin/subscription-plans', {
        name: planName,
        displayName,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        features: parsedFeatures
      });

      toast.success('Subscription plan created successfully!');
      setIsAddOpen(false);
      fetchPlans();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create plan.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !price || !durationDays) {
      return toast.error('Please fill in all required fields.');
    }

    setIsSubmitting(true);
    try {
      let parsedFeatures = null;
      if (features.trim()) {
        try {
          parsedFeatures = JSON.parse(features);
        } catch {
          parsedFeatures = features.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      await api.put(`/api/admin/subscription-plans/${selectedPlan.id}`, {
        displayName,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        features: parsedFeatures,
        isActive
      });

      toast.success('Subscription plan updated successfully!');
      setIsEditOpen(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update plan.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return `₹${parseFloat(price).toLocaleString('en-IN')}`;
  };

  const formatDuration = (days) => {
    if (days === 30) return '1 Month';
    if (days === 90) return '3 Months';
    if (days === 365) return '1 Year';
    return `${days} Days`;
  };

  const columns = [
    {
      header: 'Plan Name',
      accessor: 'displayName',
      render: (row) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="font-bold text-slate-800 dark:text-white">{row.displayName}</span>
        </div>
      )
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (row) => (
        <span className="font-bold text-slate-800 dark:text-white">{formatPrice(row.price)}</span>
      )
    },
    {
      header: 'Duration',
      accessor: 'durationDays',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDuration(row.durationDays)}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <Badge type={row.isActive ? 'active' : 'inactive'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          onClick={() => handleOpenEdit(row)}
          className="text-primary hover:text-primary-dark font-bold text-xs flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-xs font-bold text-slate-400 mt-3">Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Subscription Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage merchant subscription plans and pricing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlans}
            className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-dark-card border rounded-3xl p-6 shadow-sm transition-all ${
              plan.isActive
                ? 'border-slate-100 dark:border-dark-border hover:shadow-md'
                : 'border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-extrabold text-primary tracking-widest">
                {plan.name}
              </span>
              <Badge type={plan.isActive ? 'active' : 'inactive'}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{plan.displayName}</h3>
            
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-800 dark:text-white">{formatPrice(plan.price)}</span>
              <span className="text-sm font-normal text-slate-400 ml-1">/ {formatDuration(plan.durationDays)}</span>
            </div>

            {plan.features && (
              <div className="mt-6 space-y-2">
                {(Array.isArray(plan.features) ? plan.features : []).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => handleOpenEdit(plan)}
              className="w-full mt-6 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Plan
            </button>
          </div>
        ))}
      </div>

      {/* Add Plan Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Subscription Plan">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Plan Name (Internal) *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. monthly, quarterly, annual"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Display Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. Monthly Plan"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="399"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="30"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Features (JSON array or comma-separated)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white resize-none"
              placeholder='["Basic support", "Unlimited transactions"]'
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Plus className="w-4 h-4" />}
              Create Plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedPlan(null); }} title="Edit Subscription Plan">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Plan Name (Internal)
            </label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-500 dark:text-slate-400"
              value={planName}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Display Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Features (JSON array or comma-separated)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white resize-none"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsEditOpen(false); setSelectedPlan(null); }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Edit2 className="w-4 h-4" />}
              Update Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
