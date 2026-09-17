'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Sliders,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ResourceCapacity {
  resourceId: number;
  resourceName: string;
  totalCapacity: number;
  booked: number;
  remainingCapacity: number;
  overrideApplied?: boolean;
}

interface CapacityReport {
  date: string;
  isClosed: boolean;
  closureReason: string | null;
  override: {
    id: number;
    date: string;
    customCapacity: number | null;
    isClosed: boolean;
    reason: string | null;
  } | null;
  resources: ResourceCapacity[];
}

interface DailyOverride {
  id: number;
  date: string;
  customCapacity: number | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CapacityPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<CapacityReport | null>(null);
  const [overridesList, setOverridesList] = useState<DailyOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for overrides
  const [isClosed, setIsClosed] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [customCapacity, setCustomCapacity] = useState<string>('');

  const fetchCapacity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/capacity/availability?date=${date}`);
      const data = res.data;
      
      // Normalize if backend returned array vs object
      if (Array.isArray(data)) {
        setReport({
          date,
          isClosed: false,
          closureReason: null,
          override: null,
          resources: data.map((r: any) => ({
            resourceId: r.resourceId,
            resourceName: r.resourceName,
            totalCapacity: r.capacity,
            booked: r.booked,
            remainingCapacity: r.remaining,
          })),
        });
        setIsClosed(false);
        setClosureReason('');
        setCustomCapacity('');
      } else {
        setReport(data);
        if (data.override) {
          setIsClosed(!!data.override.isClosed);
          setClosureReason(data.override.reason || '');
          setCustomCapacity(data.override.customCapacity !== null && data.override.customCapacity !== undefined ? String(data.override.customCapacity) : '');
        } else {
          setIsClosed(false);
          setClosureReason('');
          setCustomCapacity('');
        }
      }
    } catch (err: any) {
      console.error('Failed to load capacity:', err);
      setFeedback({ type: 'error', message: 'Failed to load capacity availability.' });
    } finally {
      setLoading(false);
    }
  }, [date]);

  const fetchUpcomingOverrides = useCallback(async () => {
    try {
      const res = await api.get('/capacity/overrides');
      setOverridesList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load overrides:', err);
    }
  }, []);

  useEffect(() => {
    fetchCapacity();
    fetchUpcomingOverrides();
  }, [fetchCapacity, fetchUpcomingOverrides]);

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload: any = {
        date,
        isClosed,
        reason: closureReason.trim() || undefined,
      };

      if (!isClosed && customCapacity !== '') {
        const parsed = parseInt(customCapacity, 10);
        if (isNaN(parsed) || parsed < 0) {
          setFeedback({ type: 'error', message: 'Custom capacity must be a positive integer.' });
          setSubmitting(false);
          return;
        }
        payload.customCapacity = parsed;
      }

      await api.post('/capacity/overrides', payload);
      setFeedback({ type: 'success', message: 'Daily capacity override updated successfully.' });
      await fetchCapacity();
      await fetchUpcomingOverrides();
    } catch (err: any) {
      console.error('Failed to save override:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save daily capacity override.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOverride = async (id: number) => {
    if (!window.confirm('Are you sure you want to reset this date to standard resort capacity?')) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await api.delete(`/capacity/overrides/${id}`);
      setFeedback({ type: 'success', message: 'Override removed. Resort capacity reset to default.' });
      await fetchCapacity();
      await fetchUpcomingOverrides();
    } catch (err: any) {
      console.error('Failed to delete override:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete capacity override.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resources = report?.resources || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] font-bold">Capacity & Availability Engine</h1>
          <p className="text-gray-600 mt-1">
            Authoritative IST business calendar, blackout dates, and daily capacity overrides.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="capacity-date-picker" className="font-medium text-gray-700 text-sm">Target Business Date (IST):</label>
          <input
            id="capacity-date-picker"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 p-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3F20] transition-shadow shadow-sm"
          />
          <button
            onClick={() => {
              fetchCapacity();
              fetchUpcomingOverrides();
            }}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:text-[#1E3F20] hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh"
            aria-label="Refresh availability"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#1E3F20]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-800 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Date Status Banner */}
      {report && (
        <div>
          {report.isClosed ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 text-red-900 shadow-sm">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <Ban className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <span>DATE BLACKOUT ACTIVE</span>
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-mono uppercase">
                    Bookings Disabled
                  </span>
                </div>
                <p className="text-sm text-red-800 mt-1">
                  River Mist is closed for bookings on <strong>{report.date}</strong> (IST).
                  {report.closureReason ? ` Reason: "${report.closureReason}"` : ' (No specific closure reason noted).'}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  All guest booking attempts for this business date will be rejected with a clear closure explanation.
                </p>
              </div>
            </div>
          ) : report.override && report.override.customCapacity !== null ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-900 shadow-sm">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Sliders className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <span>CUSTOM CAPACITY OVERRIDE APPLIED</span>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-mono uppercase">
                    {report.override.customCapacity} Pax Limit
                  </span>
                </div>
                <p className="text-sm text-amber-800 mt-1">
                  General Day Tourism capacity for <strong>{report.date}</strong> has been adjusted to{' '}
                  <strong>{report.override.customCapacity}</strong> guests
                  {report.override.reason ? ` (${report.override.reason})` : ''}.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 text-emerald-900 shadow-sm">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-lg">Standard Capacity Operating Normally</div>
                <p className="text-sm text-emerald-800 mt-1">
                  Default resource limits apply for <strong>{report.date}</strong>. No blackouts or custom caps are in effect.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Capacity Table + Override Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Capacity Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1E3F20]" />
              Resource Allocation for {date}
            </h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
              IST Authoritative Range
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1E3F20] mb-2" />
                Loading capacity breakdown...
              </div>
            ) : resources.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No resources configured for this date.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Resource</th>
                    <th className="px-6 py-4">Total Cap</th>
                    <th className="px-6 py-4">Booked</th>
                    <th className="px-6 py-4">Remaining</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {resources.map((r: any) => {
                    const totalCap = r.totalCapacity ?? r.capacity ?? 0;
                    const booked = r.booked ?? 0;
                    const remaining = r.remainingCapacity ?? r.remaining ?? 0;
                    const isClosedDate = report?.isClosed;
                    const isFull = remaining === 0 || isClosedDate;
                    const isLow = !isFull && totalCap > 0 && remaining / totalCap < 0.2;

                    return (
                      <tr key={r.resourceId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{r.resourceName}</span>
                            {r.overrideApplied && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                OVERRIDE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-mono">
                          {isClosedDate ? <span className="line-through text-gray-400">{totalCap}</span> : totalCap}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800 font-mono">{booked}</td>
                        <td
                          className={`px-6 py-4 font-bold font-mono ${
                            isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
                          }`}
                        >
                          {isClosedDate ? 0 : remaining}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              isClosedDate
                                ? 'bg-red-100 text-red-800'
                                : isFull
                                ? 'bg-red-100 text-red-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {isClosedDate ? 'Blackout' : isFull ? 'Sold Out' : isLow ? 'Almost Full' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Set Daily Override & Blackout Card (1 col) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-[#1E3F20]" />
              Manage Date Policy
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Set custom limits or close River Mist on <strong>{date}</strong>.
            </p>

            <form onSubmit={handleSaveOverride} className="space-y-4">
              {/* Blackout Toggle */}
              <div className="bg-red-50/60 border border-red-100 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => setIsClosed(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-bold text-sm text-red-900">Blackout / Close Date</span>
                    <p className="text-xs text-red-700 mt-0.5">
                      Prevents any new bookings for this entire day.
                    </p>
                  </div>
                </label>
              </div>

              {/* Custom Capacity (only relevant when not fully closed) */}
              <div className={`space-y-1.5 ${isClosed ? 'opacity-40 pointer-events-none' : ''}`}>
                <label htmlFor="override-custom-capacity" className="block text-xs font-semibold text-gray-700">
                  Custom Capacity Override (Guests):
                </label>
                <input
                  id="override-custom-capacity"
                  type="number"
                  min="0"
                  placeholder="e.g. 150 (Leave blank for default)"
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(e.target.value)}
                  disabled={isClosed}
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]"
                />
                <p className="text-[11px] text-gray-500">
                  Overrides General Day Tourism resource capacity (default is 200).
                </p>
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1.5">
                <label htmlFor="override-reason" className="block text-xs font-semibold text-gray-700">
                  Reason / Internal Note:
                </label>
                <input
                  id="override-reason"
                  type="text"
                  placeholder="e.g. Private Corporate Retreat / Renovation"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]"
                />
                <p className="text-[11px] text-gray-500">
                  Displayed to guests when attempting to book a closed date.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1E3F20] hover:bg-[#2A522C] text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isClosed ? 'Apply Date Blackout' : 'Save Capacity Policy'}
                </button>

                {report?.override && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDeleteOverride(report.override!.id)}
                    className="w-full border border-red-200 text-red-600 hover:bg-red-50 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset to Default Capacity
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span>All modifications are recorded in the immutable audit log.</span>
          </div>
        </div>
      </div>

      {/* Active Overrides & Blackout Registry */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Active Capacity Overrides & Blackouts</h2>
            <p className="text-xs text-gray-500">
              Overview of all active date-specific capacity overrides and blackouts configured in the system.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {overridesList.length} Active Rules
          </span>
        </div>

        {overridesList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
            No active capacity overrides or blackout dates found. The resort is operating on standard capacity.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date (IST)</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Limit / Detail</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overridesList.map((item) => {
                  const dateStr = item.date ? item.date.substring(0, 10) : '';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 font-mono">{dateStr}</td>
                      <td className="px-4 py-3">
                        {item.isClosed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            <Ban className="w-3 h-3" /> Blackout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Sliders className="w-3 h-3" /> Custom Cap
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono">
                        {item.isClosed ? '0 Pax (Closed)' : `${item.customCapacity} Pax`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{item.reason || '—'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setDate(dateStr)}
                          className="text-xs text-[#1E3F20] hover:underline font-semibold"
                        >
                          View / Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOverride(item.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold ml-3"
                          title="Delete override"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
