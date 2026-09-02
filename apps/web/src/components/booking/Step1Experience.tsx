'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Check, Loader2, Calendar } from 'lucide-react';
import api from '@/lib/api';

interface Package {
  id: number;
  name: string;
  priceAdult: number;
  priceChild: number;
  description: string;
}

export function Step1Experience({ onNext }: { onNext: () => void }) {
  const { type, packageId, setPackage, date, setDate } = useBookingStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/packages?type=${type}`);
        setPackages(response.data);
      } catch (err) {
        console.error('Failed to fetch packages:', err);
        setError('Unable to load packages at this time. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPackages();
  }, [type]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(new Date(e.target.value));
  };

  const isComplete = packageId && date;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">1. Choose your experience</h2>
        <p className="text-sm text-gray-500 font-light">Select your preferred package and date.</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-sm font-bold text-[#1E3F20]">Available Packages</h3>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-6 border border-gray-100 rounded-xl">
            <p className="text-gray-500 text-sm">No packages available for this experience type.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {packages.map((pkg) => (
              <label key={pkg.id} className="block cursor-pointer group">
                <input 
                  type="radio" 
                  className="peer sr-only" 
                  name="package" 
                  checked={packageId === pkg.id} 
                  onChange={() => setPackage(pkg.id)} 
                />
                <div className="p-4 border border-gray-200 rounded-2xl hover:border-[#D4AF37] peer-checked:border-[#D4AF37] peer-checked:bg-[#FAF9F6] transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md peer-checked:shadow-lg">
                  {packageId === pkg.id && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37]" />
                  )}
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-colors ${packageId === pkg.id ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300 group-hover:border-[#D4AF37]'}`}>
                        {packageId === pkg.id && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <h3 className="font-serif text-base font-bold text-[#1E3F20]">{pkg.name}</h3>
                    </div>
                    
                    <div className="flex gap-4 sm:text-right w-full sm:w-auto pl-7 sm:pl-0">
                      <div>
                        <span className="block font-bold text-sm text-[#1E3F20]">₹{pkg.priceAdult}</span>
                        <span className="block text-[9px] text-gray-500 uppercase tracking-widest">Adult</span>
                      </div>
                      {pkg.priceChild > 0 && (
                        <div>
                          <span className="block font-bold text-sm text-gray-600">₹{pkg.priceChild}</span>
                          <span className="block text-[9px] text-gray-400 uppercase tracking-widest">Child</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-light leading-relaxed pl-7">{pkg.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-4">
        <h3 className="font-serif text-sm font-bold text-[#1E3F20]">Select Date</h3>
        <div className="relative group max-w-sm">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            onChange={handleDateChange}
            value={date ? date.toISOString().split('T')[0] : ''}
            className="w-full pl-12 pr-4 py-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all cursor-pointer font-medium text-gray-700 hover:border-[#D4AF37]"
          />
        </div>
      </div>

      <div className="pt-6">
        <button 
          onClick={onNext}
          disabled={!isComplete}
          className="w-full py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md"
        >
          Continue to Guests & Add-ons
        </button>
      </div>
    </div>
  );
}
