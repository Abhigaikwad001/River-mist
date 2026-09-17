'use client';
import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, Search, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/notifications/logs?limit=200');
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch notification logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'SMS': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'WHATSAPP': return <Phone className="w-4 h-4 text-emerald-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.subject && log.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    log.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div>
          <h1 className="text-2xl font-semibold text-[#1E3F20]">Notification Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor Email, SMS, and WhatsApp deliverability</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3F20] outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Recipient</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Subject</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Timestamp</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Error (if any)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(log.type)}
                    <span className="text-sm font-medium text-gray-900">{log.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{log.recipient}</span>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <span className="text-sm text-gray-600 truncate block" title={log.subject}>
                    {log.subject || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="text-sm font-medium text-gray-900">{log.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs text-xs text-red-500 truncate" title={log.errorMessage}>
                  {log.errorMessage || '-'}
                </td>
              </tr>
            ))}
            
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium">No logs found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
