import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Eye, Edit2, Lock, EyeOff, Check, RefreshCw, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modal States
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustProfile, setSelectedCustProfile] = useState(null);
  const [custLedger, setCustLedger] = useState([]);
  const [ledgerPagination, setLedgerPagination] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Edit Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [originalValues, setOriginalValues] = useState({ name: '', mobile: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset Password Modal States
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  // Create Customer States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMobile, setCreateMobile] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/customers?page=${page}&limit=10&search=${search}`);
      setCustomers(res.data.data.customers);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load customers list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerLedger = async (customerId, pageNum) => {
    setIsLedgerLoading(true);
    try {
      const res = await api.get(`/api/admin/customers/${customerId}/ledger?page=${pageNum}&limit=10`);
      setCustLedger(res.data.data.entries);
      setLedgerPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load points ledger.');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  useEffect(() => {
    if (isDetailOpen && selectedCustProfile) {
      fetchCustomerLedger(selectedCustProfile.id, ledgerPage);
    }
  }, [ledgerPage, isDetailOpen, selectedCustProfile]);

  const handleOpenDetail = async (c) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/customers/${c.id}`);
      setSelectedCustProfile(res.data.data.profile);
      setLedgerPage(1);
      setIsDetailOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve customer details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (c) => {
    try {
      const res = await api.patch(`/api/admin/customers/${c.id}/toggle`);
      toast.success(res.data.message);
      
      const updatedStatus = !c.isActive;
      // Update local grid state
      setCustomers(prev => prev.map(item => item.id === c.id ? { ...item, isActive: updatedStatus } : item));
      
      // Update details modal status instantly
      if (selectedCustProfile && selectedCustProfile.id === c.id) {
        setSelectedCustProfile(prev => ({ ...prev, isActive: updatedStatus }));
      }
    } catch (err) {
      toast.error('Failed to toggle customer status.');
    }
  };

  const handleOpenEdit = async (c) => {
    setSelectedCustProfile(c);
    // Reset inputs immediately so old modal contents don't flash
    setEditName('');
    setEditMobile('');
    setEditEmail('');
    setOriginalValues({ name: '', mobile: '', email: '' });
    
    setIsEditOpen(true);
    setIsFetching(true);
    try {
      const res = await api.get(`/api/admin/customers/${c.id}`);
      const profile = res.data.data.profile;
      
      setEditName(profile.name);
      setEditMobile(profile.user?.mobile || profile.mobile);
      setEditEmail(profile.email || '');
      setOriginalValues({
        name: profile.name,
        mobile: profile.user?.mobile || profile.mobile,
        email: profile.email || ''
      });
    } catch (err) {
      toast.error('Failed to fetch latest customer details.');
      setIsEditOpen(false);
    } finally {
      setIsFetching(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName || !editMobile) {
      return toast.error('Name and Mobile are required.');
    }
    if (editMobile.length !== 10) {
      return toast.error('Mobile must be exactly 10 digits.');
    }
    setIsSubmitting(true);
    try {
      const res = await api.put(`/api/admin/customers/${selectedCustProfile.id}`, {
        name: editName,
        mobile: editMobile,
        email: editEmail
      });
      toast.success(res.data.message || 'Customer profile updated successfully!');
      setIsEditOpen(false);
      // Refresh local grid state
      setCustomers(prev => prev.map(item => item.id === selectedCustProfile.id ? { ...item, name: editName, user: { ...item.user, mobile: editMobile }, email: editEmail } : item));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update customer.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setIsResetSubmitting(true);
    try {
      const res = await api.post(`/api/admin/customers/${selectedCustProfile.id}/reset-password`, {
        newPassword
      });
      toast.success(res.data.message || 'Password reset successful!');
      setIsResetOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset customer password.';
      toast.error(msg);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createName || !createMobile || !createPassword) {
      return toast.error('Name, Mobile and Password are required.');
    }
    if (createMobile.length !== 10) {
      return toast.error('Mobile must be exactly 10 digits.');
    }
    if (createPassword.length < 8) {
      return toast.error('Password must be at least 8 characters long.');
    }
    setIsCreateSubmitting(true);
    try {
      const res = await api.post('/api/admin/customers', {
        name: createName,
        mobile: createMobile,
        email: createEmail || undefined,
        password: createPassword,
        city: createCity || undefined
      });
      toast.success(res.data.message || 'Customer created successfully!');
      setIsCreateOpen(false);
      // Reset fields
      setCreateName('');
      setCreateMobile('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateCity('');
      // Refresh customers list
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create customer.';
      toast.error(msg);
    } finally {
      setIsCreateSubmitting(false);
    }
  };


  // Difference detection for inputs
  const isNameModified = editName !== originalValues.name;
  const isMobileModified = editMobile !== originalValues.mobile;
  const isEmailModified = editEmail !== originalValues.email;
  const modifiedCount = (isNameModified ? 1 : 0) + (isMobileModified ? 1 : 0) + (isEmailModified ? 1 : 0);

  // Strength Bar Calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    if (pwd.length < 6) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    if (pwd.length >= 10 && hasUpper && hasNum) {
      return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    }
    return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const columns = [
    {
      header: 'Customer Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-white block">{row.name}</span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{row.id}</span>
        </div>
      )
    },
    {
      header: 'Mobile',
      accessor: (row) => row.user?.mobile || row.mobile,
      render: (row) => `+91 ${row.user?.mobile || row.mobile}`
    },
    {
      header: 'Points Balance',
      accessor: 'balance',
      render: (row) => (
        <span className="font-extrabold text-slate-800 dark:text-white text-base">
          {row.balance.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => (row.isActive ? 'Active' : 'Inactive'),
      render: (row) => <Badge type={row.isActive ? 'active' : 'inactive'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDetail(row)}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedCustProfile(row);
              setNewPassword('');
              setConfirmPassword('');
              setShowNewPassword(false);
              setShowConfirmPassword(false);
              setIsResetOpen(true);
            }}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Reset Password"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const ledgerColumns = [
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
      header: 'Outlet / Action',
      accessor: (row) => row.transaction.remarks
    },
    {
      header: 'Type',
      accessor: (row) => row.transaction.type,
      render: (row) => <Badge type={row.transaction.type}>{row.transaction.type}</Badge>
    },
    {
      header: 'Change',
      accessor: 'pointsChange',
      render: (row) => (
        <span className={`font-bold ${row.pointsChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {row.pointsChange > 0 ? '+' : ''}{row.pointsChange}
        </span>
      )
    },
    {
      header: 'Running Balance',
      accessor: 'balanceAfter',
      render: (row) => <span className="font-mono text-xs">{row.balanceAfter} pts</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Customers Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review customer registrations, outstanding points holdings, and inspect individual audit ledgers.
        </p>
      </div>

      {/* Grid */}
      <DataTable
        columns={columns}
        data={customers}
        pagination={pagination}
        onPageChange={setPage}
        searchPlaceholder="Search by name, mobile, customer ID..."
        onSearchChange={setSearch}
        searchValue={search}
        isLoading={isLoading}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            Create Customer
          </button>
        }
      />

      {/* DETAIL VIEW MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Customer Profile & Ledger Audit"
        size="lg"
      >
        {selectedCustProfile && (
          <div className="space-y-6">
            {/* Header info with side by side Status Buttons */}
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex-wrap">
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white">{selectedCustProfile.name}</h4>
                <div className="mt-1">
                  <Badge type={selectedCustProfile.isActive ? 'active' : 'inactive'}>
                    {selectedCustProfile.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2">Mobile: +91 {selectedCustProfile.user?.mobile || selectedCustProfile.mobile}</p>
                {selectedCustProfile.email && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Email: {selectedCustProfile.email}</p>
                )}
              </div>
              
              {/* Side-by-side status buttons */}
              <div className="flex items-center gap-2">
                {selectedCustProfile.isActive ? (
                  <>
                    <button
                      disabled
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-not-allowed opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" /> Active
                    </button>
                    <button
                      onClick={() => handleToggleStatus(selectedCustProfile)}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/10 transition-colors"
                    >
                      Suspend
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleStatus(selectedCustProfile)}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 transition-colors"
                    >
                      Activate
                    </button>
                    <button
                      disabled
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-not-allowed opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" /> Suspended
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Balances widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Balance</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-1 flex items-center justify-center gap-1.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  {selectedCustProfile.balance} pts
                </span>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Earned</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-1 flex items-center justify-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                  {selectedCustProfile.lifetimeEarned} pts
                </span>
              </div>
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Redeemed</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-1 flex items-center justify-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                  {selectedCustProfile.lifetimeRedeemed} pts
                </span>
              </div>
            </div>

            {/* Ledger table */}
            <div className="space-y-3">
              <h5 className="font-bold text-sm text-slate-800 dark:text-white">Customer Ledger Activity Logs</h5>
              <DataTable
                columns={ledgerColumns}
                data={custLedger}
                pagination={ledgerPagination}
                onPageChange={setLedgerPage}
                isLoading={isLedgerLoading}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT VIEW MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Update Customer Personal Information"
      >
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-xs font-bold text-slate-400 mt-3">Fetching record from database...</p>
          </div>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            
            {/* Counts Banner */}
            {modifiedCount > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-xs text-yellow-600 dark:text-yellow-400 font-bold text-center">
                {modifiedCount} field(s) have been modified
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Full Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  style={{ color: isNameModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isNameModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  placeholder="e.g. Rahul Sharma"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                {isNameModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  style={{ color: isMobileModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isMobileModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  placeholder="10-digit mobile"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))}
                />
                {isMobileModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address (Optional)</label>
              <div className="relative">
                <input
                  type="email"
                  style={{ color: isEmailModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${
                    isEmailModified 
                      ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' 
                      : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'
                  }`}
                  placeholder="rahul@domain.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                {isEmailModified && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />
                )}
              </div>
            </div>

            {/* Legend */}
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

            <button
              type="submit"
              disabled={isSubmitting || modifiedCount === 0}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
              Update Customer
            </button>
          </form>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Reset Customer Password"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            User: {selectedCustProfile?.name}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password *</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Strength:</span>
                  <span className={`font-black ${
                    strength.score === 1 ? 'text-rose-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300 ${
                    strength.score === 1 ? 'w-1/3' : strength.score === 2 ? 'w-2/3' : 'w-full'
                  }`} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Matching check */}
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs font-bold text-rose-500 mt-1.5">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isResetSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Reset Password
          </button>
        </form>
      </Modal>

      {/* CREATE CUSTOMER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Customer"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. John Doe"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
            <input
              type="tel"
              required
              maxLength={10}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="10-digit mobile number"
              value={createMobile}
              onChange={(e) => setCreateMobile(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. john@example.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password *</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="Min 8 characters"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">City</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. New Delhi"
              value={createCity}
              onChange={(e) => setCreateCity(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isCreateSubmitting}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCreateSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Create Customer
          </button>
        </form>
      </Modal>
    </div>
  );
}
