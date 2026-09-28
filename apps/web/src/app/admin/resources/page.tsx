'use client';

import React, { useEffect, useState, useMemo } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Building2,
  Users,
  ShieldAlert,
  Power,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface ResourceItem {
  id: number;
  name: string;
  type: string;
  capacity: number;
  description?: string | null;
  active: boolean;
  _count?: {
    bookingResources: number;
  };
}

const RESOURCE_TYPES = ['CAPACITY', 'VENUE', 'DINING', 'FACILITY', 'PARKING'];

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CAPACITY',
    capacity: 100,
    description: '',
    active: true,
  });

  // User role for UI controls
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role);
      } catch (e) {}
    }
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin dashboard requests all resources (both active and inactive)
      const res = await api.get('/resources?includeInactive=true');
      setResources(res.data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to load resources. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = resources.length;
    const activeList = resources.filter((r) => r.active);
    const inactiveList = resources.filter((r) => !r.active);
    const totalCapacity = activeList.reduce((acc, r) => acc + (r.capacity || 0), 0);
    return {
      total,
      activeCount: activeList.length,
      inactiveCount: inactiveList.length,
      totalCapacity,
    };
  }, [resources]);

  // Filtered List
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !r.active) return false;
      if (statusFilter === 'INACTIVE' && r.active) return false;

      // Type filter
      if (typeFilter !== 'ALL' && r.type.toUpperCase() !== typeFilter.toUpperCase()) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesDesc = r.description?.toLowerCase().includes(query);
        const matchesType = r.type.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesType) return false;
      }

      return true;
    });
  }, [resources, statusFilter, typeFilter, searchQuery]);

  // Modal Handlers
  const openCreateModal = () => {
    setModalMode('CREATE');
    setEditingId(null);
    setFormData({
      name: '',
      type: 'CAPACITY',
      capacity: 100,
      description: '',
      active: true,
    });
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ResourceItem) => {
    setModalMode('EDIT');
    setEditingId(item.id);
    setFormData({
      name: item.name,
      type: item.type,
      capacity: item.capacity,
      description: item.description || '',
      active: item.active,
    });
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'CAPACITY',
      capacity: 100,
      description: '',
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Resource name is required.');
      return;
    }
    if (formData.capacity < 1) {
      setError('Capacity must be at least 1 person.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (modalMode === 'CREATE') {
        const payload = {
          name: formData.name.trim(),
          type: formData.type.trim().toUpperCase(),
          capacity: Number(formData.capacity),
          description: formData.description.trim() || undefined,
          active: formData.active,
        };
        await api.post('/resources', payload);
        setSuccessMessage(`Resource '${payload.name}' created successfully.`);
      } else if (editingId) {
        const payload = {
          name: formData.name.trim(),
          type: formData.type.trim().toUpperCase(),
          capacity: Number(formData.capacity),
          description: formData.description.trim() || undefined,
          active: formData.active,
        };
        await api.patch(`/resources/${editingId}`, payload);
        setSuccessMessage(`Resource '${payload.name}' updated successfully.`);
      }

      closeModal();
      await fetchResources();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to save resource.'));
    } finally {
      setSaving(false);
    }
  };

  // Quick Active/Inactive Toggle
  const handleToggleActive = async (item: ResourceItem) => {
    const nextState = !item.active;
    const actionLabel = nextState ? 'activate' : 'deactivate';

    if (
      !nextState &&
      (item.type === 'CAPACITY' || item.name.toLowerCase() === 'general day tourism')
    ) {
      const otherActive = resources.filter(
        (r) =>
          r.id !== item.id &&
          r.active &&
          (r.type === 'CAPACITY' || r.name.toLowerCase().includes('tourism')),
      );
      if (otherActive.length === 0) {
        alert(
          'Cannot deactivate the sole primary capacity resource! An alternate active capacity resource must exist.',
        );
        return;
      }
    }

    if (!confirm(`Are you sure you want to ${actionLabel} "${item.name}"?`)) {
      return;
    }

    try {
      await api.patch(`/resources/${item.id}`, { active: nextState });
      setSuccessMessage(`Resource '${item.name}' ${nextState ? 'activated' : 'deactivated'}.`);
      fetchResources();
    } catch (err: any) {
      alert(getApiErrorMessage(err, `Failed to ${actionLabel} resource.`));
    }
  };

  // Delete / Soft-Deactivate Handler
  const handleDelete = async (item: ResourceItem) => {
    const bookingsCount = item._count?.bookingResources ?? 0;
    const isPrimaryCapacity =
      item.type === 'CAPACITY' || item.name.toLowerCase() === 'general day tourism';

    if (isPrimaryCapacity) {
      const otherActive = resources.filter(
        (r) =>
          r.id !== item.id &&
          r.active &&
          (r.type === 'CAPACITY' || r.name.toLowerCase().includes('tourism')),
      );
      if (otherActive.length === 0) {
        alert(
          'Cannot delete or deactivate the sole active primary capacity resource. Ensure an alternate active capacity space exists first.',
        );
        return;
      }
    }

    let confirmPrompt = `Are you sure you want to delete "${item.name}"?`;
    if (bookingsCount > 0) {
      confirmPrompt = `"${item.name}" has ${bookingsCount} historical booking records.\n\nTo preserve historical integrity and financial audit trails, this resource will be deactivated rather than deleted.\n\nProceed with deactivation?`;
    }

    if (!confirm(confirmPrompt)) return;

    setDeletingId(item.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.delete(`/resources/${item.id}`);
      if (res.data?.deactivated) {
        setSuccessMessage(
          res.data.message || `Resource '${item.name}' was deactivated to preserve historical bookings.`,
        );
      } else {
        setSuccessMessage(`Resource '${item.name}' was deleted successfully.`);
      }
      fetchResources();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to delete or deactivate resource.'));
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CAPACITY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VENUE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DINING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PARKING':
      case 'FACILITY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-serif text-[#1E3F20]">Resources & Spaces</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              Phase 18F
            </span>
          </div>
          <p className="text-gray-600 mt-1 text-sm">
            Manage physical spaces, guest capacities, operational constraints, and historical records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            title="Refresh resources list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#1E3F20] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A522C] transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700">
            <Building2 size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spaces</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl text-green-700">
            <Power size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Spaces</div>
            <div className="text-2xl font-bold text-green-700 mt-0.5">{stats.activeCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-700">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Active Capacity</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.totalCapacity.toLocaleString()} pax</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-xl text-gray-600">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inactive / Preserved</div>
            <div className="text-2xl font-bold text-gray-600 mt-0.5">{stats.inactiveCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-2 w-full md:max-w-md bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by space name, description, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-gray-800 placeholder-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({resources.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({stats.activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inactive ({stats.inactiveCount})
            </button>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Resources Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={28} className="animate-spin mx-auto text-[#1E3F20] mb-3" />
            <p className="text-sm font-medium">Loading resources and capacity spaces...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-12 text-center">
            <Layers size={36} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-medium text-gray-900">No resources found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try adjusting your search query or filter options.'
                : 'Get started by adding your first resource or venue.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="mt-4 px-4 py-2 text-sm text-[#1E3F20] font-medium bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Resource / Space</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Historical Bookings</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResources.map((item) => {
                  const bookingCount = item._count?.bookingResources ?? 0;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.active ? 'hover:bg-gray-50/60' : 'bg-gray-50/30 hover:bg-gray-50/80 text-gray-500'
                      }`}
                    >
                      {/* Name & Description */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              item.active
                                ? 'bg-emerald-50/80 text-[#1E3F20] border-emerald-100'
                                : 'bg-gray-100 text-gray-400 border-gray-200'
                            }`}
                          >
                            <Building2 size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              <span>{item.name}</span>
                              {(item.type === 'CAPACITY' || item.name === 'General Day Tourism') && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Primary
                                </span>
                              )}
                            </div>
                            {item.description ? (
                              <div className="text-xs text-gray-500 mt-0.5 max-w-md line-clamp-1">
                                {item.description}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic mt-0.5">No description</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeBadgeStyle(
                            item.type,
                          )}`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <span>{item.capacity.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 font-normal ml-1">pax</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            item.active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Click to ${item.active ? 'deactivate' : 'activate'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.active ? 'bg-green-600 animate-pulse' : 'bg-gray-500'
                            }`}
                          />
                          <span>{item.active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Historical Bookings Count */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Users size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-900">{bookingCount}</span>
                          <span>bookings</span>
                          {!item.active && bookingCount > 0 && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                              Preserved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit resource"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={
                              bookingCount > 0
                                ? 'Deactivate (preserves historical bookings)'
                                : 'Delete resource'
                            }
                          >
                            {deletingId === item.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-serif text-[#1E3F20] font-semibold">
                  {modalMode === 'CREATE' ? 'Add New Resource' : 'Edit Resource'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure space constraints and booking availability.
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Resource Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Resource / Space Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. River Mist Grounds, Grand Banquet Lawn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Type and Capacity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category / Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="CUSTOM">OTHER / CUSTOM</option>
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Capacity (Pax) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description / Amenities
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes about location, sound rules, AC, parking capacity..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Active Status</div>
                  <div className="text-xs text-gray-500">
                    Inactive spaces cannot be reserved for new bookings.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E3F20]"></div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1E3F20] text-white rounded-lg text-sm font-medium hover:bg-[#2A522C] transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{modalMode === 'CREATE' ? 'Create Space' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
