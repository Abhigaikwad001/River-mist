'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday, addMonths, subMonths, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [currentDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(new Date(b.date), day) && b.status !== 'CANCELLED' && b.status !== 'REJECTED');
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Calendar</h1>
          <p className="text-gray-600 mt-1">View scheduled bookings and events.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-semibold w-40 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {daysInMonth.map((day, i) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div 
                key={day.toString()} 
                className={`p-2 border-b border-r border-gray-100 overflow-y-auto ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''} ${isToday(day) ? 'bg-green-50/30' : ''}`}
                style={i === 0 ? { gridColumnStart: day.getDay() + 1 } : {}}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${isToday(day) ? 'bg-[#1E3F20] text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {dayBookings.length}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 space-y-1">
                  {dayBookings.map((b) => (
                    <div 
                      key={b.id} 
                      className="text-xs px-2 py-1 rounded truncate border border-l-2"
                      style={{
                        backgroundColor: b.type === 'WEDDING' ? '#fdf4ff' : '#f0fdf4',
                        borderLeftColor: b.type === 'WEDDING' ? '#d946ef' : '#22c55e'
                      }}
                      title={`${b.user?.name || 'Guest'} - ${b.headCountAdult + b.headCountChild} pax`}
                    >
                      {b.user?.name?.split(' ')[0] || 'Guest'} ({b.headCountAdult + b.headCountChild})
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
