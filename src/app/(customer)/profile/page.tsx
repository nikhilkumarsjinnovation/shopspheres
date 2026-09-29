'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  MapPin,
  Users,
  Shield,
  Wallet,
  Accessibility,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Gift,
  AlertCircle,
  CheckCircle2,
  Key,
  Mail,
  Phone,
  Clock,
  UserCheck,
  UserPlus,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR, INDIAN_STATES } from '@/lib/formatters';
import { useAccessibility } from '@/context/AccessibilityContext';
import { createClient } from '@/lib/supabase/client';

interface SavedAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  label: string;
  delivery_instructions?: string | null;
  is_default: boolean;
  created_at: string;
}

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  label?: string;
}

interface ProfileData {
  user: {
    id: string;
    email: string;
    phone: string | null;
    created_at: string;
    metadata?: Record<string, any>;
  };
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  counts: {
    addresses: number;
    orders: number;
    friends: number;
  };
  wallet: {
    balance: number;
    currency: string;
    is_frozen: boolean;
  } | null;
  aiProfile?: {
    persona_preference: string;
    price_sensitivity?: string;
    feed_weights?: any;
  } | null;
  accessibilityProfile?: any;
}

type TabType = 'overview' | 'personal' | 'addresses' | 'friends' | 'wallet' | 'accessibility' | 'ai';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabParam = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(activeTabParam);

  const supabase = createClient();
  const accessibility = useAccessibility();

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edit Personal Details Form State
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Email & Password Update State
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Addresses State
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'Maharashtra',
    postal_code: '',
    label: 'Home',
    delivery_instructions: '',
    is_default: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Friends State
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRow[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRow[]>([]);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [sendingFriendReq, setSendingFriendReq] = useState(false);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [toppingUp, setToppingUp] = useState(false);

  // AI Persona State
  const [selectedPersona, setSelectedPersona] = useState<string>('everyday');
  const [savingPersona, setSavingPersona] = useState(false);

  // Synchronize Tab with search params
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/profile?tab=${tab}`);
  };

  const showSuccess = (msg: string) => {
    setSuccessNotice(msg);
    setErrorNotice(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorNotice(msg);
    setSuccessNotice(null);
  };

  // 1. Fetch Profile Data
  const loadProfile = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetchWithCsrf('/api/v1/profile');
      if (!res.ok) {
        throw new Error('Failed to load profile details.');
      }
      const data: ProfileData = await res.json();
      setProfileData(data);
      setFullNameInput(data.profile.full_name || '');
      setPhoneInput(data.user.phone || '');
      setEmailInput(data.user.email || '');
      setWalletBalance(data.wallet?.balance || 0);
      setSelectedPersona(data.aiProfile?.persona_preference || 'everyday');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading profile';
      showError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 2. Fetch Addresses
  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const res = await fetchWithCsrf('/api/v1/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch {
      // ignore address load errors
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  // 3. Fetch Friends
  const loadFriends = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/v1/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
    } catch {
      // ignore friends load errors
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadAddresses();
    loadFriends();
  }, [loadProfile, loadAddresses, loadFriends]);

  // Handle Save Personal Info
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      showError('Please enter your full name.');
      return;
    }

    setSavingPersonal(true);
    setErrorNotice(null);

    try {
      const res = await fetchWithCsrf('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullNameInput.trim(),
          phone: phoneInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update personal details.');
      }

      showSuccess('Personal information updated successfully.');
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      showError(msg);
    } finally {
      setSavingPersonal(false);
    }
  };

  // Handle Update Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      showError('Please enter a valid email address.');
      return;
    }

    setSavingEmail(true);
    setErrorNotice(null);

    try {
      const res = await fetchWithCsrf('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update email.');
      }

      showSuccess('Confirmation link sent to your new email. Please verify to complete the change.');
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email update failed.';
      showError(msg);
    } finally {
      setSavingEmail(false);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match. Please verify.');
      return;
    }

    setSavingPassword(true);
    setErrorNotice(null);

    try {
      const res = await fetchWithCsrf('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password.');
      }

      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password changed successfully. Your account is secure.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed.';
      showError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressFormData({
      recipient_name: profileData?.profile.full_name || '',
      recipient_phone: profileData?.user.phone?.replace(/\D/g, '') || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: 'Maharashtra',
      postal_code: '',
      label: 'Home',
      delivery_instructions: '',
      is_default: addresses.length === 0,
    });
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressFormData({
      recipient_name: addr.recipient_name,
      recipient_phone: addr.recipient_phone.replace(/\D/g, ''),
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      label: addr.label || 'Home',
      delivery_instructions: addr.delivery_instructions || '',
      is_default: addr.is_default,
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addressFormData.recipient_name.trim() ||
      !addressFormData.recipient_phone.trim() ||
      !addressFormData.address_line1.trim() ||
      !addressFormData.city.trim() ||
      !addressFormData.postal_code.trim()
    ) {
      showError('Please fill in Name, Phone, Address, City, and PIN Code.');
      return;
    }

    if (addressFormData.recipient_phone.replace(/\D/g, '').length < 10) {
      showError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (addressFormData.postal_code.replace(/\D/g, '').length !== 6) {
      showError('Please enter a valid 6-digit Indian postal PIN code.');
      return;
    }

    setSavingAddress(true);
    setErrorNotice(null);

    try {
      const payload = {
        recipient_name: addressFormData.recipient_name.trim(),
        recipient_phone: addressFormData.recipient_phone.trim(),
        address_line1: addressFormData.address_line1.trim(),
        address_line2: addressFormData.address_line2.trim() || null,
        city: addressFormData.city.trim(),
        state: addressFormData.state.trim(),
        postal_code: addressFormData.postal_code.trim(),
        label: addressFormData.label,
        delivery_instructions: addressFormData.delivery_instructions.trim() || null,
        is_default: addressFormData.is_default,
      };

      let res: Response;
      if (editingAddressId) {
        res = await fetchWithCsrf('/api/v1/addresses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingAddressId, ...payload }),
        });
      } else {
        res = await fetchWithCsrf('/api/v1/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save address.');
      }

      showSuccess(editingAddressId ? 'Address updated successfully.' : 'New address added to your address book.');
      setShowAddressModal(false);
      loadAddresses();
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save address.';
      showError(msg);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this delivery address?')) return;

    try {
      const res = await fetchWithCsrf(`/api/v1/addresses?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Could not delete address.');
      }
      showSuccess('Address removed from address book.');
      loadAddresses();
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      showError(msg);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetchWithCsrf('/api/v1/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_default: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update default address.');
      }
      showSuccess('Default delivery address updated.');
      loadAddresses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set default.';
      showError(msg);
    }
  };

  // Friends Handlers
  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmailInput.trim()) {
      showError('Please enter your friend’s email address.');
      return;
    }

    setSendingFriendReq(true);
    setErrorNotice(null);

    try {
      const res = await fetchWithCsrf('/api/v1/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: friendEmailInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send friend request.');
      }

      setFriendEmailInput('');
      showSuccess('Friend invitation sent successfully!');
      loadFriends();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send friend request.';
      showError(msg);
    } finally {
      setSendingFriendReq(false);
    }
  };

  const handleRespondFriendRequest = async (id: string, status: 'accepted' | 'blocked') => {
    try {
      const res = await fetchWithCsrf('/api/v1/friends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update request.');
      }
      showSuccess(status === 'accepted' ? '🎉 You are now connected!' : 'Friend request declined.');
      loadFriends();
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      showError(msg);
    }
  };

  // Wallet Top-up Handler
  const handleTopupWallet = async (amount: number) => {
    setToppingUp(true);
    setErrorNotice(null);

    try {
      const res = await fetchWithCsrf('/api/v1/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: 'Direct Wallet Top-up via Indian Netbanking/UPI' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Top-up failed.');
      }

      setWalletBalance(data.wallet?.balance || walletBalance + amount);
      showSuccess(`🎉 Wallet topped up with ${formatINR(amount)} successfully!`);
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Top-up error.';
      showError(msg);
    } finally {
      setToppingUp(false);
    }
  };

  // AI Persona Handler
  const handleUpdatePersona = async (persona: string) => {
    setSelectedPersona(persona);
    setSavingPersona(true);

    try {
      const res = await fetchWithCsrf('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_persona: persona }),
      });

      if (!res.ok) {
        throw new Error('Failed to update shopping persona.');
      }

      showSuccess(`AI shopping companion tuned to: ${persona.toUpperCase()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Persona update error.';
      showError(msg);
    } finally {
      setSavingPersona(false);
    }
  };

  const handleResetAiWeights = async () => {
    if (!window.confirm('Reset your personalized browsing memory and feed recommendations?')) return;

    try {
      const res = await fetchWithCsrf('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_ai_weights: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to reset AI memory.');
      }

      showSuccess('AI recommendation memory reset. Your explore feed will recalibrate on your next searches.');
      loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset error.';
      showError(msg);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>⏳</div>
        <p style={{ color: 'var(--fg-muted)', fontWeight: 600 }}>Loading your ShopSphere profile...</p>
      </div>
    );
  }

  const initial = (profileData?.profile.full_name || profileData?.user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="profile-container animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* 1. Header Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.95) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--glass-shadow)',
          marginBottom: '2rem',
          backdropFilter: 'var(--glass-blur)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontSize: '2.2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
              border: '3px solid #ffffff',
            }}
          >
            {initial}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--fg-primary)', margin: 0 }}>
                {profileData?.profile.full_name || 'ShopSphere Member'}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  border: '1px solid var(--success-border)',
                }}
              >
                🇮🇳 Verified Customer
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.4rem', color: 'var(--fg-muted)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} /> {profileData?.user.email}
              </span>
              {profileData?.user.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--fg-primary)', fontWeight: 600 }}>
                  <Phone size={14} /> {profileData?.user.phone}
                </span>
              )}
              <span style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>
                Joined {new Date(profileData?.user.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Counter Pills */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => switchTab('wallet')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontWeight: 600 }}>Wallet Balance</div>
            <strong style={{ fontSize: '1.15rem', color: '#059669', display: 'block' }}>{formatINR(walletBalance)}</strong>
          </button>

          <button
            type="button"
            onClick={() => switchTab('addresses')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontWeight: 600 }}>Saved Addresses</div>
            <strong style={{ fontSize: '1.15rem', color: 'var(--fg-primary)', display: 'block' }}>{profileData?.counts.addresses ?? 0}</strong>
          </button>

          <button
            type="button"
            onClick={() => switchTab('friends')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontWeight: 600 }}>Friends Circle</div>
            <strong style={{ fontSize: '1.15rem', color: '#4f46e5', display: 'block' }}>{friends.length}</strong>
          </button>

          <Link
            href="/orders"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              textAlign: 'left',
              display: 'block',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontWeight: 600 }}>Total Orders</div>
            <strong style={{ fontSize: '1.15rem', color: 'var(--fg-primary)', display: 'block' }}>{profileData?.counts.orders ?? 0}</strong>
          </Link>
        </div>
      </div>

      {/* Notices & Alerts */}
      {errorNotice && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{errorNotice}</span>
        </div>
      )}

      {successNotice && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          role="status"
        >
          <CheckCircle2 size={18} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* 2. Profile Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.5rem',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'personal', label: 'Personal & Security', icon: Shield },
          { id: 'addresses', label: `Address Book (${addresses.length})`, icon: MapPin },
          { id: 'friends', label: `Friends Circle (${friends.length})`, icon: Users },
          { id: 'wallet', label: 'In-App Wallet', icon: Wallet },
          { id: 'accessibility', label: 'Saksham Inclusive', icon: Accessibility },
          { id: 'ai', label: 'AI Persona & Memory', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id as TabType)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                border: 'none',
                background: isActive ? 'var(--accent-electric)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--fg-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Card A: Account Details Summary */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Account Information</h2>
              <button
                type="button"
                onClick={() => switchTab('personal')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-electric)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>Name:</span>
                <strong>{profileData?.profile.full_name || 'Not set'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>Email ID:</span>
                <strong>{profileData?.user.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>Phone Number:</span>
                <strong>{profileData?.user.phone || 'Not configured'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>Security Status:</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active & Protected</span>
              </div>
            </div>
          </div>

          {/* Card B: Primary Delivery Address */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Primary Delivery Address</h2>
              <button
                type="button"
                onClick={() => switchTab('addresses')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-electric)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Manage All ({addresses.length})
              </button>
            </div>

            {addresses.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <MapPin size={24} style={{ color: 'var(--fg-subtle)', marginBottom: '0.5rem' }} />
                <p style={{ margin: '0 0 1rem 0' }}>No saved delivery addresses found.</p>
                <button
                  type="button"
                  className="btn-card-add"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                  onClick={handleOpenAddAddress}
                >
                  <Plus size={14} /> Add Address
                </button>
              </div>
            ) : (
              (() => {
                const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
                return (
                  <div style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--fg-primary)' }}>{defaultAddr.recipient_name}</strong>
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 700 }}>
                        DEFAULT
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        {defaultAddr.label || 'Home'}
                      </span>
                    </div>
                    <p style={{ margin: 0 }}>
                      {defaultAddr.address_line1}
                      {defaultAddr.address_line2 ? `, ${defaultAddr.address_line2}` : ''}
                      <br />
                      {defaultAddr.city}, {defaultAddr.state} — <strong>{defaultAddr.postal_code}</strong>
                    </p>
                    <p style={{ margin: '0.4rem 0 0 0', color: 'var(--fg-muted)', fontSize: '0.82rem' }}>
                      Mobile: +91 {defaultAddr.recipient_phone}
                    </p>
                  </div>
                );
              })()
            )}
          </div>

          {/* Card C: Social & Gifting Hub */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Friends & Surprise Gifting</h2>
              <button
                type="button"
                onClick={() => switchTab('friends')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-electric)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                View Friends ({friends.length})
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Connect with fellow shoppers to send scheduled gift boxes, coordinate festive surprises, and share recommendations.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-card-add"
                style={{ flex: 1, padding: '0.6rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={() => switchTab('friends')}
              >
                <UserPlus size={15} /> Add Friends
              </button>
              <Link
                href="/gifts"
                className="btn-card-toggle"
                style={{ flex: 1, padding: '0.6rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                <Gift size={15} /> Send Gift
              </Link>
            </div>
          </div>

          {/* Card D: AI Shopping Companion Status */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Personal AI Companion</h2>
              <button
                type="button"
                onClick={() => switchTab('ai')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-electric)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Configure
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-electric)' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', textTransform: 'capitalize' }}>
                  {selectedPersona} Persona
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  Tailors marketplace feed, search re-ranking & offers
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-card-toggle"
              style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem' }}
              onClick={handleResetAiWeights}
            >
              🔄 Recalibrate Recommendations
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL INFORMATION & SECURITY */}
      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {/* Section 1: Name & Mobile Number */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--accent-electric)' }} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Personal Information</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
              Update your display name and Indian contact mobile number for doorstep order deliveries.
            </p>

            <form onSubmit={handleSavePersonal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '0.4rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '0.4rem' }}>
                  Indian Mobile Number (10 Digits) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '0.75rem 0.85rem',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRight: 'none',
                      borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--fg-secondary)',
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phoneInput.replace(/\D/g, '')}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.9rem',
                      background: '#ffffff',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Used for OTP confirmations and logistics courier coordination.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingPersonal}
                className="btn-card-add"
                style={{ padding: '0.75rem 1.5rem', alignSelf: 'flex-start', fontSize: '0.875rem' }}
              >
                {savingPersonal ? 'Saving Changes...' : 'Save Personal Details'}
              </button>
            </form>
          </div>

          {/* Section 2: Email & Password Security */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Key size={20} style={{ color: 'var(--warning)' }} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Login & Password Security</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
              Manage your login email address and update your account password.
            </p>

            {/* Email update */}
            <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '0.4rem' }}>
                  Primary Email ID
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.9rem',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingEmail || emailInput.trim() === profileData?.user.email}
                    className="btn-card-toggle"
                    style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    {savingEmail ? 'Sending...' : 'Update Email'}
                  </button>
                </div>
              </div>
            </form>

            {/* Password update */}
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '0.4rem' }}>
                  New Password (min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '0.4rem' }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="btn-card-add"
                style={{ padding: '0.75rem 1.5rem', alignSelf: 'flex-start', fontSize: '0.875rem' }}
              >
                {savingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: ADDRESS BOOK */}
      {activeTab === 'addresses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Saved Delivery Addresses</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', margin: '0.25rem 0 0 0' }}>
                Manage home, work, and family addresses across all Indian PIN codes.
              </p>
            </div>

            <button
              type="button"
              className="btn-card-add"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handleOpenAddAddress}
            >
              <Plus size={16} /> Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📍</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>No Saved Addresses Yet</h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                Add your home or office address to enable 1-click checkout and seamless local deliveries.
              </p>
              <button
                type="button"
                className="btn-card-add"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                onClick={handleOpenAddAddress}
              >
                + Add Address
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    background: addr.is_default ? 'linear-gradient(135deg, rgba(236, 253, 245, 0.75), rgba(255, 255, 255, 0.95))' : 'var(--bg-surface)',
                    border: addr.is_default ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                          {addr.label || 'Home'}
                        </span>
                        {addr.is_default && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success)' }}>
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          title="Edit Address"
                          style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          title="Delete Address"
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <strong style={{ fontSize: '1rem', color: 'var(--fg-primary)', display: 'block', marginBottom: '0.35rem' }}>
                      {addr.recipient_name}
                    </strong>

                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                      {addr.address_line1}
                      {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                      <br />
                      {addr.city}, {addr.state} — <strong>{addr.postal_code}</strong>
                    </p>

                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
                      Phone: <strong>+91 {addr.recipient_phone}</strong>
                    </p>
                  </div>

                  <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-electric)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Set as Default Address
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FRIENDS & SOCIAL CIRCLE */}
      {activeTab === 'friends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Header & Add Friend */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} style={{ color: '#4f46e5' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Friends & Gifting Circle</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', margin: '0 0 1.5rem 0' }}>
              Connect with your friends to send secret gift orders, view wishlists, and share product finds.
            </p>

            <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px' }}>
              <input
                type="email"
                required
                value={friendEmailInput}
                onChange={(e) => setFriendEmailInput(e.target.value)}
                placeholder="Enter friend's email address..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.9rem',
                  background: '#ffffff',
                }}
              />
              <button
                type="submit"
                disabled={sendingFriendReq}
                className="btn-card-add"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
              >
                {sendingFriendReq ? 'Sending...' : 'Send Request'}
              </button>
            </form>
          </div>

          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Incoming Connection Requests</span>
                <span className="bag-badge" style={{ position: 'static' }}>{incomingRequests.length}</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {incomingRequests.map((req) => (
                  <div key={req.id} className="friend-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div className="friend-avatar">{(req.label || 'U').charAt(0).toUpperCase()}</div>
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block' }}>{req.label || 'ShopSphere User'}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Wants to connect with you</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn-card-add"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => handleRespondFriendRequest(req.id, 'accepted')}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        type="button"
                        className="btn-card-toggle"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleRespondFriendRequest(req.id, 'blocked')}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Friends List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Active Friends ({friends.length})
              </h3>
              <Link href="/gifts" style={{ fontSize: '0.85rem', color: 'var(--accent-electric)', fontWeight: 600, textDecoration: 'none' }}>
                🎁 Surprise Gifting Hub →
              </Link>
            </div>

            {friends.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
                  You haven’t connected with any friends yet. Add a friend using their email above to exchange surprises!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {friends.map((f) => (
                  <div key={f.id} className="friend-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div className="friend-avatar">{(f.label || 'U').charAt(0).toUpperCase()}</div>
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block' }}>{f.label || 'Connected Friend'}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Active Friend</span>
                      </div>
                    </div>

                    <Link
                      href="/gifts"
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-glow)',
                        color: 'var(--accent-electric)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Gift size={13} /> Gift
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: IN-APP WALLET */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Wallet Balance Card */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Wallet size={22} style={{ color: '#059669' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>ShopSphere Wallet</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
              Instant 1-click checkout with guaranteed zero bank gateway drops and instant refund credits.
            </p>

            <div
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                color: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 24px rgba(4, 120, 87, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Current Available Balance</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.25rem 0' }}>{formatINR(walletBalance)}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Currency: Indian Rupee (INR) • Verified by ShopSphere India</div>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.65rem' }}>
                Quick Top-Up Options:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleTopupWallet(amt)}
                    disabled={toppingUp}
                    style={{
                      padding: '0.65rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    +{formatINR(amt)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Wallet Features & Perks */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Why use ShopSphere Wallet?</h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--fg-secondary)', lineHeight: 1.8 }}>
              <li><strong>Zero Bank Gateway Drops:</strong> Payment verifies instantly without waiting for SMS OTPs during peak flash sales.</li>
              <li><strong>Instant Refunds:</strong> Returned orders are refunded to your wallet in under 60 seconds.</li>
              <li><strong>Agent-Assisted Checkout:</strong> Enable Personal AI to buy pre-authorized products seamlessly on your behalf.</li>
              <li><strong>Protected Balances:</strong> 100% held securely with 256-bit institutional encryption.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 6: SAKSHAM INCLUSIVE ACCESSIBILITY */}
      {activeTab === 'accessibility' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Accessibility size={22} style={{ color: '#0284c7' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Saksham Inclusive Accessibility Hub</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
            Customize ShopSphere to match your motor, visual, auditory, and cognitive requirements (WCAG 2.2 AAA Compliant).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Toggle 1: Large Touch Targets */}
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>Large Touch Targets (Motor Ease)</strong>
                <input
                  type="checkbox"
                  checked={accessibility.motorLargeTouchTargets}
                  onChange={accessibility.toggleLargeTouchTargets}
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', margin: 0 }}>
                Enforces min 56px touch target boundaries on all buttons and inputs to prevent accidental clicks for motor tremors.
              </p>
            </div>

            {/* Toggle 2: Simplified UI */}
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>Simplified Interface (Cognitive Mode)</strong>
                <input
                  type="checkbox"
                  checked={accessibility.cognitiveSimplifiedUI}
                  onChange={accessibility.toggleSimplifiedUI}
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', margin: 0 }}>
                Strips distracting carousels, busy animations, and simplifies product lists into clean high-contrast single cards.
              </p>
            </div>

            {/* Toggle 3: High Contrast */}
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>High Contrast Mode</strong>
                <input
                  type="checkbox"
                  checked={accessibility.visualHighContrast}
                  onChange={accessibility.toggleHighContrast}
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', margin: 0 }}>
                Enhances text contrast with deep black backgrounds and high-visibility yellow and white elements for low-vision users.
              </p>
            </div>

            {/* Font Magnification */}
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Font Magnification Scale</strong>
                <span style={{ float: 'right', fontWeight: 700, color: 'var(--accent-electric)' }}>
                  {Math.round(accessibility.visualFontMagnification * 100)}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                {[1.0, 1.25, 1.5, 1.75].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => accessibility.setFontMagnification(scale)}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      border: accessibility.visualFontMagnification === scale ? '2px solid var(--accent-electric)' : '1px solid var(--border-subtle)',
                      background: accessibility.visualFontMagnification === scale ? 'var(--accent-glow)' : 'var(--bg-muted)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {Math.round(scale * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AI SHOPPING PERSONA & MEMORY */}
      {activeTab === 'ai' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={22} style={{ color: 'var(--accent-electric)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Personal AI Shopping Persona & Context Memory</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
            Choose how the AI assistant consults with you and adapts your explore feed re-ranking in real time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { id: 'everyday', title: 'Everyday Value Shopper', desc: 'Focuses on discounts, bundled savings, and daily home essentials.' },
              { id: 'tech', title: 'Tech & Gadget Geek', desc: 'Prioritizes specs, benchmark scores, 5G smartphones, and audio gear.' },
              { id: 'fashion', title: 'Fashion & Ethnic Stylist', desc: 'Curates festive wear, fabrics, footwear, and coordinated accessories.' },
              { id: 'gourmet', title: 'Kitchen & Gourmet Chef', desc: 'Highlights cookware, spices, regional staples, and culinary appliances.' },
              { id: 'beauty', title: 'Beauty & Wellness', desc: 'Skincare ingredients, organic care, and personal wellness.' },
            ].map((p) => {
              const isSelected = selectedPersona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleUpdatePersona(p.id)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--accent-electric)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--accent-glow)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--accent-electric)' : 'var(--fg-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    {p.title}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--fg-muted)', lineHeight: 1.4 }}>
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', display: 'block' }}>Reset AI Feed Recommendation Weights</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
                Clears all category affinities and recent conversational intents so your feed starts completely fresh.
              </span>
            </div>

            <button
              type="button"
              className="btn-card-toggle"
              onClick={handleResetAiWeights}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
            >
              🔄 Clear & Reset Memory
            </button>
          </div>
        </div>
      )}

      {/* 4. ADD / EDIT ADDRESS MODAL */}
      {showAddressModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--glass-shadow-hover)',
              border: '1px solid var(--border-subtle)',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {editingAddressId ? 'Edit Delivery Address' : 'Add New Indian Address'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.recipient_name}
                    onChange={(e) => setAddressFormData({ ...addressFormData, recipient_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    10-Digit Mobile *
                  </label>
                  <div style={{ display: 'flex' }}>
                    <span style={{ padding: '0.65rem', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', fontSize: '0.85rem', fontWeight: 700 }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      value={addressFormData.recipient_phone}
                      onChange={(e) => setAddressFormData({ ...addressFormData, recipient_phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="9876543210"
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Flat, House no., Building, Apartment *
                </label>
                <input
                  type="text"
                  required
                  value={addressFormData.address_line1}
                  onChange={(e) => setAddressFormData({ ...addressFormData, address_line1: e.target.value })}
                  placeholder="e.g. Flat 402, Shanti Heights"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Area, Street, Sector, Village
                  </label>
                  <input
                    type="text"
                    value={addressFormData.address_line2}
                    onChange={(e) => setAddressFormData({ ...addressFormData, address_line2: e.target.value })}
                    placeholder="e.g. Linking Road, Bandra"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Town / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.city}
                    onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    State / UT *
                  </label>
                  <select
                    value={addressFormData.state}
                    onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem', background: '#ffffff' }}
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    PIN Code (6 digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={addressFormData.postal_code}
                    onChange={(e) => setAddressFormData({ ...addressFormData, postal_code: e.target.value.replace(/\D/g, '') })}
                    placeholder="400050"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Address Label:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressFormData({ ...addressFormData, label: lbl })}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: addressFormData.label === lbl ? '1px solid var(--fg-primary)' : '1px solid var(--border-subtle)',
                        background: addressFormData.label === lbl ? 'var(--fg-primary)' : '#ffffff',
                        color: addressFormData.label === lbl ? '#ffffff' : 'var(--fg-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={addressFormData.is_default}
                  onChange={(e) => setAddressFormData({ ...addressFormData, is_default: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Set as my default delivery address</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="btn-card-toggle"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="btn-card-add"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem' }}
                >
                  {savingAddress ? 'Saving Address...' : editingAddressId ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--fg-muted)' }}>Loading Profile...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
