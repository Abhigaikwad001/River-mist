import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
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
                <p className="text-gray-600">River Road, Agro Valley<br />Maharashtra, India</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Phone Number</h3>
                <p className="text-gray-600">+91 9322759343<br />+91 9876543210</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Email Address</h3>
                <p className="text-gray-600">info@rivermist.in<br />bookings@rivermist.in</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3F20] mb-1">Working Hours</h3>
                <p className="text-gray-600">Mon - Sun: 9:00 AM to 6:00 PM</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-serif text-[#1E3F20] mb-6">Send a Message</h2>
            <form className="space-y-4">
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
              <button type="button" className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-medium tracking-wide hover:bg-[#D4AF37] transition-colors">
                Submit
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
