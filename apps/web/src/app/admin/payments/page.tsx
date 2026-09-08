'use client';

import React, { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import { IndianRupee, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bookingId: '',
    amount: '',
    method: 'UPI',
    referenceId: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [paymentsRes, bookingsRes] = await Promise.all([
        api.get('/payments'),
        api.get('/bookings')
      ]);
      setPayments(paymentsRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.error('Failed to load payments or bookings:', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load payments or bookings from server.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = (bookingIdStr: string) => {
    const selected = bookings.find(b => String(b.id) === bookingIdStr);
    setFormData(prev => ({
      ...prev,
      bookingId: bookingIdStr,
      amount: selected ? String(selected.balanceAmount > 0 ? selected.balanceAmount : selected.advanceRequired) : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bookingId || !formData.amount || Number(formData.amount) <= 0) {
      alert('Please select a booking and enter a valid positive payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/payments/manual', {
        bookingId: Number(formData.bookingId),
        amount: Number(formData.amount),
        method: formData.method,
        referenceId: formData.referenceId,
        notes: formData.notes
      });
      setIsModalOpen(false);
      setFormData({
        bookingId: '',
        amount: '',
        method: 'UPI',
        referenceId: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      alert(err.response?.data?.message || 'Failed to record manual payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBookingData = bookings.find(b => String(b.id) === formData.bookingId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] font-bold">Payments & Transactions</h1>
          <p className="text-gray-600 text-sm mt-1">View all online Razorpay transactions and record verified manual payments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData} 
            className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 bg-[#1E3F20] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#2A522C] transition-colors shadow-sm text-sm"
          >
            <Plus size={18} /> Record Manual Payment
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm">{fetchError}</span>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Transaction / Ref ID</th>
                <th className="px-6 py-4">Booking & Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500 font-serif">Loading payment records...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500">No payment records found.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-gray-700 font-semibold">
                    {p.razorpayPaymentId || `MANUAL-${p.id}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{p.booking?.bookingNumber}</span>
                    <span className="text-xs text-gray-500 block">{p.booking?.user?.name || 'Guest'}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {p.paymentDate ? format(new Date(p.paymentDate), 'MMM d, yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 uppercase tracking-wider">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#1E3F20]">
                    ₹{p.amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      p.status === 'CAPTURED' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'INITIATED' ? 'bg-amber-100 text-amber-800' :
                      p.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status === 'CAPTURED' && <CheckCircle2 size={12} />}
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Manual Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl border border-gray-100">
            <h3 className="text-xl font-serif font-bold text-[#1E3F20] mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-[#D4AF37]" /> Record Manual Payment
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Select Booking</label>
                <select 
                  required 
                  value={formData.bookingId} 
                  onChange={e => handleSelectBooking(e.target.value)} 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]"
                >
                  <option value="">-- Choose a Booking --</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNumber} — {b.user?.name || 'Guest'} (Total: ₹{b.totalAmount}, Paid: ₹{b.amountPaid})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBookingData && (
                <div className="p-3 bg-[#1E3F20]/5 border border-[#1E3F20]/10 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Amount:</span>
                    <span className="font-bold text-gray-900">₹{selectedBookingData.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Already Paid:</span>
                    <span className="font-bold text-emerald-700">₹{selectedBookingData.amountPaid}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 border-t pt-1 font-bold">
                    <span>Remaining Balance:</span>
                    <span className="text-amber-800">₹{selectedBookingData.balanceAmount}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Payment Method</label>
                  <select 
                    value={formData.method} 
                    onChange={e => setFormData({...formData, method: e.target.value})} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Amount Received (₹)</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" 
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Transaction / Reference ID (Optional)</label>
                <input 
                  type="text" 
                  value={formData.referenceId} 
                  onChange={e => setFormData({...formData, referenceId: e.target.value})} 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" 
                  placeholder="e.g. UPI-1234567890" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Payment Date</label>
                <input 
                  type="date" 
                  value={formData.paymentDate} 
                  onChange={e => setFormData({...formData, paymentDate: e.target.value})} 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Internal Notes (Optional)</label>
                <input 
                  type="text" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" 
                  placeholder="Verified via bank statement..." 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-5 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C] text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
