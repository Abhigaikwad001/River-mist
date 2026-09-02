'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // Since we don't have a GET /payments yet, let's fetch revenue which returns payments,
        // or bookings and extract payments. Wait, I added getRevenue which returns CAPTURED payments.
        // Let's use GET /bookings and map out payments for now, since getRevenue is only CAPTURED.
        // Wait, does /payments exist in PaymentsController? Yes, wait, no, I didn't add it.
        // Let's use getRevenue for now.
        const res = await api.get('/admin/revenue');
        setPayments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Payments</h1>
          <p className="text-gray-600 mt-1">View all captured payment transactions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Booking</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No payments found.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">
                    {p.razorpayPaymentId || `MANUAL-${p.id}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{p.booking?.bookingNumber}</span>
                    <br/><span className="text-xs text-gray-500">{p.booking?.user?.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(p.paymentDate), 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-6 py-4 text-gray-600">{p.method}</td>
                  <td className="px-6 py-4 font-medium">₹{p.amount}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
