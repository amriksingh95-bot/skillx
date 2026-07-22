import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Undo, RefreshCw, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reversal States
  const [isReversing, setIsReversing] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = `/api/admin/transactions?page=${page}&limit=12&search=${search}`;
      if (status) query += `&status=${status}`;
      if (type) query += `&type=${type}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await api.get(query);
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load transactions history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search, status, type, startDate, endDate]);

  const handleOpenReverseConfirm = (tx) => {
    setSelectedTx(tx);
    setIsConfirmOpen(true);
  };

  const handleReverseSubmit = async () => {
    setIsReversing(true);
    try {
      const res = await api.post(`/api/admin/transactions/${selectedTx.id}/reverse`);
      toast.success(res.data.message || 'Transaction reversed successfully!');
      setIsConfirmOpen(false);
      fetchTransactions();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reverse transaction.';
      toast.error(msg);
    } finally {
      setIsReversing(false);
    }
  };

  const handleClearFilters = () => {
    setStatus('');
    setType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      header: 'Customer',
      accessor: (row) => row.customer?.name || 'N/A',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-white block">{row.customer?.name || 'N/A'}</span>
          <span className="text-[10px] text-slate-400 block">+91 {row.customer?.user?.mobile || row.customer?.mobile || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Merchant',
      accessor: (row) => /referral bonus/i.test(row.remarks) ? 'Referral Bonus' : row.merchant.businessName
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => <Badge type={row.type}>{row.type}</Badge>
    },
    {
      header: 'Amount',
      accessor: 'purchaseAmount',
      render: (row) => row.purchaseAmount ? `₹${parseFloat(row.purchaseAmount).toLocaleString('en-IN')}` : '-'
    },
    {
      header: 'Points',
      accessor: 'points',
      render: (row) => {
        const pointsChange = row.ledgerEntries?.[0]?.pointsChange;
        const isPositive = pointsChange !== undefined 
          ? pointsChange > 0 
          : (row.type === 'earn' || (row.type === 'reversal' && row.points > 0));
        const isNegative = pointsChange !== undefined 
          ? pointsChange < 0 
          : (row.type === 'redeem' || (row.type === 'reversal' && row.points < 0));

        const sign = isPositive ? '+' : isNegative ? '-' : '';
        const colorClass = isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-500' : 'text-slate-500';

        return (
          <span className={`font-bold ${colorClass}`}>
            {sign}{row.points}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge type={row.status}>{row.status}</Badge>
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        const canReverse = row.status === 'completed' && (row.type === 'earn' || row.type === 'redeem');
        if (!canReverse) return '-';
        return (
          <button
            onClick={() => handleOpenReverseConfirm(row)}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 transition-colors btn-press"
            title="Reverse Transaction"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Audit Transaction Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, inspect, and reverse transaction logs on the entire loyalty platform.
          </p>
        </div>
      </div>

      {/* Advanced Filter Control Bar */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-primary" />
          Filtering Controls
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tx Type</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">All Types</option>
              <option value="earn" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Earn</option>
              <option value="redeem" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Redeem</option>
              <option value="reversal" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Reversal</option>
              <option value="adjustment" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tx Status</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">All Status</option>
              <option value="completed" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Completed</option>
              <option value="pending" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Pending</option>
              <option value="failed" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Failed</option>
              <option value="reversed" className="bg-white dark:bg-dark-card text-slate-800 dark:text-white">Reversed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm dark:text-slate-100"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm dark:text-slate-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors btn-press"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={transactions}
        pagination={pagination}
        onPageChange={setPage}
        searchPlaceholder="Search by remarks, customer or merchant..."
        onSearchChange={setSearch}
        searchValue={search}
        isLoading={isLoading}
      />

      {/* REVERSAL CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleReverseSubmit}
        isLoading={isReversing}
        title="Reverse Loyalty Transaction"
        message={`Are you sure you want to reverse the transaction (ID: ${selectedTx?.id?.substring(0,8)}...)? This is irreversible, and points will be deducted or refunded to the customer accordingly.`}
      />
    </div>
  );
}
