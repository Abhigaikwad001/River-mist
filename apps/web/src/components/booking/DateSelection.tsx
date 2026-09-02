'use client';
import { useBookingStore } from '@/store/useBookingStore';
import { Calendar } from 'lucide-react';

export function DateSelection({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { date, setDate } = useBookingStore();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(new Date(e.target.value));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">When are you visiting?</h2>
        <p className="text-sm text-gray-500 font-light">Select your preferred date for the experience.</p>
      </div>

      <div className="space-y-2 py-8">
        <div className="relative group max-w-sm mx-auto">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            onChange={handleDateChange}
            value={date ? date.toISOString().split('T')[0] : ''}
            className="w-full pl-12 pr-4 py-4 text-base bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all cursor-pointer font-medium text-gray-700 hover:border-[#D4AF37]"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={onNext}
          disabled={!date}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
        >
          Continue to Guests
        </button>
      </div>
    </div>
  );
}
