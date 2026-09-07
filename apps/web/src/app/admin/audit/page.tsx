'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, History, Filter, Calendar, User, Eye, X, ChevronLeft, ChevronRight, 
  ArrowRight, Shield, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';

interface AuditLogItem {
  id: number;
  actorUserId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: number | string | null;
  entityKey: string | null;
  description: string;
  beforeData: any;
  afterData: any;
  metadata: any;
  createdAt: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

const ENTITY_TYPES = [
  'PACKAGE', 'FOOD', 'ACTIVITY', 'EVENT', 'MEDIA', 
  'DISCOUNT', 'CONTENT', 'BOOKING', 'PAYMENT', 'QUOTE', 'USER', 'SETTING'
];

const ACTIONS = [
  'CREATE', 'UPDATE', 'PRICE_CHANGE', 'STATUS_CHANGE', 
  'DELETE', 'PAYMENT_RECORDED', 'PAYMENT_REFUNDED', 'BULK'
];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (entityType) params.entityType = entityType;
      if (action) params.action = action;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/audit', { params });
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, entityType, action, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setEntityType('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getActionBadgeColor = (act: string) => {
    switch (act) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PRICE_CHANGE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UPDATE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'STATUS_CHANGE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PAYMENT_RECORDED':
      case 'PAYMENT_REFUNDED':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderFormattedDiff = (before: any, after: any) => {
    if (!before && !after) {
      return <p className="text-gray-500 italic">No snapshot data recorded for this entry.</p>;
    }

    // Combine keys from both before and after
    const beforeObj = (typeof before === 'object' && before !== null) ? before : {};
    const afterObj = (typeof after === 'object' && after !== null) ? after : {};
    const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

    if (allKeys.length === 0) {
      return (
        <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-gray-50 p-4 rounded-lg">
          <div>
            <span className="font-semibold text-gray-600 block mb-2">Before:</span>
            <pre className="whitespace-pre-wrap text-gray-700">{JSON.stringify(before, null, 2)}</pre>
          </div>
          <div>
            <span className="font-semibold text-gray-600 block mb-2">After:</span>
            <pre className="whitespace-pre-wrap text-gray-700">{JSON.stringify(after, null, 2)}</pre>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">
          <div className="col-span-4">Field</div>
          <div className="col-span-4 text-rose-600">Previous Value</div>
          <div className="col-span-4 text-emerald-600">New Value</div>
        </div>
        {allKeys.map(key => {
          const oldVal = beforeObj[key];
          const newVal = afterObj[key];
          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          return (
            <div 
              key={key} 
              className={`grid grid-cols-12 gap-2 text-sm p-2 rounded-md ${
                isChanged ? 'bg-amber-50/60 border border-amber-100' : 'bg-gray-50/50'
              }`}
            >
              <div className="col-span-4 font-mono font-medium text-gray-700 break-all">{key}</div>
              <div className="col-span-4 font-mono text-rose-700 bg-rose-50/80 p-1.5 rounded border border-rose-100 break-all">
                {oldVal !== undefined ? (
                  typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)
                ) : (
                  <span className="text-gray-400 italic">&lt;undefined&gt;</span>
                )}
              </div>
              <div className="col-span-4 font-mono text-emerald-700 bg-emerald-50/80 p-1.5 rounded border border-emerald-100 break-all">
                {newVal !== undefined ? (
                  typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)
                ) : (
                  <span className="text-gray-400 italic">&lt;undefined&gt;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] flex items-center gap-3">
            <History className="text-[#D4AF37]" size={28} />
            Admin Audit History
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            System audit log — track administrative mutations, pricing updates, state changes, and security operations.
          </p>
        </div>
        <button 
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, entity key..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm w-full"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm text-gray-700"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm text-gray-700"
            >
              <option value="">All Actions</option>
              {ACTIONS.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-1/2 py-2 px-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-xs text-gray-700"
              title="Start Date"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-1/2 py-2 px-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-xs text-gray-700"
              title="End Date"
            />
          </div>
        </div>

        {(search || entityType || action || startDate || endDate) && (
          <div className="flex justify-end border-t pt-3">
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-gray-400" size={24} />
                    Loading audit history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    No audit records found matching the current criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="p-4 whitespace-nowrap text-gray-600">
                      <div className="font-medium text-gray-900">
                        {new Date(log.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1E3F20]/10 text-[#1E3F20] flex items-center justify-center font-bold text-xs">
                          {log.actorName ? log.actorName.charAt(0).toUpperCase() : (log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.actorName || log.user?.name || (log.actorUserId ? `User #${log.actorUserId}` : 'System / Guest')}
                          </div>
                          {log.actorEmail || log.user?.email ? (
                            <div className="text-xs text-gray-500">{log.actorEmail || log.user?.email}</div>
                          ) : null}
                          {log.user?.role && (
                            <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                              {log.user.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-700">{log.entityType}</span>
                      {log.entityId ? (
                        <span className="text-xs text-gray-500 ml-1">#{log.entityId}</span>
                      ) : log.entityKey ? (
                        <span className="text-xs text-gray-500 ml-1">({log.entityKey})</span>
                      ) : null}
                    </td>

                    {/* Description */}
                    <td className="p-4 text-gray-800 max-w-md break-words">
                      {log.description}
                    </td>

                    {/* Action Details button */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3F20] hover:text-[#2A522C] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <Eye size={14} />
                        <span>View Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Showing <span className="font-semibold text-gray-900">{logs.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-gray-900">{total}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-gray-600 px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-[#FAF9F6]">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">Entry #{selectedLog.id}</span>
                </div>
                <h2 className="text-xl font-serif text-[#1E3F20] mt-2">
                  {selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ''} Audit Details
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Recorded on {new Date(selectedLog.createdAt).toLocaleString()} by{' '}
                  <span className="font-semibold text-gray-700">
                    {selectedLog.actorName || selectedLog.user?.name || (selectedLog.actorUserId ? `User #${selectedLog.actorUserId}` : 'System / Guest')}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Description Box */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Description</span>
                <p className="text-sm font-medium text-gray-900">{selectedLog.description}</p>
              </div>

              {/* Before vs After Diff */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>State Snapshot Comparison</span>
                </h3>
                {renderFormattedDiff(selectedLog.beforeData, selectedLog.afterData)}
              </div>

              {/* Metadata if present */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="border-t pt-4">
                  <span className="text-xs uppercase font-bold text-gray-400 block mb-2">Metadata</span>
                  <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-[#1E3F20] text-white text-sm font-medium rounded-lg hover:bg-[#2A522C] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
