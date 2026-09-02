'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Users, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';

interface Activity {
  id: number;
  name: string;
  description: string;
  price: number;
  pricingType: string;
}

export function Step2GuestsAddons({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { date, type, headCountAdult, headCountChild, setGuests, activityIds, toggleActivity } = useBookingStore();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const response = await api.get('/activities?activeOnly=true');
        setActivities(response.data);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchActivities();
  }, []);

  const handleNext = async () => {
    if (!date) return;
    setLoadingNext(true);
    setError('');

    try {
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
      setLoadingNext(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">2. Guests & Add-ons</h2>
        <p className="text-sm text-gray-500 font-light">Who is coming and what would you like to add?</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-sm font-bold text-[#1E3F20]">Number of Guests</h3>
        <div className="grid grid-cols-1 gap-4 max-w-sm">
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
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="font-serif text-sm font-bold text-[#1E3F20] mb-4">Enhance Your Experience (Optional)</h3>
        
        {loadingActivities ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6 border border-gray-100 rounded-xl bg-gray-50">
            <p className="text-gray-500 text-sm">No optional add-ons available.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
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

      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium text-center">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-6 border-t border-gray-100">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={handleNext}
          disabled={loadingNext || headCountAdult < 1}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
        >
          {loadingNext ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Checking...
            </>
          ) : (
            'Continue to Details'
          )}
        </button>
      </div>
    </div>
  );
}
