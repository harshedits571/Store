'use client';
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '../../context/StoreContext';
import { useAdminNotifications } from '../../context/AdminNotificationContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Permission = {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
};

type Role = {
  id?: string;
  name: string;
  color: string;
  permissions: string[];
  isSystem?: boolean;
};

type TeamMember = {
  id?: string;
  email: string;
  name: string;
  roleId: string;
  status: 'active' | 'invited' | 'suspended';
  addedAt?: string;
  lastLogin?: string;
};

// ─── All available permissions ────────────────────────────────────────────────
const ALL_PERMISSIONS: Permission[] = [
  { id: 'view_dashboard', label: 'View Dashboard',     description: 'See stats and revenue overview',            icon: '📊', category: 'Dashboard' },
  { id: 'view_orders',    label: 'View Orders',        description: 'See all customer orders',                   icon: '🛍️', category: 'Orders' },
  { id: 'manage_orders',  label: 'Manage Orders',      description: 'Update, refund, and manage orders',         icon: '✏️', category: 'Orders' },
  { id: 'view_products',  label: 'View Products',      description: 'Browse product catalog',                    icon: '📦', category: 'Products' },
  { id: 'manage_products',label: 'Manage Products',    description: 'Add, edit, delete products',               icon: '🛠️', category: 'Products' },
  { id: 'view_customers', label: 'View Customers',     description: 'See customer list and profiles',            icon: '👥', category: 'Customers' },
  { id: 'manage_customers',label:'Manage Customers',   description: 'Edit customer data, block/unblock',         icon: '🔧', category: 'Customers' },
  { id: 'view_licenses',  label: 'View Licenses',      description: 'See all generated license keys',            icon: '🔑', category: 'Licenses' },
  { id: 'manage_licenses',label: 'Manage Licenses',    description: 'Block, grant, reset license keys',          icon: '🔒', category: 'Licenses' },
  { id: 'view_articles',  label: 'View Articles',      description: 'See blog and article content',              icon: '📝', category: 'Content' },
  { id: 'manage_articles',label: 'Manage Articles',    description: 'Create and edit articles',                  icon: '✍️', category: 'Content' },
  { id: 'manage_promos',  label: 'Manage Promos',      description: 'Create and manage promo codes',             icon: '🏷️', category: 'Content' },
  { id: 'view_analytics', label: 'View Analytics',     description: 'See visitor and conversion analytics',      icon: '📈', category: 'Analytics' },
  { id: 'manage_settings',label: 'Manage Settings',    description: 'Edit homepage and store settings',          icon: '⚙️', category: 'Settings' },
  { id: 'manage_team',    label: 'Manage Team',        description: 'Invite admins and manage roles (super admin only)', icon: '👑', category: 'Settings' },
];

const PERMISSION_CATEGORIES = ['Dashboard', 'Orders', 'Products', 'Customers', 'Licenses', 'Content', 'Analytics', 'Settings'];

// ─── Preset role colors ───────────────────────────────────────────────────────
const ROLE_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];

