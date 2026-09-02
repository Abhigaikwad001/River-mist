'use client';
import React, { useState } from 'react';
import { Users, Presentation, Music, GlassWater, ArrowRight, PartyPopper, CheckCircle, Sun, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function EventsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'CORPORATE_EVENT',
    eventDate: '',
    guestCount: 100,
    venueRequirements: '',
    foodRequirements: '',
    decorationRequirements: '',
    djMusicRequirements: '',
    photographyRequirements: '',
    specialRequirements: '',
    notes: ''
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type) {
      setFormData(prev => ({ ...prev, eventType: type }));
      // Optional: auto-scroll to form if navigating with a preselected type
      setTimeout(() => {
        document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/quotes', formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit enquiry. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen">
      
      {/* Header */}
      <div className="bg-[#1E3F20] text-white py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2000" 
            className="object-cover" 
            alt="Events" 
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="relative z-10">
          <h2 className="classic-subheading mb-4 text-[#D4AF37]">Gatherings</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">Events & Retreats</h1>
          <p className="text-xl max-w-2xl mx-auto opacity-90 font-light">
            From high-energy team building sessions to intimate birthday celebrations, River Mist is equipped to host unforgettable events.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-gray-900 mb-4">Choose Your Event Type</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select an event type below to start planning. Our team will tailor the perfect package for your gathering.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-6xl mx-auto">
          {[
            { id: 'CORPORATE_EVENT', title: 'Corporate Event', desc: 'High-energy team building, executive retreats, and professional conferences.', icon: Presentation },
            { id: 'BIRTHDAY', title: 'Birthday', desc: 'Celebrate your special day with family, friends, and nature.', icon: PartyPopper },
            { id: 'ANNIVERSARY', title: 'Anniversary', desc: 'Romantic and memorable gatherings to celebrate your journey together.', icon: GlassWater },
            { id: 'SCHOOL_COLLEGE_PICNIC', title: 'School/College Picnic', desc: 'Safe, fun, and engaging outdoor activities for students of all ages.', icon: Users },
            { id: 'FAMILY_DAY_OUT', title: 'Family Day Out', desc: 'Reconnect with your loved ones in a peaceful, natural setting.', icon: Sun },
            { id: 'OTHER_EVENT', title: 'Other', desc: 'Custom events tailored completely to your unique vision and requirements.', icon: Sparkles }
          ].map((event) => (
            <div key={event.id} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#1E3F20]/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
              
              <div className="w-14 h-14 bg-[#1E3F20]/10 rounded-2xl flex items-center justify-center text-[#1E3F20] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <event.icon size={28} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">{event.title}</h3>
              <p className="text-gray-600 text-sm flex-1 mb-8 leading-relaxed">
                {event.desc}
              </p>
              
              <button 
                onClick={() => {
                  setFormData(prev => ({ ...prev, eventType: event.id }));
                  document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="text-[#1E3F20] font-bold flex items-center gap-2 hover:gap-3 transition-all mt-auto uppercase tracking-wider text-xs"
              >
                Plan Your Event <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Enquiry Form Section */}
      <section id="enquiry" className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1E3F20]/10 text-[#1E3F20] mb-6">
              <PartyPopper size={32} />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-[#1E3F20] mb-4">Request Event Quote</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ready to start planning? Tell us about your vision, and our events team will create a custom quotation for you.
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#FAF9F6] p-12 rounded-2xl shadow-xl text-center border border-gray-100">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-serif text-[#1E3F20] mb-4">Request Received!</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Thank you for considering River Mist. Our events team is reviewing your requirements and will get back to you with a detailed quotation shortly.
              </p>
              <button onClick={() => setSubmitted(false)} className="text-[#1E3F20] font-medium hover:underline">
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#FAF9F6] p-8 md:p-12 rounded-2xl shadow-xl border border-gray-100">
              <div className="mb-10">
                <h3 className="text-xl font-bold mb-6 pb-2 border-b">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input required name="name" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input required type="email" name="email" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input required type="tel" name="phone" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Event Date</label>
                    <input required type="date" name="eventDate" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Event Type</label>
                    <select name="eventType" onChange={handleChange} value={formData.eventType} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]">
                      <option value="CORPORATE_EVENT">Corporate Event</option>
                      <option value="BIRTHDAY">Birthday</option>
                      <option value="ANNIVERSARY">Anniversary</option>
                      <option value="SCHOOL_COLLEGE_PICNIC">School/College Picnic</option>
                      <option value="FAMILY_DAY_OUT">Family Day Out</option>
                      <option value="OTHER_EVENT">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Guest Count</label>
                    <input required type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-bold mb-6 pb-2 border-b">Event Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Venue Preferences</label>
                    <input name="venueRequirements" placeholder="e.g. AC Conference Hall, Open Lawn" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Food & Catering</label>
                    <input name="foodRequirements" placeholder="e.g. Vegetarian Buffet, Hi-Tea" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Decoration</label>
                    <input name="decorationRequirements" placeholder="e.g. Balloons, Themed Setup" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">DJ & Music</label>
                    <input name="djMusicRequirements" placeholder="e.g. DJ required, Soft Music" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Photography</label>
                    <input name="photographyRequirements" placeholder="e.g. Event Photographer" onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Special Requirements & Notes</label>
                    <textarea name="notes" rows={4} placeholder="Any other details..." onChange={handleChange} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[#1E3F20] text-white text-lg font-bold rounded-lg hover:bg-[#2A522C] transition-colors shadow-lg">
                Send Enquiry
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
