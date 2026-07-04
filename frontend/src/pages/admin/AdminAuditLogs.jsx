import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/audit-logs?page=${page}&limit=20`);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    {
      header: 'User Account',
      accessor: (row) => (row.user ? row.user.email || row.user.mobile : 'System / Guest'),
      render: (row) => (
        row.user ? (
          <div>
            <span className="font-bold text-slate-800 dark:text-white block">{row.user.email || 'No email'}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">+91 {row.user.mobile}</span>
          </div>
        ) : (
          <span className="text-slate-400 italic">Guest / External</span>
        )
      )
    },
    {
      header: 'Role',
      accessor: (row) => (row.user ? row.user.role : '-'),
      render: (row) => row.user ? <Badge type={row.user.role}>{row.user.role}</Badge> : '-'
    },
    {
      header: 'Action Executed',
      accessor: 'action',
      render: (row) => (
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-lg">
          {row.action}
        </span>
      )
    },
    {
      header: 'Target Entity',
      accessor: (row) => `${row.entityType || '-'} (${row.entityId ? row.entityId.substring(0, 8) + '...' : '-'})`,
      render: (row) => (
        row.entityType ? (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {row.entityType} <span className="font-mono text-[10px] opacity-75">[{row.entityId ? row.entityId.substring(0, 8) : ''}]</span>
          </span>
        ) : '-'
      )
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.ipAddress || '127.0.0.1'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Security Audit Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Immutable, read-only system audit trail capturing all credential actions and balance mutations.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        pagination={pagination}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
