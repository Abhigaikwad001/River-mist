'use client';

import React from 'react';
import { Shield, CreditCard, Clock } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function PoliciesPage() {
  const { getText } = useSiteContent('POLICIES');

  const checkinText = getText(
    'policies.checkin',
    'Standard check-in time is 12:00 PM. Standard check-out time is 10:00 AM. Early check-in and late check-out are subject to availability. Government-issued ID is mandatory for all guests upon arrival.'
  );
  const cancellationText = getText(
    'policies.cancellation',
    'A 100% advance is required for day outings to secure your booking. Weddings and large events require a 25% non-refundable advance. Cancellations made 7 days prior receive a 50% refund.'
  );
  const guidelinesText = getText(
    'policies.guidelines',
    'Outside food and beverages (especially alcohol) are strictly prohibited on the premises. River Mist is a family-friendly environment. Swimming pool usage requires proper swimwear.'
  );

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
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{checkinText}</p>
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
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{cancellationText}</p>
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
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{guidelinesText}</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

