"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import ConfirmationModal from '@/components/ConfirmationModal';
import AdminNavbar from '@/components/AdminNavbar';
import UserDetailsModal from '@/components/UserDetailsModal';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  todayUsers: number;
  activeWeekUsers: number;
  totalCoins: number;
}

interface RecentUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  coins: number;
  last_login: string | null;
  is_active: boolean;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDetailsModal, setUserDetailsModal] = useState<{
    isOpen: boolean;
    user: RecentUser | null;
  }>({
    isOpen: false,
    user: null
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    userId: string;
    currentStatus: boolean;
    username: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    userId: '',
    currentStatus: true,
    username: '',
    isLoading: false
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // Ignore errors, proceed to clear client state
    }
    localStorage.clear();
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/auth/login';
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (response.status === 403) {
        router.push('/auth/login');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data.stats);
      setRecentUsers(data.recentUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    // Auth check: only allow admin
    if (user && !user.is_admin) {
      router.replace('/auth/login');
    }
  }, [user, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUserStatusToggle = (userId: string, currentStatus: boolean, username: string) => {
    setConfirmationModal({
      isOpen: true,
      userId,
      currentStatus,
      username,
      isLoading: false
    });
  };

  const handleUserDetailsClick = (user: RecentUser) => {
    setUserDetailsModal({
      isOpen: true,
      user
    });
  };

  const closeUserDetailsModal = () => {
    setUserDetailsModal({
      isOpen: false,
      user: null
    });
  };

  const confirmUserStatusToggle = async () => {
    const { userId, currentStatus } = confirmationModal;
    
    setConfirmationModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isActive: !currentStatus
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      // Update the user in the recent users list
      setRecentUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );

      // Refresh stats to update active user count
      fetchStats();
      
      // Close modal
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConfirmationModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminNavbar onLogout={handleLogout} />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-gray-600 font-medium">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminNavbar onLogout={handleLogout} />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto py-8 px-6">
          <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AdminNavbar onLogout={handleLogout} />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your platform today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New Today</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats?.todayUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active This Week</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats?.activeWeekUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Coins</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats?.totalCoins?.toLocaleString() || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="mt-12 bg-white shadow-lg overflow-hidden rounded-xl border border-gray-100">
          <div className="px-4 sm:px-6 py-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Users</h3>
            <p className="mt-1 text-sm text-gray-600">Latest user registrations</p>
          </div>
          
          {/* Desktop List */}
          <div className="hidden md:block">
            <ul className="divide-y divide-gray-100">
              {recentUsers.map((user) => (
                <li key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                            <span className="text-lg font-semibold text-white">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="text-sm font-semibold text-gray-900">{user.email}</div>
                            {user.username && (
                              <div className="ml-2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">@{user.username}</div>
                            )}
                            <div className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Banned'}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Joined {formatDate(user.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-900 bg-yellow-50 px-3 py-1 rounded-full">
                          <span className="font-semibold">{user.coins}</span> coins
                        </div>
                        {user.last_login && (
                          <div className="text-xs text-gray-500">
                            Last login: {formatDate(user.last_login)}
                          </div>
                        )}
                        <button
                          onClick={() => handleUserStatusToggle(user.id, user.is_active, user.username)}
                          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                            user.is_active
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                              : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          {user.is_active ? 'Ban User' : 'Unban User'}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <div className="space-y-4 p-4">
              {recentUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleUserDetailsClick(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                            <span className="text-sm font-semibold text-white">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{user.email}</div>
                          {user.username && (
                            <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Banned'}
                            </span>
                            <span className="text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded-full">
                              {user.coins} coins
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => handleUserStatusToggle(user.id, user.is_active, user.username)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                          user.is_active
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {user.is_active ? 'Ban' : 'Unban'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={userDetailsModal.isOpen}
        onClose={closeUserDetailsModal}
        user={userDetailsModal.user}
        onToggleStatus={(userId, username, currentStatus) => handleUserStatusToggle(userId, currentStatus, username)}
        isLoading={confirmationModal.isLoading}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={confirmUserStatusToggle}
        title={confirmationModal.currentStatus ? 'Ban User' : 'Unban User'}
        message={
          confirmationModal.currentStatus
            ? `Are you sure you want to ban "${confirmationModal.username}"? This will prevent them from logging in and accessing the platform.`
            : `Are you sure you want to unban "${confirmationModal.username}"? This will restore their access to the platform.`
        }
        confirmText={confirmationModal.currentStatus ? 'Ban User' : 'Unban User'}
        cancelText="Cancel"
        type={confirmationModal.currentStatus ? 'ban' : 'unban'}
        isLoading={confirmationModal.isLoading}
      />
    </div>
  );
}
