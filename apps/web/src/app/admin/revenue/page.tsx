'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { IndianRupee, TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';

export default function RevenuePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.get('/admin/revenue');
        setPayments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate revenue by method
  const upiRevenue = payments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const cardRevenue = payments.filter(p => p.method === 'RAZORPAY').reduce((sum, p) => sum + p.amount, 0);
  const cashRevenue = payments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);

  // Calculate last 30 days revenue
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentRevenue = payments
    .filter(p => isAfter(new Date(p.paymentDate), thirtyDaysAgo))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Revenue</h1>
          <p className="text-gray-600 mt-1">Financial analytics based on captured payments.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 p-8">Loading revenue data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><IndianRupee size={20} /></div>
                <h3 className="text-gray-500 font-medium">Total Revenue</h3>
              </div>
              <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                <h3 className="text-gray-500 font-medium">Last 30 Days</h3>
              </div>
              <p className="text-3xl font-bold">₹{recentRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CreditCard size={20} /></div>
                <h3 className="text-gray-500 font-medium">Online (Razorpay/UPI)</h3>
              </div>
              <p className="text-3xl font-bold">₹{(upiRevenue + cardRevenue).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Wallet size={20} /></div>
                <h3 className="text-gray-500 font-medium">Cash Collected</h3>
              </div>
              <p className="text-3xl font-bold">₹{cashRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 font-medium text-gray-500 uppercase">Date</th>
                  <th className="p-4 font-medium text-gray-500 uppercase">Booking</th>
                  <th className="p-4 font-medium text-gray-500 uppercase">Method</th>
                  <th className="p-4 font-medium text-gray-500 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.slice(0, 15).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-600">{format(new Date(p.paymentDate), 'MMM d, yyyy')}</td>
                    <td className="p-4 font-medium">{p.booking?.bookingNumber}</td>
                    <td className="p-4 text-gray-600">{p.method}</td>
                    <td className="p-4 font-bold text-right">₹{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
