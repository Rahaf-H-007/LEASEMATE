'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { Pie } from 'react-chartjs-2';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'landlord' | 'tenant' | 'admin';
  verificationStatus?: {
    status: 'pending' | 'approved' | 'rejected';
    uploadedIdUrl?: string;
    selfieUrl?: string;
  };
  createdAt: string;
}

interface AbusiveUser {
  _id: string;
  name: string;
  phone?: string;
  role: 'landlord' | 'tenant';
  abusiveCommentsCount: number;
  isBlocked?: boolean;
}

export default function AdminDashboard() {
  const { user, token, logout, isLoading: authLoading, socket } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6; // Number of users per page
 
  const [activeTab, setActiveTab] = useState<'table' | 'dashboard' | 'images' | 'abusive' | 'support'| 'subscriptions' | 'available' | 'maintenance' | 'booked'>('table');
  
  // Sidebar collapse states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSupportSidebarCollapsed, setIsSupportSidebarCollapsed] = useState(false);

  // State for pending images (now pending units)
  const [pendingUnits, setPendingUnits] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageActionLoading, setImageActionLoading] = useState<string | null>(null);
  // State for unit review modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingRejectUnit, setPendingRejectUnit] = useState<any>(null);
  // State for image preview modal
  const [selectedImage, setSelectedImage] = useState<null | { url: string; unitName: string; ownerName?: string }>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [abusiveUsers, setAbusiveUsers] = useState<AbusiveUser[]>([]);
  const [loadingAbusive, setLoadingAbusive] = useState(false);
  
  // Support chat state
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [loadingSupportChats, setLoadingSupportChats] = useState(false);
  const [selectedSupportChat, setSelectedSupportChat] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportText, setSupportText] = useState('');
  
  // Support search state
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // State for subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null);
  const [subscriptionSearchId, setSubscriptionSearchId] = useState<string>('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  
  // State for refund confirmation modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [pendingRefundSubscription, setPendingRefundSubscription] = useState<any>(null);

  // State for units tabs
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [maintenanceUnits, setMaintenanceUnits] = useState<any[]>([]);
  const [bookedUnits, setBookedUnits] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [loadingBooked, setLoadingBooked] = useState(false);

  // Search state for units tabs
  const [availableSearch, setAvailableSearch] = useState('');
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [bookedSearch, setBookedSearch] = useState('');

  // Check admin access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
    
    // Handle URL parameters for tab switching
    const tabParam = searchParams.get('tab');
    if (tabParam && ['table', 'dashboard', 'images', 'abusive', 'support', 'subscriptions', 'available', 'maintenance', 'booked'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [user?.role, authLoading, router, searchParams]);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchUsers();
      fetchAbusiveUsers();
    }
  }, [token, user?.role]);

  // Fetch units when their respective tabs are active
  useEffect(() => {
    if (token && user?.role === 'admin') {
      if (activeTab === 'available') {
        fetchAvailableUnits();
      } else if (activeTab === 'maintenance') {
        fetchMaintenanceUnits();
      } else if (activeTab === 'booked') {
        fetchBookedUnits();
      }
    }
  }, [activeTab, token, user?.role]);

  const fetchSupportChats = useCallback(async () => {
    if (!token) return;
    setLoadingSupportChats(true);
    try {
      const response = await fetch('http://localhost:5000/api/support-chat/admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSupportChats(data || []);
    } catch (error) {
      console.error('Error fetching support chats:', error);
      setSupportChats([]);
    } finally {
      setLoadingSupportChats(false);
    }
  }, [token]);

  // Search users for support chat
  const searchUsersForSupport = async (query: string) => {
    if (!token || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Filter users from existing users state
      const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase()) ||
        user.phone?.includes(query)
      );
      
      // Filter out admin users and only show landlords and tenants
      const nonAdminUsers = filteredUsers.filter(user => user.role !== 'admin');
      setSearchResults(nonAdminUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      toast.error('حدث خطأ أثناء البحث عن المستخدمين');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user selection for support chat
  const handleUserSelectForSupport = async (selectedUser: User) => {
    if (!token) return;
    
    try {
      // Check if support chat already exists for this user
      const existingChat = supportChats.find(chat => chat.user?._id === selectedUser._id);
      
      if (existingChat) {
        // If chat exists, select it
        handleSelectSupportChat(existingChat);
        toast.success(`تم فتح المحادثة مع ${selectedUser.name}`);
      } else {
        // Create new support chat
        const response = await fetch('http://localhost:5000/api/support-chat/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: selectedUser._id,
            text: ''
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Refresh support chats to include the new one
          await fetchSupportChats();
          
          // Find the newly created chat and select it
          setTimeout(async () => {
            const updatedChats = await fetch('http://localhost:5000/api/support-chat/admin', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }).then(res => res.json());
            
            const newChat = updatedChats.find((chat: any) => chat.user?._id === selectedUser._id);
            if (newChat) {
              handleSelectSupportChat(newChat);
              toast.success(`تم إنشاء محادثة جديدة مع ${selectedUser.name}`);
            }
          }, 500);
        } else {
          toast.error('حدث خطأ أثناء إنشاء المحادثة');
        }
      }
      
      // Clear search
      setSupportSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating/selecting support chat:', error);
      toast.error('حدث خطأ أثناء إنشاء المحادثة');
    }
  };

  // Fetch support chats when admin loads the page to show unread count
  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchSupportChats();
    }
  }, [token, user?.role, fetchSupportChats]);

  // Search users when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (supportSearchQuery.trim()) {
        searchUsersForSupport(supportSearchQuery);
        setSelectedSearchIndex(-1); // Reset selection when query changes
      } else {
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [supportSearchQuery, users]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!searchResults.length) return;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSearchIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
            handleUserSelectForSupport(searchResults[selectedSearchIndex]);
          }
          break;
        case 'Escape':
          setSearchResults([]);
          setSelectedSearchIndex(-1);
          setSupportSearchQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchResults, selectedSearchIndex]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await apiService.getUsers(token) as { users: User[] };
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationAction = async (userId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      await apiService.updateVerificationStatus(userId, action, token);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  // Fetch pending images for admin
  const fetchPendingImages = async () => {
    if (!token) return;
    setLoadingImages(true);
    try {
      const res = await apiService.getPendingUnitsWithDetails(token) as { data: { pendingUnits?: any[] } };
      setPendingUnits(res.data.pendingUnits || []);
    } catch (err) {
      setPendingUnits([]);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'images' && token && user?.role === 'admin') {
      fetchPendingImages();
    }
  }, [activeTab, token, user?.role]);

  useEffect(() => {
    if (activeTab === 'subscriptions' && token && user?.role === 'admin') {
      fetchSubscriptions();
    }
  }, [activeTab, token, user]);

  const handleImageReview = async (unitId: string, imageUrl: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setImageActionLoading(unitId + imageUrl + action);
    try {
      await apiService.reviewUnitImage({ unitId, imageUrl, action, token });
      // Remove image from list after action
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Approve unit handler
  const handleApproveUnit = async (unitId: string) => {
    if (!token) return;
    setImageActionLoading(unitId + 'approve');
    try {
      await apiService.approveUnit({ unitId, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Approve all images for a unit
  const handleApproveAll = async (unitId: string) => {
    if (!token) return;
    setImageActionLoading(unitId + 'approveAll');
    try {
      await apiService.approveAllUnitImages({ unitId, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== unitId));
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Reject unit handler (open modal)
  const handleRejectUnitClick = (unit: any) => {
    setPendingRejectUnit(unit);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Reject all images for a unit (open modal)
  const handleRejectAllClick = (unit: any) => {
    setPendingRejectUnit(unit);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Confirm reject unit
  const handleRejectUnitConfirm = async () => {
    if (!token || !pendingRejectUnit) return;
    setImageActionLoading(pendingRejectUnit.unitId + 'reject');
    try {
      await apiService.rejectUnit({ unitId: pendingRejectUnit.unitId, reason: rejectReason, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== pendingRejectUnit.unitId));
      setShowRejectModal(false);
      setPendingRejectUnit(null);
      setRejectReason('');
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  // Confirm reject all images
  const handleRejectAllConfirm = async () => {
    if (!token || !pendingRejectUnit) return;
    setImageActionLoading(pendingRejectUnit.unitId + 'rejectAll');
    try {
      await apiService.rejectAllUnitImages({ unitId: pendingRejectUnit.unitId, reason: rejectReason, token });
      setPendingUnits((prev) => prev.filter(unit => unit.unitId !== pendingRejectUnit.unitId));
      setShowRejectModal(false);
      setPendingRejectUnit(null);
      setRejectReason('');
    } catch (err) {
      // handle error
    } finally {
      setImageActionLoading(null);
    }
  };

  const fetchAbusiveUsers = async () => {
    if (!token) return;
    setLoadingAbusive(true);
    try {
      const res = await apiService.getAbusiveUsers(token);
      setAbusiveUsers(res.users || []);
    } catch (err) {
      setAbusiveUsers([]);
    } finally {
      setLoadingAbusive(false);
    }
  };

  const fetchAvailableUnits = async () => {
    if (!token) return;
    setLoadingAvailable(true);
    try {
      const res = await apiService.getAvailableUnits(token);
      setAvailableUnits(res.data.units || []);
    } catch (err) {
      setAvailableUnits([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const fetchMaintenanceUnits = async () => {
    if (!token) return;
    setLoadingMaintenance(true);
    try {
      const res = await apiService.getMaintenanceUnits(token);
      setMaintenanceUnits(res.data.units || []);
    } catch (err) {
      setMaintenanceUnits([]);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const fetchBookedUnits = async () => {
    if (!token) return;
    setLoadingBooked(true);
    try {
      const res = await apiService.getBookedUnits(token);
      setBookedUnits(res.data.units || []);
    } catch (err) {
      setBookedUnits([]);
    } finally {
      setLoadingBooked(false);
    }
  };

  // fetching the subscription
  const fetchSubscriptions = async () => {
    if (!token) return;
    setLoadingSubscriptions(true);
    try {
      const res = await apiService.getSubscriptions(token);
      setSubscriptions(res.subscriptions || []);
    } catch (err: any) {
      setSubscriptions([]);
      toast.error(err.message || 'حدث خطأ أثناء جلب الاشتراكات');
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleRefundSubscription = async (subscriptionId: string) => {
    if (!token) return;
    
    // Find the subscription to show in modal
    const subscription = subscriptions.find(sub => sub._id === subscriptionId);
    if (subscription) {
      setPendingRefundSubscription(subscription);
      setShowRefundModal(true);
    }
  };

  const confirmRefundSubscription = async () => {
    if (!token || !pendingRefundSubscription) return;
    
    setRefundLoadingId(pendingRefundSubscription._id);
    try {
      const result = await apiService.refundSubscription(pendingRefundSubscription._id, token);
      // Update local state immediately for better UX
      setSubscriptions(prev => prev.map(sub => {
        if (sub._id === pendingRefundSubscription._id) {
          return {
            ...sub,
            status: 'refunded',
            refunded: true
          };
        }
        return sub;
      }));
      toast.success(result.message || 'تم استرداد الاشتراك بنجاح');
      setShowRefundModal(false);
      setPendingRefundSubscription(null);
    } catch (err: any) {
      console.error('Error refunding subscription:', err);
      toast.error(err.message || 'حدث خطأ أثناء استرداد الاشتراك');
    } finally {
      setRefundLoadingId(null);
    }
  };
  // Handle new support messages from socket - optimized to prevent unnecessary re-fetches
  useEffect(() => {
    if (!socket) return;

    const handleNewSupportMessage = (msg: any) => {
      console.log('🟢 Admin received new support message:', msg);
      
      // Update messages if we're in the correct chat
      if (selectedSupportChat && msg.chatId === selectedSupportChat._id) {
        setSupportMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(existingMsg => 
            existingMsg._id === msg._id || 
            (existingMsg.sender === msg.senderId && existingMsg.text === msg.text)
          );
          
          if (messageExists) {
            console.log('🟡 Message already exists, skipping duplicate');
            return prev;
          }
          
          // Replace optimistic message with real message if it exists
          const hasOptimistic = prev.some(m => m._id?.startsWith('temp-') && m.text === msg.text && m.sender === msg.senderId);
          if (hasOptimistic) {
            console.log('🔄 Replacing optimistic message with real message');
            return prev.map(m => 
              m._id?.startsWith('temp-') && m.text === msg.text && m.sender === msg.senderId
                ? { _id: msg._id, sender: msg.senderId, text: msg.text, createdAt: msg.createdAt }
                : m
            );
          }
          
          console.log('✅ Adding new message to admin chat');
          return [...prev, {
            _id: msg._id || `temp-${Date.now()}`,
            sender: msg.senderId,
            text: msg.text,
            createdAt: msg.createdAt || new Date().toISOString()
          }];
        });
      }
      
      // Update the chat list without full re-fetch to prevent "uploading itself"
      setSupportChats(prev => {
        return prev.map(chat => {
          if (chat._id === msg.chatId) {
            return {
              ...chat,
              lastMessage: msg.text,
              lastMessageAt: msg.createdAt || new Date().toISOString(),
              unreadCount: chat.unreadCount + (msg.senderId !== user?._id ? 1 : 0)
            };
          }
          return chat;
        });
      });
    };

    socket.on('newSupportMessage', handleNewSupportMessage);

    return () => {
      socket.off('newSupportMessage', handleNewSupportMessage);
    };
  }, [socket, selectedSupportChat, user?._id]);





  const handleSupportMessageSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportText.trim() || !selectedSupportChat || !token) return;
    
    console.log('🟢 Admin sending message:', supportText, 'to chat:', selectedSupportChat._id);
    
    try {
      // Add optimistic message first
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        sender: user?._id,
        text: supportText,
        createdAt: new Date().toISOString()
      };
      setSupportMessages(prev => [...prev, optimisticMessage]);
      
      // Send message via Socket.IO (it will save to database and broadcast)
      if (socket) {
        socket.emit('sendSupportMessage', {
          chatId: selectedSupportChat._id,
          senderId: user?._id,
          text: supportText
        });
      }
      
      setSupportText('');
    } catch (error) {
      console.error('❌ Error sending admin message:', error);
      // Remove optimistic message on error
      setSupportMessages(prev => prev.filter(msg => msg._id !== `temp-${Date.now()}`));
    }
  }, [supportText, selectedSupportChat, token, user?._id, socket]);

  const handleSelectSupportChat = useCallback((chat: any) => {
    console.log('🟢 Admin selecting support chat:', chat._id);
    setSelectedSupportChat(chat);
    // Join the support chat room
    if (socket) {
      console.log('🟢 Admin joining support chat room:', chat._id);
      socket.emit('joinSupportChat', chat._id);
    }
    // Fetch messages for this chat with retry logic
    console.log('📨 Admin fetching messages for chat:', chat._id);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/support-chat/${chat._id}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📨 Admin fetched messages:', data.length, 'messages');
          console.log('📝 Messages details:', data.map((m: any) => ({ id: m._id, sender: m.sender, text: m.text.substring(0, 30) })));
          setSupportMessages(data);
          
          // Mark messages as read when opening chat
          if (token && user?._id) {
            fetch(`http://localhost:5000/api/support-chat/${chat._id}/read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ userId: user._id })
            }).then(() => {
              console.log('✅ Messages marked as read');
              // Update unread count in chat list
              setSupportChats(prev => prev.map(c => 
                c._id === chat._id ? { ...c, unreadCount: 0 } : c
              ));
            }).catch(err => console.error('❌ Error marking messages as read:', err));
          }
        } else {
          console.error('❌ Failed to fetch messages:', response.status);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Retrying fetch messages (${retryCount}/${maxRetries})...`);
            setTimeout(fetchMessages, 1000); // Retry after 1 second
          }
        }
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying fetch messages (${retryCount}/${maxRetries})...`);
          setTimeout(fetchMessages, 1000); // Retry after 1 second
        }
      }
    };
    
    fetchMessages();
  }, [socket, token, user?._id]);

  const filteredUsers = users.filter(user => {
    const statusMatch = selectedStatus === 'all' || user.verificationStatus?.status === selectedStatus;
    const roleMatch = selectedRole === 'all' || user.role === selectedRole;
    return statusMatch && roleMatch;
  });

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  // استبعاد الأدمن من الظهور في الجدول
  const filteredNonAdminUsers = filteredUsers.filter(user => user.role !== 'admin');
  const currentUsers = filteredNonAdminUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredNonAdminUsers.length / usersPerPage);

  // Stats for dashboard
  const pendingCount = users.filter(u => u.verificationStatus?.status === 'pending').length;
  const approvedCount = users.filter(u => u.verificationStatus?.status === 'approved').length;
  const rejectedCount = users.filter(u => u.verificationStatus?.status === 'rejected').length;
  const totalUsers = users.length;
  const totalLandlords = users.filter(u => u.role === 'landlord').length;
  const totalTenants = users.filter(u => u.role === 'tenant').length;

  // Pie chart data
  const pieData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [
      {
        data: [pendingCount, approvedCount, rejectedCount],
        backgroundColor: [
          'rgba(251, 191, 36, 0.7)', // yellow
          'rgba(34, 197, 94, 0.7)',  // green
          'rgba(239, 68, 68, 0.7)',  // red
        ],
        borderColor: [
          'rgba(251, 191, 36, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-inset ring-green-200">
            تم التأكيد
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
            قيد الانتظار
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
            تم الرفض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200">
            لم يتم التقديم
          </span>
        );
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className={`relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>
      <div className="flex h-full grow">
        {/* Sidebar */}
        <aside className={`flex flex-col w-64 border-r p-6 shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-8">
            <Logo size={80} />
          </div>
          
          <nav className="flex flex-col gap-2">
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg className={`${activeTab === 'dashboard' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <p className="text-sm font-semibold">لوحة التحكم</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'table' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('table')}
            >
              <svg className={`${activeTab === 'table' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
              </svg>
              <p className="text-sm font-medium">جدول المستخدمين</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'images' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('images')}
            >
              <svg className={`${activeTab === 'images' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-2 0H5V5h14ZM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5Z" />
              </svg>
              <p className="text-sm font-semibold">مراجعة الشقق</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'abusive' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('abusive')}
            >
              <svg className={`${activeTab === 'abusive' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p className="text-sm font-semibold">المستخدمون المسيئون</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'available' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('available')}
            >
              <svg className={`${activeTab === 'available' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              </svg>
              <p className="text-sm font-semibold">الشقق المتاحة</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'maintenance' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('maintenance')}
            >
              <svg className={`${activeTab === 'maintenance' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
              </svg>
              <p className="text-sm font-semibold">الشقق تحت الصيانة</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'booked' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('booked')}
            >
              <svg className={`${activeTab === 'booked' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <p className="text-sm font-semibold">الشقق المحجوزة</p>
            </button>
            {/* اشتراكات */}
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'subscriptions' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              <svg className={`${activeTab === 'subscriptions' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <p className="text-sm font-semibold">اشتراكات الملاك</p>
            </button>
            <button
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors relative ${activeTab === 'support' ? (isDarkMode ? 'bg-orange-900 text-orange-300 font-semibold' : 'bg-orange-50 text-orange-600 font-semibold') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100')}`}
              onClick={() => setActiveTab('support')}
            >
              <svg className={`${activeTab === 'support' ? 'text-orange-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <p className="text-sm font-semibold">رسائل دعم المستخدمين</p>
              {supportChats.some(chat => chat.unreadCount > 0) && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {supportChats.reduce((total, chat) => total + (chat.unreadCount || 0), 0)}
                </span>
              )}
            </button>
          
          </nav>
          
          <div className="mt-auto">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors w-full mb-2 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100'}`}
            >
              {isDarkMode ? (
                <svg className="text-yellow-400" fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                  <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                </svg>
              ) : (
                <svg className="text-gray-600" fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM6.166 17.834a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 10-1.06-1.061l-1.591 1.59zM2.25 12a.75.75 0 01.75-.75H5a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zM6.166 6.166a.75.75 0 001.06-1.06L5.636 3.515a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              )}
              <p className="text-sm font-medium">{isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</p>
            </button>
            
            <button
              onClick={() => {
                logout();
                router.push('/auth/login');
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors w-full ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100'}`}
            >
              <svg className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} fill="currentColor" height="24px" viewBox="0 0 24 24" width="24px">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <p className="text-sm font-medium">تسجيل الخروج</p>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-8 overflow-y-auto h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-orange-50'}`}>
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="flex flex-col items-center gap-8">
                <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>لوحة التحكم</h1>
                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-8">
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalUsers}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>إجمالي المستخدمين</p>
                  </div>
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalLandlords}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>المالكون</p>
                  </div>
                  <div className={`rounded-xl shadow p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-orange-600 mb-2">{totalTenants}</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>المستأجرون</p>
                  </div>
                </div>
                {/* Pie Chart */}
                <div className={`rounded-xl shadow p-8 w-full max-w-xl flex flex-col items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>توزيع حالة التأكيد</h2>
                  <Pie data={pieData} />
                </div>
              </div>
            ) : activeTab === 'images' ? (
              <div>
                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>مراجعة الشقق المعلقة</h1>
                {loadingImages ? (
                  <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري التحميل...</div>
                ) : pendingUnits.length === 0 ? (
                  <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد شقق قيد المراجعة حالياً</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {pendingUnits.map((unit) => (
                      <div key={unit.unitId} className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        {/* Unit Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unit.unitName}</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              المالك: {unit.owner?.name || 'غير محدد'}
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              نوع الوحدة: {unit.type === 'apartment' ? 'شقة' : 'فيلا'}
                            </p>
                          </div>
                                           <div className={`text-right ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                   <div className="text-2xl font-bold">{unit.pricePerMonth}</div>
                   <div className="text-sm">جنية/شهر</div>
                 </div>
                        </div>

                        {/* Unit Details */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>العنوان:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.address}</p>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المدينة:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.city}</p>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المحافظة:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.governorate}</p>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>عدد الغرف:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.numRooms}</p>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المساحة:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.space} م²</p>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>التأمين:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.securityDeposit || 0} دينار</p>
                          </div>
                        </div>

                        {/* Amenities */}
                        <div className="mb-4">
                          <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المرافق:</p>
                          <div className="flex flex-wrap gap-2">
                            {unit.isFurnished && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>مؤثثة</span>}
                            {unit.hasAC && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>مكيف</span>}
                            {unit.hasWifi && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>واي فاي</span>}
                            {unit.hasTV && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-800'}`}>تلفاز</span>}
                            {unit.hasKitchenware && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>أدوات مطبخ</span>}
                            {unit.hasHeating && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'}`}>تدفئة</span>}
                            {unit.hasPool && <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>مسبح</span>}
                          </div>
                        </div>

                        {/* Description */}
                        {unit.description && (
                          <div className="mb-4">
                            <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>الوصف:</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-3`}>{unit.description}</p>
                          </div>
                        )}

                        {/* Images */}
                        <div className="mb-4">
                          <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>الصور المعلقة:</p>
                          <div className="flex gap-2 flex-wrap">
                            {unit.images.map((img: any, idx: number) => (
                              <img
                                key={idx}
                                src={img.url}
                                alt="صورة"
                                className="w-20 h-16 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  setSelectedImage({ url: img.url, unitName: unit.unitName, ownerName: unit.owner?.name });
                                  setShowImageModal(true);
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 text-sm"
                            disabled={imageActionLoading === unit.unitId + 'approveAll'}
                            onClick={() => handleApproveAll(unit.unitId)}
                          >
                            {imageActionLoading === unit.unitId + 'approveAll' ? '...' : 'موافقة على كل الصور'}
                          </button>
                          <button
                            type="button"
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 text-sm"
                            disabled={imageActionLoading === unit.unitId + 'rejectAll'}
                            onClick={() => handleRejectAllClick(unit)}
                          >
                            {imageActionLoading === unit.unitId + 'rejectAll' ? '...' : 'رفض كل الصور'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
               {/* مودال سبب الرفض */}
               {showRejectModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                   <div className={`rounded-xl shadow-xl p-8 max-w-md w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                     <button
                       className={`absolute top-3 left-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                       onClick={() => setShowRejectModal(false)}
                       aria-label="إغلاق"
                     >
                       ×
                     </button>
                     <h2 className="text-xl font-bold mb-4 text-red-600 text-center">سبب رفض الإعلان</h2>
                     <textarea
                       className={`w-full px-3 py-2 rounded-lg border mb-4 ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                       rows={3}
                       placeholder="اكتب سبب الرفض هنا..."
                       value={rejectReason}
                       onChange={e => setRejectReason(e.target.value)}
                     />
                     <div className="flex gap-4 mt-6">
                       <button
                         className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                         onClick={() => setShowRejectModal(false)}
                         type="button"
                       >
                         إلغاء
                       </button>
                       <button
                         className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
                         onClick={handleRejectAllConfirm}
                         type="button"
                         disabled={!rejectReason.trim() || imageActionLoading === (pendingRejectUnit?.unitId + 'rejectAll')}
                       >
                         {imageActionLoading === (pendingRejectUnit?.unitId + 'rejectAll') ? '...' : 'تأكيد الرفض'}
                       </button>
                     </div>
                   </div>
                 </div>
               )}
              {/* مودال عرض الصورة */}
              {showImageModal && selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className={`rounded-xl shadow-xl p-6 max-w-lg w-full relative flex flex-col items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <button
                      className={`absolute top-3 left-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
                      onClick={() => setShowImageModal(false)}
                      aria-label="إغلاق"
                    >
                      ×
                    </button>
                    <img
                      src={selectedImage.url}
                      alt="صورة الشقة"
                      className="rounded-lg max-h-[60vh] mb-4 border mx-auto"
                      style={{ maxWidth: '100%' }}
                    />
                    <div className="text-center">
                      <p className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedImage.unitName}</p>
                      {selectedImage.ownerName && (
                        <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>المالك: {selectedImage.ownerName}</p>
                      )}
                      <a
                        href={selectedImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline text-xs mt-2 inline-block"
                      >
                        فتح الصورة في نافذة جديدة
                      </a>
                    </div>
                  </div>
                </div>
              )}
              </div>
            ) : activeTab === 'abusive' ? (
              <div>
                <header className="mb-8">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>المستخدمون ذوو التعليقات المسيئة</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>إدارة المستخدمين الذين لديهم تعليقات مسيئة .</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 border ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                  {loadingAbusive ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري التحميل...</div>
                  ) : abusiveUsers.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا يوجد مستخدمين لديهم تعليقات مسيئة حالياً</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className={`text-xs uppercase ${isDarkMode ? 'text-red-300 bg-red-900/50' : 'text-red-700 bg-red-100'}`}>
                          <tr>
                            <th className="px-4 py-3">الاسم</th>
                            <th className="px-4 py-3">رقم الهاتف</th>
                            <th className="px-4 py-3">الدور</th>
                            <th className="px-4 py-3">عدد التعليقات المسيئة</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">معلومات الحظر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abusiveUsers.map((u) => (
                            <tr key={u._id} className={`border-b ${isDarkMode ? 'border-red-700 bg-gray-900 hover:bg-red-900/20' : 'border-red-200 bg-white hover:bg-red-50'}`}>
                              <td className={`py-2 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.name}</td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.phone || '-'}</td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.role}</td>
                              <td className={`py-2 px-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  u.abusiveCommentsCount >= 2 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {u.abusiveCommentsCount}
                                </span>
                              </td>
                              <td className="py-2 px-4">
                                {u.isBlocked ? (
                                  <span className="text-red-400 font-bold">محظور تلقائياً</span>
                                ) : u.abusiveCommentsCount >= 2 ? (
                                  <span className="text-orange-400 font-bold">في خطر الحظر</span>
                                ) : (
                                  <span className="text-green-400 font-bold">نشط</span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {u.isBlocked ? (
                                  <span className="text-sm text-red-600">تم الحظر بعد التعليق المسيء الثاني</span>
                                ) : u.abusiveCommentsCount === 1 ? (
                                  <span className="text-sm text-yellow-600">تحذير أول - التعليق التالي سيؤدي للحظر</span>
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'subscriptions' ? (
              <div className="h-full flex flex-col">
                <header className="mb-8 flex-shrink-0">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الاشتراكات</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>إدارة اشتراكات الملاك.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Search Bar and Filters */}
                  <div className="mb-4">
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="text"
                          placeholder="البحث برقم الاشتراك..."
                          value={subscriptionSearchId}
                          onChange={(e) => setSubscriptionSearchId(e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'}`}
                        />
                        {subscriptionSearchId && (
                          <button
                            onClick={() => setSubscriptionSearchId('')}
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Status Filter Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSubscriptionStatusFilter('all')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'all'
                              ? 'bg-orange-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          الكل
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('active')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'active'
                              ? 'bg-green-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          نشط
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('expired')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'expired'
                              ? 'bg-red-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          منتهي الصلاحية
                        </button>
                        <button
                          onClick={() => setSubscriptionStatusFilter('refunded')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            subscriptionStatusFilter === 'refunded'
                              ? 'bg-gray-500 text-white'
                              : isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          تم الاسترداد
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingSubscriptions ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الاشتراكات...</div>
                  ) : subscriptions.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد اشتراكات في النظام حالياً</div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="w-full text-sm text-right">
                        <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-500 bg-gray-50'}`}>
                          <tr>
                            <th className="px-4 py-3">رقم الاشتراك</th>
                            <th className="px-4 py-3">المالك</th>
                            <th className="px-4 py-3">خطة الاشتراك</th>
                            <th className="px-4 py-3">حالة الاشتراك</th>
                            <th className="px-4 py-3">تاريخ البداية</th>
                            <th className="px-4 py-3">تاريخ الانتهاء</th>
                            <th className="px-4 py-3">عدد الوحدات المسموحة</th>
                            <th className="px-4 py-3">تم الاسترداد</th>
                            <th className="px-4 py-3">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions
                            .filter(subscription => {
                              // Search filter
                              const searchMatch = !subscriptionSearchId || 
                                subscription._id.toLowerCase().includes(subscriptionSearchId.toLowerCase());
                              
                              // Status filter
                              const statusMatch = subscriptionStatusFilter === 'all' || 
                                subscription.status === subscriptionStatusFilter;
                              
                              return searchMatch && statusMatch;
                            })
                            .map((subscription) => (
                            <tr key={subscription._id} className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-900 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription._id}
                              </td>
                              <td className={`py-2 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {subscription.landlordId?.name || 'غير محدد'}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription.planName === 'basic' ? 'أساسي' : 
                                 subscription.planName === 'standard' ? 'قياسي' : 
                                 subscription.planName === 'premium' ? 'مميز' : subscription.planName}
                              </td>
                              <td className="py-2 px-4">
                                {subscription.status === 'active' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-inset ring-green-200">
                                    نشط
                                  </span>
                                ) : subscription.status === 'expired' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
                                    منتهي الصلاحية
                                  </span>
                                ) : subscription.status === 'refunded' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200">
                                    تم الاسترداد
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-200">
                                    {subscription.status}
                                  </span>
                                )}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(subscription.startDate).toLocaleDateString()}
                              </td>
                              <td className={`py-2 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(subscription.endDate).toLocaleDateString()}
                              </td>
                              <td className={`py-2 px-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {subscription.unitLimit}
                              </td>
                              <td className="py-2 px-4 text-center">
                                {subscription.refunded ? (
                                  <span className="text-green-600 font-bold">نعم</span>
                                ) : (
                                  <span className="text-red-600 font-bold">لا</span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {subscription.status === 'expired' && !subscription.refunded && (
                                  <button
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                                    disabled={refundLoadingId === subscription._id}
                                    onClick={() => handleRefundSubscription(subscription._id)}
                                  >
                                    {refundLoadingId === subscription._id ? '...' : 'استرداد'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'support' ? (
              <div className="flex h-[calc(100vh-100px)] bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Sidebar for support chats */}
                <div className={`border-r transition-all duration-300 ${isSupportSidebarCollapsed ? 'w-16' : 'w-1/3'} ${isDarkMode ? 'border-orange-700 bg-gray-800/90' : 'border-orange-200 bg-white/90'} backdrop-blur-xl flex flex-col`}>
                  <div className={`border-b ${isDarkMode ? 'border-orange-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 to-white'} ${isSupportSidebarCollapsed ? 'p-2' : 'p-6'}`}>
                    <div className={`flex items-center gap-3 ${isSupportSidebarCollapsed ? 'justify-center' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                      </div>
                      {!isSupportSidebarCollapsed && <h2 className={`text-xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>رسائل الدعم</h2>}
                      <button
                        onClick={() => setIsSupportSidebarCollapsed(!isSupportSidebarCollapsed)}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-stone-100'} ${isSupportSidebarCollapsed ? 'absolute top-2 right-2' : 'ml-auto'}`}
                        title={isSupportSidebarCollapsed ? "توسيع" : "طي"}
                      >
                        {isSupportSidebarCollapsed ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Search Input */}
                    {!isSupportSidebarCollapsed && (
                      <div className="mt-4 relative search-container">
                        <div className="mb-2">
                          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            البحث عن مستخدم
                          </h3>
                          <p id="search-description" className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ابحث عن مالك أو مستأجر لبدء محادثة دعم جديدة
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="اكتب اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف..."
                            value={supportSearchQuery}
                            onChange={(e) => setSupportSearchQuery(e.target.value)}
                            className={`w-full px-4 py-2 pr-10 rounded-lg border text-sm ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' 
                                : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-orange-400`}
                            aria-label="البحث عن مستخدم"
                            aria-describedby="search-description"
                            role="combobox"
                            aria-expanded={searchResults.length > 0}
                            aria-haspopup="listbox"
                            aria-controls="search-results"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          {supportSearchQuery && (
                            <button
                              onClick={() => {
                                setSupportSearchQuery('');
                                setSearchResults([]);
                              }}
                              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                              aria-label="مسح البحث"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                          <div 
                            id="search-results"
                            role="listbox"
                            className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-lg border ${
                              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                            } max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700`}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 #fef3c7' }}
                          >
                            <div className={`p-2 text-xs font-semibold border-b ${
                              isDarkMode ? 'text-gray-300 border-gray-600' : 'text-gray-600 border-gray-200'
                            }`}>
                              نتائج البحث ({searchResults.length})
                            </div>
                            {searchResults.map((user, index) => (
                              <div
                                key={user._id}
                                onClick={() => handleUserSelectForSupport(user)}
                                role="option"
                                aria-selected={index === selectedSearchIndex}
                                className={`p-3 cursor-pointer transition-colors border-b ${
                                  index === selectedSearchIndex
                                    ? 'bg-orange-100 dark:bg-orange-900'
                                    : 'hover:bg-orange-50 dark:hover:bg-gray-600'
                                } ${
                                  isDarkMode ? 'border-gray-600' : 'border-gray-100'
                                } last:border-b-0`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">
                                      {user.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {user.name}
                                    </div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      {user.email || user.phone || 'لا توجد معلومات إضافية'}
                                    </div>
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-full ${
                                    user.role === 'landlord' 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  }`}>
                                    {user.role === 'landlord' ? 'مالك' : 'مستأجر'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Loading indicator */}
                        {isSearching && (
                          <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                          } p-3`}>
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                              <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                جاري البحث...
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* No results message */}
                        {supportSearchQuery && !isSearching && searchResults.length === 0 && (
                          <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                          } p-3`}>
                            <div className="text-center">
                              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                لم يتم العثور على مستخدمين بهذا الاسم
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Keyboard shortcuts hint */}
                        {searchResults.length > 0 && (
                          <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span>استخدم ↑↓ للتنقل، Enter للاختيار، Esc للإلغاء</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`overflow-y-auto flex-1 ${isSupportSidebarCollapsed ? 'p-1' : 'p-2'} pb-4 scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 #fef3c7' }}>
                    {loadingSupportChats ? (
                      <div className={`text-center ${isSupportSidebarCollapsed ? 'p-2' : 'p-6'}`}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                        {!isSupportSidebarCollapsed && <div className="text-gray-600 dark:text-gray-400">جاري التحميل...</div>}
                      </div>
                    ) : supportChats.length === 0 ? (
                      <div className={`text-center ${isSupportSidebarCollapsed ? 'p-2' : 'p-6'}`}>
                        <div className="text-orange-400 dark:text-orange-300 mb-4">
                          <svg className={`${isSupportSidebarCollapsed ? 'w-8 h-8' : 'w-16 h-16'} mx-auto`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                          </svg>
                        </div>
                        {!isSupportSidebarCollapsed && (
                          <>
                            <p className="text-gray-600 dark:text-gray-400 font-semibold">لا توجد رسائل دعم</p>
                            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">ستظهر هنا عندما يرسل المستخدمون رسائل</p>
                          </>
                        )}
                      </div>
                    ) : (
                      supportChats.map((chat) => (
                        <div
                          key={chat._id}
                          className={`cursor-pointer rounded-xl mb-2 transition-all duration-300 ${
                            selectedSupportChat?._id === chat._id
                              ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 shadow-lg'
                              : 'hover:bg-orange-50 dark:hover:bg-gray-700 hover:shadow-md'
                          } ${isDarkMode ? 'border border-gray-700' : 'border border-orange-100'} ${isSupportSidebarCollapsed ? 'p-2' : 'p-4'}`}
                          onClick={() => handleSelectSupportChat(chat)}
                          title={isSupportSidebarCollapsed ? `${chat.user?.name || 'مستخدم غير معروف'} - ${chat.unreadCount > 0 ? `${chat.unreadCount} رسائل جديدة` : 'لا توجد رسائل جديدة'}` : ""}
                        >
                          {isSupportSidebarCollapsed ? (
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center mb-1">
                                <span className="text-white font-bold text-xs">
                                  {chat.user?.name?.charAt(0) || '?'}
                                </span>
                              </div>
                              {chat.unreadCount > 0 && (
                                <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {chat.user?.name || 'مستخدم غير معروف'}
                                </div>
                                {chat.unreadCount > 0 && (
                                  <span className="bg-orange-500 text-white rounded-full px-2 py-1 text-xs font-bold">
                                    {chat.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm mb-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                                {chat.user?.role === 'landlord' ? 'مالك' : 'مستأجر'}
                              </div>
                              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString() : ''}
                              </div>
                              <div className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {chat.lastMessage || 'لا توجد رسائل'}
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                    {/* مساحة إضافية في النهاية لضمان ظهور آخر شات */}
                    <div className="h-4"></div>
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                  {selectedSupportChat ? (
                    <>
                      {/* Chat header */}
                      <div className={`p-6 border-b shrink-0 ${isDarkMode ? 'border-orange-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-orange-200 bg-gradient-to-r from-orange-50 to-white'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {selectedSupportChat.user?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {selectedSupportChat.user?.name || 'مستخدم غير معروف'}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                              {selectedSupportChat.user?.role === 'landlord' ? 'مالك' : 'مستأجر'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700 min-h-0 max-h-full scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 #fef3c7' }}>
                        {supportMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="text-orange-400 dark:text-orange-300 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                              </div>
                              <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>لا توجد رسائل بعد</p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>ابدأ المحادثة بكتابة رسالة أدناه</p>
                            </div>
                          </div>
                        ) : (
                          supportMessages.map((msg, idx) => {
                          const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
                          return (
                            <div key={msg._id || idx} className={`flex ${senderId === user?._id ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`relative max-w-[75%] px-4 py-3 rounded-2xl shadow-md text-base break-words
                                  ${senderId === user?._id
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                    : 'bg-white dark:bg-gray-600 dark:border-orange-500 text-gray-800 dark:text-white'}
                                `}
                                style={{
                                  borderRadius: senderId === user?._id 
                                    ? '1rem 1rem 0.5rem 1rem' 
                                    : '1rem 1rem 1rem 0.5rem',
                                }}
                              >
                                {msg.text}
                                <div className={`text-xs mt-2 ${senderId === user?._id ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })
                        )}
                      </div>

                      {/* Message input */}
                      <form onSubmit={handleSupportMessageSend} className={`p-4 border-t ${isDarkMode ? 'border-orange-700 bg-gray-800' : 'border-orange-200 bg-white'} rounded-b-2xl`}>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={supportText}
                            onChange={(e) => setSupportText(e.target.value)}
                            placeholder="اكتب رسالتك..."
                            className={`flex-1 border border-orange-200 dark:border-orange-700 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-base bg-orange-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                          />
                          <button
                            type="submit"
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                          >
                            إرسال
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 #fef3c7' }}>
                      <div className="text-center">
                        <div className="text-orange-400 dark:text-orange-300 mb-6">
                          <svg className="w-24 h-24 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                          </svg>
                        </div>
                        <p className={`text-xl font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>اختر محادثة لعرض الرسائل</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>اختر محادثة من القائمة على اليسار</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'available' ? (
              <div className="h-full flex flex-col">
                <header className="mb-8 flex-shrink-0">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الشقق المتاحة</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>عرض جميع الشقق المتاحة للإيجار.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative max-w-md">
                      <input
                        type="text"
                        placeholder="البحث باسم الشقة..."
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        className={`w-full px-4 py-2 pr-10 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'}`}
                      />
                      {availableSearch && (
                        <button
                          onClick={() => setAvailableSearch('')}
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {loadingAvailable ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الشقق المتاحة...</div>
                  ) : availableUnits.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد شقق متاحة حالياً</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {availableUnits
                        .filter(unit => 
                          unit.name?.toLowerCase().includes(availableSearch.toLowerCase()) ||
                          unit.ownerId?.name?.toLowerCase().includes(availableSearch.toLowerCase())
                        )
                        .map((unit) => (
                          <div key={unit._id} className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unit.name}</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  المالك: {unit.ownerId?.name || 'غير محدد'}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  نوع الوحدة: {unit.type === 'apartment' ? 'شقة' : 'فيلا'}
                                </p>
                              </div>
                              <div className={`text-right ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                <div className="text-2xl font-bold">{unit.pricePerMonth}</div>
                                <div className="text-sm">جنية/شهر</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>العنوان:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.address}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المدينة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.city}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>عدد الغرف:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.numRooms}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المساحة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.space} متر²</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {unit.isFurnished && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">مفروشة</span>
                              )}
                              {unit.hasAC && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">مكيف</span>
                              )}
                              {unit.hasWifi && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">واي فاي</span>
                              )}
                              {unit.hasTV && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">تلفاز</span>
                              )}
                              {unit.hasKitchenware && (
                                <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">أدوات مطبخ</span>
                              )}
                              {unit.hasHeating && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">تدفئة</span>
                              )}
                              {unit.hasPool && (
                                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full">مسبح</span>
                              )}
                            </div>

                            <p className={`text-sm line-clamp-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {unit.description}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'maintenance' ? (
              <div className="h-full flex flex-col">
                <header className="mb-8 flex-shrink-0">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الشقق تحت الصيانة</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>عرض جميع الشقق التي تحتاج صيانة.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative max-w-md">
                      <input
                        type="text"
                        placeholder="البحث باسم الشقة..."
                        value={maintenanceSearch}
                        onChange={(e) => setMaintenanceSearch(e.target.value)}
                        className={`w-full px-4 py-2 pr-10 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'}`}
                      />
                      {maintenanceSearch && (
                        <button
                          onClick={() => setMaintenanceSearch('')}
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {loadingMaintenance ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الشقق تحت الصيانة...</div>
                  ) : maintenanceUnits.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد شقق تحت الصيانة حالياً</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {maintenanceUnits
                        .filter(unit => 
                          unit.name?.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
                          unit.ownerId?.name?.toLowerCase().includes(maintenanceSearch.toLowerCase())
                        )
                        .map((unit) => (
                          <div key={unit._id} className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unit.name}</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  المالك: {unit.ownerId?.name || 'غير محدد'}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  نوع الوحدة: {unit.type === 'apartment' ? 'شقة' : 'فيلا'}
                                </p>
                              </div>
                              <div className={`text-right ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                <div className="text-2xl font-bold">{unit.pricePerMonth}</div>
                                <div className="text-sm">جنية/شهر</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>العنوان:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.address}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المدينة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.city}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>عدد الغرف:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.numRooms}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المساحة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.space} متر²</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {unit.isFurnished && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">مفروشة</span>
                              )}
                              {unit.hasAC && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">مكيف</span>
                              )}
                              {unit.hasWifi && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">واي فاي</span>
                              )}
                              {unit.hasTV && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">تلفاز</span>
                              )}
                              {unit.hasKitchenware && (
                                <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">أدوات مطبخ</span>
                              )}
                              {unit.hasHeating && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">تدفئة</span>
                              )}
                              {unit.hasPool && (
                                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full">مسبح</span>
                              )}
                            </div>

                            <p className={`text-sm line-clamp-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {unit.description}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'booked' ? (
              <div className="h-full flex flex-col">
                <header className="mb-8 flex-shrink-0">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الشقق المحجوزة</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>عرض جميع الشقق المحجوزة مع معلومات العقود.</p>
                </header>
                
                <div className={`rounded-xl shadow-sm p-6 flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative max-w-md">
                      <input
                        type="text"
                        placeholder="البحث باسم الشقة..."
                        value={bookedSearch}
                        onChange={(e) => setBookedSearch(e.target.value)}
                        className={`w-full px-4 py-2 pr-10 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 placeholder-gray-400' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'}`}
                      />
                      {bookedSearch && (
                        <button
                          onClick={() => setBookedSearch('')}
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {loadingBooked ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الشقق المحجوزة...</div>
                  ) : bookedUnits.length === 0 ? (
                    <div className={`text-center py-12 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>لا توجد شقق محجوزة حالياً</div>
                  ) : (
                    <div className="space-y-6">
                      {bookedUnits
                        .filter(unit => 
                          unit.name?.toLowerCase().includes(bookedSearch.toLowerCase()) ||
                          unit.ownerId?.name?.toLowerCase().includes(bookedSearch.toLowerCase()) ||
                          unit.lease?.tenantId?.name?.toLowerCase().includes(bookedSearch.toLowerCase())
                        )
                        .map((unit) => (
                          <div key={unit._id} className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unit.name}</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  المالك: {unit.ownerId?.name || 'غير محدد'}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  نوع الوحدة: {unit.type === 'apartment' ? 'شقة' : 'فيلا'}
                                </p>
                              </div>
                              <div className={`text-right ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                <div className="text-2xl font-bold">{unit.pricePerMonth}</div>
                                <div className="text-sm">جنية/شهر</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>العنوان:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.address}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المدينة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.city}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>عدد الغرف:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.numRooms}</p>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المساحة:</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{unit.space} متر²</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {unit.isFurnished && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">مفروشة</span>
                              )}
                              {unit.hasAC && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">مكيف</span>
                              )}
                              {unit.hasWifi && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">واي فاي</span>
                              )}
                              {unit.hasTV && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">تلفاز</span>
                              )}
                              {unit.hasKitchenware && (
                                <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">أدوات مطبخ</span>
                              )}
                              {unit.hasHeating && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">تدفئة</span>
                              )}
                              {unit.hasPool && (
                                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full">مسبح</span>
                              )}
                            </div>

                            <p className={`text-sm line-clamp-3 mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {unit.description}
                            </p>

                            {/* Lease Information */}
                            {unit.lease && (
                              <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-600 border border-gray-500' : 'bg-gray-50 border border-gray-200'}`}>
                                <h4 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>معلومات العقد</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المستأجر:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {unit.lease.tenantId?.name || 'غير محدد'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>المالك:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {unit.lease.landlordId?.name || 'غير محدد'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>مبلغ الإيجار:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {unit.lease.rentAmount} جنية/شهر
                                    </p>
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>مبلغ التأمين:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {unit.lease.depositAmount} جنية
                                    </p>
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>تاريخ البداية:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {new Date(unit.lease.startDate).toLocaleDateString('ar-EG')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>تاريخ الانتهاء:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {new Date(unit.lease.endDate).toLocaleDateString('ar-EG')}
                                    </p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>شروط الدفع:</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {unit.lease.paymentTerms}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <header className="mb-8">
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>التأكيدات</h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>إدارة التأكيدات والتقارير.</p>
                </header>

       

                <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <div className="flex gap-3 flex-wrap">
                      <div className="relative">
                        <select 
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-4 pr-3 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          <option value="all">الكل</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="approved">تم التأكيد</option>
                          <option value="rejected">تم الرفض</option>
                        </select>
                      </div>
                      <div className="relative">
                        <select 
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-4 pr-3 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          <option value="all">الكل</option>
                          <option value="landlord">المالك</option>
                          <option value="tenant">المستأجر</option>
                        </select>
                      </div>
                    </div>
                   
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-500 bg-gray-50'}`}>
                        <tr>
                          <th className="px-6 py-3" scope="col">المستخدم</th>
                          <th className="px-6 py-3" scope="col">الدور</th>
                          <th className="px-6 py-3" scope="col">الحالة</th>
                          <th className="px-6 py-3" scope="col">تاريخ الانضمام</th>
                          <th className="px-6 py-3 text-right" scope="col">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={`px-6 py-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              لا يوجد مستخدمين
                            </td>
                          </tr>
                        ) : (
                          currentUsers.map((user) => (
                            <tr key={user._id} className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                              <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {user.name}
                              </td>
                              <td className={`px-6 py-4 capitalize ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {user.role}
                              </td>
                              <td className="px-6 py-4">
                                {getStatusBadge(user.verificationStatus?.status || 'not_submitted')}
                              </td>
                              <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                          
                                  <button
                                    className="text-orange-600 bg-orange-50 p-3 hover:text-orange-800 font-medium text-sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowModal(true);
                                    }}
                                  >
                                    عرض الوثائق
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                        >
                          السابق
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                          <button
                            key={idx + 1}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`px-3 py-1 rounded ${currentPage === idx + 1 ? 'bg-orange-500 text-white' : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Refund Confirmation Modal */}
      {showRefundModal && pendingRefundSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`rounded-xl shadow-xl p-8 max-w-xl w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              className={`absolute top-3 right-3 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
              onClick={() => {
                setShowRefundModal(false);
                setPendingRefundSubscription(null);
              }}
              aria-label="إغلاق"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-100'}`}>
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>تأكيد استرداد الاشتراك</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                هل أنت متأكد من استرداد هذا الاشتراك؟
              </p>
            </div>

            <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>المالك:</span>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pendingRefundSubscription.landlordId?.name || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>خطة الاشتراك:</span>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pendingRefundSubscription.planName === 'basic' ? 'أساسي' : 
                     pendingRefundSubscription.planName === 'standard' ? 'قياسي' : 
                     pendingRefundSubscription.planName === 'premium' ? 'مميز' : pendingRefundSubscription.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>رقم الاشتراك:</span>
                  <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {pendingRefundSubscription._id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg mb-6 ${isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                  <strong>تحذير:</strong> سيتم حذف جميع الوحدات المرتبطة بهذا الاشتراك نهائياً.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setPendingRefundSubscription(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmRefundSubscription}
                  disabled={refundLoadingId === pendingRefundSubscription._id}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {refundLoadingId === pendingRefundSubscription._id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري الاسترداد...
                    </div>
                  ) : (
                    'تأكيد الاسترداد'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className={`rounded-xl shadow-xl p-8 max-w-md w-full relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <button
                className={`absolute top-3 right-3 ${isDarkMode ? 'text-gray-400 hover:text-orange-400' : 'text-gray-500 hover:text-orange-600'}`}
                onClick={() => setShowModal(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</h2>
              <div className="mb-4">
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.email}</p>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.phone}</p>
              </div>
              <div className="mb-4 flex flex-col gap-4 items-center">
                {selectedUser.verificationStatus?.uploadedIdUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">صورة الهوية</p>
                    <img src={selectedUser.verificationStatus.uploadedIdUrl} alt="ID" className="rounded-lg max-h-40 border" />
                  </div>
                )}
                {selectedUser.verificationStatus?.selfieUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">صورة التصوير الشخصي</p>
                    <img src={selectedUser.verificationStatus.selfieUrl} alt="Selfie" className="rounded-lg max-h-40 border" />
                  </div>
                )}
              </div>
              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={async () => {
                    await handleVerificationAction(selectedUser._id, 'approve');
                    setShowModal(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  تأكيد
                </button>
                <button
                  onClick={async () => {
                    await handleVerificationAction(selectedUser._id, 'reject');
                    setShowModal(false);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  رفض
                </button>
              </div>
            </div>
          </div>
        )}
        <Toaster position="top-center" />
      </div>
    );
  }