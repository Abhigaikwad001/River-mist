'use client';
import { useBookingStore } from '@/store/useBookingStore';
import { Calendar, Users, Loader2, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useState, useEffect } from 'react';

export function Summary({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { date, type, headCountAdult, headCountChild, packageId, activityIds } = useBookingStore();
  const [error, setError] = useState('');
  const [pkg, setPkg] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!packageId) return;
      try {
        setLoading(true);
        // Fetch package
        const pkgRes = await api.get(`/packages/${packageId}`);
        setPkg(pkgRes.data);

        // Fetch selected activities if any
        if (activityIds.length > 0) {
          const actsRes = await Promise.all(
            activityIds.map(id => api.get(`/activities/${id}`))
          );
          setActivities(actsRes.map(res => res.data));
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error('Failed to fetch summary data:', err);
        setError('Failed to load summary details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [packageId, activityIds]);

  // Calculate totals
  const packageTotal = pkg ? (pkg.priceAdult * headCountAdult) + (pkg.priceChild * headCountChild) : 0;
  
  let activitiesTotal = 0;
  activities.forEach(act => {
    if (act.pricingType === 'PER_PERSON') {
      activitiesTotal += (act.price * (headCountAdult + headCountChild));
    } else {
      activitiesTotal += act.price;
    }
  });

  const totalAmount = packageTotal + activitiesTotal;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        <p className="text-[#1E3F20] font-serif">Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Review Your Booking</h2>
        <p className="text-sm text-gray-500 font-light mt-1">Please confirm your details before providing guest information.</p>
      </div>
        
      <div className="bg-[#FAF9F6] p-6 md:p-8 rounded-3xl border border-[#D4AF37]/30 shadow-inner space-y-6 relative">
        {/* Receipt Edge Decoration */}
        <div className="absolute top-0 left-4 right-4 h-2 flex justify-around opacity-20">
          {[...Array(20)].map((_, i) => <div key={i} className="w-2 h-2 rounded-b-full bg-[#1E3F20]"></div>)}
        </div>

        <div className="flex items-center justify-between pb-5 border-b border-[#D4AF37]/20 pt-2">
          <div className="flex items-center gap-4 text-[#1E3F20]">
            <div className="p-2.5 bg-white rounded-full shadow-sm"><Calendar className="w-5 h-5 text-[#D4AF37]" /></div>
            <div>
              <span className="block font-serif font-bold text-lg">{date?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-[#D4AF37]">{type.replace(/_/g, ' ')} Experience</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-[#1E3F20] pb-5 border-b border-[#D4AF37]/20">
          <div className="p-2.5 bg-white rounded-full shadow-sm"><Users className="w-5 h-5 text-[#D4AF37]" /></div>
          <span className="font-medium text-md">{headCountAdult} Adults{headCountChild > 0 ? `, ${headCountChild} Children` : ''}</span>
        </div>

        <div className="pt-2 space-y-4">
          <h4 className="font-serif font-bold text-xl text-[#1E3F20]">{pkg?.name}</h4>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex justify-between text-gray-600 items-center text-sm">
              <span>Adult Ticket ({headCountAdult} × ₹{pkg?.priceAdult})</span>
              <span className="font-medium">₹{pkg?.priceAdult * headCountAdult}</span>
            </div>
            {headCountChild > 0 && (
              <div className="flex justify-between text-gray-600 items-center text-sm">
                <span>Child Ticket ({headCountChild} × ₹{pkg?.priceChild})</span>
                <span className="font-medium">₹{pkg?.priceChild * headCountChild}</span>
              </div>
            )}
          </div>
        </div>

        {activities.length > 0 && (
          <div className="pt-2 space-y-4 border-t border-[#D4AF37]/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="font-serif font-bold text-lg text-[#1E3F20]">Optional Activities</h4>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              {activities.map((act) => {
                const isPerPerson = act.pricingType === 'PER_PERSON';
                const count = isPerPerson ? (headCountAdult + headCountChild) : 1;
                const cost = isPerPerson ? act.price * count : act.price;
                return (
                  <div key={act.id} className="flex justify-between text-gray-600 items-start text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="block font-medium text-gray-800">{act.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {isPerPerson ? `${count} × ₹${act.price} (Per Person)` : 'Fixed Price'}
                      </span>
                    </div>
                    <span className="font-medium pt-1">₹{cost}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-5 border-t border-dashed border-[#D4AF37] flex justify-between items-end">
          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
          <span className="text-3xl font-serif font-bold text-[#1E3F20]">₹{totalAmount}</span>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center font-medium">{error}</div>}

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onBack}
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          onClick={onNext}
          disabled={!!error}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 flex justify-center items-center shadow-xl hover:shadow-2xl"
        >
          Confirm Details
        </button>
      </div>
    </div>
  );
}
