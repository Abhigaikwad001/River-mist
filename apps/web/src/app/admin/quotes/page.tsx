'use client';
import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import api from '@/lib/api';

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredQuotes = quotes.filter(quote => 
    quote.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
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
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Quote Info</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Client Details</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Event Details</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Notes</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredQuotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-semibold text-[#1E3F20]">{quote.quoteNumber}</p>
                  <p className="text-sm text-gray-500">₹{quote.total}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{quote.name}</p>
                  <p className="text-sm text-gray-500">{quote.email}</p>
                  <p className="text-sm text-gray-500">{quote.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{new Date(quote.eventDate).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{quote.guestCount} Guests</p>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p className="text-sm text-gray-600 truncate" title={quote.notes}>{quote.notes}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <select
                    className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3F20]"
                    value={quote.status}
                    onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                    <option value="CONVERTED">Convert</option>
                  </select>
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
  );
}
