'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function CapacityPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCapacity = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/capacity/availability?date=${date}`);
        setReport(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCapacity();
  }, [date]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Capacity Planning</h1>
          <p className="text-gray-600 mt-1">Check resource availability for any date.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Select Date:</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3F20]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading capacity...</div>
        ) : !report ? (
          <div className="p-8 text-center text-gray-500">No capacity data found.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Total Capacity</th>
                <th className="px-6 py-4">Booked</th>
                <th className="px-6 py-4">Remaining</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.map((r: any) => {
                const isFull = r.remaining === 0;
                const isLow = !isFull && (r.remaining / r.capacity < 0.2);
                
                return (
                  <tr key={r.resourceId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.resourceName}</td>
                    <td className="px-6 py-4 text-gray-600">{r.capacity}</td>
                    <td className="px-6 py-4 font-semibold">{r.booked}</td>
                    <td className={`px-6 py-4 font-bold ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                      {r.remaining}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isFull ? 'bg-red-100 text-red-800' : 
                        isLow ? 'bg-amber-100 text-amber-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {isFull ? 'Sold Out' : isLow ? 'Almost Full' : 'Available'}
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
  );
}
