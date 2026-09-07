'use client';

import React, { useEffect, useState } from 'react';
import { Users, Presentation, Music, GlassWater, ArrowRight, PartyPopper, CheckCircle, Sun, Sparkles, Calendar, Clock, MapPin, Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { format } from 'date-fns';
import { buildWhatsAppMessageUrl } from '@/lib/config';

export default function EventsPage() {
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
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

  useEffect(() => {
    fetchScheduledEvents();

    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type) {
      setFormData(prev => ({ ...prev, eventType: type }));
      setTimeout(() => {
        document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  const fetchScheduledEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await api.get('/events?activeOnly=true');
      setScheduledEvents(res.data);
    } catch (err) {
      console.error('Failed to load scheduled events:', err);
      setScheduledEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/quotes', formData);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit quote enquiry:', err);
      alert('Failed to submit enquiry. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWhatsAppEnquiry = (eventItem: any) => {
    const dateStr = eventItem.eventDate ? format(new Date(eventItem.eventDate), 'dd MMMM yyyy') : 'Upcoming';
    const waUrl = buildWhatsAppMessageUrl({
      bookingNumber: `EVT-${eventItem.id}`,
      packageName: `Scheduled Event: ${eventItem.title}`,
      dateStr,
      headCountAdult: 1,
      headCountChild: 0,
      guestName: 'Guest',
      guestPhone: '',
      totalAmount: eventItem.price || 0
    });
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen">
      
      {/* 1. Header */}
      <div className="bg-[#1E3F20] text-white py-28 px-4 text-center relative overflow-hidden">
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
          <h2 className="classic-subheading mb-3 text-[#D4AF37]">Gatherings & Festivities</h2>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">Events & Retreats</h1>
          <p className="text-lg max-w-2xl mx-auto opacity-90 font-light">
            From seasonal farm carnivals to bespoke corporate retreats, River Mist is equipped to host unforgettable events in nature.
          </p>
        </div>
      </div>

      {/* 2. Scheduled Resort Events Section */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex items-center justify-between mb-8 border-b border-[#D4AF37]/30 pb-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-[#1E3F20]">Upcoming Resort Events</h2>
            <p className="text-gray-600 text-sm mt-1">Scheduled seasonal festivals and special gatherings at River Mist.</p>
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif text-sm">Loading upcoming events...</p>
          </div>
        ) : scheduledEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-10 text-center shadow-sm max-w-2xl mx-auto">
            <Calendar className="w-12 h-12 text-[#D4AF37] mx-auto mb-3 opacity-60" />
            <h3 className="text-xl font-serif font-bold text-[#1E3F20] mb-2">No Upcoming Events Scheduled</h3>
            <p className="text-gray-600 text-sm font-light">Check back soon for new seasonal experiences at River Mist or submit a private event enquiry below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scheduledEvents.map((evt) => (
              <div key={evt.id} className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                <div>
                  <div className="h-48 relative bg-gray-100">
                    {(evt.media?.url || evt.image) ? (
                      <Image 
                        src={evt.media?.url || evt.image} 
                        alt={evt.media?.altText || evt.title} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#1E3F20]/10 flex items-center justify-center text-[#1E3F20]">
                        <Calendar size={40} className="opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-[#1E3F20] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-widest shadow-md">
                      {evt.status || 'PUBLISHED'}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-2xl font-serif font-bold text-[#1E3F20] mb-3">{evt.title}</h3>
                    
                    <div className="space-y-2 text-xs text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#D4AF37]" />
                        <span>{evt.eventDate ? format(new Date(evt.eventDate), 'PPP') : 'TBD'}</span>
                      </div>
                      {evt.startTime && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-[#D4AF37]" />
                          <span>{evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}</span>
                        </div>
                      )}
                      {evt.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-[#D4AF37]" />
                          <span>{evt.location}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-3 font-light leading-relaxed mb-4">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 mt-auto border-t border-gray-100 flex items-center justify-between pt-4">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Entry / Ticket</span>
                    <span className="text-lg font-bold text-[#1E3F20]">
                      {evt.price > 0 ? `₹${evt.price.toLocaleString('en-IN')}` : 'Included / Free'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleWhatsAppEnquiry(evt)}
                    className="inline-flex items-center gap-1.5 bg-[#1E3F20] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-colors shadow-sm"
                  >
                    Enquire <MessageSquare size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Event Types Overview */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-gray-900 mb-3">Host a Private or Corporate Gathering</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm">
            Select an event type below to submit your requirements. Our events team will tailor the perfect quotation for your group.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-6xl mx-auto">
          {[
            { id: 'CORPORATE_EVENT', title: 'Corporate Event', desc: 'High-energy team building, executive retreats, and professional conferences.', icon: Presentation },
            { id: 'BIRTHDAY', title: 'Birthday', desc: 'Celebrate your special day with family, friends, and nature.', icon: PartyPopper },
            { id: 'ANNIVERSARY', title: 'Anniversary', desc: 'Romantic and memorable gatherings to celebrate your journey together.', icon: GlassWater },
            { id: 'SCHOOL_COLLEGE_PICNIC', title: 'School/College Picnic', desc: 'Safe, fun, and engaging outdoor activities for students of all ages.', icon: Users },
            { id: 'FAMILY_DAY_OUT', title: 'Family Day Out', desc: 'Reconnect with your loved ones in a peaceful, natural setting.', icon: Sun },
            { id: 'OTHER_EVENT', title: 'Other Event', desc: 'Custom events tailored completely to your unique vision and requirements.', icon: Sparkles }
          ].map((event) => (
            <div key={event.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden">
              <div className="w-12 h-12 bg-[#1E3F20]/10 rounded-2xl flex items-center justify-center text-[#1E3F20] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <event.icon size={26} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">{event.title}</h3>
              <p className="text-gray-600 text-sm flex-1 mb-6 leading-relaxed font-light">
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

      {/* 4. Quote Enquiry Form */}
      <section id="enquiry" className="bg-white py-20 px-6 border-t border-[#D4AF37]/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1E3F20]/10 text-[#1E3F20] mb-4">
              <PartyPopper size={28} />
            </div>
            <h2 className="text-4xl font-serif text-[#1E3F20] mb-3">Request Event Quote</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm">
              Ready to start planning? Tell us about your vision, and our events team will create a custom quotation for you.
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#FAF9F6] p-10 rounded-2xl shadow-sm text-center border border-gray-100 max-w-lg mx-auto">
              <CheckCircle size={56} className="text-emerald-600 mx-auto mb-4" />
              <h2 className="text-2xl font-serif text-[#1E3F20] font-bold mb-3">Request Received!</h2>
              <p className="text-gray-600 mb-6 text-sm">
                Thank you for considering River Mist. Our events team is reviewing your requirements and will contact you with a detailed quotation shortly.
              </p>
              <button onClick={() => setSubmitted(false)} className="text-[#1E3F20] font-bold text-xs uppercase tracking-wider hover:underline">
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#FAF9F6] p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1E3F20] mb-4 pb-2 border-b">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Full Name</label>
                    <input required name="name" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Email Address</label>
                    <input required type="email" name="email" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Phone Number</label>
                    <input required type="tel" name="phone" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Event Date</label>
                    <input required type="date" name="eventDate" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Event Type</label>
                    <select name="eventType" onChange={handleChange} value={formData.eventType} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                      <option value="CORPORATE_EVENT">Corporate Event</option>
                      <option value="BIRTHDAY">Birthday</option>
                      <option value="ANNIVERSARY">Anniversary</option>
                      <option value="SCHOOL_COLLEGE_PICNIC">School/College Picnic</option>
                      <option value="FAMILY_DAY_OUT">Family Day Out</option>
                      <option value="OTHER_EVENT">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Estimated Guest Count</label>
                    <input required type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1E3F20] mb-4 pb-2 border-b">Requirements & Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Venue Preferences</label>
                    <input name="venueRequirements" placeholder="e.g. AC Conference Hall, Open Lawn" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Food & Catering</label>
                    <input name="foodRequirements" placeholder="e.g. Vegetarian Buffet, Hi-Tea" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Decoration Setup</label>
                    <input name="decorationRequirements" placeholder="e.g. Balloons, Stage Setup" onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Special Requirements & Notes</label>
                    <textarea name="notes" rows={3} placeholder="Any other details..." onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-[#1E3F20] text-white font-bold rounded-xl hover:bg-[#2A522C] transition-colors shadow-md uppercase tracking-wider text-xs">
                Send Quote Request
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
