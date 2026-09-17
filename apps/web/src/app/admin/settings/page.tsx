'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Settings as SettingsIcon, Save, RefreshCw, Trash2, Plus, Info } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  type: string;
  category: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New setting form
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState('STRING');
  const [newCategory, setNewCategory] = useState('GENERAL');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdate = async (key: string, value: string, type: string, category: string) => {
    try {
      setFeedback(null);
      await api.post(`/settings/${key}`, { value, type, category });
      setFeedback({ type: 'success', message: `Setting ${key} updated successfully.` });
      await fetchSettings();
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Update failed.' });
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete ${key}?`)) return;
    try {
      setFeedback(null);
      await api.delete(`/settings/${key}`);
      setFeedback({ type: 'success', message: `Setting ${key} deleted.` });
      await fetchSettings();
    } catch (err: any) {
      console.error('Failed to delete setting:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Delete failed.' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    try {
      setFeedback(null);
      await api.post(`/settings/${newKey.trim()}`, { 
        value: newValue, 
        type: newType, 
        category: newCategory 
      });
      setFeedback({ type: 'success', message: 'New setting added.' });
      setNewKey('');
      setNewValue('');
      await fetchSettings();
    } catch (err: any) {
      console.error('Failed to add setting:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Add failed.' });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Global Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage site-wide configurations, keys, and operational limits.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-800 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Add New Setting */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#1E3F20]" />
          Add New Setting
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Key Name</label>
            <input 
              required
              value={newKey}
              onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder="e.g. TAX_RATE"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Value</label>
            <input 
              required
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="e.g. 0.18"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
            >
              <option value="STRING">String</option>
              <option value="NUMBER">Number</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="JSON">JSON</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
            >
              <option value="GENERAL">General</option>
              <option value="FINANCE">Finance</option>
              <option value="CONTACT">Contact</option>
              <option value="UI">UI / Content</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button type="submit" className="w-full bg-[#1E3F20] hover:bg-[#2A522C] text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors">
              Add Setting
            </button>
          </div>
        </form>
      </div>

      {/* Existing Settings List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-gray-900 text-lg">Configured Settings</h2>
        </div>
        <div className="overflow-x-auto">
          {settings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No custom settings configured yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-6 py-4">Key</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Type / Cat</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settings.map(s => (
                  <tr key={s.key} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-[#1E3F20]">{s.key}</td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        defaultValue={s.value}
                        onBlur={(e) => {
                          if (e.target.value !== s.value) {
                            handleUpdate(s.key, e.target.value, s.type, s.category);
                          }
                        }}
                        className="w-full border border-transparent hover:border-gray-300 focus:border-[#1E3F20] focus:ring-1 focus:ring-[#1E3F20] bg-transparent p-1.5 rounded transition-all"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">{s.type}</span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">{s.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(s.key)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete setting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
