import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { Eye, ShieldAlert, Filter, X, RefreshCw } from 'lucide-react';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusToSave, setStatusToSave] = useState('Pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filters State
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'All') params.append('role', filterRole);
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterType !== 'All') params.append('type', filterType);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const res = await api.get(`/api/admin/complaints?${params.toString()}`);
      setComplaints(res.data.data);
    } catch (err) {
      toast.error('Failed to load complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterRole, filterStatus, filterType, filterStartDate, filterEndDate]);

  const handleClearFilters = () => {
    setFilterRole('All');
    setFilterStatus('All');
    setFilterType('All');
    setFilterStartDate('');
    setFilterEndDate('');
    toast.success('Filters cleared.');
  };

  const handleOpenDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setStatusToSave(complaint.status);
    setIsDetailsOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/api/admin/complaints/${selectedComplaint.id}/status`, {
        status: statusToSave
      });
      toast.success(res.data.message || 'Status updated successfully!');
      
      // Update local state
      setComplaints(prev =>
        prev.map(c => c.id === selectedComplaint.id ? { ...c, status: statusToSave } : c)
      );
      setSelectedComplaint(prev => ({ ...prev, status: statusToSave }));
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update complaint status.';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = [
    {
      header: 'Complaint ID',
      accessor: 'id',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-500">
          {row.id.substring(0, 8)}...
        </span>
      )
    },
    {
      header: 'User / Role',
      accessor: 'userName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-white block">{row.userName}</span>
          <span className="mt-1 block">
            <Badge type={row.userRole}>{row.userRole}</Badge>
          </span>
        </div>
      )
    },
    {
      header: 'Complaint Type',
      accessor: 'type',
      render: (row) => (
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-lg">
          {row.type}
        </span>
      )
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 block max-w-xs truncate" title={row.description}>
          {row.description}
        </span>
      )
    },
    {
      header: 'Submitted Date',
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
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        let badgeType = 'pending';
        if (row.status === 'In Progress') badgeType = 'earn'; // using earn (amber/yellow) for progress
        if (row.status === 'Resolved') badgeType = 'active'; // using active (green) for resolved
        return <Badge type={badgeType}>{row.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center btn-press"
          title="View Details & Update Status"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Complaints & Feedback
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track user complaints, investigate loyalty transaction discrepancies, and update resolution status.
          </p>
        </div>
        <button
          onClick={fetchComplaints}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold btn-press"
          title="Reload complaints"
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-white">
          <Filter className="w-4 h-4 text-primary" />
          Filter Submissions
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* User Role */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Complainant Role</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="customer">Customer</option>
              <option value="merchant">Merchant</option>
            </select>
          </div>

          {/* Complaint Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Complaint Status</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Complaint Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Complaint Type</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Payment Issue">Payment Issue</option>
              <option value="Points Not Received">Points Not Received</option>
              <option value="Payout Issue">Payout Issue</option>
              <option value="Customer Dispute">Customer Dispute</option>
              <option value="Technical Problem">Technical Problem</option>
              <option value="App Problem">App Problem</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {(filterRole !== 'All' || filterStatus !== 'All' || filterType !== 'All' || filterStartDate || filterEndDate) && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors btn-press"
            >
              <X className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Grid table */}
      <DataTable
        columns={columns}
        data={complaints}
        isLoading={isLoading}
        searchPlaceholder="Filter display..."
      />

      {/* COMPLAINTS DETAILS MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Complaint Detail & Status Control"
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-6">
            {/* Header / Meta details */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-dark-border space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Complaint ID</span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{selectedComplaint.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge type={selectedComplaint.userRole}>{selectedComplaint.userRole}</Badge>
                  {(() => {
                    let badgeType = 'pending';
                    if (selectedComplaint.status === 'In Progress') badgeType = 'earn';
                    if (selectedComplaint.status === 'Resolved') badgeType = 'active';
                    return <Badge type={badgeType}>{selectedComplaint.status}</Badge>;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Submitted By Name</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-white">{selectedComplaint.userName}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">User Identifier ID</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{selectedComplaint.userId}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Complaint Classification</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedComplaint.type}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Submission Date/Time</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedComplaint.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Text */}
            <div className="space-y-2">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Full Issue Description</span>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-dark-border max-h-48 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.description}
              </div>
            </div>

            {/* Update Status form */}
            <form onSubmit={handleUpdateStatus} className="border-t border-slate-100 dark:border-dark-border pt-6 space-y-4">
              <h5 className="font-bold text-sm text-slate-800 dark:text-white">Update Complaint Status</h5>
              
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resolution Status</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none"
                    value={statusToSave}
                    onChange={(e) => setStatusToSave(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={isUpdatingStatus || statusToSave === selectedComplaint.status}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 btn-press"
                >
                  {isUpdatingStatus ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
