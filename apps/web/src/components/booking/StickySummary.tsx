'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Calendar, Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export function StickySummary() {
  const { date, type, headCountAdult, headCountChild, packageId, activityIds } = useBookingStore();
  const [pkg, setPkg] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!packageId) {
        setPkg(null);
        setActivities([]);
        return;
      }
      
      try {
        setLoading(true);
        const pkgRes = await api.get(`/packages/${packageId}`);
        setPkg(pkgRes.data);

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

  return (
    <div className="bg-[#FAF9F6] p-6 rounded-3xl border border-[#D4AF37]/30 shadow-md sticky top-24">
      <h3 className="font-serif text-xl text-[#1E3F20] font-bold mb-4 border-b border-gray-200 pb-3">Your Booking</h3>
      
      <div className="space-y-4">
        {/* Date */}
        {date ? (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#D4AF37] mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#1E3F20]">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{type.replace(/_/g, ' ')}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No date selected</p>
        )}

        {/* Guests */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-[#D4AF37] mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#1E3F20]">{headCountAdult} Adults{headCountChild > 0 ? `, ${headCountChild} Children` : ''}</p>
          </div>
        </div>

        {/* Package */}
        <div className="pt-3 border-t border-gray-200">
          {packageId && pkg ? (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-[#1E3F20]">{pkg.name}</span>
              <span className="font-bold text-[#1E3F20]">₹{packageTotal}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No package selected</p>
          )}
        </div>

        {/* Activities */}
        {activities.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase">Add-ons</p>
            {activities.map(act => {
              const isPerPerson = act.pricingType === 'PER_PERSON';
              const cost = isPerPerson ? act.price * (headCountAdult + headCountChild) : act.price;
              return (
                <div key={act.id} className="flex justify-between text-xs text-gray-600">
                  <span className="truncate pr-2">{act.name}</span>
                  <span className="font-medium whitespace-nowrap">₹{cost}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Total */}
        <div className="pt-4 border-t border-[#D4AF37]/30 flex justify-between items-end mt-4">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total</span>
          <div className="text-right">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
            ) : (
              <span className="text-2xl font-serif font-bold text-[#1E3F20]">₹{totalAmount}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
