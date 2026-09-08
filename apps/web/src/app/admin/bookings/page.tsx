'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Eye, Check, X, IndianRupee, 
  QrCode, Send, MessageSquare, ExternalLink, 
  Copy, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
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

  // QR & WhatsApp Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<any>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isConfirmPaymentModalOpen, setIsConfirmPaymentModalOpen] = useState(false);

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

  const handleConfirmAvailability = async (bookingId: number) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/confirm-availability`);
      alert('Availability confirmed successfully! The booking is now APPROVED.');
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: res.data?.status || 'APPROVED' });
      }
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to confirm availability:', err);
      alert(err.response?.data?.message || 'Failed to confirm booking availability.');
    }
  };

  const openQrModal = async (booking: any) => {
    setSelectedBooking(booking);
    setIsQrModalOpen(true);
    setQrLoading(true);
    setQrData(null);
    setWhatsAppResult(null);
    setCopiedUpi(false);

    try {
      const res = await api.get(`/bookings/${booking.id}/payment-qr`);
      setQrData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch payment QR:', err);
      alert(err.response?.data?.message || 'Failed to generate payment QR.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSendPaymentRequest = async () => {
    if (!selectedBooking) return;
    setIsConfirmPaymentModalOpen(false);
    setSendingWhatsApp(true);
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/send-payment-request`);
      setWhatsAppResult(res.data?.result || res.data);
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to send WhatsApp payment request:', err);
      alert(err.response?.data?.message || 'Failed to send WhatsApp payment request.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleConfirmAndRequestPayment = async (bookingId: number) => {
    if (!confirm('Confirm booking availability and dispatch payment instructions to the customer via WhatsApp?')) {
      return;
    }
    try {
      const res = await api.post(`/bookings/${bookingId}/confirm-and-request-payment`);
      alert(`Availability confirmed! WhatsApp status: ${res.data?.whatsapp?.status || 'dispatched'}`);
      fetchBookings();
    } catch (err: any) {
      console.error('Failed to confirm and request payment:', err);
      alert(err.response?.data?.message || 'Failed to confirm availability and request payment.');
    }
  };

  const openPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    const defaultAmount = booking.amountPaid === 0 && booking.advanceRequired > 0 
      ? booking.advanceRequired 
      : (booking.balanceAmount > 0 ? booking.balanceAmount : booking.advanceRequired);
    setPaymentAmount(defaultAmount);
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
    if (paymentAmount > selectedBooking.balanceAmount) {
      alert(`Payment amount (₹${paymentAmount}) cannot exceed remaining balance (₹${selectedBooking.balanceAmount}).`);
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
          <p className="text-gray-600 text-sm mt-1">Review guest requests, verify availability, dispatch authoritative UPI payment QRs via WhatsApp, and record verified payments.</p>
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
                    <span className="text-xs text-gray-400">{b.user?.phone || b.user?.email}</span>
                  </td>
                  <td className="p-4 text-gray-600 capitalize">{b.type?.replace('_', ' ')}</td>
                  <td className="p-4 text-gray-600">{b.headCountAdult} Adults, {b.headCountChild} Children</td>
                  <td className="p-4 text-gray-600">
                    <div className="font-bold text-[#1E3F20]">Total: ₹{b.totalAmount?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-emerald-700 font-medium">Paid: ₹{b.amountPaid?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-amber-800 font-medium">Balance: ₹{b.balanceAmount?.toLocaleString('en-IN')}</div>
                    {b.advanceRequired > 0 && (
                      <div className="text-[10px] text-gray-500">Advance: ₹{b.advanceRequired?.toLocaleString('en-IN')}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                      b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'PAYMENT_PENDING' ? 'bg-purple-100 text-purple-800' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center space-x-1.5">
                      {b.status === 'REQUESTED' && (
                        <>
                          <button 
                            onClick={() => handleConfirmAvailability(b.id)} 
                            className="px-2.5 py-1.5 bg-[#1E3F20] text-white text-xs font-semibold rounded-lg hover:bg-[#2A522C] transition-colors flex items-center gap-1 shadow-sm"
                            title="Confirm Booking Availability"
                          >
                            <Check size={14} />
                            <span>Confirm Availability</span>
                          </button>
                          <button 
                            onClick={() => updateStatus(b.id, 'REJECTED')} 
                            className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" 
                            title="Reject Booking"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}

                      {/* Payment QR & WhatsApp Action (Available for any booking not cancelled/rejected with balance remaining) */}
                      {b.status !== 'CANCELLED' && b.status !== 'REJECTED' && (b.balanceAmount > 0 || b.amountPaid === 0) && (
                        <button 
                          onClick={() => openQrModal(b)} 
                          className={`rounded-lg transition-colors flex items-center gap-1 ${
                            b.status === 'APPROVED'
                              ? 'px-2.5 py-1.5 bg-purple-700 text-white hover:bg-purple-800 text-xs font-semibold shadow-sm'
                              : 'p-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200'
                          }`}
                          title="View Payment QR / Send WhatsApp"
                        >
                          <QrCode size={16} />
                          {b.status === 'APPROVED' && <span>Payment QR</span>}
                        </button>
                      )}
                      
                      {(b.status === 'REQUESTED' || b.status === 'APPROVED' || b.status === 'PAYMENT_PENDING' || b.status === 'CONFIRMED') && (
                        <button 
                          onClick={() => openPaymentModal(b)} 
                          className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" 
                          title="Record Manual Payment"
                        >
                          <IndianRupee size={16} />
                        </button>
                      )}

                      {b.status === 'CONFIRMED' && (
                        <button 
                          onClick={() => updateStatus(b.id, 'CANCELLED')} 
                          className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" 
                          title="Cancel Booking"
                        >
                          <X size={16} />
                        </button>
                      )}

                      <button 
                        onClick={() => openDetailsModal(b)} 
                        className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" 
                        title="View Details"
                      >
                        <Eye size={16} />
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

      {/* Payment QR & WhatsApp Automation Modal */}
      {isQrModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-serif font-bold text-[#1E3F20]">Payment & WhatsApp Desk</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-mono font-bold rounded">
                    {selectedBooking.bookingNumber}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    selectedBooking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedBooking.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                    selectedBooking.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                    selectedBooking.status === 'PAYMENT_PENDING' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 space-x-1.5 flex flex-wrap">
                  <span>Guest: <strong>{selectedBooking.user?.name || 'Guest'}</strong> ({selectedBooking.user?.phone || selectedBooking.user?.email || 'No contact'})</span>
                  <span>•</span>
                  <span>{new Date(selectedBooking.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{selectedBooking.headCountAdult} Adults, {selectedBooking.headCountChild} Children</span>
                </div>
              </div>
              <button 
                onClick={() => setIsQrModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {qrLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-[#1E3F20]" />
                <p className="text-sm font-medium text-gray-600 font-serif">Generating server-authoritative QR...</p>
              </div>
            ) : qrData ? (
              <>
                {/* Availability Notice for REQUESTED bookings */}
                {selectedBooking.status === 'REQUESTED' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-700 shrink-0" />
                      <span><strong>Availability Pending:</strong> Confirm availability before requesting payment.</span>
                    </div>
                    <button
                      onClick={async () => {
                        await handleConfirmAvailability(selectedBooking.id);
                      }}
                      className="px-3 py-1.5 bg-[#1E3F20] text-white font-semibold rounded-lg hover:bg-[#2A522C] shrink-0 flex items-center gap-1 shadow-sm transition-colors text-xs"
                    >
                      <Check size={14} />
                      <span>Confirm Availability</span>
                    </button>
                  </div>
                )}

                {/* Financial Breakdown */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Total Booking Value:</span>
                    <span className="font-bold text-gray-900">₹{qrData.financials.totalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  {qrData.financials.advanceRequired > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Advance Required:</span>
                      <span className="font-medium text-gray-800">₹{qrData.financials.advanceRequired?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Amount Paid to Date:</span>
                    <span className="font-semibold text-emerald-700">₹{qrData.financials.amountPaid?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Remaining Balance:</span>
                    <span className="font-semibold text-amber-800">₹{qrData.financials.balanceAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-emerald-200/80 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-[#1E3F20]">Authoritative Amount to Request:</span>
                    <span className="text-lg font-black text-[#1E3F20]">
                      ₹{qrData.financials.amountRequested?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* QR Code Graphic and Tap-to-Pay Details */}
                {qrData.financials.balanceAmount > 0 ? (
                  <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <img 
                      src={qrData.qrDataUrl} 
                      alt={`Payment QR for ₹${qrData.financials.amountRequested}`}
                      className="w-44 h-44 rounded-lg shadow-sm border border-gray-200 bg-white p-2"
                    />
                    <span className="text-[11px] text-gray-500 font-mono mt-2 text-center">
                      UPI ID: <strong>{qrData.upiId}</strong> • Scan via Google Pay, PhonePe, Paytm, BHIM
                    </span>

                    {/* Tap-to-Pay / UPI URI */}
                    <div className="w-full mt-3 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs">
                      <span className="font-mono text-gray-600 truncate max-w-[260px]" title={qrData.upiUri}>
                        {qrData.upiUri}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrData.upiUri);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="text-xs font-medium text-[#1E3F20] hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        {copiedUpi ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-medium">
                    🎉 This booking is fully paid and settled. No further payment requested.
                  </div>
                )}

                {/* Staff Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Staff Actions</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {qrData.financials.balanceAmount > 0 && (
                      <button
                        onClick={() => setIsConfirmPaymentModalOpen(true)}
                        disabled={sendingWhatsApp || selectedBooking.status === 'REQUESTED'}
                        className="py-2.5 px-3 bg-[#1E3F20] hover:bg-[#2A522C] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                        title={selectedBooking.status === 'REQUESTED' ? 'Confirm availability first' : 'Send WhatsApp payment request'}
                      >
                        {sendingWhatsApp ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Send WhatsApp Request</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsQrModalOpen(false);
                        openPaymentModal(selectedBooking);
                      }}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <IndianRupee size={14} />
                      <span>Record Manual Payment</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Result / Fallback Feedback */}
                {whatsAppResult && (
                  <div className={`p-3.5 rounded-xl text-xs space-y-2 ${
                    whatsAppResult.status === 'SENT'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : whatsAppResult.status === 'TEXT_FALLBACK_SENT' || whatsAppResult.status === 'TEXT_SENT'
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : 'bg-red-50 border border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {whatsAppResult.status === 'SENT' ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Payment QR Image & Instructions Dispatched via WhatsApp</span>
                        </>
                      ) : whatsAppResult.status === 'TEXT_FALLBACK_SENT' || whatsAppResult.status === 'TEXT_SENT' ? (
                        <>
                          <AlertCircle size={16} className="text-amber-600 shrink-0" />
                          <span>Text Payment Instructions Dispatched (Media QR Fallback)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} className="text-red-600 shrink-0" />
                          <span>WhatsApp Dispatch Status: {whatsAppResult.status}</span>
                        </>
                      )}
                    </div>

                    {whatsAppResult.mediaError && (
                      <div className="p-2 bg-white/70 border border-amber-300 rounded text-[11px] text-amber-800 font-mono">
                        <strong>Media QR Notice:</strong> {whatsAppResult.mediaError}
                      </div>
                    )}

                    {whatsAppResult.messageId && (
                      <div className="text-[11px] font-mono text-gray-600">
                        Meta Message ID: {whatsAppResult.messageId}
                      </div>
                    )}

                    {whatsAppResult.fallbackUrl && (
                      <div className="pt-1">
                        <p className="mb-1.5 font-medium text-gray-700">Click-to-Chat Fallback (wa.me) Ready:</p>
                        <a
                          href={whatsAppResult.fallbackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3F20] text-white rounded-lg text-xs font-semibold hover:bg-[#2A522C] shadow-sm transition-colors"
                        >
                          <MessageSquare size={14} />
                          <span>Open Customer WhatsApp Chat (wa.me)</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Verification Reminder */}
                <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-lg flex items-start gap-2 text-[11px] text-amber-900">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-700" />
                  <p>
                    <strong>Financial Safety:</strong> Sending payment instructions does not mark the reservation as paid. Staff must verify credit in bank/UPI and record manual payment.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-gray-500 py-6">Could not load QR code details.</p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Before Sending Payment Request */}
      {isConfirmPaymentModalOpen && selectedBooking && qrData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 space-y-4">
            <h4 className="text-lg font-serif font-bold text-[#1E3F20]">Send Payment Request?</h4>
            <p className="text-xs text-gray-600">
              Confirm dispatching official payment instructions and the UPI QR code to the customer via WhatsApp:
            </p>
            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Amount to Request:</span>
                <span className="font-bold text-base text-[#1E3F20]">
                  ₹{qrData.financials.amountRequested?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient:</span>
                <span className="font-medium text-gray-800 text-right">
                  {selectedBooking.user?.name || 'Customer'}<br />
                  <span className="text-gray-500 text-[11px]">{selectedBooking.user?.phone || 'Business Desk'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Booking:</span>
                <span className="font-mono font-bold text-gray-800">{selectedBooking.bookingNumber}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmPaymentModalOpen(false)}
                className="px-3.5 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPaymentRequest}
                className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg text-xs font-semibold hover:bg-[#2A522C] shadow-sm flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>Send Payment Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
