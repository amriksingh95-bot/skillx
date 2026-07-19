import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Image as ImageIcon, RefreshCw } from 'lucide-react';
import AdStepper from '../../components/AdStepper';

export default function AdPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/ad-payments/pending');
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load ad payment requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (paymentId) => {
    setActioning(paymentId);
    try {
      const res = await api.patch(`/api/admin/ad-payments/${paymentId}/confirm`);
      toast.success(res.data.message);
      await fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (paymentId) => {
    setActioning(paymentId);
    try {
      const res = await api.patch(`/api/admin/ad-payments/${paymentId}/reject`);
      toast.success(res.data.message);
      await fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payment.');
    } finally {
      setActioning(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold"><Clock className="w-3 h-3" />Pending</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold"><CheckCircle className="w-3 h-3" />Confirmed</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><XCircle className="w-3 h-3" />Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Ad Payment Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review and process merchant advertisement payments</p>
        </div>
        <button
          onClick={fetchPending}
          className="p-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all btn-press"
        >
          <RefreshCw className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No pending ad payment requests.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Title</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Package</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Screenshot</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                {payments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{item.advertisement?.merchant?.businessName || 'N/A'}</span>
                      <span className="block text-xs text-slate-400">{item.advertisement?.merchant?.user?.mobile || ''}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.advertisement?.title || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 capitalize">{item.advertisement?.package}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">₹{item.amountPaid}</td>
                    <td className="px-4 py-3">
                      {item.screenshotPath ? (
                        <a
                          href={item.screenshotPath.startsWith('http') ? item.screenshotPath : `${api.defaults.baseURL}${item.screenshotPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AdStepper ad={item.advertisement} />
                        {item.status === 'pending' && item.paidAt && new Date(item.paidAt) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                            Verification Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {item.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConfirm(item.id)}
                            disabled={actioning === item.id}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 btn-press"
                            title="Confirm"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={actioning === item.id}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 btn-press"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
