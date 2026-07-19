import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Plus, Edit2, Lock, UserX, UserCheck, RefreshCw, Eye, Check, X, Store, MapPin, Phone, Mail, EyeOff, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Predefined categories (must match your original dropdown list) -----------
const predefinedCategories = ['grocery', 'medical', 'doctor', 'cafe', 'electronics', 'fashion', 'beauty', 'stationery', 'gym', 'hotel', 'education'];

function generateRandomPassword() {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;

  // Let's decide length randomly between 10 and 12
  const length = Math.floor(Math.random() * 3) + 10; // 10, 11, or 12

  // Make sure to include at least one of each to meet backend requirements
  let passwordArray = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  for (let i = passwordArray.length; i < length; i++) {
    passwordArray.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password array
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

// Removed getInitialTab (now query-driven)

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  
  // Deactivation Warning Modal States
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [merchantToDeactivate, setMerchantToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Tab State (driven by URL query params)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';
  const [paymentPendingList, setPaymentPendingList] = useState([]);
  const [paymentPendingPagination, setPaymentPendingPagination] = useState(null);

  // Reject Modal State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [merchantToReject, setMerchantToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('other');
  // NEW: holds the typed custom category text
  const [customCategory, setCustomCategory] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit Track States
  const [isFetching, setIsFetching] = useState(false);
  const [originalValues, setOriginalValues] = useState({
    businessName: '',
    ownerName: '',
    mobile: '',
    email: '',
    address: '',
    category: 'other',
    customCategory: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/merchants?page=${page}&limit=10&search=${search}`);
      let data = res.data.data.merchants;
      if (activeTab === 'pending') {
        data = data.filter(m => m.status === 'pending');
      }
      setMerchants(data);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load merchants list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/merchants?page=${page}&limit=50`);
      const data = res.data.data.merchants.filter(m => m.status === 'pending');
      setMerchants(data);
      setPagination(null);
    } catch (err) {
      toast.error('Failed to load pending approvals.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/merchants/pending-payments');
      setPaymentPendingList(res.data.data || []);
      setPaymentPendingPagination(null);
    } catch (err) {
      toast.error('Failed to load pending payments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchMerchants();
    } else if (activeTab === 'pending') {
      fetchPendingApprovals();
    } else if (activeTab === 'paymentPending') {
      fetchPendingPayments();
    }
  }, [activeTab, page, search]);

  // Helper: reset category-related state cleanly
  const resetCategoryState = () => {
    setCategory('other');
    setCustomCategory('');
  };

  const handleOpenAdd = () => {
    setBusinessName('');
    setOwnerName('');
    setMobile('');
    setEmail('');
    setAddress('');
    resetCategoryState();
    setPassword(generateRandomPassword());
    setShowPassword(false);
    setIsAddOpen(true);
  };

  const handleOpenDetail = async (m) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/merchants/${m.id}`);
      setSelectedMerchant(res.data.data);
      setIsDetailOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve merchant details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = async (m) => {
    setSelectedMerchant(m);
    setBusinessName('');
    setOwnerName('');
    setMobile('');
    setEmail('');
    setAddress('');
    resetCategoryState();
    setOriginalValues({
      businessName: '',
      ownerName: '',
      mobile: '',
      email: '',
      address: '',
      category: 'other',
      customCategory: ''
    });

    setIsEditOpen(true);
    setIsFetching(true);
    try {
      const res = await api.get(`/api/admin/merchants/${m.id}`);
      const profile = res.data.data;

      setBusinessName(profile.businessName);
      setOwnerName(profile.ownerName);
      setMobile(profile.user?.mobile || profile.mobile);
      setEmail(profile.email || '');
      setAddress(profile.address || '');

      // Detect whether the saved category is predefined or custom
      const savedCategory = profile.category || '';
      const isPredefined = predefinedCategories.includes(savedCategory);

      if (isPredefined) {
        setCategory(savedCategory);
        setCustomCategory('');
        setOriginalValues({
          businessName: profile.businessName,
          ownerName: profile.ownerName,
          mobile: profile.user?.mobile || profile.mobile,
          email: profile.email || '',
          address: profile.address || '',
          category: savedCategory,
          customCategory: ''
        });
      } else {
        // Custom category: dropdown = 'other', text box = saved value
        setCategory('other');
        setCustomCategory(savedCategory);
        setOriginalValues({
          businessName: profile.businessName,
          ownerName: profile.ownerName,
          mobile: profile.user?.mobile || profile.mobile,
          email: profile.email || '',
          address: profile.address || '',
          category: 'other',
          customCategory: savedCategory
        });
      }
    } catch (err) {
      toast.error('Failed to fetch latest merchant details.');
      setIsEditOpen(false);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpenReset = (m) => {
    setSelectedMerchant(m);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsResetOpen(true);
  };

  // Resolve final category string to send to API
  const resolvedCategory = category === 'other'
    ? customCategory.trim().toLowerCase()
    : category;

  // Create Merchant
  const handleAddMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!businessName || !ownerName || !mobile || !category) {
      return toast.error('Please fill in all required fields.');
    }
    if (mobile.length !== 10) {
      return toast.error('Mobile number must be exactly 10 digits.');
    }
    if (category === 'other' && !customCategory.trim()) {
      return toast.error('Please enter a custom category name.');
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/admin/merchants', {
        businessName,
        ownerName,
        mobile,
        email,
        address,
        category: resolvedCategory,
        password
      });
      toast.success(res.data.message || 'Merchant created successfully!');
      setIsAddOpen(false);
      fetchMerchants();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create merchant.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Merchant
  const handleEditMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!businessName || !ownerName || !mobile || !category) {
      return toast.error('Please fill in all required fields.');
    }
    if (mobile.length !== 10) {
      return toast.error('Mobile number must be exactly 10 digits.');
    }
    if (category === 'other' && !customCategory.trim()) {
      return toast.error('Please enter a custom category name.');
    }

    setIsSubmitting(true);
    try {
      const res = await api.put(`/api/admin/merchants/${selectedMerchant.id}`, {
        businessName,
        ownerName,
        mobile,
        email,
        address,
        category: resolvedCategory
      });
      toast.success(res.data.message || 'Merchant profile updated!');
      setIsEditOpen(false);
      setMerchants(prev =>
        prev.map(item =>
          item.id === selectedMerchant.id
            ? { ...item, businessName, ownerName, user: { ...item.user, mobile }, email, address, category: resolvedCategory }
            : item
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update merchant.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setIsResetSubmitting(true);
    try {
      const res = await api.post(`/api/admin/merchants/${selectedMerchant.id}/reset-password`, {
        newPassword
      });
      toast.success(res.data.message || 'Password reset successful!');
      setIsResetOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      toast.error(msg);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  // Set Account Status (suspend, deactivate, reactivate)
  const handleSetStatus = async (m, action) => {
    try {
      const res = await api.patch(`/api/admin/merchants/${m.id}/status`, { action });
      toast.success(res.data.message);
      
      const { status, isActive, statusChangedAt: serverChangedAt, statusChangedByName } = res.data.data;
      const statusChangedAt = serverChangedAt || new Date().toISOString();
      const statusChangedBy = statusChangedByName || 'Admin';
      
      setMerchants(prev =>
        prev.map(item =>
          item.id === m.id
            ? {
                ...item,
                status,
                statusChangedAt,
                statusChangedBy,
                statusChangedByUser: { name: statusChangedBy },
                user: { ...item.user, isActive }
              }
            : item
        )
      );

      if (selectedMerchant && selectedMerchant.id === m.id) {
        setSelectedMerchant(prev => ({
          ...prev,
          status,
          statusChangedAt,
          statusChangedBy,
          statusChangedByUser: { name: statusChangedBy },
          user: { ...prev.user, isActive }
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update merchant status.';
      toast.error(msg);
    }
  };

  const handleOpenDeactivateConfirm = (m) => {
    setMerchantToDeactivate(m);
    setIsDeactivateConfirmOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!merchantToDeactivate) return;
    setIsDeactivating(true);
    try {
      const res = await api.patch(`/api/admin/merchants/${merchantToDeactivate.id}/status`, { 
        action: 'deactivate',
        confirmed: true
      });
      toast.success(res.data.message);
      
      const { status, isActive, statusChangedAt: serverChangedAt, statusChangedByName } = res.data.data;
      const statusChangedAt = serverChangedAt || new Date().toISOString();
      const statusChangedBy = statusChangedByName || 'Admin';
      
      setMerchants(prev =>
        prev.map(item =>
          item.id === merchantToDeactivate.id
            ? {
                ...item,
                status,
                statusChangedAt,
                statusChangedBy,
                statusChangedByUser: { name: statusChangedBy },
                user: { ...item.user, isActive }
              }
            : item
        )
      );

      if (selectedMerchant && selectedMerchant.id === merchantToDeactivate.id) {
        setSelectedMerchant(prev => ({
          ...prev,
          status,
          statusChangedAt,
          statusChangedBy,
          statusChangedByUser: { name: statusChangedBy },
          user: { ...prev.user, isActive }
        }));
      }
      setIsDeactivateConfirmOpen(false);
      setMerchantToDeactivate(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to deactivate merchant.';
      toast.error(msg);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleApprove = async (m) => {
    try {
      await api.patch(`/api/admin/merchants/${m.id}/approve`);
      toast.success('Merchant approved');
      if (activeTab === 'pending') {
        setMerchants(prev => prev.filter(item => item.id !== m.id));
      } else {
        fetchMerchants();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve merchant.');
    }
  };

  const handleOpenReject = (m) => {
    setMerchantToReject(m);
    setRejectReason('');
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!merchantToReject) return;
    setIsRejecting(true);
    try {
      await api.patch(`/api/admin/merchants/${merchantToReject.id}/reject`, { reason: rejectReason });
      toast.success('Merchant rejected');
      setIsRejectOpen(false);
      setMerchantToReject(null);
      setRejectReason('');
      if (activeTab === 'pending') {
        setMerchants(prev => prev.filter(item => item.id !== merchantToReject.id));
      } else {
        fetchMerchants();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject merchant.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Difference detection
  const originalResolvedCategory = originalValues.category === 'other'
    ? originalValues.customCategory
    : originalValues.category;

  const isBusinessNameModified = businessName !== originalValues.businessName;
  const isOwnerNameModified = ownerName !== originalValues.ownerName;
  const isMobileModified = mobile !== originalValues.mobile;
  const isCategoryModified = resolvedCategory !== originalResolvedCategory;
  const isEmailModified = email !== originalValues.email;
  const isAddressModified = address !== originalValues.address;

  const modifiedCount = (isBusinessNameModified ? 1 : 0) +
    (isOwnerNameModified ? 1 : 0) +
    (isMobileModified ? 1 : 0) +
    (isCategoryModified ? 1 : 0) +
    (isEmailModified ? 1 : 0) +
    (isAddressModified ? 1 : 0);

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

  const getColumns = () => {
    if (activeTab === 'pending') {
      return [
        {
          header: 'Business Name',
          accessor: 'businessName',
          render: (row) => (
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">{row.businessName}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold uppercase">{row.id.substring(0, 8)}...</span>
            </div>
          )
        },
        {
          header: 'Owner',
          accessor: 'ownerName'
        },
        {
          header: 'Mobile',
          accessor: (row) => row.user?.mobile || row.mobile,
          render: (row) => `+91 ${row.user?.mobile || row.mobile}`
        },
        {
          header: 'Category',
          accessor: 'category',
          render: (row) => <Badge type={row.category}>{row.category}</Badge>
        },
        {
          header: 'Applied Date',
          accessor: 'createdAt',
          render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        },
        {
          header: 'Actions',
          accessor: 'id',
          render: (row) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(row)}
                className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-colors flex items-center gap-1 btn-press"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => handleOpenReject(row)}
                className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 transition-colors flex items-center gap-1 btn-press"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )
        }
      ];
    }

    if (activeTab === 'paymentPending') {
      return [
        {
          header: 'Business Name',
          accessor: 'businessName',
          render: (row) => (
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">{row.businessName}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold uppercase">{row.id.substring(0, 8)}...</span>
            </div>
          )
        },
        {
          header: 'Owner / Mobile',
          accessor: 'user',
          render: (row) => (
            <div>
              <span className="text-slate-800 dark:text-white block">{row.user?.mobile ? `+91 ${row.user.mobile}` : '—'}</span>
            </div>
          )
        },
        {
          header: 'Status',
          accessor: 'status',
          render: (row) => <Badge type={row.status}>{row.status}</Badge>
        },
        {
          header: 'Actions',
          accessor: 'id',
          render: (row) => (
            <button
              onClick={async () => {
                try {
                  await api.patch(`/api/admin/merchants/${row.id}/confirm-payment`);
                  toast.success('Payment confirmed');
                  fetchPendingPayments();
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to confirm payment.');
                }
              }}
              className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-colors btn-press"
            >
              Confirm Payment
            </button>
          )
        }
      ];
    }

    return [
      {
        header: 'Business Name',
        accessor: 'businessName',
        render: (row) => (
          <div>
            <span className="font-bold text-slate-800 dark:text-white block">{row.businessName}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold uppercase">{row.id.substring(0, 8)}...</span>
          </div>
        )
      },
      {
        header: 'Category',
        accessor: 'category',
        render: (row) => <Badge type={row.category}>{row.category}</Badge>
      },
      {
        header: 'Owner',
        accessor: 'ownerName'
      },
      {
        header: 'Mobile',
        accessor: (row) => row.user?.mobile || row.mobile,
        render: (row) => `+91 ${row.user?.mobile || row.mobile}`
      },
      {
        header: 'Status',
        accessor: (row) => row.status || 'active',
        render: (row) => {
          const statusVal = row.status || 'active';
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Badge type={statusVal}>{statusVal}</Badge>
              {row.statusChangedAt && (
                <span className="text-[10px] text-slate-400 mt-0.5 font-medium block">
                  {new Date(row.statusChangedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              )}
              {row.statusChangedBy && (
                <span className="text-[10px] text-slate-400 font-semibold block">
                  By: {row.statusChangedByUser?.name || row.statusChangedBy}
                </span>
              )}
            </div>
          );
        }
      },
      {
        header: 'Actions',
        accessor: 'id',
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenDetail(row)}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors btn-press"
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors btn-press"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleOpenReset(row)}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-colors btn-press"
              title="Reset Password"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      }
    ];
  };

  const columns = getColumns();

  const displayedData = activeTab === 'paymentPending' ? paymentPendingList : merchants;
  const displayedPagination = activeTab === 'paymentPending' ? paymentPendingPagination : pagination;

  const categories = [...predefinedCategories, 'other'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Merchants Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register and manage business outlets connected to the shared points network.
          </p>
        </div>
        {activeTab === 'all' && (
          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 btn-press"
          >
            <Plus className="w-4 h-4" />
            Add Merchant
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => { setSearchParams({ tab: 'all' }); setPage(1); setSearch(''); }}
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          } btn-press`}
        >
          All Merchants
        </button>
        <button
          onClick={() => { setSearchParams({ tab: 'pending' }); setPage(1); setSearch(''); }}
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          } btn-press`}
        >
          Pending Approval
        </button>
        <button
          onClick={() => { setSearchParams({ tab: 'paymentPending' }); setPage(1); setSearch(''); }}
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'paymentPending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          } btn-press`}
        >
          Payment Pending
        </button>
      </div>

      {/* Context Banner */}      {activeTab === 'pending' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
          <span className="text-amber-500 text-lg leading-none mt-0.5"><Clock className="w-5 h-5" /></span>
          <div>
            <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400">These merchants have registered but are waiting for your approval.</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-0.5">Review their details and click <span className="underline">Approve</span> to move them to payment, or <span className="underline">Reject</span> to decline their application. They cannot use the platform until approved.</p>
          </div>
        </div>
      )}

      {activeTab === 'paymentPending' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl">
          <span className="text-blue-500 text-lg leading-none mt-0.5"><CheckCircle className="w-5 h-5" /></span>
          <div>
            <p className="text-sm font-extrabold text-blue-700 dark:text-blue-400">These merchants were approved and have paid their ₹399/month subscription.</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 font-semibold mt-0.5">Check your bank/UPI for their payment screenshot. Click <span className="underline">Confirm Payment</span> to activate their account. They get 1,000 bonus points on activation.</p>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
          <span className="text-slate-400 text-lg leading-none mt-0.5"><Store className="w-5 h-5" /></span>
          <div>
            <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Complete merchant directory - all statuses.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Status flow: <span className="font-black text-slate-700 dark:text-slate-200">pending -> approved -> payment_pending -> active</span>. Use the other tabs to action pending approvals or confirm payments.</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={displayedData}
        pagination={displayedPagination}
        onPageChange={setPage}
        searchPlaceholder={activeTab === 'pending' ? 'Search pending merchants...' : activeTab === 'paymentPending' ? '' : 'Search by business, owner name, mobile...'}
        onSearchChange={activeTab === 'paymentPending' ? () => {} : setSearch}
        searchValue={search}
        isLoading={isLoading}
      />

      {/* DETAIL VIEW MODAL */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Merchant Profile Details" size="lg">
        {selectedMerchant && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex-wrap">
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white">{selectedMerchant.businessName}</h4>
                <div className="mt-1">
                  <Badge type={selectedMerchant.status || 'active'}>
                    {selectedMerchant.status || 'active'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-semibold mt-2">Owner: {selectedMerchant.ownerName}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Mobile: +91 {selectedMerchant.user?.mobile || selectedMerchant.mobile}</p>
                {selectedMerchant.email && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Email: {selectedMerchant.email}</p>
                )}
                {selectedMerchant.address && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5 font-mono">Address: {selectedMerchant.address}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(selectedMerchant.status || 'active') === 'active' && (
                  <>
                    <button
                      onClick={() => handleSetStatus(selectedMerchant, 'suspend')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/10 transition-colors btn-press"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => handleOpenDeactivateConfirm(selectedMerchant)}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/10 transition-colors btn-press"
                    >
                      Deactivate
                    </button>
                  </>
                )}
                {(selectedMerchant.status || 'active') === 'suspended' && (
                  <>
                    <button
                      onClick={() => handleSetStatus(selectedMerchant, 'reactivate')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 transition-colors btn-press"
                    >
                      Reactivate
                    </button>
                    <button
                      onClick={() => handleOpenDeactivateConfirm(selectedMerchant)}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/10 transition-colors btn-press"
                    >
                      Deactivate
                    </button>
                  </>
                )}
                {(selectedMerchant.status || 'active') === 'deactivated' && (
                  <span className="text-xs font-extrabold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    Permanently Deactivated
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Category</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white block mt-1 capitalize">{selectedMerchant.category}</span>
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Merchant Since</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white block mt-1">
                  {new Date(selectedMerchant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Points Balance</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white block mt-1">
                  {(selectedMerchant.pointsBalance || 0).toLocaleString('en-IN')} pts
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ADD MERCHANT MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Merchant Outlet">
        <form onSubmit={handleAddMerchantSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Business Name *</label>
              <input
                type="text" required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="e.g. FreshMart Grocery"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Full Name *</label>
              <input
                type="text" required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="Owner Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
              <input
                type="tel" required maxLength={10}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Merchant Category *</label>
              <select
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm capitalize text-slate-800 dark:text-white"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCustomCategory('');
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>

              {/* ✅ NEW: Custom category box — only shows when Other is selected */}
              {category === 'other' && (
                <div className="mt-3">
                  <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-500 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="e.g. bakery, salon, hardware…"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    This will be saved as the merchant's category.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address (Optional)</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="outlet@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shop Address (Optional)</label>
            <textarea
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm h-20 resize-none text-slate-800 dark:text-white"
              placeholder="Business Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Login Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required
                className="w-full px-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-mono text-slate-800 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 btn-press"
          >
            {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Save Merchant
          </button>
        </form>
      </Modal>

      {/* EDIT MERCHANT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Merchant Information">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-xs font-bold text-slate-400 mt-3">Fetching record from database...</p>
          </div>
        ) : (
          <form onSubmit={handleEditMerchantSubmit} className="space-y-4">
            {modifiedCount > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-xs text-yellow-600 dark:text-yellow-400 font-bold text-center">
                {modifiedCount} field(s) have been modified
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Business Name *</label>
                <div className="relative">
                  <input
                    type="text" required
                    style={{ color: isBusinessNameModified ? '#facc15' : undefined }}
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${isBusinessNameModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  {isBusinessNameModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Full Name *</label>
                <div className="relative">
                  <input
                    type="text" required
                    style={{ color: isOwnerNameModified ? '#facc15' : undefined }}
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${isOwnerNameModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                  {isOwnerNameModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
                <div className="relative">
                  <input
                    type="tel" required maxLength={10}
                    style={{ color: isMobileModified ? '#facc15' : undefined }}
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${isMobileModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  />
                  {isMobileModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Merchant Category *</label>
                <div className="relative">
                  <select
                    required
                    style={{ color: isCategoryModified ? '#facc15' : undefined }}
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm capitalize transition-all ${isCategoryModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (e.target.value !== 'other') setCustomCategory('');
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  {isCategoryModified && <span className="absolute top-2.5 right-6 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
                </div>

                {/* ? NEW: Custom category box for edit modal */}
                {category === 'other' && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">
                      Custom Category Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        style={{ color: isCategoryModified ? '#facc15' : undefined }}
                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${isCategoryModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-blue-400 dark:border-blue-500 text-slate-800 dark:text-white'}`}
                        placeholder="e.g. bakery, salon, hardware…"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                      />
                      {isCategoryModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      This will be saved as the merchant's category.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address (Optional)</label>
              <div className="relative">
                <input
                  type="email"
                  style={{ color: isEmailModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm transition-all ${isEmailModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isEmailModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shop Address (Optional)</label>
              <div className="relative">
                <textarea
                  style={{ color: isAddressModified ? '#facc15' : undefined }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-20 resize-none transition-all ${isAddressModified ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/15 font-semibold' : 'border-slate-200 dark:border-dark-border text-slate-800 dark:text-white'}`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                {isAddressModified && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#facc15] shadow-sm" title="Modified" />}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-900 pt-4">
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
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press"
            >
              {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
              Update Merchant
            </button>
          </form>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title="Reset Merchant Access Password">
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 font-semibold uppercase">
            Outlet: {selectedMerchant?.businessName}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password *</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'} required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Strength:</span>
                  <span className={`font-black ${strength.score === 1 ? 'text-rose-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300 ${strength.score === 1 ? 'w-1/3' : strength.score === 2 ? 'w-2/3' : 'w-full'}`} />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'} required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs font-bold text-rose-500 mt-1.5">Passwords do not match</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isResetSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press"
          >
            {isResetSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
            Reset Password
          </button>
        </form>
      </Modal>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      <Modal 
        isOpen={isDeactivateConfirmOpen} 
        onClose={() => !isDeactivating && setIsDeactivateConfirmOpen(false)} 
        title={
          <span className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-black">
            <span>??</span> Permanent Merchant Deactivation
          </span>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                You are about to permanently deactivate this merchant account.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                This action is <span className="text-rose-500 font-extrabold underline">irreversible</span>. Once a merchant account is deactivated, it cannot be reactivated, restored, or recovered in the future.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                All associated access, services, and benefits linked to this merchant account will be permanently disabled.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Please confirm only if you are absolutely certain you want to proceed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-900 pt-4">
            <button
              type="button"
              disabled={isDeactivating}
              onClick={() => setIsDeactivateConfirmOpen(false)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-colors btn-press"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeactivating}
              onClick={handleConfirmDeactivate}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-500/10 transition-colors flex items-center gap-1.5 btn-press"
            >
              {isDeactivating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : null}
              Permanently Deactivate
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MERCHANT MODAL */}
      <Modal isOpen={isRejectOpen} onClose={() => !isRejecting && setIsRejectOpen(false)} title="Reject Merchant Application">
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1">
              Reject {merchantToReject?.businessName}?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              This will mark the merchant application as rejected. This action can be reviewed later.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rejection Reason (Optional)</label>
            <textarea
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white h-24 resize-none"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-dark-border pt-4">
            <button
              type="button"
              disabled={isRejecting}
              onClick={() => setIsRejectOpen(false)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-colors btn-press"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRejecting}
              onClick={handleConfirmReject}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-500/10 transition-colors flex items-center gap-1.5 btn-press"
            >
              {isRejecting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : null}
              Reject Merchant
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}