// ─── System default roles ─────────────────────────────────────────────────────
const SYSTEM_ROLES: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    color: '#EF4444',
    permissions: ALL_PERMISSIONS.map(p => p.id),
    isSystem: true,
  },
  {
    id: 'manager',
    name: 'Manager',
    color: '#3B82F6',
    permissions: ['view_dashboard','view_orders','manage_orders','view_products','manage_products','view_customers','manage_customers','view_licenses','manage_licenses','view_articles','manage_articles','manage_promos','view_analytics'],
    isSystem: true,
  },
  {
    id: 'support',
    name: 'Support',
    color: '#10B981',
    permissions: ['view_dashboard','view_orders','view_customers','view_licenses','manage_licenses'],
    isSystem: true,
  },
  {
    id: 'content_editor',
    name: 'Content Editor',
    color: '#8B5CF6',
    permissions: ['view_dashboard','view_products','manage_products','view_articles','manage_articles'],
    isSystem: true,
  },
];

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.1)',
  background: '#fff',
  color: '#111',
  fontSize: '0.875rem',
  outline: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  padding: '28px',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: '#111',
  marginBottom: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export default function SettingsPage() {
  const { products } = useStore();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    soundEnabled,
    setSoundEnabled,
    soundType,
    setSoundType,
    testNotification,
    playSaleSound
  } = useAdminNotifications();
  const [activeTab, setActiveTab] = useState<'homepage' | 'team' | 'roles'>('homepage');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Homepage settings state ─────────────────────────────────────────────────
  const [heroTitleLine1, setHeroTitleLine1] = useState('');
  const [heroTitleLine2, setHeroTitleLine2] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCarouselStyle, setHeroCarouselStyle] = useState<'style1' | 'style2'>('style1');
  const [bundleBadge, setBundleBadge] = useState('');
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleSub, setBundleSub] = useState('');
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleInrOriginalPrice, setBundleInrOriginalPrice] = useState('');
  const [bundleInrPrice, setBundleInrPrice] = useState('');
  const [bundleItemsText, setBundleItemsText] = useState('');
  const [bundleProductIds, setBundleProductIds] = useState<string[]>([]);
  const [bundleBgUrl, setBundleBgUrl] = useState('');
  const [bioTitle, setBioTitle] = useState('');
  const [bioText1, setBioText1] = useState('');
  const [bioText2, setBioText2] = useState('');
  const [bioImageUrl, setBioImageUrl] = useState('');

  // ── Creator & Store Identity ──
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState('/fabicone.png');
  const [creatorName, setCreatorName] = useState('Crevo Store');

  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [testimonials, setTestimonials] = useState<{ name: string; handle: string; text: string }[]>([]);

  // ── Limited-Time Promo Popup State ──
  const [promoPopupEnabled, setPromoPopupEnabled] = useState(true);
  const [promoPopupBadge, setPromoPopupBadge] = useState('⚡ LIMITED TIME OFFER ⚡');
  const [promoPopupHeading, setPromoPopupHeading] = useState('Exclusive Creator Discount');
  const [promoPopupDesc, setPromoPopupDesc] = useState('Get an instant discount on all premium video editing assets, plugins & presets before the timer expires!');
  const [promoPopupCode, setPromoPopupCode] = useState('CREVO20');
  const [promoPopupDiscount, setPromoPopupDiscount] = useState('20% OFF');
  const [promoPopupMinutes, setPromoPopupMinutes] = useState('15');

  // ── Special Celebration Day Promo & Confetti State ──
  const [specialPromoEnabled, setSpecialPromoEnabled] = useState(false);
  const [specialPromoOccasion, setSpecialPromoOccasion] = useState('🎂 Founder\'s Birthday Special!');
  const [specialPromoHeading, setSpecialPromoHeading] = useState('Special Celebration Discount');
  const [specialPromoReason, setSpecialPromoReason] = useState('Today is a special day for Crevo Store! Grab an exclusive flat 50% discount on all assets.');
  const [specialPromoCode, setSpecialPromoCode] = useState('SPECIAL50');
  const [specialPromoDiscount, setSpecialPromoDiscount] = useState('50% OFF');
  const [specialPromoConfetti, setSpecialPromoConfetti] = useState(true);

  // ── Team state ──────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('manager');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);

  // New role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  // ── Load homepage settings ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'homepage'));
        if (snap.exists()) {
          const d = snap.data();
          setHeroTitleLine1(d.heroTitleLine1 || '');
          setHeroTitleLine2(d.heroTitleLine2 || '');
          setHeroSubtitle(d.heroSubtitle || '');
          setHeroCarouselStyle(d.heroCarouselStyle || 'style1');
          setBundleBadge(d.bundleBadge || '');
          setBundleTitle(d.bundleTitle || '');
          setBundleSub(d.bundleSub || '');
          setBundleOriginalPrice(d.bundleOriginalPrice?.toString() || '');
          setBundlePrice(d.bundlePrice?.toString() || '');
          setBundleInrOriginalPrice(d.bundleInrOriginalPrice?.toString() || '');
          setBundleInrPrice(d.bundleInrPrice?.toString() || '');
          setBundleItemsText(d.bundleItems ? d.bundleItems.join('\n') : '');
          setBundleProductIds(d.bundleProductIds || []);
          setBundleBgUrl(d.bundleBgUrl || '');
          setBioTitle(d.bioTitle || '');
          setBioText1(d.bioText1 || '');
          setBioText2(d.bioText2 || '');
          setBioImageUrl(d.bioImageUrl || '');
          setCreatorAvatarUrl(d.creatorAvatarUrl || '/fabicone.png');
          setCreatorName(d.creatorName || 'Crevo Store');
          setFeaturedProductIds(d.featuredProductIds || []);
          setFaqs(d.faqs || []);
          setTestimonials(d.testimonials || []);

          // Promo Popup
          if (d.promoPopupEnabled !== undefined) setPromoPopupEnabled(d.promoPopupEnabled);
          if (d.promoPopupBadge) setPromoPopupBadge(d.promoPopupBadge);
          if (d.promoPopupHeading) setPromoPopupHeading(d.promoPopupHeading);
          if (d.promoPopupDesc) setPromoPopupDesc(d.promoPopupDesc);
          if (d.promoPopupCode) setPromoPopupCode(d.promoPopupCode);
          if (d.promoPopupDiscount) setPromoPopupDiscount(d.promoPopupDiscount);
          if (d.promoPopupMinutes) setPromoPopupMinutes(d.promoPopupMinutes.toString());

          // Special Celebration Promo
          if (d.specialPromoEnabled !== undefined) setSpecialPromoEnabled(d.specialPromoEnabled);
          if (d.specialPromoOccasion) setSpecialPromoOccasion(d.specialPromoOccasion);
          if (d.specialPromoHeading) setSpecialPromoHeading(d.specialPromoHeading);
          if (d.specialPromoReason) setSpecialPromoReason(d.specialPromoReason);
          if (d.specialPromoCode) setSpecialPromoCode(d.specialPromoCode);
          if (d.specialPromoDiscount) setSpecialPromoDiscount(d.specialPromoDiscount);
          if (d.specialPromoConfetti !== undefined) setSpecialPromoConfetti(d.specialPromoConfetti);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  // ── Load team members & custom roles ───────────────────────────────────────
  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [membersSnap, rolesSnap] = await Promise.all([
        getDocs(collection(db, 'admin_team')),
        getDocs(collection(db, 'admin_roles')),
      ]);
      setTeamMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
      const customRoles: Role[] = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Role));
      setRoles([...SYSTEM_ROLES, ...customRoles]);
    } catch (err) { console.error(err); }
    setTeamLoading(false);
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // ── Save homepage settings ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const bundleItems = bundleItemsText.split('\n').map(i => i.trim()).filter(Boolean);
    try {
      await setDoc(doc(db, 'settings', 'homepage'), {
        heroTitleLine1, heroTitleLine2, heroSubtitle,
        heroCarouselStyle,
        bundleBadge, bundleTitle, bundleSub,
        bundleOriginalPrice: parseFloat(bundleOriginalPrice) || 0,
        bundlePrice: parseFloat(bundlePrice) || 0,
        bundleInrOriginalPrice: parseFloat(bundleInrOriginalPrice) || null,
        bundleInrPrice: parseFloat(bundleInrPrice) || null,
        bundleItems, bundleProductIds, bundleBgUrl,
        bioTitle, bioText1, bioText2, bioImageUrl,
        creatorAvatarUrl: creatorAvatarUrl.trim() || '/fabicone.png',
        creatorName: creatorName.trim() || 'Crevo Store',
        featuredProductIds, faqs, testimonials,
        promoPopupEnabled,
        promoPopupBadge,
        promoPopupHeading,
        promoPopupDesc,
        promoPopupCode: promoPopupCode.trim().toUpperCase(),
        promoPopupDiscount,
        promoPopupMinutes: parseInt(promoPopupMinutes, 10) || 15,

        // Special Celebration Promo
        specialPromoEnabled,
        specialPromoOccasion,
        specialPromoHeading,
        specialPromoReason,
        specialPromoCode: specialPromoCode.trim().toUpperCase(),
        specialPromoDiscount,
        specialPromoConfetti,
      }, { merge: true });

      // Auto-sync discount code to custom_links collection so checkout works immediately
      if (promoPopupCode.trim()) {
        const cleanCode = promoPopupCode.trim().toUpperCase();
        const discountNum = parseInt(promoPopupDiscount.replace(/[^0-9]/g, ''), 10) || 20;
        await setDoc(doc(db, 'custom_links', cleanCode), {
          active: promoPopupEnabled,
          pricingMode: 'discount',
          discountPercent: discountNum,
          products: [], // applies to all products
          maxRedemptions: 0,
          note: 'Auto-synced from Promo Popup settings',
        }, { merge: true });
      }

      // Auto-sync Special Celebration promo code to custom_links collection
      if (specialPromoCode.trim()) {
        const cleanSpecialCode = specialPromoCode.trim().toUpperCase();
        const specialDiscountNum = parseInt(specialPromoDiscount.replace(/[^0-9]/g, ''), 10) || 50;
        await setDoc(doc(db, 'custom_links', cleanSpecialCode), {
          active: specialPromoEnabled,
          pricingMode: 'discount',
          discountPercent: specialDiscountNum,
          products: [], // applies to all products
          maxRedemptions: 0,
          note: `Special Celebration: ${specialPromoOccasion}`,
        }, { merge: true });
      }

      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast('Error saving settings.', 'error');
    }
    setSaving(false);
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Invite team member ─────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    setTeamSaving(true);
    try {
      await addDoc(collection(db, 'admin_team'), {
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim(),
        roleId: inviteRoleId,
        status: 'invited',
        addedAt: new Date().toISOString(),
      });
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteEmail(''); setInviteName(''); setInviteRoleId('manager');
      setShowInviteModal(false);
      fetchTeam();
    } catch (err) { showToast('Error inviting member.', 'error'); }
    setTeamSaving(false);
  };

  // ── Remove team member ─────────────────────────────────────────────────────
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await deleteDoc(doc(db, 'admin_team', memberId));
      showToast('Member removed.', 'success');
      fetchTeam();
    } catch (err) { showToast('Error removing member.', 'error'); }
  };

  // ── Update member role ─────────────────────────────────────────────────────
  const handleUpdateRole = async (memberId: string, newRoleId: string) => {
    try {
      await updateDoc(doc(db, 'admin_team', memberId), { roleId: newRoleId });
      fetchTeam();
    } catch (err) { showToast('Error updating role.', 'error'); }
  };

  // ── Toggle member status ───────────────────────────────────────────────────
  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'admin_team', member.id!), { status: newStatus });
      showToast(`Member ${newStatus}.`, 'success');
      fetchTeam();
    } catch (err) { showToast('Error updating status.', 'error'); }
  };

  // ── Create custom role ─────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!newRoleName.trim() || newRolePerms.length === 0) return;
    setTeamSaving(true);
    try {
      await addDoc(collection(db, 'admin_roles'), {
        name: newRoleName.trim(),
        color: newRoleColor,
        permissions: newRolePerms,
        isSystem: false,
      });
      showToast(`Role "${newRoleName}" created!`, 'success');
      setNewRoleName(''); setNewRoleColor(ROLE_COLORS[0]); setNewRolePerms([]);
      setShowRoleModal(false);
      fetchTeam();
    } catch (err) { showToast('Error creating role.', 'error'); }
    setTeamSaving(false);
  };

  // ── Delete custom role ─────────────────────────────────────────────────────
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this custom role? Members with this role will need reassignment.')) return;
    try {
      await deleteDoc(doc(db, 'admin_roles', roleId));
      showToast('Role deleted.', 'success');
      fetchTeam();
    } catch (err) { showToast('Error deleting role.', 'error'); }
  };

  // ── Toggle permission in new role modal ────────────────────────────────────
  const togglePerm = (permId: string) => {
    setNewRolePerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleCategoryPerms = (category: string) => {
    const catPerms = ALL_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const allSelected = catPerms.every(p => newRolePerms.includes(p));
    if (allSelected) {
      setNewRolePerms(prev => prev.filter(p => !catPerms.includes(p)));
    } else {
      setNewRolePerms(prev => [...new Set([...prev, ...catPerms])]);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getRoleById = (id: string) => roles.find(r => r.id === id);

  const handleProductToggle = (id: string) =>
    setFeaturedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBundleProductToggle = (id: string) =>
    setBundleProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleAddFaq = () => setFaqs(f => [...f, { q: '', a: '' }]);
  const handleRemoveFaq = (i: number) => setFaqs(f => f.filter((_, idx) => idx !== i));
  const handleFaqChange = (i: number, field: 'q' | 'a', v: string) => {
    const u = [...faqs]; u[i][field] = v; setFaqs(u);
  };

  const handleAddTestimonial = () => setTestimonials(t => [...t, { name: '', handle: '', text: '' }]);
  const handleRemoveTestimonial = (i: number) => setTestimonials(t => t.filter((_, idx) => idx !== i));
  const handleTestimonialChange = (i: number, f: 'name' | 'handle' | 'text', v: string) => {
    const u = [...testimonials]; u[i][f] = v; setTestimonials(u);
  };

  const statusColors: Record<string, string> = {
    active: '#10B981', invited: '#F59E0B', suspended: '#EF4444',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#999' }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
          color: toast.type === 'success' ? '#065F46' : '#991B1B',
          padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          fontWeight: 600, fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111', margin: 0, marginBottom: '4px' }}>
          Settings
        </h1>
        <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>
          Manage your store, team members, and access control
        </p>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: '4px',
        background: '#F3F4F6', borderRadius: '12px',
        padding: '4px', marginBottom: '32px', width: 'fit-content',
      }}>
        {([
          { id: 'homepage', label: '🏠 Homepage', },
          { id: 'team',     label: '👥 Team Members', },
          { id: 'roles',    label: '🛡️ Roles & Permissions', },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 20px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#111' : '#666',
              boxShadow: activeTab === tab.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: HOMEPAGE SETTINGS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'homepage' && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Save button sticky top */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '11px 28px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,113,227,0.3)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>

          {/* Real-Time Sale Audio & Popup Notification Card */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #10B981', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ ...sectionHeaderStyle, color: '#10B981' }}>🔔 Real-Time Sale Notifications & Audio Alerts</div>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Jab bhi store par koi new customer order / lead aayegi, turant live popup notification aur sound play hoga.
                </p>
              </div>

              {/* Master Notification Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: notificationsEnabled ? '#059669' : '#999' }}>
                  {notificationsEnabled ? '● Alerts ON' : '○ Alerts OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#10B981', cursor: 'pointer' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
              {/* Sound Toggle */}
              <div style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111' }}>Sale Sound (Chime) 🔊</div>
                  <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>Play audio on new purchase</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled && notificationsEnabled}
                  disabled={!notificationsEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0071E3', cursor: notificationsEnabled ? 'pointer' : 'not-allowed' }}
                />
              </div>

              {/* Sound Tone Selector */}
              <div style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111' }}>Chime Sound Tone</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['cash_register', 'chime', 'bell'] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => {
                        setSoundType(tone);
                        playSaleSound(tone);
                      }}
                      disabled={!notificationsEnabled || !soundEnabled}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid',
                        cursor: (notificationsEnabled && soundEnabled) ? 'pointer' : 'not-allowed',
                        background: soundType === tone ? 'rgba(0, 113, 227, 0.12)' : '#fff',
                        color: soundType === tone ? '#0071E3' : '#666',
                        borderColor: soundType === tone ? '#0071E3' : '#E5E7EB',
                        opacity: (notificationsEnabled && soundEnabled) ? 1 : 0.5
                      }}
                    >
                      {tone === 'cash_register' ? '💸 Cash Register' : tone === 'chime' ? '✨ Glass Chime' : '🔔 Bell'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Sound Button */}
              <div style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={testNotification}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  ⚡ Test Sale Notification & Sound
                </button>
              </div>
            </div>
          </div>

          {/* 0. Limited-Time Welcome Coupon & Sale Timer */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #0071E3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={sectionHeaderStyle}>🎟️ Limited-Time Welcome Coupon & Sale Timer</div>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Visitors see a sleek countdown popup & floating discount badge on entering the store with 1-click code copying.
                </p>
              </div>

              {/* Toggle switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: promoPopupEnabled ? '#059669' : '#999' }}>
                  {promoPopupEnabled ? '● Active' : '○ Inactive'}
                </span>
                <input
                  type="checkbox"
                  checked={promoPopupEnabled}
                  onChange={(e) => setPromoPopupEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#0071E3', cursor: 'pointer' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Coupon Code (e.g. CREVO20)
                  </label>
                  <input
                    type="text"
                    style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase' }}
                    value={promoPopupCode}
                    onChange={e => setPromoPopupCode(e.target.value.toUpperCase())}
                    placeholder="CREVO20"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Discount Tag / % (e.g. 20% OFF)
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={promoPopupDiscount}
                    onChange={e => setPromoPopupDiscount(e.target.value)}
                    placeholder="20% OFF"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Countdown Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    style={inputStyle}
                    value={promoPopupMinutes}
                    onChange={e => setPromoPopupMinutes(e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Badge Text
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={promoPopupBadge}
                    onChange={e => setPromoPopupBadge(e.target.value)}
                    placeholder="⚡ LIMITED TIME OFFER ⚡"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Popup Main Heading
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={promoPopupHeading}
                    onChange={e => setPromoPopupHeading(e.target.value)}
                    placeholder="Exclusive Creator Discount"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                  Popup Description
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  value={promoPopupDesc}
                  onChange={e => setPromoPopupDesc(e.target.value)}
                  placeholder="Get an instant discount on all premium video editing assets, plugins & presets before the timer expires!"
                />
              </div>

              {/* Preview Box */}
              <div style={{
                background: '#F9FAFB',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🎁</span>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111' }}>
                      Visitor Preview: <span style={{ color: '#0071E3', fontFamily: 'monospace' }}>{promoPopupCode}</span> ({promoPopupDiscount})
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#666' }}>
                      Timer starts at {promoPopupMinutes} mins per visitor with 1-click clipboard copy
                    </span>
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: promoPopupEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)',
                  color: promoPopupEnabled ? '#059669' : '#999',
                }}>
                  {promoPopupEnabled ? 'Active on Storefront' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* 0B. Special Celebration Day Promo & Confetti Event */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #EC4899', background: specialPromoEnabled ? 'rgba(236, 72, 153, 0.02)' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ ...sectionHeaderStyle, color: '#DB2777' }}>🎊 Special Celebration Day Promo & Confetti Blast</div>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Enable a full-screen celebratory confetti blast and special milestone discount modal for birthdays, anniversaries, or special milestones.
                </p>
              </div>

              {/* Toggle Switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: specialPromoEnabled ? '#DB2777' : '#999' }}>
                  {specialPromoEnabled ? '🎉 Celebration Mode Active' : 'Celebration Mode Off'}
                </span>
                <div
                  onClick={() => setSpecialPromoEnabled(!specialPromoEnabled)}
                  style={{
                    width: '46px',
                    height: '24px',
                    borderRadius: '99px',
                    background: specialPromoEnabled ? '#EC4899' : '#D1D5DB',
                    position: 'relative',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: specialPromoEnabled ? '25px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', opacity: specialPromoEnabled ? 1 : 0.6, pointerEvents: specialPromoEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Occasion / Event Title (e.g. Birthday, Anniversary)
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={specialPromoOccasion}
                    onChange={e => setSpecialPromoOccasion(e.target.value)}
                    placeholder="🎂 Founder's Birthday Special!"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Main Celebration Headline
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={specialPromoHeading}
                    onChange={e => setSpecialPromoHeading(e.target.value)}
                    placeholder="Exclusive Celebration Discount"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Celebration Promo Code
                  </label>
                  <input
                    type="text"
                    style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                    value={specialPromoCode}
                    onChange={e => setSpecialPromoCode(e.target.value.toUpperCase())}
                    placeholder="SPECIAL50"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Discount Percentage / Label
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={specialPromoDiscount}
                    onChange={e => setSpecialPromoDiscount(e.target.value)}
                    placeholder="50% OFF"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                  Reason & Announcement Message
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  value={specialPromoReason}
                  onChange={e => setSpecialPromoReason(e.target.value)}
                  placeholder="Today is a very special day for Crevo Store! We are celebrating with an exclusive store-wide discount for our creative community."
                />
              </div>

              {/* Confetti Toggle & Live Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FDF2F8', borderRadius: '12px', border: '1px solid #FBCFE8' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#9D174D' }}>
                  <input
                    type="checkbox"
                    checked={specialPromoConfetti}
                    onChange={e => setSpecialPromoConfetti(e.target.checked)}
                    style={{ accentColor: '#EC4899', width: '16px', height: '16px' }}
                  />
                  <span>🎉 Blast Full-Screen Colorful Confetti Cannon on visitor arrival</span>
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DB2777' }}>
                  Code auto-syncs with checkout
                </span>
              </div>
            </div>
          </div>

          {/* 0. Storefront Identity & Creator Badge */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #0071E3', background: '#fff' }}>
            <div style={sectionHeaderStyle}>🏪 Storefront Identity & Creator Badge</div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '20px', marginTop: '2px' }}>
              Set your store brand name and profile avatar / logo. Changes are rendered in the <strong>Live Preview</strong> below instantly before saving.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
              
              {/* Left Side: Live Preview Cards */}
              <div style={{
                background: '#F9FAFB',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ● Live Instant Preview
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>
                    Pre-Save Render
                  </span>
                </div>

                {/* 1. Circular Avatar Card Preview */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#111',
                    border: '2px solid #0071E3',
                    boxShadow: '0 4px 12px rgba(0, 113, 227, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {(() => {
                      const trimmed = (creatorAvatarUrl || '').trim();
                      if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
                        return (
                          <div
                            dangerouslySetInnerHTML={{ __html: trimmed }}
                            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          />
                        );
                      }
                      if (trimmed.startsWith('<img') || trimmed.includes('<img')) {
                        const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
                        const src = srcMatch ? srcMatch[1] : '/fabicone.png';
                        return (
                          <img
                            key={src}
                            src={src}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = '/fabicone.png'; }}
                          />
                        );
                      }
                      return (
                        <img
                          key={trimmed || 'default'}
                          src={trimmed || '/fabicone.png'}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = '/fabicone.png'; }}
                        />
                      );
                    })()}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {creatorName || 'Crevo Store'}
                      </span>
                      <span style={{ color: '#0071E3', fontSize: '0.9rem' }} title="Verified Store">✓</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      Store Creator & Verified Seller
                    </span>
                  </div>
                </div>

                {/* 2. Glassmorphic Pill Banner Mockup */}
                <div style={{
                  background: 'rgba(17, 24, 39, 0.95)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {(() => {
                        const trimmed = (creatorAvatarUrl || '').trim();
                        if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
                          return (
                            <div
                              dangerouslySetInnerHTML={{ __html: trimmed }}
                              style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                          );
                        }
                        if (trimmed.startsWith('<img') || trimmed.includes('<img')) {
                          const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
                          const src = srcMatch ? srcMatch[1] : '/fabicone.png';
                          return (
                            <img
                              key={`pill-${src}`}
                              src={src}
                              alt="Logo"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.currentTarget.src = '/fabicone.png'; }}
                            />
                          );
                        }
                        return (
                          <img
                            key={`pill-${trimmed}`}
                            src={trimmed || '/fabicone.png'}
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.currentTarget.src = '/fabicone.png'; }}
                          />
                        );
                      })()}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {creatorName || 'Crevo Store'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '100px' }}>
                    Header View
                  </span>
                </div>
              </div>

              {/* Right Side: Form Inputs & File Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Store / Creator Brand Name
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={creatorName}
                    onChange={e => setCreatorName(e.target.value)}
                    placeholder="e.g. Crevo Store"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                      Logo Image URL, Path, or SVG Code
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      Supports URL, Base64, or &lt;svg&gt;
                    </span>
                  </div>
                  <textarea
                    style={{ ...inputStyle, minHeight: '76px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    value={creatorAvatarUrl}
                    onChange={e => setCreatorAvatarUrl(e.target.value)}
                    placeholder="Paste image URL (https://...), local path (/fabicone.png), or raw <svg>...</svg> code"
                  />
                </div>

                {/* Upload File & Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    color: '#374151',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <span>📁 Upload Logo File</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            if (result) {
                              setCreatorAvatarUrl(result);
                              showToast('Logo loaded into Live Preview!', 'success');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setCreatorAvatarUrl('/fabicone.png')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'none',
                      border: '1px solid #E5E7EB',
                      color: '#6B7280',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Reset Default (/fabicone.png)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatorAvatarUrl('/black.png')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'none',
                      border: '1px solid #E5E7EB',
                      color: '#6B7280',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Use /black.png
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 1. Hero Banner */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>🎯 Hero Banner</div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '20px', marginTop: '2px' }}>
              Customize the main headline and subtitle shown at the top of your store.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Title Line 1 (Gradient Text)
                  </label>
                  <input type="text" style={inputStyle} value={heroTitleLine1} onChange={e => setHeroTitleLine1(e.target.value)} placeholder="e.g. Spend less time editing," />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Title Line 2 (Bold Text)
                  </label>
                  <input type="text" style={inputStyle} value={heroTitleLine2} onChange={e => setHeroTitleLine2(e.target.value)} placeholder="e.g. More time living." />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Subtitle</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Subtitle shown under hero title..." />
              </div>
            </div>
          </div>

          {/* 2. Bundle Settings */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>📦 All-In-One Bundle</div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '20px', marginTop: '2px' }}>
              Configure the bundle offer section displayed on your homepage.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Badge Text</label>
                  <input type="text" style={inputStyle} value={bundleBadge} onChange={e => setBundleBadge(e.target.value)} placeholder="⚡ Value $370+ for cheap ⚡" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Bundle Title</label>
                  <input type="text" style={inputStyle} value={bundleTitle} onChange={e => setBundleTitle(e.target.value)} placeholder="ALL IN ONE CREATIVE SUITE" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Bundle Description</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={bundleSub} onChange={e => setBundleSub(e.target.value)} placeholder="Get instant lifetime access..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Background Image URL</label>
                <input type="text" style={inputStyle} value={bundleBgUrl} onChange={e => setBundleBgUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Original Price ($)', val: bundleOriginalPrice, set: setBundleOriginalPrice },
                  { label: 'Sale Price ($)',      val: bundlePrice,         set: setBundlePrice },
                  { label: 'Original Price (₹)',  val: bundleInrOriginalPrice, set: setBundleInrOriginalPrice },
                  { label: 'Sale Price (₹)',      val: bundleInrPrice,      set: setBundleInrPrice },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>{label}</label>
                    <input type="number" step="0.01" style={inputStyle} value={val} onChange={e => set(e.target.value)} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                  Bundle Features List <span style={{ fontWeight: 400, color: '#999' }}>(one per line)</span>
                </label>
                <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'monospace' }} value={bundleItemsText} onChange={e => setBundleItemsText(e.target.value)} placeholder={'All Premium Plugins\nVisual Transitions Pack\nCinematic SFX'} />
              </div>

              {/* Bundle product selection */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#333', marginBottom: '4px' }}>Products included in this bundle</label>
                <p style={{ color: '#999', fontSize: '0.78rem', marginBottom: '12px' }}>Selected products are unlocked for the buyer instantly.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {products.map(prod => (
                    <label key={`bundle-${prod.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                      borderRadius: '10px', border: `2px solid ${bundleProductIds.includes(prod.id) ? '#0071E3' : 'rgba(0,0,0,0.08)'}`,
                      background: bundleProductIds.includes(prod.id) ? 'rgba(0,113,227,0.05)' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <input type="checkbox" checked={bundleProductIds.includes(prod.id)} onChange={() => handleBundleProductToggle(prod.id)} style={{ accentColor: '#0071E3', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111' }}>{prod.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#999' }}>${Number(prod.price).toFixed(2)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Homepage Products Display */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={sectionHeaderStyle}>⭐ Homepage Display Products</div>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Select exactly which products appear on the storefront homepage. Leave all unchecked to show all products.
                </p>
              </div>

              {/* Counter and quick action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                  {featuredProductIds.length > 0 ? `${featuredProductIds.length} of ${products.length} Selected` : 'All Products Showing'}
                </span>
                <button
                  type="button"
                  onClick={() => setFeaturedProductIds(products.map(p => p.id))}
                  style={{ background: '#F3F4F6', border: 'none', padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedProductIds([])}
                  style={{ background: '#F3F4F6', border: 'none', padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {products.map(prod => {
                const isSelected = featuredProductIds.includes(prod.id);
                const thumb = prod.imageUrls?.[0] || prod.imageUrl || '';

                return (
                  <label 
                    key={prod.id} 
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 14px',
                      borderRadius: '12px', 
                      border: `2px solid ${isSelected ? '#0071E3' : 'rgba(0,0,0,0.08)'}`,
                      background: isSelected ? 'rgba(0, 113, 227, 0.04)' : '#fff',
                      cursor: 'pointer', 
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,113,227,0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => handleProductToggle(prod.id)} 
                      style={{ accentColor: '#0071E3', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} 
                    />
                    
                    {/* Thumbnail preview */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#F3F4F6', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }}>
                      {thumb ? (
                        <img src={thumb} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📦</div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                        <span style={{ background: '#F3F4F6', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{prod.category || 'Asset'}</span>
                        <span style={{ fontWeight: 700, color: '#111' }}>
                          {prod.price ? `$${Number(prod.price).toFixed(2)}` : (prod.inrPrice ? `₹${prod.inrPrice}` : 'Free')}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Creator Bio */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>👤 Creator Biography</div>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '20px', marginTop: '2px' }}>About section shown on your store homepage.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Bio Title</label>
                <input type="text" style={inputStyle} value={bioTitle} onChange={e => setBioTitle(e.target.value)} placeholder="WHO IS ASIM?" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Paragraph 1</label>
                  <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={bioText1} onChange={e => setBioText1(e.target.value)} placeholder="Introductory bio..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Paragraph 2</label>
                  <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={bioText2} onChange={e => setBioText2(e.target.value)} placeholder="Additional details..." />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Bio Image URL</label>
                <input type="url" style={inputStyle} value={bioImageUrl} onChange={e => setBioImageUrl(e.target.value)} placeholder="https://example.com/photo.png" />
              </div>
            </div>
          </div>

          {/* 5. FAQs */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={sectionHeaderStyle}>❓ FAQs</div>
              <button type="button" onClick={handleAddFaq} style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', color: '#111',
              }}>+ Add Question</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {faqs.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', padding: '24px', fontSize: '0.875rem' }}>No FAQs yet. Click "+ Add Question".</div>}
              {faqs.map((faq, i) => (
                <div key={i} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ background: '#0071E3', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>Q{i + 1}</span>
                    <input type="text" style={{ ...inputStyle, flex: 1 }} value={faq.q} onChange={e => handleFaqChange(i, 'q', e.target.value)} placeholder="Question..." />
                    <button type="button" onClick={() => handleRemoveFaq(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>Remove</button>
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }} value={faq.a} onChange={e => handleFaqChange(i, 'a', e.target.value)} placeholder="Answer..." />
                </div>
              ))}
            </div>
          </div>

          {/* 6. Testimonials */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={sectionHeaderStyle}>💬 Testimonials</div>
              <button type="button" onClick={handleAddTestimonial} style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', color: '#111',
              }}>+ Add Testimonial</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {testimonials.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#ccc', padding: '24px', fontSize: '0.875rem' }}>No testimonials yet.</div>}
              {testimonials.map((t, i) => (
                <div key={i} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#555' }}>#{i + 1}</span>
                    <button type="button" onClick={() => handleRemoveTestimonial(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" style={inputStyle} value={t.name} onChange={e => handleTestimonialChange(i, 'name', e.target.value)} placeholder="Full Name" />
                    <input type="text" style={inputStyle} value={t.handle} onChange={e => handleTestimonialChange(i, 'handle', e.target.value)} placeholder="@handle" />
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={t.text} onChange={e => handleTestimonialChange(i, 'text', e.target.value)} placeholder="Testimonial text..." />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} style={{
              padding: '12px 32px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #0071E3, #005BB5)', color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,113,227,0.3)', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? '⏳ Saving...' : '💾 Save All Settings'}
            </button>
          </div>
        </form>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: TEAM MEMBERS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>Team Members</h2>
              <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '0.82rem' }}>Invite people and assign their access roles</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #0071E3, #005BB5)', color: '#fff',
                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,113,227,0.25)',
              }}
            >
              + Invite Member
            </button>
          </div>

          {/* Members Table */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {teamLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#999' }}>Loading team...</div>
            ) : teamMembers.length === 0 ? (
              <div style={{ padding: '64px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
                <div style={{ fontWeight: 700, color: '#333', marginBottom: '6px' }}>No team members yet</div>
                <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '20px' }}>Invite someone to help manage your store</div>
                <button onClick={() => setShowInviteModal(true)} style={{ padding: '10px 22px', borderRadius: '8px', background: '#0071E3', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  + Invite First Member
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {['Member', 'Role', 'Status', 'Added', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, i) => {
                    const role = getRoleById(member.roleId);
                    return (
                      <tr key={member.id} style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%',
                              background: `linear-gradient(135deg, ${role?.color || '#999'}, ${role?.color || '#ccc'}88)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                            }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#111', fontSize: '0.9rem' }}>{member.name}</div>
                              <div style={{ color: '#888', fontSize: '0.78rem' }}>{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <select
                            value={member.roleId}
                            onChange={e => handleUpdateRole(member.id!, e.target.value)}
                            style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, color: role?.color || '#333', borderColor: role?.color ? `${role.color}40` : undefined }}
                          >
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            background: `${statusColors[member.status]}18`,
                            color: statusColors[member.status],
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColors[member.status], display: 'inline-block' }} />
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#888', fontSize: '0.8rem' }}>
                          {member.addedAt ? new Date(member.addedAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleStatus(member)}
                              style={{
                                padding: '5px 12px', borderRadius: '7px', border: '1px solid',
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                background: 'transparent',
                                borderColor: member.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
                                color: member.status === 'active' ? '#D97706' : '#059669',
                              }}
                            >
                              {member.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id!)}
                              style={{
                                padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.25)',
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                background: 'transparent', color: '#DC2626',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: ROLES & PERMISSIONS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>Roles & Permissions</h2>
              <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '0.82rem' }}>Define what each role can see and do in the admin panel</p>
            </div>
            <button
              onClick={() => { setNewRoleName(''); setNewRoleColor(ROLE_COLORS[0]); setNewRolePerms([]); setShowRoleModal(true); }}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff',
                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
              }}
            >
              + Create Custom Role
            </button>
          </div>

          {/* Roles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {roles.map(role => (
              <div key={role.id} style={{
                ...cardStyle, padding: '20px',
                borderLeft: `4px solid ${role.color}`,
              }}>
                {/* Role header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%', background: role.color, display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111' }}>{role.name}</span>
                      {role.isSystem && (
                        <span style={{ background: '#F3F4F6', color: '#888', padding: '1px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>SYSTEM</span>
                      )}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.78rem' }}>{role.permissions.length} permissions</div>
                  </div>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(role.id!)}
                      style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '7px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Permissions by category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {PERMISSION_CATEGORIES.map(cat => {
                    const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat);
                    const grantedInCat = catPerms.filter(p => role.permissions.includes(p.id));
                    if (grantedInCat.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{cat}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {grantedInCat.map(perm => (
                            <span key={perm.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                              background: `${role.color}12`, color: role.color,
                            }}>
                              {perm.icon} {perm.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* All permissions reference table */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, marginBottom: '16px' }}>📋 All Available Permissions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {PERMISSION_CATEGORIES.map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 6px' }}>{cat}</div>
                  {ALL_PERMISSIONS.filter(p => p.category === cat).map(perm => (
                    <div key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: '#F9FAFB' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{perm.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111' }}>{perm.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{perm.description}</div>
                      </div>
                      <code style={{ fontSize: '0.68rem', color: '#aaa', background: '#EBEBEB', padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace' }}>{perm.id}</code>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: Invite Member
      ════════════════════════════════════════════════════════════════════════ */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => setShowInviteModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111' }}>👥 Invite Team Member</h2>
                <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '0.82rem' }}>Add someone to help manage your store</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Full Name *</label>
                <input type="text" style={inputStyle} value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Email Address *</label>
                <input type="email" style={inputStyle} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. rahul@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Assign Role *</label>
                <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)} style={inputStyle}>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.permissions.length} permissions)</option>
                  ))}
                </select>
              </div>

              {/* Show what this role can do */}
              {(() => {
                const selectedRole = getRoleById(inviteRoleId);
                if (!selectedRole) return null;
                return (
                  <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '14px', border: `1px solid ${selectedRole.color}30` }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedRole.color, marginBottom: '8px' }}>
                      {selectedRole.name} will have access to:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {ALL_PERMISSIONS.filter(p => selectedRole.permissions.includes(p.id)).map(p => (
                        <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: `${selectedRole.color}10`, color: selectedRole.color }}>
                          {p.icon} {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowInviteModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontWeight: 700, cursor: 'pointer', color: '#555' }}>
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={teamSaving || !inviteEmail || !inviteName}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0071E3, #005BB5)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: teamSaving ? 0.7 : 1 }}
                >
                  {teamSaving ? 'Inviting...' : '📨 Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: Create Custom Role
      ════════════════════════════════════════════════════════════════════════ */}
      {showRoleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => setShowRoleModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111' }}>🛡️ Create Custom Role</h2>
                <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '0.82rem' }}>Define a new role with specific permissions</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name + Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Role Name *</label>
                  <input type="text" style={inputStyle} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. Sales Manager" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {ROLE_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewRoleColor(c)} style={{
                        width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${newRoleColor === c ? '#111' : 'transparent'}`,
                        cursor: 'pointer', transition: 'border 0.1s',
                      }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444' }}>
                    Permissions * <span style={{ fontWeight: 400, color: '#999' }}>({newRolePerms.length} selected)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setNewRolePerms(ALL_PERMISSIONS.map(p => p.id))} style={{ fontSize: '0.72rem', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Select All
                    </button>
                    <button type="button" onClick={() => setNewRolePerms([])} style={{ fontSize: '0.72rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Clear All
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {PERMISSION_CATEGORIES.map(cat => {
                    const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat);
                    const allCatSelected = catPerms.every(p => newRolePerms.includes(p.id));
                    const someCatSelected = catPerms.some(p => newRolePerms.includes(p.id));
                    return (
                      <div key={cat} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        {/* Category header */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: allCatSelected ? `${newRoleColor}0A` : '#F9FAFB', cursor: 'pointer' }}
                          onClick={() => toggleCategoryPerms(cat)}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#333' }}>{cat}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#888' }}>{catPerms.filter(p => newRolePerms.includes(p.id)).length}/{catPerms.length}</span>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${allCatSelected ? newRoleColor : (someCatSelected ? newRoleColor : 'rgba(0,0,0,0.2)')}`,
                              background: allCatSelected ? newRoleColor : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {allCatSelected && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
                              {!allCatSelected && someCatSelected && <span style={{ color: newRoleColor, fontSize: '0.9rem', lineHeight: 1 }}>–</span>}
                            </div>
                          </div>
                        </div>
                        {/* Permissions */}
                        <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {catPerms.map(perm => (
                            <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                              <div style={{
                                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                                border: `2px solid ${newRolePerms.includes(perm.id) ? newRoleColor : 'rgba(0,0,0,0.2)'}`,
                                background: newRolePerms.includes(perm.id) ? newRoleColor : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.1s',
                              }} onClick={() => togglePerm(perm.id)}>
                                {newRolePerms.includes(perm.id) && <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: '0.8rem' }}>{perm.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111' }}>{perm.label}</div>
                                <div style={{ fontSize: '0.72rem', color: '#888' }}>{perm.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button onClick={() => setShowRoleModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontWeight: 700, cursor: 'pointer', color: '#555' }}>
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={teamSaving || !newRoleName.trim() || newRolePerms.length === 0}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                    background: `linear-gradient(135deg, ${newRoleColor}, ${newRoleColor}CC)`,
                    color: '#fff', fontWeight: 700, cursor: 'pointer',
                    opacity: (teamSaving || !newRoleName.trim() || newRolePerms.length === 0) ? 0.5 : 1,
                  }}
                >
                  {teamSaving ? 'Creating...' : `🛡️ Create "${newRoleName || 'Role'}"`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
