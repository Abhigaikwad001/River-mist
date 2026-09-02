'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Check, X, FileText, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WeddingsPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Quote Builder State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteItems, setQuoteItems] = useState<{ category: string; description: string; amount: number }[]>([]);

  const categories = ['Venue', 'Food', 'Decoration', 'DJ', 'Photography', 'Activities', 'Other'];

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotes?type=wedding');
      setQuotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    setIsModalOpen(true);
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
      setIsModalOpen(false);
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
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Weddings & Quotes</h1>
          <p className="text-gray-600 mt-1">Manage destination wedding requests and quotations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
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

      {isModalOpen && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Manage Quote: {selectedQuote.quoteNumber}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
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
