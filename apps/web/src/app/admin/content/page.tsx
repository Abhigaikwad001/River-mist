'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Globe, Edit, Trash2, Plus } from 'lucide-react';

export default function AdminContentPage() {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    key: '',
    title: '',
    subtitle: '',
    content: '',
    image: '',
    category: 'HERO',
    active: true
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await api.get('/content');
      setContentItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      key: '', title: '', subtitle: '', content: '', image: '', category: 'HERO', active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setFormData({
      key: item.key,
      title: item.title || '',
      subtitle: item.subtitle || '',
      content: item.content || '',
      image: item.image || '',
      category: item.category || 'HERO',
      active: item.active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete content block "${key}"?`)) return;
    try {
      await api.delete(`/content/${key}`);
      fetchContent();
    } catch (err) {
      console.error(err);
      alert('Failed to delete content block');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/content', formData);
      setIsModalOpen(false);
      fetchContent();
    } catch (err) {
      console.error(err);
      alert('Failed to save content block');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Website Content</h1>
          <p className="text-gray-600 mt-1">Manage promotional banners, headings, hero titles, and seasonal text blocks.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          <Plus size={18} /> Add Content Block
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Key</th>
                <th className="px-6 py-4">Title & Subtitle</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contentItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-[#1E3F20] font-bold">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-[#D4AF37]" />
                      {item.key}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.subtitle && <div className="text-xs text-gray-500">{item.subtitle}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{item.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(item.key)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl my-8">
            <h3 className="text-xl font-bold mb-4">Edit Content Block</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unique Key Identifier</label>
                  <input required type="text" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="w-full border p-2 rounded-lg font-mono text-sm" placeholder="e.g. home_hero_title" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="HERO">Hero Banner</option>
                    <option value="SEASONAL">Seasonal Announcement</option>
                    <option value="PROMO">Promotional Strip</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subtitle</label>
                <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content / Body Text</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} className="w-full border p-2 rounded-lg">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C]">Save Content Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
