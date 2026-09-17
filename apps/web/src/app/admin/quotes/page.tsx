'use client';
import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Search, Edit, ArrowRightCircle, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await api.get('/quotes');
      setQuotes(res.data);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.patch(`/quotes/${id}/status`, { status });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleConvert = async (id: number) => {
    if (!confirm('Are you sure you want to convert this quote to a booking?')) return;
    try {
      await api.post(`/quotes/${id}/convert`);
      alert('Quote successfully converted to a booking!');
      fetchQuotes();
    } catch (error: any) {
      console.error('Failed to convert quote:', error);
      alert(error.response?.data?.message || 'Failed to convert quote');
    }
  };

  const openItemsModal = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteItems(quote.items ? [...quote.items] : []);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setQuoteItems([...quoteItems, { category: 'FOOD', description: '', amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...quoteItems];
    newItems.splice(index, 1);
    setQuoteItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteItems(newItems);
  };

  const saveQuoteItems = async () => {
    if (!selectedQuote) return;
    try {
      const itemsPayload = quoteItems.map(item => ({
        ...item,
        amount: Number(item.amount)
      }));
      await api.patch(`/quotes/${selectedQuote.id}/items`, { items: itemsPayload });
      alert('Quote items saved successfully');
      setIsModalOpen(false);
      fetchQuotes();
    } catch (error) {
      console.error('Failed to save quote items:', error);
      alert('Failed to save quote items');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const term = searchTerm.toLowerCase();
    const name = quote.user?.name || '';
    const email = quote.user?.email || '';
    const quoteNum = quote.quoteNumber || '';
    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || quoteNum.toLowerCase().includes(term);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CONVERTED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3F20]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#1E3F20]">Quote Requests</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3F20] outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Quote Info</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Client Details</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Event Details</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Items/Total</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#1E3F20]">{quote.quoteNumber}</p>
                    <p className="text-sm text-gray-500">{new Date(quote.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{quote.user?.name || 'Guest'}</p>
                    <p className="text-sm text-gray-500">{quote.user?.email || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{quote.user?.phone || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 font-medium">{quote.eventType}</p>
                    <p className="text-sm text-gray-900">{new Date(quote.eventDate).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">{quote.guestCount} Guests</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">₹{quote.total}</p>
                    <button 
                      onClick={() => openItemsModal(quote)}
                      className="mt-1 text-sm text-[#D4AF37] hover:text-[#B3932F] flex items-center gap-1 font-medium"
                    >
                      <Edit className="w-3 h-3" /> Edit Items ({quote.items?.length || 0})
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-y-2">
                    {quote.status !== 'CONVERTED' ? (
                      <select
                        className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3F20] w-full mb-2"
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="APPROVED">Approve</option>
                        <option value="REJECTED">Reject</option>
                      </select>
                    ) : (
                      <p className="text-xs text-gray-500">Converted to booking</p>
                    )}
                    
                    {quote.status === 'APPROVED' && !quote.bookingId && (
                      <button
                        onClick={() => handleConvert(quote.id)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1 bg-[#1E3F20] text-white rounded text-sm hover:bg-[#162f18] transition-colors"
                      >
                        <ArrowRightCircle className="w-4 h-4" /> Convert
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium">No quotes found</p>
                    <p className="text-sm">Try adjusting your search</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-semibold text-[#1E3F20]">Edit Quote Items</h2>
                <p className="text-sm text-gray-500">{selectedQuote.quoteNumber} - {selectedQuote.user?.name}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {quoteItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  No items added yet. Click below to add items.
                </div>
              ) : (
                <div className="space-y-3">
                  {quoteItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50 group">
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-3">
                          <div className="w-1/3">
                            <label className="block text-xs text-gray-500 mb-1">Category</label>
                            <select 
                              value={item.category}
                              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm bg-white"
                            >
                              <option value="FOOD">Food & Catering</option>
                              <option value="VENUE">Venue</option>
                              <option value="DECORATION">Decoration</option>
                              <option value="PHOTOGRAPHY">Photography</option>
                              <option value="ENTERTAINMENT">Entertainment</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="w-1/3">
                            <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
                            <input 
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                              min="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input 
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="e.g. Premium Thali for 100 pax"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={handleAddItem}
                className="w-full py-2 border-2 border-dashed border-[#1E3F20]/30 text-[#1E3F20] font-medium rounded-lg hover:bg-[#1E3F20]/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
              <div className="font-semibold text-gray-900">
                Total: ₹{quoteItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveQuoteItems}
                  className="px-4 py-2 bg-[#1E3F20] text-white font-medium rounded-lg hover:bg-[#162f18] transition-colors"
                >
                  Save Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
