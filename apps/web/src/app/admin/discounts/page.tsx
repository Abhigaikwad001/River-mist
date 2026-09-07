'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Tag,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Percent,
  IndianRupee,
  Layers,
  Activity as ActivityIcon,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'PERCENTAGE',
    value: 10,
    minBookingAmount: 0,
    maxDiscountAmount: 0,
    perCustomerLimit: 1,
    usageLimit: 0,
    validFrom: '',
    validUntil: '',
    active: true,
    displayOrder: 0,
    applicablePackages: [] as string[],
    applicableActivities: [] as string[],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [discRes, pkgRes, actRes] = await Promise.all([
        api.get('/discounts'),
        api.get('/packages?all=true').catch(() => ({ data: [] })),
        api.get('/activities').catch(() => ({ data: [] })),
      ]);
      setDiscounts(discRes.data || []);
      setPackagesList(pkgRes.data || []);
      setActivitiesList(actRes.data || []);
    } catch (err) {
      console.error('Failed to load discounts or metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const res = await api.get('/discounts');
      setDiscounts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: 10,
      minBookingAmount: 0,
      maxDiscountAmount: 0,
      perCustomerLimit: 1,
      usageLimit: 0,
      validFrom: '',
      validUntil: '',
      active: true,
      displayOrder: 0,
      applicablePackages: [],
      applicableActivities: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      type: item.type || 'PERCENTAGE',
      value: item.value || 0,
      minBookingAmount: item.minBookingAmount || 0,
      maxDiscountAmount: item.maxDiscountAmount || 0,
      perCustomerLimit: item.perCustomerLimit !== null ? item.perCustomerLimit : 1,
      usageLimit: item.usageLimit || 0,
      validFrom: item.validFrom ? new Date(item.validFrom).toISOString().split('T')[0] : '',
      validUntil: item.validUntil ? new Date(item.validUntil).toISOString().split('T')[0] : '',
      active: item.active !== undefined ? item.active : true,
      displayOrder: item.displayOrder || 0,
      applicablePackages: Array.isArray(item.applicablePackages) ? item.applicablePackages : [],
      applicableActivities: Array.isArray(item.applicableActivities) ? item.applicableActivities : [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    try {
      await api.delete(`/discounts/${id}`);
      fetchDiscounts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete promotional offer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        name: formData.name ? formData.name.trim() : formData.code.toUpperCase().trim(),
        minBookingAmount: formData.minBookingAmount ? Number(formData.minBookingAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit && formData.usageLimit > 0 ? Number(formData.usageLimit) : null,
        perCustomerLimit: formData.perCustomerLimit && formData.perCustomerLimit > 0 ? Number(formData.perCustomerLimit) : null,
        validFrom: formData.validFrom ? formData.validFrom : null,
        validUntil: formData.validUntil ? formData.validUntil : null,
      };

      if (editingItem) {
        await api.patch(`/discounts/${editingItem.id}`, payload);
      } else {
        await api.post('/discounts', payload);
      }

      setIsModalOpen(false);
      fetchDiscounts();
    } catch (err: any) {
      console.error('Failed to save offer:', err);
      alert(err.response?.data?.message || 'Failed to save offer code');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePackageSelection = (pkgSlugOrId: string) => {
    setFormData(prev => {
      const exists = prev.applicablePackages.includes(pkgSlugOrId);
      return {
        ...prev,
        applicablePackages: exists
          ? prev.applicablePackages.filter(p => p !== pkgSlugOrId)
          : [...prev.applicablePackages, pkgSlugOrId],
      };
    });
  };

  const toggleActivitySelection = (actId: string) => {
    setFormData(prev => {
      const exists = prev.applicableActivities.includes(actId);
      return {
        ...prev,
        applicableActivities: exists
          ? prev.applicableActivities.filter(a => a !== actId)
          : [...prev.applicableActivities, actId],
      };
    });
  };

  const filteredDiscounts = discounts.filter(d => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = d.code?.toLowerCase().includes(q);
      const matchName = d.name?.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }
    if (statusFilter && d.computedStatus !== statusFilter) return false;
    if (typeFilter && d.type !== typeFilter) return false;
    return true;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Clock size={12} /> Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertCircle size={12} /> Expired
          </span>
        );
      case 'DISABLED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <Ban size={12} /> Disabled
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1E3F20]">Offers & Promotional Pricing</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage promotional coupons, package discounts, and eligibility rules.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-[#1E3F20] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#2A522C] transition-all shadow-md shadow-[#1E3F20]/10 text-sm"
        >
          <Plus size={18} /> Create New Offer
        </button>
      </div>

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search offer by code or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3F20]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISABLED">Disabled</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Discount Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-serif flex flex-col items-center space-y-3">
            <Loader2 className="animate-spin text-[#1E3F20]" size={32} />
            <span>Loading Promotional Offers...</span>
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Tag size={40} className="mx-auto text-gray-300" />
            <h3 className="text-lg font-serif font-bold text-gray-800">No Offers Found</h3>
            <p className="text-xs text-gray-500">No promotional offers match your selected filter.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Coupon Code & Name</th>
                <th className="p-4">Discount Value</th>
                <th className="p-4">Validity Period</th>
                <th className="p-4">Usage Count / Limit</th>
                <th className="p-4">Restrictions</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredDiscounts.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-xl flex-shrink-0">
                        <Tag size={20} />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-[#1E3F20] text-base tracking-wide">{item.code}</div>
                        <div className="text-xs text-gray-500 font-medium">{item.name || item.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-gray-900">
                    {item.type === 'PERCENTAGE' ? (
                      <span className="flex items-center gap-1 text-blue-700">
                        <Percent size={14} /> {item.value}% Off
                        {item.maxDiscountAmount ? ` (Cap: ₹${item.maxDiscountAmount})` : ''}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <IndianRupee size={14} /> ₹{item.value.toLocaleString('en-IN')} Flat Off
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    <div>From: {item.validFrom ? new Date(item.validFrom).toLocaleDateString() : 'Immediate'}</div>
                    <div>Until: {item.validUntil ? new Date(item.validUntil).toLocaleDateString() : 'No expiry'}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    <div className="font-medium text-gray-900">
                      {item.usageCount} / {item.usageLimit !== null ? item.usageLimit : '∞'}
                    </div>
                    {item.perCustomerLimit && (
                      <div className="text-[11px] text-gray-400">Max {item.perCustomerLimit}/user</div>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {item.minBookingAmount > 0 && <div>Min Subtotal: ₹{item.minBookingAmount}</div>}
                    {Array.isArray(item.applicablePackages) && item.applicablePackages.length > 0 ? (
                      <div className="text-amber-700 font-medium">{item.applicablePackages.length} package(s)</div>
                    ) : (
                      <div className="text-gray-400">All packages</div>
                    )}
                  </td>
                  <td className="p-4">{renderStatusBadge(item.computedStatus)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1 transition-colors"
                      title="Edit Offer"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Offer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Offer Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold text-[#1E3F20]">
                {editingItem ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Coupon Code *</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="e.g. MONSOON20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Offer Title / Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="e.g. Monsoon Special 20% Off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                  placeholder="e.g. Get 20% off on all day tourism packages during monsoon season"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Discount Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Discount Value {formData.type === 'PERCENTAGE' ? '(%)' : '(₹)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={e => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="0 for uncapped"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Min Subtotal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minBookingAmount}
                    onChange={e => setFormData({ ...formData, minBookingAmount: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="0 for no min"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Global Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={e => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                    placeholder="0 for unlimited"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Per-Customer Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perCustomerLimit}
                    onChange={e => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E3F20]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled / Inactive</option>
                  </select>
                </div>
              </div>

              {/* Applicable Packages Selection */}
              {packagesList.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5 flex items-center gap-1">
                    <Layers size={14} /> Applicable Packages (Leave empty to allow all packages)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                    {packagesList.map(pkg => {
                      const isSelected = formData.applicablePackages.includes(pkg.slug) || formData.applicablePackages.includes(String(pkg.id));
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => togglePackageSelection(pkg.slug)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#1E3F20] text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {pkg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1E3F20] text-white rounded-xl text-sm font-semibold hover:bg-[#2A522C] flex items-center gap-2"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  {editingItem ? 'Save Offer Changes' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
