import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';

export default function MerchantTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/merchant/transactions?page=${page}&limit=15&search=${search}`);
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load transaction history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search]);

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
      header: 'Customer Name',
      accessor: (row) => row.customer?.name || 'N/A'
    },
    {
      header: 'Customer Mobile',
      accessor: (row) => row.customer?.user?.mobile || row.customer?.mobile || 'N/A'
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => <Badge type={row.type}>{row.type}</Badge>
    },
    {
      header: 'Invoice Amount',
      accessor: 'invoiceAmount',
      render: (row) => {
        const amount = row.type === 'earn' ? row.purchaseAmount : row.invoiceAmount;
        return amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : '-';
      }
    },
    {
      header: 'Discount',
      accessor: 'purchaseAmount',
      render: (row) => {
        if (row.type === 'redeem' && row.purchaseAmount) {
          return <span className="text-amber-500">- ₹{parseFloat(row.purchaseAmount).toLocaleString('en-IN')}</span>;
        }
        return '-';
      }
    },
    {
      header: 'Points',
      accessor: 'points',
      render: (row) => (
        <span className={`font-bold ${row.type === 'earn' ? 'text-emerald-600' : 'text-amber-500'}`}>
          {row.type === 'earn' ? '+' : '-'}{row.points}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge type={row.status}>{row.status}</Badge>
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Transaction Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete log of points issued and redeemed at your business outlet.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        pagination={pagination}
        onPageChange={setPage}
        searchPlaceholder="Search by customer name or mobile number..."
        onSearchChange={setSearch}
        searchValue={search}
        isLoading={isLoading}
      />
    </div>
  );
}
