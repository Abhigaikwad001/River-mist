'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Package {
  id: number;
  name: string;
  priceAdult: number;
  priceChild: number;
  description: string;
}

export function PackageSelection({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { type, packageId, setPackage } = useBookingStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        <p className="text-[#1E3F20] font-serif">Loading available packages...</p>
      </div>
    );
  }

  if (packages.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <p className="text-[#1E3F20] font-serif text-lg">No packages currently available for this experience type.</p>
        <button onClick={onBack} className="text-[#D4AF37] underline text-sm">Go back and select another date/type</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Choose your experience</h2>
        <p className="text-sm text-gray-500 font-light">Select a package that best fits your needs.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {packages.map((pkg, index) => (
          <label key={pkg.id} className="block cursor-pointer group">
            <input 
              type="radio" 
              className="peer sr-only" 
              name="package" 
              checked={packageId === pkg.id} 
              onChange={() => setPackage(pkg.id)} 
            />
            <div className="p-5 border border-gray-200 rounded-2xl hover:border-[#D4AF37] peer-checked:border-[#D4AF37] peer-checked:bg-[#FAF9F6] transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md peer-checked:shadow-lg">
              
              {/* Highlight ribbon for the second package (typically Premium) */}
              {index === 1 && (
                <div className="absolute top-4 -right-10 bg-[#D4AF37] text-white text-[9px] font-bold uppercase tracking-widest py-1 px-10 rotate-45">
                  Popular
                </div>
              )}

              {packageId === pkg.id && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37]" />
              )}
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${packageId === pkg.id ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300 group-hover:border-[#D4AF37]'}`}>
                    {packageId === pkg.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <h3 className="font-serif text-lg md:text-xl font-bold text-[#1E3F20]">{pkg.name}</h3>
                </div>
                
                <div className="flex gap-4 md:text-right w-full md:w-auto pl-8 md:pl-0">
                  <div>
                    <span className="block font-bold text-lg text-[#1E3F20]">₹{pkg.priceAdult}</span>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-widest">Adult</span>
                  </div>
                  {pkg.priceChild > 0 && (
                    <div>
                      <span className="block font-bold text-lg text-gray-600">₹{pkg.priceChild}</span>
                      <span className="block text-[10px] text-gray-400 uppercase tracking-widest">Child</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 font-light leading-relaxed pl-8">{pkg.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-3 pt-6">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={onNext}
          disabled={!packageId}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
