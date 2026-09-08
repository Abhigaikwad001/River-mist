'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { WHATSAPP_BOOKING_NUMBER } from '@/lib/config';

export default function ContactPage() {
  const { getText } = useSiteContent('CONTACT');

  const phoneText = getText('contact.phone', '+91 9322759343');
  const emailText = getText('contact.email', 'info@rivermist.in / bookings@rivermist.in');
  const addressText = getText('contact.address', 'River Road, Agro Valley, Maharashtra, India');
  const hoursText = getText('contact.hours', 'Mon - Sun: 9:00 AM to 6:00 PM');

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24">
      <section className="px-6 md:px-20 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-6">Get in Touch</h1>
        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Whether you're planning a grand wedding, a corporate retreat, or a relaxing day out, our team is here to assist you.
        </p>
      </section>

      <section className="px-6 md:px-20 max-w-5xl mx-auto mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Details */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Our Location</h3>
                <p className="text-gray-600 whitespace-pre-line">{addressText}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Phone Number</h3>
                <p className="text-gray-600 whitespace-pre-line">{phoneText}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">WhatsApp Concierge</h3>
                <a 
                  href={`https://wa.me/${WHATSAPP_BOOKING_NUMBER}?text=${encodeURIComponent('Hello River Mist, I would like to enquire about your resort.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 font-medium hover:underline inline-flex items-center gap-1.5"
                >
                  Chat on WhatsApp (+91 9322759343)
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Email Address</h3>
                <p className="text-gray-600 whitespace-pre-line">{emailText}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Working Hours</h3>
                <p className="text-gray-600 whitespace-pre-line">{hoursText}</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-serif text-[#1E3F20] mb-6">Send a Message</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] outline-none" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] outline-none" placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] outline-none" placeholder="How can we help?"></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-medium tracking-wide hover:bg-[#D4AF37] transition-colors">
                Submit
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

