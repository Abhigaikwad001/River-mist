'use client';
import { useState } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export function GuestSelection({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { date, type, headCountAdult, headCountChild, setGuests } = useBookingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!date) return;
    setLoading(true);
    setError('');

    try {
      // Check availability now that we have Type, Date, and Guest Count
      const response = await api.post('/bookings/check-availability', {
        date: date.toISOString(),
        type,
        guests: headCountAdult + headCountChild
      });

      if (response.data && response.data.available !== false) { 
        onNext();
      } else {
        setError(response.data.message || 'Not enough capacity available for the selected date and guest count.');
      }
    } catch (err: any) {
      console.error('Failed to check capacity:', err);
      setError(err.response?.data?.message || 'Failed to check availability. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Who is coming?</h2>
        <p className="text-sm text-gray-500 font-light">Enter the number of adults and children.</p>
      </div>

      <div className="max-w-sm mx-auto space-y-6 py-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-[#1E3F20]" />
            </div>
            <div>
              <p className="font-bold text-[#1E3F20]">Adults</p>
              <p className="text-xs text-gray-500">12+ years</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setGuests(Math.max(1, headCountAdult - 1), headCountChild)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors bg-white"
            >
              -
            </button>
            <span className="w-6 text-center font-bold text-lg">{headCountAdult}</span>
            <button 
              onClick={() => setGuests(headCountAdult + 1, headCountChild)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors bg-white"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-bold text-[#1E3F20]">Children</p>
              <p className="text-xs text-gray-500">3-12 years</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setGuests(headCountAdult, Math.max(0, headCountChild - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors bg-white"
            >
              -
            </button>
            <span className="w-6 text-center font-bold text-lg">{headCountChild}</span>
            <button 
              onClick={() => setGuests(headCountAdult, headCountChild + 1)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors bg-white"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium text-center">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={handleNext}
          disabled={loading || headCountAdult < 1}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Checking...
            </>
          ) : (
            'Continue to Activities'
          )}
        </button>
      </div>
    </div>
  );
}
