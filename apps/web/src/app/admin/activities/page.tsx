'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Tent, Edit, Trash2, Plus, Filter } from 'lucide-react';

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'GENERAL',
    location: '',
    image: '',
    price: 0,
    pricingType: 'PER_PERSON',
    capacity: 0,
    displayOrder: 0,
    active: true
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category: 'GENERAL',
      location: '',
      image: '',
      price: 0,
      pricingType: 'PER_PERSON',
      capacity: 0,
      displayOrder: 0,
      active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || 'GENERAL',
      location: item.location || '',
      image: item.image || '',
      price: item.price || 0,
      pricingType: item.pricingType || 'PER_PERSON',
      capacity: item.capacity || 0,
      displayOrder: item.displayOrder || 0,
      active: item.active !== false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      await api.delete(`/activities/${id}`);
      fetchActivities();
    } catch (err) {
      console.error(err);
      alert('Failed to delete item');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        capacity: formData.capacity === 0 ? null : Number(formData.capacity),
        displayOrder: Number(formData.displayOrder)
      };

      if (editingItem) {
        await api.patch(`/activities/${editingItem.id}`, payload);
      } else {
        await api.post('/activities', payload);
      }
      setIsModalOpen(false);
      fetchActivities();
    } catch (err) {
      console.error(err);
      alert('Failed to save activity');
    }
  };

  const filteredActivities = selectedCategory === 'ALL'
    ? activities
    : activities.filter(a => (a.category || 'GENERAL').toUpperCase() === selectedCategory);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Activities Management</h1>
          <p className="text-gray-600 mt-1">Manage adventure, aqua, farm, and riverside resort experiences.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          <Plus size={18} /> Add Activity
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mr-2">
          <Filter size={14} /> Category:
        </span>
        {['ALL', 'ADVENTURE', 'AQUA', 'FARM', 'RIVERSIDE', 'GENERAL'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-[#1E3F20] text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading activities...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredActivities.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-[#1E3F20] rounded-lg">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <Tent size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 max-w-[250px]">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200 text-xs font-semibold">
                      {item.category || 'GENERAL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.location || 'Resort Grounds'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {item.price > 0 ? `₹${item.price} (${item.pricingType || 'PER_PERSON'})` : 'Included'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {item.capacity ? `${item.capacity} max` : 'Unlimited'}
                  </td>
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
              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No activities found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl my-8">
            <h3 className="text-xl font-serif text-[#1E3F20] font-bold mb-4">{editingItem ? 'Edit Activity' : 'Add Activity'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Activity Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Zip Lining" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="ADVENTURE">Adventure</option>
                    <option value="AQUA">Aqua / Water</option>
                    <option value="FARM">Farm Experience</option>
                    <option value="RIVERSIDE">Riverside</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Location / Zone</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Adventure Park" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded-lg h-20" placeholder="Brief activity details..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Price (₹)</label>
                  <input type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Pricing Type</label>
                  <select value={formData.pricingType} onChange={e => setFormData({...formData, pricingType: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_GROUP">Per Group</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Capacity (0 = Unlimited)</label>
                  <input type="number" min="0" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Display Order</label>
                  <input type="number" value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                  <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} className="w-full border p-2 rounded-lg">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Image URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://images.unsplash.com/..." />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C]">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

