'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Image as ImageIcon, Video, Edit, Trash2, Plus } from 'lucide-react';

export default function AdminMediaPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    type: 'IMAGE',
    url: '',
    altText: '',
    category: 'GALLERY',
    active: true
  });

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await api.get('/media');
      setMediaItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      type: 'IMAGE', url: '', altText: '', category: 'GALLERY', active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      url: item.url,
      altText: item.altText || '',
      category: item.category,
      active: item.active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    try {
      await api.delete(`/media/${id}`);
      fetchMedia();
    } catch (err) {
      console.error(err);
      alert('Failed to delete media');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.patch(`/media/${editingItem.id}`, formData);
      } else {
        await api.post('/media', formData);
      }
      setIsModalOpen(false);
      fetchMedia();
    } catch (err) {
      console.error(err);
      alert('Failed to save media');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Media Gallery</h1>
          <p className="text-gray-600 mt-1">Manage images and videos used across the website.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          <Plus size={18} /> Add Media
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Alt Text</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mediaItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.type === 'IMAGE' ? (
                        <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {item.url ? (
                            <img src={item.url} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-400" /></div>
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-blue-50 rounded flex items-center justify-center text-blue-500 flex-shrink-0">
                          <Video size={24} />
                        </div>
                      )}
                      <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.url}>{item.url}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{item.category}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm truncate max-w-[200px]">{item.altText || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl my-8">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Media' : 'Add Media'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="GALLERY">Gallery</option>
                    <option value="HERO">Hero</option>
                    <option value="EVENTS">Events</option>
                    <option value="WEDDINGS">Weddings</option>
                    <option value="FOOD">Food</option>
                    <option value="ACTIVITIES">Activities</option>
                    <option value="BANNER">Banner</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Media URL</label>
                <input required type="text" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alt Text (Accessibility)</label>
                <input type="text" value={formData.altText} onChange={e => setFormData({...formData, altText: e.target.value})} className="w-full border p-2 rounded-lg" />
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
                <button type="submit" className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C]">Save Media</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
