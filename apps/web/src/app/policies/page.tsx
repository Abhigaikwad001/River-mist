import React from 'react';
import { Shield, FileText, CreditCard, Clock } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24 pb-32">
      <section className="px-6 md:px-20 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-6">Terms & Policies</h1>
        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Please review our property guidelines and cancellation policies to ensure a seamless and enjoyable experience.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6">
        <div className="space-y-12">
          
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-[#1E3F20]/5 rounded-2xl flex items-center justify-center text-[#1E3F20]">
                <Clock size={32} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#1E3F20] mb-4">Check-in & Check-out</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
                <li>Standard check-in time is <strong>12:00 PM</strong>.</li>
                <li>Standard check-out time is <strong>10:00 AM</strong>.</li>
                <li>Early check-in and late check-out are subject to availability and may incur additional charges.</li>
                <li>Government-issued ID is mandatory for all guests upon arrival.</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                <CreditCard size={32} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#1E3F20] mb-4">Payment & Cancellation</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
                <li>A 100% advance is required for day outings to secure your booking.</li>
                <li>Weddings and large events require a 25% non-refundable advance.</li>
                <li>Cancellations made 7 days prior to the event will receive a 50% refund (excluding non-refundable advances).</li>
                <li>No-shows will be charged the full amount.</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Shield size={32} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#1E3F20] mb-4">Property Guidelines</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
                <li>Outside food and beverages (especially alcohol) are strictly prohibited on the premises.</li>
                <li>River Mist is a family-friendly environment. Decorous behavior is expected in all common areas.</li>
                <li>Swimming pool usage is allowed only with proper swimwear. There is no lifeguard on duty.</li>
                <li>Damage to property or natural surroundings will result in penalty charges.</li>
              </ul>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
