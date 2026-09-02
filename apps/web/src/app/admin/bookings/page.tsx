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
      fetchBookings(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const openPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentAmount(booking.advanceRequired - booking.amountPaid > 0 ? booking.advanceRequired - booking.amountPaid : booking.balanceAmount);
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
    try {
      await api.post('/payments/manual', {
        bookingId: selectedBooking.id,
        amount: Number(paymentAmount),
        method: 'CASH'
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-[#1E3F20]">Bookings Management</h1>
        <button className="bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          Export CSV
        </button>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#8B5E3C] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-3 ml-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID, Name..." 
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20] w-64"
            />
          </div>
          <button className="p-2 border rounded-lg text-gray-600 hover:bg-gray-50">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Booking ID</th>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Customer</th>
                <th className="p-4 font-semibold text-gray-600">Type</th>
                <th className="p-4 font-semibold text-gray-600">Guests</th>
                <th className="p-4 font-semibold text-gray-600">Finances</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">Loading bookings...</td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">No bookings found.</td>
                </tr>
              ) : filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{b.bookingNumber}</td>
                  <td className="p-4 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-600">
                    {b.user?.name || 'Guest'}<br/>
                    <span className="text-xs text-gray-400">{b.user?.email}</span>
                  </td>
                  <td className="p-4 text-gray-600 capitalize">{b.type.replace('_', ' ')}</td>
                  <td className="p-4 text-gray-600">{b.headCountAdult} Adults, {b.headCountChild} Children</td>
                  <td className="p-4 text-gray-600">
                    <div>Total: ₹{b.totalAmount}</div>
                    <div className="text-sm text-gray-500">Paid: ₹{b.amountPaid}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      b.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      b.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end space-x-2">
                      {b.status === 'REQUESTED' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'APPROVED')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="Approve">
                            <Check size={18} />
                          </button>
                          <button onClick={() => updateStatus(b.id, 'REJECTED')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors" title="Reject">
                            <X size={18} />
                          </button>
                        </>
                      )}
                      
                      {(b.status === 'APPROVED' || b.status === 'PAYMENT_PENDING') && (
                        <button onClick={() => openPaymentModal(b)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title="Record Payment">
                          <IndianRupee size={18} />
                        </button>
                      )}

                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus(b.id, 'CANCELLED')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors" title="Cancel">
                          <X size={18} />
                        </button>
                      )}
                      <button onClick={() => openDetailsModal(b)} className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors" title="View Details">
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

      {isPaymentModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Record Manual Payment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Booking: <strong>{selectedBooking.bookingNumber}</strong><br/>
              Total Amount: ₹{selectedBooking.totalAmount}<br/>
              Advance Required: ₹{selectedBooking.advanceRequired}<br/>
              Already Paid: ₹{selectedBooking.amountPaid}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Record (₹)</label>
              <input 
                type="number" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={recordPayment}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold">Booking Details: {selectedBooking.bookingNumber}</h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-lg font-semibold">₹{selectedBooking.totalAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Amount</p>
                <p className="text-lg font-semibold text-red-600">₹{selectedBooking.balanceAmount}</p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="font-semibold mb-3">Internal Notes</h4>
              <textarea 
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-[#1E3F20]"
                placeholder="Add private admin notes here..."
              />
              <div className="mt-2 flex justify-end">
                <button onClick={saveNotes} className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C] text-sm">
                  Save Notes
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Payments</h4>
              {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 font-medium">Method</th>
                        <th className="p-3 font-medium">Amount</th>
                        <th className="p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedBooking.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-3">{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td className="p-3">{p.method}</td>
                          <td className="p-3">₹{p.amount}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              p.status === 'CAPTURED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                <p className="text-gray-500 text-sm">No payments recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
