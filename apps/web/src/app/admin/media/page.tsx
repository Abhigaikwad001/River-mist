'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Image as ImageIcon,
  Video,
  Edit,
  Trash2,
  Plus,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  AlertTriangle,
  Star,
  CheckSquare,
  Square,
  ArrowUpDown,
  X,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';

const CATEGORIES = [
  'GALLERY',
  'FOOD',
  'PACKAGE',
  'ACTIVITY',
  'EVENT',
  'WEDDING',
  'RESORT',
  'HERO',
  'TESTIMONIAL',
  'BANNER',
  'OTHER',
];

export default function AdminMediaPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeatured, setSelectedFeatured] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'displayOrder' | 'title' | 'category'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState('GALLERY');
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'FILE' | 'URL'>('FILE');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'IMAGE',
    url: '',
    altText: '',
    description: '',
    category: 'GALLERY',
    active: true,
    isFeatured: false,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchMedia();
  }, [selectedCategory, selectedStatus, selectedFeatured, sortBy, sortOrder]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.activeOnly = selectedStatus === 'active' ? 'true' : 'false';
      if (selectedFeatured) params.isFeatured = selectedFeatured === 'true' ? 'true' : 'false';
      if (searchQuery) params.search = searchQuery;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const res = await api.get('/media', { params });
      setMediaItems(res.data);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMedia();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setSelectedFile(null);
    setUploadTab('FILE');
    setFormData({
      title: '',
      type: 'IMAGE',
      url: '',
      altText: '',
      description: '',
      category: 'GALLERY',
      active: true,
      isFeatured: false,
      displayOrder: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setSelectedFile(null);
    setUploadTab('URL');
    setFormData({
      title: item.title || '',
      type: item.type || 'IMAGE',
      url: item.url || '',
      altText: item.altText || '',
      description: item.description || '',
      category: item.category || 'GALLERY',
      active: item.active !== undefined ? item.active : true,
      isFeatured: item.isFeatured || false,
      displayOrder: item.displayOrder || 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    try {
      await api.delete(`/media/${id}`);
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchMedia();
    } catch (err) {
      console.error(err);
      alert('Failed to delete media asset');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (!editingItem && uploadTab === 'FILE') {
        if (!selectedFile) {
          alert('Please select a file to upload');
          setUploading(false);
          return;
        }

        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('title', formData.title || selectedFile.name);
        uploadData.append('altText', formData.altText || selectedFile.name);
        uploadData.append('description', formData.description);
        uploadData.append('category', formData.category);
        uploadData.append('isFeatured', formData.isFeatured ? 'true' : 'false');

        await api.post('/media/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (editingItem) {
        await api.patch(`/media/${editingItem.id}`, formData);
      } else {
        await api.post('/media', formData);
      }

      setIsModalOpen(false);
      fetchMedia();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save media asset');
    } finally {
      setUploading(false);
    }
  };

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === mediaItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaItems.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleBulkAction = async (action: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'CHANGE_CATEGORY') => {
    if (selectedIds.length === 0) return;

    if (action === 'DELETE') {
      if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} media assets?`)) return;
    }

    try {
      const payload = action === 'CHANGE_CATEGORY' ? { category: bulkCategory } : undefined;
      await api.post('/media/bulk', { action, ids: selectedIds, payload });
      setSelectedIds([]);
      setIsBulkCategoryModalOpen(false);
      fetchMedia();
    } catch (err: any) {
      console.error('Bulk action failed:', err);
      alert('Failed to execute bulk operation');
    }
  };

  const toggleFeaturedStatus = async (item: any) => {
    try {
      await api.patch(`/media/${item.id}`, { isFeatured: !item.isFeatured });
      fetchMedia();
    } catch (err) {
      console.error('Failed to update featured status:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1E3F20]">Digital Asset Manager</h1>
          <p className="text-gray-600 text-sm mt-1">
            Centralized media repository for all website images, videos, and galleries.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-[#1E3F20] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#2A522C] transition-all shadow-md shadow-[#1E3F20]/10 text-sm"
        >
          <Plus size={18} /> Add Media Asset
        </button>
      </div>

      {/* Search, Filters & Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by title, category, or alt text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20 focus:border-[#1E3F20]"
            />
          </form>

          {/* Filters & View Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Featured Filter */}
            <select
              value={selectedFeatured}
              onChange={e => setSelectedFeatured(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="">Featured Filter</option>
              <option value="true">Featured on Home</option>
              <option value="false">Standard</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="displayOrder-asc">Display Order (Low-High)</option>
              <option value="category-asc">Category (A-Z)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-0.5">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'GRID' ? 'bg-white shadow-sm text-[#1E3F20]' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Grid View"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'TABLE' ? 'bg-white shadow-sm text-[#1E3F20]' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Table View"
              >
                <List size={18} />
              </button>
            </div>

          </div>
        </div>

        {/* Bulk Action Bar (Visible when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1E3F20]/5 p-3 rounded-xl border border-[#1E3F20]/15">
            <span className="text-sm font-medium text-[#1E3F20] flex items-center gap-2">
              <CheckCircle2 size={16} />
              {selectedIds.length} media asset(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkAction('ACTIVATE')}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
              >
                Bulk Activate
              </button>
              <button
                onClick={() => handleBulkAction('DEACTIVATE')}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
              >
                Bulk Deactivate
              </button>
              <button
                onClick={() => setIsBulkCategoryModalOpen(true)}
                className="px-3 py-1.5 bg-[#1E3F20] text-white rounded-lg text-xs font-semibold hover:bg-[#2A522C]"
              >
                Change Category
              </button>
              <button
                onClick={() => handleBulkAction('DELETE')}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Bulk Delete
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 text-gray-500 hover:text-gray-700 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Media Assets Display */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 flex flex-col items-center space-y-3">
          <Loader2 className="animate-spin text-[#1E3F20]" size={32} />
          <p className="text-gray-500 text-sm font-medium">Loading Digital Assets...</p>
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 space-y-3">
          <ImageIcon className="mx-auto text-gray-300" size={48} />
          <h3 className="text-lg font-serif font-bold text-gray-800">No Media Assets Found</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            No assets match your search or filter parameters. Upload or add a new asset to get started.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2A522C]"
          >
            <Plus size={16} /> Add Media Asset
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mediaItems.map(item => {
            const isSelected = selectedIds.includes(item.id);
            const missingAlt = !item.altText || item.altText.trim() === '';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col group relative ${
                  isSelected ? 'border-[#1E3F20] ring-2 ring-[#1E3F20]/20 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleSelectItem(item.id)}
                  className="absolute top-3 left-3 z-20 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-[#1E3F20] hover:bg-white shadow-sm"
                >
                  {isSelected ? <CheckSquare size={18} className="text-[#1E3F20]" /> : <Square size={18} className="text-gray-400" />}
                </button>

                {/* Featured Badge */}
                <button
                  onClick={() => toggleFeaturedStatus(item)}
                  title={item.isFeatured ? 'Featured on Home (Click to remove)' : 'Click to Feature on Home'}
                  className={`absolute top-3 right-3 z-20 p-1.5 rounded-full shadow-sm backdrop-blur-sm transition-all ${
                    item.isFeatured ? 'bg-amber-400 text-white' : 'bg-white/80 text-gray-400 hover:text-amber-500'
                  }`}
                >
                  <Star size={16} fill={item.isFeatured ? 'currentColor' : 'none'} />
                </button>

                {/* Media Preview Container */}
                <div className="h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                  {item.type === 'IMAGE' ? (
                    <img
                      src={item.url}
                      alt={item.altText || 'Media Asset'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  )}

                  {!item.active && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-full">
                        Inactive
                      </span>
                    </div>
                  )}

                  {missingAlt && (
                    <div
                      className="absolute bottom-2 left-2 z-10 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"
                      title="Missing Alt Text (Accessibility Warning)"
                    >
                      <AlertTriangle size={12} /> Alt Missing
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-gray-400">Order: {item.displayOrder}</span>
                    </div>

                    <h4 className="font-medium text-gray-900 text-sm truncate" title={item.title || item.url}>
                      {item.title || 'Untitled Asset'}
                    </h4>

                    <p className="text-xs text-gray-500 truncate mt-0.5" title={item.altText}>
                      Alt: {item.altText || <span className="italic text-amber-600">None</span>}
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Metadata"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Asset"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === mediaItems.length ? (
                      <CheckSquare size={18} className="text-[#1E3F20]" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-4">Preview</th>
                <th className="p-4">Title & Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Alt Text</th>
                <th className="p-4">Featured</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {mediaItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const missingAlt = !item.altText || item.altText.trim() === '';

                return (
                  <tr key={item.id} className={`hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-[#1E3F20]/5' : ''}`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelectItem(item.id)}>
                        {isSelected ? <CheckSquare size={18} className="text-[#1E3F20]" /> : <Square size={18} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="w-16 h-12 rounded-lg bg-gray-100 overflow-hidden relative flex-shrink-0">
                        {item.type === 'IMAGE' ? (
                          <img src={item.url} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.title || 'Untitled'}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[180px]">{item.url}</div>
                    </td>
                    <td className="p-4 font-semibold text-xs text-gray-700">{item.category}</td>
                    <td className="p-4 text-xs">
                      {missingAlt ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <AlertTriangle size={14} /> Missing
                        </span>
                      ) : (
                        <span className="text-gray-600 truncate max-w-[150px] inline-block">{item.altText}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleFeaturedStatus(item)}
                        className={`p-1 rounded-full ${item.isFeatured ? 'text-amber-500' : 'text-gray-300'}`}
                      >
                        <Star size={18} fill={item.isFeatured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Media Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold text-[#1E3F20]">
                {editingItem ? 'Edit Media Asset Metadata' : 'Add New Media Asset'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {!editingItem && (
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setUploadTab('FILE')}
                  className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center ${
                    uploadTab === 'FILE' ? 'border-[#1E3F20] text-[#1E3F20]' : 'border-transparent text-gray-400'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('URL')}
                  className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center ${
                    uploadTab === 'URL' ? 'border-[#1E3F20] text-[#1E3F20]' : 'border-transparent text-gray-400'
                  }`}
                >
                  External URL
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingItem && uploadTab === 'FILE' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select File</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Supports JPEG, PNG, WebP, GIF, SVG (Max 10MB) & MP4, WebM (Max 50MB).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Media URL</label>
                  <input
                    type="text"
                    required
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Asset Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
                  placeholder="e.g. Lawn Riverside View"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none"
                  >
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Alt Text (SEO & A11y)</label>
                  {!formData.altText && (
                    <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> Recommended
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.altText}
                  onChange={e => setFormData({ ...formData, altText: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
                  placeholder="Describe the image content for screen readers"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
                  placeholder="Optional details or context"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={e => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm bg-white focus:outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Featured</label>
                  <select
                    value={formData.isFeatured ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, isFeatured: e.target.value === 'true' })}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm bg-white focus:outline-none"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-[#1E3F20] text-white rounded-xl text-sm font-semibold hover:bg-[#2A522C] flex items-center gap-2"
                >
                  {uploading && <Loader2 className="animate-spin" size={16} />}
                  {editingItem ? 'Save Changes' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Category Change Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#1E3F20]">Change Category for {selectedIds.length} Assets</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Category</label>
              <select
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('CHANGE_CATEGORY')}
                className="px-4 py-2 bg-[#1E3F20] text-white rounded-xl text-sm font-semibold"
              >
                Apply Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
