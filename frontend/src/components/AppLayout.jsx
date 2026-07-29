import { Link, useLocation, Navigate } from 'react-router-dom';
import { User, ShoppingBag, Shield, Settings as SettingsIcon, Package, Users, LogOut, ChevronRight, Cpu } from 'lucide-react';
import useAuthStore from '@/lib/authStore';
import { toast } from 'sonner';

// ─── Unified sidebar — one nav for the entire signed-in experience ─────────────
// Items are filtered by role so each user sees a single, non-duplicated nav.
// `tab` is matched against the ?tab= query string (Account uses tab-based content
// switching); items without `tab` match by pathname.
const USER_ITEMS = [
  { to: '/account', tab: null, label: 'Profile', icon: User },
  // Personal order history — only customers (non-admins) see this. Admins
  // get the store-wide Orders entry in the Admin section instead, so there's
  // never two "Orders" rows for the same user.
  { to: '/account?tab=orders', tab: 'orders', label: 'Orders', icon: ShoppingBag, customerOnly: true },
  { to: '/account?tab=security', tab: 'security', label: 'Security', icon: Shield },
  { to: '/account?tab=settings', tab: 'settings', label: 'Settings', icon: SettingsIcon },
];

const ADMIN_ITEMS = [
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AppLayout({ children, requireAdmin = false }) {
  const { user, logout, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/account" replace />;

  const isAdmin = user.role === 'admin';
  const handleLogout = async () => { await logout(); toast.success('Logged out'); };

  // Active = same pathname AND same tab (matching `null` for items with no tab).
  const currentTab = new URLSearchParams(location.search).get('tab');
  const isActive = (item) => {
    if (item.tab !== undefined) {
      // Account-style item: match pathname + tab
      return location.pathname === '/account' && currentTab === item.tab;
    }
    // Admin-style item: pathname startsWith
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  // User items — skip the customer-only personal Orders entry for admins
  const visibleUserItems = USER_ITEMS.filter((i) => !(i.customerOnly && isAdmin));

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r flex flex-col"
        style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}>
        {/* Brand */}
        <div className="p-5 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <Cpu size={16} className="text-neutral-300" />
            <span className="font-bold text-[13px] tracking-tight">Reflexity RAM</span>
          </Link>
          <div className="text-[10px] text-neutral-600 mt-0.5 uppercase tracking-widest">
            {isAdmin ? 'Admin panel' : 'My account'}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleUserItems.map((item) => <SidebarLink key={item.label} item={item} active={isActive(item)} />)}

          {isAdmin && (
            <>
              <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-neutral-600">Admin</div>
              {ADMIN_ITEMS.map((item) => <SidebarLink key={item.to} item={item} active={isActive(item)} />)}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2 text-[12px] text-neutral-500 mb-1 truncate" title={user.email}>
            {user.email}
          </div>
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-neutral-400 hover:text-white hover:bg-white/4 transition-all"
          >
            <ChevronRight size={13} />
            View store
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
        active
          ? 'bg-white/8 text-white border border-white/10'
          : 'text-neutral-400 hover:text-white hover:bg-white/4'
      }`}
    >
      <Icon size={14} /> {item.label}
    </Link>
  );
}
