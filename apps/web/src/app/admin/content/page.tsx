'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Globe, Edit, Trash2, Plus, Search, Filter, AlertCircle, Eye, CheckCircle, XCircle } from 'lucide-react';

export default function AdminContentPage() {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    key: '',
    title: '',
    subtitle: '',
    content: '',
    image: '',
    category: 'HERO',
    active: true
  });

  const categories = [
    'ALL',
    'HERO',
    'ABOUT',
    'CONTACT',
    'POLICIES',
    'WEDDINGS',
    'GENERAL',
    'PROMO',
    'SEASONAL'
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Admin should fetch all content including inactive items
      const res = await api.get('/content?all=true');
      setContentItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch content blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      key: '', title: '', subtitle: '', content: '', image: '', category: 'HERO', active: true
    });
    setFormError(null);
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
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete content block "${key}"?`)) return;
    try {
      await api.delete(`/content/${key}`);
      fetchContent();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete content block');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic client validation
    if (!formData.key.trim()) {
      setFormError('Key identifier is required');
      return;
    }

    if (formData.image && formData.image.startsWith('javascript:')) {
      setFormError('JavaScript protocol in Image URL is not allowed for security reasons.');
      return;
    }

    try {
      await api.post('/content', formData);
      setIsModalOpen(false);
      fetchContent();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save content block');
    }
  };

  const filteredItems = contentItems.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      item.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3F20]">Website Content Management (CMS)</h1>
          <p className="text-gray-600 mt-1">
            Manage dynamic business text, headings, hero banners, policies, and contact information across River Mist.
          </p>
        </div>
        <button 
          onClick={openAddModal} 
          className="flex items-center gap-2 bg-[#1E3F20] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#2A522C] transition-colors shadow-sm"
        >
          <Plus size={18} /> Add Content Block
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <Filter size={16} className="text-gray-400 mr-2 flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#1E3F20] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search key or title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#1E3F20] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading site content...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No content blocks found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Key</th>
                  <th className="px-6 py-4">Title & Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-[#1E3F20] font-bold">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-[#D4AF37] flex-shrink-0" />
                        <span>{item.key}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-semibold text-gray-900 line-clamp-1">{item.title}</div>
                      {item.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.subtitle}</div>}
                      {item.content && <div className="text-xs text-gray-400 mt-1 line-clamp-2 italic">{item.content}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.active ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(item)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(item.key)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-xl font-serif font-bold text-[#1E3F20]">
                {formData.key ? `Edit: ${formData.key}` : 'Create New Content Block'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Unique Key Identifier *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={formData.key} 
                    onChange={e => setFormData({...formData, key: e.target.value})} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none" 
                    placeholder="e.g. home.hero.title" 
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Use dot-notation e.g. section.subsection.field</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none bg-white"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Title / Primary Heading *
                </label>
                <input 
                  required 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none"
                  placeholder="Content title or heading"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Subtitle / Badge (Optional)
                </label>
                <input 
                  type="text" 
                  value={formData.subtitle} 
                  onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                  className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none"
                  placeholder="Supporting subtitle"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Content / Body Text (Optional)
                </label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  className="w-full border border-gray-200 p-2.5 rounded-lg text-sm h-32 focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none font-sans"
                  placeholder="Detailed content, description, or policy text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Image URL (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={formData.image} 
                    onChange={e => setFormData({...formData, image: e.target.value})} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none" 
                    placeholder="https://..." 
                  />
                  {formData.image && (
                    <div className="mt-2 h-16 w-full relative rounded border overflow-hidden bg-gray-50 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.image} alt="Preview" className="h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select 
                    value={formData.active ? 'true' : 'false'} 
                    onChange={e => setFormData({...formData, active: e.target.value === 'true'})} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3F20]/20 focus:outline-none bg-white"
                  >
                    <option value="true">Active (Publicly Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#1E3F20] text-white text-sm font-semibold rounded-lg hover:bg-[#2A522C] transition-colors shadow-sm"
                >
                  Save Content Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
