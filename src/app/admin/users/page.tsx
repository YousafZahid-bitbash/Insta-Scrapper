"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 }); // Increased to 100
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingCoins, setEditingCoins] = useState<{ userId: string; coins: number } | null>(null);
  const router = useRouter();

  // Logout handler
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/auth/login';
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (response.status === 403) {
        router.push('/auth/login');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoins = async (userId: string, newCoins: number, action: 'set' | 'add') => {
    try {
      const response = await fetch('/api/admin/update-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coins: newCoins, action })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coins');
      }

      // Update the user in the list
      setUsers(users.map(user => 
        user.id === userId ? { ...user, coins: data.user.coins } : user
      ));
      setEditingCoins(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update coins');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'ban' : 'unban';
    const confirmMsg = currentStatus
      ? 'Are you sure you want to ban this user? This will prevent them from logging in.'
      : 'Are you sure you want to unban this user and allow them to log in again?';
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;
    try {
      console.log('🔍 [Frontend] Starting user status toggle...');
      console.log('  - User ID:', userId);
      console.log('  - Current Status (is_active):', currentStatus);
      console.log('  - Will set is_active to:', !currentStatus);
      console.log('  - Action:', currentStatus ? 'BAN' : 'UNBAN');

      const requestBody = {
        userId,
        isActive: !currentStatus
      };
      console.log('🔍 [Frontend] Request body:', requestBody);

      const response = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔍 [Frontend] Response status:', response.status);
      console.log('🔍 [Frontend] Response ok:', response.ok);

      const data = await response.json();
      console.log('🔍 [Frontend] Response data:', data);

      if (!response.ok) {
        console.error('❌ [Frontend] API request failed:', data.error);
        throw new Error(data.error || 'Failed to update user status');
      }

      console.log('✅ [Frontend] User status updated successfully');
      // Update the user in the users list
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );
    } catch (err) {
      console.error('❌ [Frontend] Error in handleUserStatusToggle:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Navigation Header */}
        <nav className="bg-white shadow-xl border-b border-gray-200 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                </div>
                <div className="hidden md:flex space-x-1">
                  <Link href="/admin" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200">
                    Dashboard
                  </Link>
                  <Link href="/admin/users" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                    All Users
                  </Link>
                  <Link href="/admin/stats" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200">
                    Statistics
                  </Link>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
        
        {/* Content */}
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-xl border-b border-gray-200 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
              </div>
              <div className="hidden md:flex space-x-1">
                <Link href="/admin" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200">
                  Dashboard
                </Link>
                <Link href="/admin/users" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                  All Users
                </Link>
                <Link href="/admin/stats" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200">
                  Statistics
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">User Management</h2>
          <p className="text-gray-600">Manage and monitor all registered users</p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6 mb-8">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <input
              type="text"
              placeholder="Search users by email or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 shadow-sm"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Search
            </button>
            
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  fetchUsers();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Users</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Total: {pagination.total} users
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          {user.username && (
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCoins?.userId === user.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editingCoins.coins}
                            onChange={(e) => setEditingCoins({ userId: user.id, coins: parseInt(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => handleUpdateCoins(user.id, editingCoins.coins, 'set')}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCoins(null)}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{user.coins}</span>
                          <button
                            onClick={() => setEditingCoins({ userId: user.id, coins: user.coins })}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {/* TODO: Add admin badge when is_admin column exists */}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? formatDate(user.last_login) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        {/* Coin Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateCoins(user.id, 100, 'add')}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            +100 Coins
                          </button>
                          <button
                            onClick={() => handleUpdateCoins(user.id, 500, 'add')}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            +500 Coins
                          </button>
                        </div>
                        {/* Ban/Unban Actions */}
                        <div>
                          <button
                            onClick={() => handleUserStatusToggle(user.id, user.is_active)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                              user.is_active
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {user.is_active ? 'Ban User' : 'Unban User'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        const current = pagination.page;
                        return page === 1 || page === pagination.totalPages || (page >= current - 2 && page <= current + 2);
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    
  );
}
