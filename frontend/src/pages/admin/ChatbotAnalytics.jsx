import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { MessageSquare, TrendingUp, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ChatbotAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/chatbot-analytics');
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load chatbot analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No analytics data available yet.</p>
      </div>
    );
  }

  const peakHourMax = Math.max(...data.peakHours.map(h => h.count), 1);
  const topThreeCounts = data.topQuestions.slice(0, 3).map(q => q.count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Chatbot Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor what users are asking</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Week</p>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{data.totalThisWeek}</p>
          <p className="text-xs text-slate-500 mt-1">Total messages</p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month</p>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{data.totalThisMonth}</p>
          <p className="text-xs text-slate-500 mt-1">Total messages</p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Match Rate</p>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{data.matchRate}</p>
          <p className="text-xs text-slate-500 mt-1">Questions answered</p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Most Active</p>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white capitalize">{data.mostActiveRole}</p>
          <p className="text-xs text-slate-500 mt-1">User type</p>
        </div>
      </div>

      {/* Top 10 Questions */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Top 10 Most Asked Questions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Question</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Asked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
              {data.topQuestions.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{item.question}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unanswered Questions */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <XCircle className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Questions Chatbot Could Not Answer</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">Add these to chatbot-responses.json to improve coverage</p>
        {data.unansweredQuestions.length === 0 ? (
          <p className="text-sm text-slate-500">No unanswered questions. Great job!</p>
        ) : (
          <div className="space-y-2">
            {data.unansweredQuestions.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{item.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(item.createdAt).toLocaleString()} · {item.userRole}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Hours */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Peak Hours</h2>
        </div>
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 24 }, (_, i) => {
            const hourData = data.peakHours.find(h => h.hour === i);
            const count = hourData ? hourData.count : 0;
            const height = peakHourMax > 0 ? (count / peakHourMax) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-all relative group" style={{ height: `${Math.max(height, 2)}%` }}>
                  {count > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {count}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{i}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
