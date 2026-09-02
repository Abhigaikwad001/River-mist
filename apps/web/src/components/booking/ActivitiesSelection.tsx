'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Activity {
  id: number;
  name: string;
  description: string;
  price: number;
  pricingType: string;
}

export function ActivitiesSelection({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { activityIds, toggleActivity } = useBookingStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/activities?activeOnly=true');
        setActivities(response.data);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setError('Unable to load activities at this time.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Enhance Your Experience</h2>
        <p className="text-sm text-gray-500 font-light">Select optional activities to add to your booking.</p>
      </div>

      <div className="pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <p className="text-gray-500 text-sm">No optional activities available right now.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((act) => {
              const isSelected = activityIds.includes(act.id);
              return (
                <label key={act.id} className="block cursor-pointer group">
                  <div className={`p-4 border rounded-2xl transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md ${
                    isSelected ? 'border-[#D4AF37] bg-[#FAF9F6] shadow-lg' : 'border-gray-200 hover:border-[#D4AF37]'
                  }`}>
                    {isSelected && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37]" />
                    )}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex flex-shrink-0 items-center justify-center transition-colors ${
                          isSelected ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300 group-hover:border-[#D4AF37]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <h3 className="font-serif text-base font-bold text-[#1E3F20]">{act.name}</h3>
                      </div>
                      
                      <div className="flex gap-4 sm:text-right w-full sm:w-auto pl-8 sm:pl-0">
                        <div>
                          <span className="block font-bold text-sm text-[#1E3F20]">₹{act.price}</span>
                          <span className="block text-[9px] text-gray-500 uppercase tracking-widest">
                            {act.pricingType === 'PER_PERSON' ? 'Per Person' : act.pricingType === 'FIXED' ? 'Fixed Price' : act.pricingType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 font-light leading-relaxed pl-8">{act.description}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={isSelected} 
                    onChange={() => toggleActivity(act.id)} 
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={onNext}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs hover:bg-[#D4AF37] transition-colors duration-300 shadow-md"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
