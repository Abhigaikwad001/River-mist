'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Package as PackageIcon, Edit, Trash2, Plus } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    experienceType: 'DAY_TOURISM',
    priceAdult: 0,
    priceChild: 0,
    minGuests: 1,
    maxGuests: 0,
    active: true,
    displayOrder: 0
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages?all=true');
      setPackages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPkg(null);
    setFormData({
      name: '', description: '', experienceType: 'DAY_TOURISM',
      priceAdult: 0, priceChild: 0, minGuests: 1, maxGuests: 0, active: true, displayOrder: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: any) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      experienceType: pkg.experienceType,
      priceAdult: pkg.priceAdult,
      priceChild: pkg.priceChild,
      minGuests: pkg.minGuests,
      maxGuests: pkg.maxGuests || 0,
      active: pkg.active,
      displayOrder: pkg.displayOrder
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await api.delete(`/packages/${id}`);
      fetchPackages();
    } catch (err) {
      console.error(err);
      alert('Failed to delete package');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        maxGuests: formData.maxGuests === 0 ? null : formData.maxGuests
      };

      if (editingPkg) {
        await api.patch(`/packages/${editingPkg.id}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      console.error(err);
      alert('Failed to save package');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Packages</h1>
          <p className="text-gray-600 mt-1">Manage all available booking packages.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-colors">
          <Plus size={18} /> Add Package
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Price (Adult/Child)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg"><PackageIcon size={20} className="text-gray-600"/></div>
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{p.experienceType}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">₹{p.priceAdult} / ₹{p.priceChild}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
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
            <h3 className="text-xl font-bold mb-4">{editingPkg ? 'Edit Package' : 'Add Package'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Experience Type</label>
                  <select value={formData.experienceType} onChange={e => setFormData({...formData, experienceType: e.target.value})} className="w-full border p-2 rounded-lg">
                    <option value="DAY_TOURISM">Day Tourism</option>
                    <option value="WEDDING">Wedding</option>
                    <option value="DESTINATION_WEDDING">Destination Wedding</option>
                    <option value="CORPORATE_EVENT">Corporate Event</option>
                    <option value="FAMILY_DAY_OUT">Family Day Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} className="w-full border p-2 rounded-lg">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Adult (₹)</label>
                  <input type="number" required min="0" value={formData.priceAdult} onChange={e => setFormData({...formData, priceAdult: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Child (₹)</label>
                  <input type="number" required min="0" value={formData.priceChild} onChange={e => setFormData({...formData, priceChild: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Guests</label>
                  <input type="number" required min="1" value={formData.minGuests} onChange={e => setFormData({...formData, minGuests: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Guests (0 for no limit)</label>
                  <input type="number" min="0" value={formData.maxGuests} onChange={e => setFormData({...formData, maxGuests: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1E3F20] text-white rounded-lg hover:bg-[#2A522C]">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
