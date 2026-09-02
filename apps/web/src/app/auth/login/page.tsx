'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
        
        // Fetch user details to determine role
        try {
          const userRes = await api.get('/users/me');
          localStorage.setItem('user', JSON.stringify(userRes.data));
          
          if (userRes.data.role !== 'USER') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/booking';
          }
        } catch (meError) {
          window.location.href = '/booking';
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#FAF9F6] px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-black/5 p-10 border border-[#D4AF37]/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#1E3F20]" />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-[#1E3F20] font-bold">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to manage your bookings</p>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account? <a href="/auth/register" className="text-primary font-medium hover:underline">Register here</a>
        </p>
      </div>
    </div>
  );
}
