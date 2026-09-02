'use client';
import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export default function WeddingQuoteRequest() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    guestCount: 300,
    notes: '',
    events: [] as string[]
  });

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event) 
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const packageId = urlParams.get('packageId');

      // Append events to notes for backend simplicity
      let finalNotes = formData.events.length > 0 
        ? `Events Planned: ${formData.events.join(', ')}. \n\nAdditional Notes: ${formData.notes}`
        : formData.notes;

      if (packageId) {
        finalNotes = `[Interested in Package ID: ${packageId}]\n\n${finalNotes}`;
      }

      await api.post('/quotes', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        eventDate: formData.eventDate,
        eventType: 'WEDDING',
        guestCount: Number(formData.guestCount),
        notes: finalNotes
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Failed to submit quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
        <CheckCircle size={64} className="text-green-500 mb-6" />
        <h1 className="text-3xl font-serif text-[#1E3F20] mb-4">Request Received!</h1>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Thank you for considering River Mist for your special day. Our event manager will contact you within 24 hours with a customized quotation.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-[#1E3F20] text-white rounded-full font-medium hover:bg-[#2A522C] transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif text-[#1E3F20] mb-4">Request a Wedding Quote</h1>
          <p className="text-gray-600">Please provide the details of your dream wedding, and we will tailor a package exclusively for you.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Name</label>
              <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" placeholder="John & Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input required type="email" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <input required type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Expected Date</label>
              <input required type="date" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Estimated Guests</label>
              <input required type="number" min="50" max="1000" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" placeholder="e.g. 300" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: Number(e.target.value)})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Events Planned</label>
            <div className="flex flex-wrap gap-3">
              {['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception'].map((event) => (
                <label key={event} className={`flex items-center gap-2 px-4 py-2 border rounded-full cursor-pointer transition-colors ${formData.events.includes(event) ? 'bg-[#1E3F20] text-white border-[#1E3F20]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  <input type="checkbox" className="hidden" checked={formData.events.includes(event)} onChange={() => handleEventToggle(event)} />
                  <span className="text-sm">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Additional Requirements / Notes</label>
            <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all" placeholder="Any specific themes, catering preferences, or accommodation needs?" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-[#D4AF37] disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-300 shadow-md">
            {loading ? 'Submitting...' : (
              <>
                <Send size={18} />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
