'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Home, Plus, Edit, Trash2, X, Save, AlertCircle } from 'lucide-react';

export default function ResourcesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/resources?all=true');
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setIsEditing(item.id);
    setEditForm({ name: item.name, type: item.type, capacity: item.capacity, description: item.description || '' });
    setIsAdding(false);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setEditForm({});
    setError(null);
  };

  const handleSave = async (id?: number) => {
    try {
      setError(null);
      if (id) {
        await api.patch(`/resources/${id}`, {
          ...editForm,
          capacity: Number(editForm.capacity)
        });
      } else {
        await api.post(`/resources`, {
          ...editForm,
          capacity: Number(editForm.capacity)
        });
      }
      handleCancel();
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save resource');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Failed to delete. It might be in use.');
    }
  };


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Resources & Venues</h1>
          <p className="text-gray-600 mt-1">Manage physical spaces, rooms, and constraints.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
            setEditForm({});
          }} 
          className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C]"
        >
          <Plus size={18} /> Add Resource
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading resources...</div>
        ) : (
          <>
            {error && (
              <div className="p-4 bg-red-50 text-red-700 flex items-center gap-2 border-b border-red-100">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isAdding && (
                  <tr className="bg-blue-50/50">
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        placeholder="Resource Name"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        placeholder="Type (e.g. VENUE, PARKING)"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        value={editForm.type || ''} 
                        onChange={(e) => setEditForm({...editForm, type: e.target.value.toUpperCase()})} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        placeholder="Capacity"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.capacity || ''} 
                        onChange={(e) => setEditForm({...editForm, capacity: e.target.value})} 
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleSave()} className="p-2 text-green-600 hover:bg-green-50 rounded-lg mr-2"><Save size={18}/></button>
                      <button onClick={handleCancel} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
                    </td>
                  </tr>
                )}
                {items.map(p => (
                  <tr key={p.id} className={isEditing === p.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4">
                      {isEditing === p.id ? (
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.name || ''} 
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Home size={20}/></div>
                          <div>
                            <div className="font-medium text-gray-900">{p.name}</div>
                            {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {isEditing === p.id ? (
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                          value={editForm.type || ''} 
                          onChange={(e) => setEditForm({...editForm, type: e.target.value.toUpperCase()})} 
                        />
                      ) : (
                        p.type
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {isEditing === p.id ? (
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.capacity || ''} 
                          onChange={(e) => setEditForm({...editForm, capacity: e.target.value})} 
                        />
                      ) : (
                        `${p.capacity} pax`
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing === p.id ? (
                        <>
                          <button onClick={() => handleSave(p.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg mr-2"><Save size={18}/></button>
                          <button onClick={handleCancel} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit size={18}/></button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
