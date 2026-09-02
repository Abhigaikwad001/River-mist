'use client';

import React from 'react';

export default function SettingsManagement() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-[#1E3F20]">Platform Settings</h1>
        <button className="bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
        {/* General Settings */}
        <section>
          <h2 className="text-xl font-medium text-gray-900 mb-4 pb-2 border-b">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resort Name</label>
              <input type="text" defaultValue="River Mist Resort" className="w-full px-4 py-2 border rounded-lg focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" defaultValue="hello@rivermist.com" className="w-full px-4 py-2 border rounded-lg focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input type="text" defaultValue="+91 98765 43210" className="w-full px-4 py-2 border rounded-lg focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className="w-full px-4 py-2 border rounded-lg focus:ring-[#1E3F20] focus:border-[#1E3F20]">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Payment Settings */}
        <section>
          <h2 className="text-xl font-medium text-gray-900 mb-4 pb-2 border-b">Payment Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Razorpay Key ID</label>
              <input type="text" placeholder="rzp_live_..." className="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Razorpay Key Secret</label>
              <input type="password" placeholder="••••••••••••••••" className="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment Required (%)</label>
              <input type="number" defaultValue="50" className="w-full px-4 py-2 border rounded-lg focus:ring-[#1E3F20] focus:border-[#1E3F20]" />
              <p className="text-xs text-gray-500 mt-1">Percentage of total amount required to confirm a booking.</p>
            </div>
          </div>
        </section>

        {/* Email Notification Settings */}
        <section>
          <h2 className="text-xl font-medium text-gray-900 mb-4 pb-2 border-b">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-[#1E3F20] rounded focus:ring-[#1E3F20]" />
              <span className="text-gray-700">Email Admin on New Booking</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-[#1E3F20] rounded focus:ring-[#1E3F20]" />
              <span className="text-gray-700">Email Admin on Custom Quote Request</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-[#1E3F20] rounded focus:ring-[#1E3F20]" />
              <span className="text-gray-700">Send Payment Reminders to Customers</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
