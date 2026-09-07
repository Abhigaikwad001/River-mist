'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Check, X, FileText, Plus, Trash2, Calendar, Edit, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EventsAdminPage() {
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'QUOTES'>('SCHEDULED');
  
  // Scheduled Events State
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    image: '',
    eventDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '18:00',
    location: 'River Mist Grounds',
    capacity: 100,
    price: 0,
    status: 'PUBLISHED',
    active: true,
    displayOrder: 0
  });

  // Quotes State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const router = useRouter();

  // Quote Builder State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteItems, setQuoteItems] = useState<{ category: string; description: string; amount: number }[]>([]);

  const categories = ['Venue', 'Food', 'Decoration', 'DJ', 'Photography', 'Activities', 'Other'];

  useEffect(() => {
    fetchEvents();
    fetchQuotes();
  }, []);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      setQuotesLoading(true);
      const res = await api.get('/quotes?type=event');
      setQuotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setQuotesLoading(false);
    }
  };

  // --- Scheduled Events Handlers ---
  const openAddEventModal = () => {
    setEditingEvent(null);
    setEventFormData({
      title: '',
      description: '',
      image: '',
      eventDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '18:00',
      location: 'River Mist Grounds',
      capacity: 100,
      price: 0,
      status: 'PUBLISHED',
      active: true,
      displayOrder: 0
    });
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (item: any) => {
    setEditingEvent(item);
    const dateStr = item.eventDate ? new Date(item.eventDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setEventFormData({
      title: item.title,
      description: item.description || '',
      image: item.image || '',
      eventDate: dateStr,
      startTime: item.startTime || '10:00',
      endTime: item.endTime || '18:00',
      location: item.location || 'River Mist Grounds',
      capacity: item.capacity || 0,
      price: item.price || 0,
      status: item.status || 'PUBLISHED',
      active: item.active !== false,
      displayOrder: item.displayOrder || 0
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete event');
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...eventFormData,
        eventDate: new Date(eventFormData.eventDate).toISOString(),
        capacity: eventFormData.capacity === 0 ? null : Number(eventFormData.capacity),
        price: Number(eventFormData.price),
        displayOrder: Number(eventFormData.displayOrder)
      };

      if (editingEvent) {
        await api.patch(`/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      setIsEventModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to save event');
    }
  };

  // --- Quote Handlers ---
  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/quotes/${id}/status`, { status });
      fetchQuotes();
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote({ ...selectedQuote, status });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const openQuoteBuilder = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteItems(quote.items?.length > 0 ? quote.items.map((i: any) => ({ category: i.category, description: i.description, amount: i.amount })) : []);
    setIsQuoteModalOpen(true);
  };

  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, { category: 'Venue', description: '', amount: 0 }]);
  };

  const removeQuoteItem = (index: number) => {
    const newItems = [...quoteItems];
    newItems.splice(index, 1);
    setQuoteItems(newItems);
  };

  const saveQuoteItems = async () => {
    try {
      const res = await api.patch(`/quotes/${selectedQuote.id}/items`, { items: quoteItems });
      setSelectedQuote(res.data);
      fetchQuotes();
      alert('Quote items saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save quote items');
    }
  };

  const convertQuote = async () => {
    if (!confirm('Are you sure you want to convert this quote into a booking?')) return;
    try {
      const res = await api.post(`/quotes/${selectedQuote.id}/convert`);
      alert(`Quote converted! Booking Number: ${res.data.booking.bookingNumber}`);
      setIsQuoteModalOpen(false);
      fetchQuotes();
      router.push('/admin/bookings');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to convert quote');
    }
  };

  const quoteSubtotal = quoteItems.reduce((acc, i) => acc + (i.amount || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Events & Festival Management</h1>
          <p className="text-gray-600 mt-1">Manage scheduled resort events, festivals, and custom group event quotes.</p>
        </div>
        {activeTab === 'SCHEDULED' && (
          <button onClick={openAddEventModal} className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
            <Plus size={18} /> Add Event
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('SCHEDULED')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'SCHEDULED'
              ? 'border-[#1E3F20] text-[#1E3F20]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Scheduled Resort Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('QUOTES')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'QUOTES'
              ? 'border-[#1E3F20] text-[#1E3F20]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Event Quote Enquiries ({quotes.length})
        </button>
      </div>

      {/* TAB 1: SCHEDULED EVENTS */}
      {activeTab === 'SCHEDULED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {eventsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading scheduled events...</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-[#1E3F20] rounded-lg">
                          {ev.image ? (
                            <img src={ev.image} alt={ev.title} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <Calendar size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{ev.title}</div>
                          <div className="text-xs text-gray-500 line-clamp-1 max-w-[250px]">{ev.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>{format(new Date(ev.eventDate), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-gray-500">{ev.startTime || 'All Day'} {ev.endTime ? `- ${ev.endTime}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ev.location || 'River Mist Resort'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {ev.price > 0 ? `₹${ev.price}` : 'Free / Included'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ev.capacity ? `${ev.capacity} seats` : 'Unlimited'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        ev.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                        ev.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        ev.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditEventModal(ev)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit size={18}/></button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No scheduled events found. Click "Add Event" to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: QUOTE ENQUIRIES */}
      {activeTab === 'QUOTES' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {quotesLoading ? (
            <div className="p-8 text-center text-gray-500">Loading quotes...</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                  <th className="px-6 py-4">Quote #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Guests</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{q.quoteNumber}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {q.user?.name || `User #${q.userId}`}<br/>
                      <span className="text-xs text-gray-400">{q.user?.email}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-semibold">{q.eventType}</span><br/>
                      <span className="text-xs">{format(new Date(q.eventDate), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{q.guestCount}</td>
                    <td className="px-6 py-4 font-medium">₹{q.total}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        q.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        q.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                        q.status === 'CONVERTED' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openQuoteBuilder(q)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Manage Quote">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No quotes found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SCHEDULED EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl my-8">
            <h3 className="text-xl font-serif text-[#1E3F20] font-bold mb-4">{editingEvent ? 'Edit Event' : 'Add Scheduled Event'}</h3>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Event Title</label>
                <input required type="text" value={eventFormData.title} onChange={e => setEventFormData({...eventFormData, title: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Hurda Festival 2026" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                <textarea required value={eventFormData.description} onChange={e => setEventFormData({...eventFormData, description: e.target.value})} className="w-full border p-2 rounded-lg h-20" placeholder="Event highlights and details..." />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Event Date</label>
                  <input required type="date" value={eventFormData.eventDate} onChange={e => setEventFormData({...eventFormData, eventDate: e.target.value})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Start Time</label>
                  <input type="text" value={eventFormData.startTime} onChange={e => setEventFormData({...eventFormData, startTime: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="10:00 AM" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">End Time</label>
                  <input type="text" value={eventFormData.endTime} onChange={e => setEventFormData({...eventFormData, endTime: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="06:00 PM" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Location / Venue</label>
                  <input type="text" value={eventFormData.location} onChange={e => setEventFormData({...eventFormData, location: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Riverside Lawn" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Price per Person (₹)</label>
                  <input type="number" min="0" value={eventFormData.price} onChange={e => setEventFormData({...eventFormData, price: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Capacity (0 = Unlimited)</label>
                  <input type="number" min="0" value={eventFormData.capacity} onChange={e => setEventFormData({...eventFormData, capacity: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                  <select value={eventFormData.status} onChange={e => setEventFormData({...eventFormData, status: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Display Order</label>
                  <input type="number" value={eventFormData.displayOrder} onChange={e => setEventFormData({...eventFormData, displayOrder: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Image URL</label>
                <input type="text" value={eventFormData.image} onChange={e => setEventFormData({...eventFormData, image: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C]">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUOTE MANAGEMENT MODAL */}
      {isQuoteModalOpen && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Manage Quote: {selectedQuote.quoteNumber}</h3>
              <button onClick={() => setIsQuoteModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-8">
              {/* Left Column: Requirements */}
              <div className="space-y-4">
                <h4 className="font-bold border-b pb-2">Client Requirements</h4>
                
                <div className="text-sm">
                  <span className="font-semibold text-gray-600">Event Type:</span> {selectedQuote.eventType}
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-gray-600">Event Date:</span> {format(new Date(selectedQuote.eventDate), 'PPP')}
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-gray-600">Guests:</span> {selectedQuote.guestCount}
                </div>
                
                {selectedQuote.venueRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">Venue:</span> {selectedQuote.venueRequirements}
                  </div>
                )}
                {selectedQuote.foodRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">Food:</span> {selectedQuote.foodRequirements}
                  </div>
                )}
                {selectedQuote.decorationRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">Decoration:</span> {selectedQuote.decorationRequirements}
                  </div>
                )}
                {selectedQuote.djMusicRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">DJ/Music:</span> {selectedQuote.djMusicRequirements}
                  </div>
                )}
                {selectedQuote.photographyRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">Photography:</span> {selectedQuote.photographyRequirements}
                  </div>
                )}
                {selectedQuote.specialRequirements && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-600 block">Special:</span> {selectedQuote.specialRequirements}
                  </div>
                )}
              </div>

              {/* Right Column: Quote Builder */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold">Quote Items</h4>
                  {selectedQuote.status !== 'CONVERTED' && (
                    <button onClick={addQuoteItem} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center hover:bg-gray-200">
                      <Plus size={14} className="mr-1" /> Add Line
                    </button>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {quoteItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <select 
                        value={item.category}
                        onChange={(e) => {
                          const newItems = [...quoteItems];
                          newItems[index].category = e.target.value;
                          setQuoteItems(newItems);
                        }}
                        className="p-2 border rounded-lg text-sm w-1/3"
                        disabled={selectedQuote.status === 'CONVERTED'}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      
                      <input 
                        type="text" 
                        placeholder="Description" 
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...quoteItems];
                          newItems[index].description = e.target.value;
                          setQuoteItems(newItems);
                        }}
                        className="p-2 border rounded-lg text-sm flex-1"
                        disabled={selectedQuote.status === 'CONVERTED'}
                      />
                      
                      <input 
                        type="number" 
                        placeholder="Amt" 
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...quoteItems];
                          newItems[index].amount = Number(e.target.value);
                          setQuoteItems(newItems);
                        }}
                        className="p-2 border rounded-lg text-sm w-24"
                        disabled={selectedQuote.status === 'CONVERTED'}
                      />

                      {selectedQuote.status !== 'CONVERTED' && (
                        <button onClick={() => removeQuoteItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {quoteItems.length === 0 && <p className="text-sm text-gray-500 italic">No line items added yet.</p>}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Subtotal:</span>
                    <span>₹{quoteSubtotal}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total (incl. tax):</span>
                    <span>₹{selectedQuote.total}</span>
                  </div>
                  
                  {selectedQuote.status !== 'CONVERTED' && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={saveQuoteItems} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900">
                        Calculate & Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 border-t pt-6">
                  <h4 className="font-bold mb-3">Workflow Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Status: {selectedQuote.status}</span>
                    
                    {selectedQuote.status !== 'CONVERTED' && (
                      <>
                        <button onClick={() => updateStatus(selectedQuote.id, 'SENT')} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200">
                          Mark as Sent
                        </button>
                        <button onClick={() => updateStatus(selectedQuote.id, 'APPROVED')} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(selectedQuote.id, 'REJECTED')} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
                          Reject
                        </button>
                      </>
                    )}

                    {selectedQuote.status === 'APPROVED' && (
                      <button onClick={convertQuote} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 w-full mt-2">
                        Convert to Booking
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

