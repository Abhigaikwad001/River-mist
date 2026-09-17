'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday, addMonths, subMonths, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Tent, Wine, Clock, Phone, Mail, MapPin } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());


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

  const getEventTypeStyle = (type: string) => {
    switch(type) {
      case 'WEDDING': return { bg: 'bg-fuchsia-50', border: 'border-fuchsia-500', text: 'text-fuchsia-700' };
      case 'DESTINATION_WEDDING': return { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' };
      case 'CORPORATE_RETREAT': return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' };
      case 'DAY_VISIT': return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' };
      case 'OVERNIGHT_STAY': return { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-700' };
    }
  };

  const selectedDayBookings = getBookingsForDay(selectedDate);
  const totalGuestsForDay = selectedDayBookings.reduce((sum, b) => sum + b.headCountAdult + b.headCountChild, 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Calendar & Daily Roster</h1>
          <p className="text-gray-600 mt-1">Manage schedules, events, and daily operational capacity.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-semibold w-48 text-center text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 overflow-y-auto auto-rows-[minmax(120px,1fr)]">
            {daysInMonth.map((day, i) => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 border-b border-r border-gray-100 overflow-hidden cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'bg-gray-50/50' : 'hover:bg-gray-50'} 
                    ${isSelected ? 'ring-2 ring-inset ring-[#1E3F20] bg-green-50/20' : ''}`}
                  style={i === 0 ? { gridColumnStart: day.getDay() + 1 } : {}}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday(day) ? 'bg-[#D4AF37] text-white' : isSelected ? 'bg-[#1E3F20] text-white' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-md font-bold">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 overflow-y-auto max-h-[80px] scrollbar-thin">
                    {dayBookings.map((b) => {
                      const style = getEventTypeStyle(b.type);
                      return (
                        <div 
                          key={b.id} 
                          className={`text-xs px-2 py-1 rounded truncate border-l-2 ${style.bg} ${style.border} ${style.text}`}
                          title={`${b.user?.name || 'Guest'} - ${b.headCountAdult + b.headCountChild} pax`}
                        >
                          <span className="font-semibold">{b.user?.name?.split(' ')[0] || 'Guest'}</span> ({b.headCountAdult + b.headCountChild})
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Roster Sidebar */}
        <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden shrink-0">
          <div className="p-5 border-b border-gray-100 bg-gray-50 shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">Daily Roster</h3>
            <p className="text-sm text-gray-500 font-medium">{format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
            
            <div className="mt-4 flex items-center gap-4 text-sm bg-white p-3 rounded-lg border">
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Total Guests</span>
                <span className="font-semibold text-lg text-[#1E3F20] flex items-center gap-1">
                  <Users className="w-4 h-4" /> {totalGuestsForDay}
                </span>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Events</span>
                <span className="font-semibold text-lg text-gray-800 flex items-center gap-1">
                  <Tent className="w-4 h-4" /> {selectedDayBookings.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selectedDayBookings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Clock className="w-12 h-12 mb-3 text-gray-300" />
                <p>No bookings or events scheduled.</p>
              </div>
            ) : (
              selectedDayBookings.map(b => (
                <div key={b.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className={`px-4 py-2 border-b flex justify-between items-center ${getEventTypeStyle(b.type).bg}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${getEventTypeStyle(b.type).text}`}>
                      {b.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{b.bookingNumber}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{b.user?.name || 'Guest User'}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.user?.phone || 'N/A'}</span>
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {b.user?.email}</span>
                        </div>
                      </div>
                      <div className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <Users className="w-4 h-4" />
                        {b.headCountAdult + b.headCountChild}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-800 mb-1">{b.package?.name}</div>
                      <div className="flex gap-2 flex-wrap">
                        {b.activities?.map((ba: any) => (
                          <span key={ba.activityId} className="text-xs bg-[#1E3F20]/10 text-[#1E3F20] px-2 py-0.5 rounded-full">
                            {ba.activity?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
