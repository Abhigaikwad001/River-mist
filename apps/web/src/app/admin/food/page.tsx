'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Utensils, Edit, Trash2, Plus, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminFoodPage() {
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meal: 'LUNCH',
    category: 'THALI',
    tags: '',
    image: '',
    isVeg: true,
    isSeasonal: false,
    seasonalBadge: '',
    active: true,
    displayOrder: 0
  });

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const fetchFoodItems = async () => {
    try {
      const res = await api.get('/food');
      setFoodItems(res.data);
    } catch (err) {
      console.error('Failed to fetch food items:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '', description: '', meal: 'LUNCH', category: 'THALI', tags: '', image: '',
      isVeg: true, isSeasonal: false, seasonalBadge: '', active: true, displayOrder: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      meal: item.meal,
      category: item.category || 'THALI',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
      image: item.image || '',
      isVeg: item.isVeg,
      isSeasonal: item.isSeasonal || false,
      seasonalBadge: item.seasonalBadge || '',
      active: item.active,
      displayOrder: item.displayOrder || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/food/${id}`);
      fetchFoodItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
        displayOrder: Number(formData.displayOrder)
      };
      if (editingItem) {
        await api.patch(`/food/${editingItem.id}`, payload);
      } else {
        await api.post('/food', payload);
      }
      setIsModalOpen(false);
      fetchFoodItems();
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Failed to save item');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20] font-bold">Food & Thalis Catalog</h1>
          <p className="text-gray-600 text-sm mt-1">Manage resort Thalis, meal offerings, tags, display order, and seasonal availability.</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="flex items-center gap-2 bg-[#1E3F20] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#2A522C] transition-colors shadow-sm text-sm"
        >
          <Plus size={18} /> Add Thali / Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-serif">Loading menu items...</div>
        ) : foodItems.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No menu items found. Click &quot;Add Thali / Item&quot; to create one.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Item Name & Description</th>
                <th className="px-6 py-4">Category & Meal</th>
                <th className="px-6 py-4">Diet & Badges</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {foodItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-600">
                    #{item.displayOrder ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#1E3F20]/5 rounded-lg border border-[#1E3F20]/10">
                        <Utensils size={20} className="text-[#1E3F20]" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {item.name}
                          {item.isSeasonal && <Sparkles size={14} className="text-[#D4AF37]" />}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1 max-w-[280px] mt-0.5">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-xs text-gray-400 block">{item.meal}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.isVeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>
                      {item.isSeasonal && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Sparkles size={12} /> {item.seasonalBadge || 'Seasonal'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={12} /> ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        <XCircle size={12} /> INACTIVE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(item)} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-1 transition-colors"
                      title="Edit Item"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Editor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-2xl my-8 border border-gray-100">
            <h3 className="text-xl font-serif font-bold text-[#1E3F20] mb-4">
              {editingItem ? 'Edit Menu Offering' : 'Add New Menu Offering'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Item Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20] outline-none" placeholder="e.g. Maharashtrian Thali" />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm h-20 focus:ring-2 focus:ring-[#1E3F20] outline-none" placeholder="Detailed description of flavors and bhakris..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                    <option value="THALI">Thali</option>
                    <option value="A_LA_CARTE">A La Carte</option>
                    <option value="BEVERAGE">Beverage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Meal Time</label>
                  <select value={formData.meal} onChange={e => setFormData({...formData, meal: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="SNACKS">Evening Snacks</option>
                    <option value="DINNER">Dinner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Diet Type</label>
                  <select value={formData.isVeg ? 'true' : 'false'} onChange={e => setFormData({...formData, isVeg: e.target.value === 'true'})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                    <option value="true">Vegetarian 🟢</option>
                    <option value="false">Non-Vegetarian 🔴</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Seasonal Offering</label>
                  <select value={formData.isSeasonal ? 'true' : 'false'} onChange={e => setFormData({...formData, isSeasonal: e.target.value === 'true'})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                    <option value="false">All Year</option>
                    <option value="true">Seasonal Special ✨</option>
                  </select>
                </div>
              </div>

              {formData.isSeasonal && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Seasonal Badge Text</label>
                  <input type="text" value={formData.seasonalBadge} onChange={e => setFormData({...formData, seasonalBadge: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" placeholder="e.g. Winter Harvest Special" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Tags (Comma-separated)</label>
                <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" placeholder="Authentic, Traditional, Local" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Image URL</label>
                  <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Display Order</label>
                  <input type="number" min="0" value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: Number(e.target.value)})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Public Availability Status</label>
                <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]">
                  <option value="true">Active (Visible Publicly)</option>
                  <option value="false">Inactive (Hidden Publicly)</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C] text-sm font-medium shadow-sm">Save Offering</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
