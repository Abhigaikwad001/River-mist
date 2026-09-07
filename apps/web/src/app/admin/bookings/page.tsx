'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, IndianRupee } from 'lucide-react';
import api from '@/lib/api';

export default function BookingsManagement() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceId, setReferenceId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  const tabs = ['ALL', 'REQUESTED', 'APPROVED', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.post(`/bookings/${id}/status`, { status });
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const openPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentAmount(booking.balanceAmount > 0 ? booking.balanceAmount : booking.advanceRequired);
    setPaymentMethod('UPI');
    setReferenceId('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const openDetailsModal = (booking: any) => {
    setSelectedBooking(booking);
    setNotesInput(booking.notes || '');
    setIsDetailsModalOpen(true);
  };

  const saveNotes = async () => {
    if (!selectedBooking) return;
    try {
      await api.post(`/bookings/${selectedBooking.id}/notes`, { notes: notesInput });
      setSelectedBooking({ ...selectedBooking, notes: notesInput });
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to update notes:', err);
      alert('Failed to update notes.');
    }
  };

  const recordPayment = async () => {
    if (!selectedBooking) return;
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    try {
      await api.post('/payments/manual', {
        bookingId: selectedBooking.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        referenceId,
        notes: paymentNotes
      });
      setIsPaymentModalOpen(false);
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      alert(err.response?.data?.message || 'Failed to record payment.');
    }
  };

  const filteredBookings = activeTab === 'ALL' 
    ? bookings 
    : bookings.filter(b => b.status === activeTab);

  return (
    <div className="space-y-6 h-full flex flex-col p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] font-bold">Bookings Management</h1>
          <p className="text-gray-600 text-sm mt-1">Review guest requests, approve reservations, and record manual payments.</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#1E3F20] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Booking ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Guests</th>
                <th className="p-4">Finances</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-serif">Loading bookings...</td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">No bookings found.</td>
                </tr>
              ) : filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 font-mono font-bold text-gray-900">{b.bookingNumber}</td>
                  <td className="p-4 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-600">
                    <span className="font-semibold text-gray-900 block">{b.user?.name || 'Guest'}</span>
                    <span className="text-xs text-gray-400">{b.user?.email}</span>
                  </td>
                  <td className="p-4 text-gray-600 capitalize">{b.type?.replace('_', ' ')}</td>
                  <td className="p-4 text-gray-600">{b.headCountAdult} Adults, {b.headCountChild} Children</td>
                  <td className="p-4 text-gray-600">
                    <div className="font-bold text-[#1E3F20]">Total: ₹{b.totalAmount?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-emerald-700 font-medium">Paid: ₹{b.amountPaid?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-amber-800 font-medium">Balance: ₹{b.balanceAmount?.toLocaleString('en-IN')}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                      b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {b.status === 'REQUESTED' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'APPROVED')} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="Approve Booking">
                            <Check size={18} />
                          </button>
                          <button onClick={() => updateStatus(b.id, 'REJECTED')} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Reject Booking">
                            <X size={18} />
                          </button>
                        </>
                      )}
                      
                      {(b.status === 'REQUESTED' || b.status === 'APPROVED' || b.status === 'PAYMENT_PENDING' || b.status === 'CONFIRMED') && (
                        <button onClick={() => openPaymentModal(b)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" title="Record Manual Payment">
                          <IndianRupee size={18} />
                        </button>
                      )}

                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus(b.id, 'CANCELLED')} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Cancel Booking">
                          <X size={18} />
                        </button>
                      )}
                      <button onClick={() => openDetailsModal(b)} className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" title="View Details">
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment Modal */}
      {isPaymentModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-xl font-serif font-bold text-[#1E3F20]">Record Manual Payment</h3>
            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 text-gray-700">
              <div>Booking: <strong className="font-mono text-gray-900">{selectedBooking.bookingNumber}</strong></div>
              <div>Total Amount: <strong>₹{selectedBooking.totalAmount}</strong></div>
              <div>Already Paid: <strong className="text-emerald-700">₹{selectedBooking.amountPaid}</strong></div>
              <div>Remaining Balance: <strong className="text-amber-800">₹{selectedBooking.balanceAmount}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                type="number" 
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Transaction / Ref ID (Optional)</label>
              <input 
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]"
                placeholder="e.g. UPI-998877"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Notes (Optional)</label>
              <input 
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]"
                placeholder="Payment verified by staff..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={recordPayment}
                className="px-5 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C] text-sm font-medium shadow-sm"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#1E3F20]">Booking {selectedBooking.bookingNumber}</h3>
                <p className="text-xs text-gray-500">Customer: {selectedBooking.user?.name} ({selectedBooking.user?.email})</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl text-center">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Amount</p>
                <p className="text-lg font-bold text-[#1E3F20]">₹{selectedBooking.totalAmount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Paid Amount</p>
                <p className="text-lg font-bold text-emerald-700">₹{selectedBooking.amountPaid}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Balance</p>
                <p className="text-lg font-bold text-amber-800">₹{selectedBooking.balanceAmount}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-sm mb-2 text-gray-700 uppercase tracking-wider">Internal Admin Notes</h4>
              <textarea 
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm"
                placeholder="Add private staff notes..."
              />
              <div className="mt-2 flex justify-end">
                <button onClick={saveNotes} className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C] text-sm font-medium">
                  Save Notes
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wider">Payment History</h4>
              {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 font-semibold text-gray-500">Ref / ID</th>
                        <th className="p-3 font-semibold text-gray-500">Date</th>
                        <th className="p-3 font-semibold text-gray-500">Method</th>
                        <th className="p-3 font-semibold text-gray-500">Amount</th>
                        <th className="p-3 font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBooking.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-3 font-mono font-medium">{p.razorpayPaymentId || `MANUAL-${p.id}`}</td>
                          <td className="p-3 text-gray-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td className="p-3 font-medium uppercase">{p.method}</td>
                          <td className="p-3 font-bold text-[#1E3F20]">₹{p.amount}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'CAPTURED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No payment transactions recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
