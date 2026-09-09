'use client';
import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { buildWeddingQuoteWhatsAppUrl } from '@/lib/config';

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
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#1E3F20] mb-2">Request Received!</h1>
        <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-4">
          Wedding & Special Event Enquiry Registered
        </p>
        <p className="text-gray-600 max-w-md mx-auto mb-6 text-sm leading-relaxed font-light">
          Thank you for considering River Mist for your celebration. Our events manager will review your date ({formData.eventDate || 'flexible'}) and guest count ({formData.guestCount} guests), then contact you within 24 hours with a customized quotation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md w-full">
          <a 
            href={buildWeddingQuoteWhatsAppUrl({
              quoteNumber: 'Pending Review',
              guestName: formData.name,
              guestPhone: formData.phone,
              eventDate: formData.eventDate,
              guestCount: formData.guestCount,
              notes: formData.notes
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-[#25D366] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#1EBE5D] transition-colors inline-flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare size={16} /> Connect on WhatsApp Concierge
          </a>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3.5 border border-gray-300 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 md:p-12 rounded-3xl shadow-lg border border-[#D4AF37]/30">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1E3F20] mb-2">
            Request a Wedding Quote
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold block mb-3">
            Wedding & Special Event Enquiry
          </p>
          <p className="text-gray-600 text-xs sm:text-sm font-light max-w-lg mx-auto leading-relaxed">
            Please share your planned event details below. Our events team will review venue availability and curate a customized proposal for you.
          </p>
        </div>

        {/* Informative notice */}
        <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/80 text-[#1E3F20] rounded-2xl text-xs flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Bespoke Planning:</strong> This enquiry registers your interest. No payment is collected at this stage. You will receive an itemized proposal including lawns, banquet, catering, and accommodation.
          </p>
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
              <label htmlFor="wedding-name" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="wedding-name"
                name="name"
                required
                type="text"
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
                placeholder="John & Jane Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="wedding-email" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="wedding-email"
                name="email"
                required
                type="email"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="wedding-phone" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
                WhatsApp / Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="wedding-phone"
                name="phone"
                required
                type="tel"
                autoComplete="tel"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
              <p className="text-[10px] text-gray-500">We will send your proposal & venue brochure via WhatsApp.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="wedding-date" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
                Preferred Event Date <span className="text-red-500">*</span>
              </label>
              <input
                id="wedding-date"
                name="eventDate"
                required
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
                value={formData.eventDate}
                onChange={e => setFormData({...formData, eventDate: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label htmlFor="wedding-guests" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
                Estimated Guest Count <span className="text-red-500">*</span>
              </label>
              <input
                id="wedding-guests"
                name="guestCount"
                required
                type="number"
                min="50"
                max="1000"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. 300"
                value={formData.guestCount}
                onChange={e => setFormData({...formData, guestCount: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-gray-700 tracking-wider">Ceremonies & Events Planned</label>
            <div className="flex flex-wrap gap-2.5">
              {['Haldi', 'Mehendi', 'Sangeet', 'Wedding Ceremony', 'Reception'].map((event) => (
                <label
                  key={event}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-full cursor-pointer transition-colors text-xs font-semibold ${
                    formData.events.includes(event)
                      ? 'bg-[#1E3F20] text-white border-[#1E3F20]'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.events.includes(event)}
                    onChange={() => handleEventToggle(event)}
                  />
                  <span>{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="wedding-notes" className="text-xs uppercase font-bold text-gray-700 tracking-wider">
              Specific Requirements / Enquiries
            </label>
            <textarea
              id="wedding-notes"
              name="notes"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-sm"
              placeholder="Accommodation needs, pure veg / Maharashtrian catering preferences, special decor themes..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#2A522C] disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-300 shadow-lg"
          >
            {loading ? (
              'Submitting Request...'
            ) : (
              <>
                <Send size={16} className="text-[#D4AF37]" />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
