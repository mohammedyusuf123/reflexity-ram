import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart, User, Menu, X,
  ChevronDown, LogOut, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import ReflexityMark from "@/components/ReflexityMark";
import ThemeToggle from "@/components/ThemeToggle";
import AuthModal from "@/components/AuthModal";
import useCartStore from "@/lib/cartStore";
import useAuthStore from "@/lib/authStore";

const NAV = [
  { to: "/categories", label: "Shop RAM" },
  { to: "/support", label: "Support" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("signin");
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { itemCount } = useCartStore();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname, location.search]);

  const openAuth = (tab) => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    await logout();
    toast.success("Logged out");
  };

  return (
    <>
      <header className="header-blur fixed top-0 left-0 right-0 z-50" data-testid="site-header">
        <div className="container-tight flex items-center gap-4 py-3.5">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="header-logo-link">
            <ReflexityMark size={32} />
            <div className="hidden sm:block leading-tight">
              <div className="font-semibold tracking-tight text-[15px]">Reflexity</div>
              <div className="mono text-[10px] text-neutral-500">by Reflexity.io</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" data-testid="header-nav">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className="px-3 py-2 text-[13px] text-neutral-400 hover:text-white transition-colors rounded-full"
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden md:block mr-1">
              <ThemeToggle />
            </div>

            {/* Account dropdown */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="inline-flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-400 hover:text-white transition-colors"
                data-testid="header-account-btn"
              >
                <User size={15} />
                {isAuthenticated() && (
                  <span className="text-[12px] max-w-[80px] truncate">{user.firstName}</span>
                )}
                <ChevronDown size={12} className="opacity-60" />
              </button>

              {accountOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 bg-neutral-900/95 backdrop-blur border border-white/10 rounded-xl shadow-xl overflow-hidden z-40"
                  data-testid="header-account-dropdown"
                >
                  {isAuthenticated() ? (
                    <>
                      <div className="px-4 py-2.5 border-b border-white/5">
                        <div className="text-[12px] font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-[11px] text-neutral-500 truncate">{user.email}</div>
                      </div>
                      <button
                        onClick={() => { navigate("/account"); setAccountOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                        data-testid="account-dropdown-account"
                      >
                        <User size={13} /> Account
                      </button>
                      <button
                        onClick={() => { navigate("/account?tab=orders"); setAccountOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                        data-testid="account-dropdown-orders"
                      >
                        Orders
                      </button>
                      {user.role === 'admin' && (
                        <button
                          onClick={() => { navigate("/admin"); setAccountOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                          data-testid="account-dropdown-admin"
                        >
                          <LayoutDashboard size={13} /> Admin
                        </button>
                      )}
                      <div className="border-t border-white/5" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/5 transition-colors flex items-center gap-2"
                        data-testid="account-dropdown-signout"
                      >
                        <LogOut size={13} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { openAuth("signin"); setAccountOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                        data-testid="account-dropdown-signin"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => { openAuth("signup"); setAccountOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                        data-testid="account-dropdown-signup"
                      >
                        Create account
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors"
              data-testid="header-cart-link"
            >
              <ShoppingCart size={18} className="text-neutral-200" />
              {itemCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center"
                  data-testid="header-cart-count"
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors"
              data-testid="header-menu-toggle"
              aria-label="Menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden border-t border-white/5 bg-black/90 backdrop-blur-xl" data-testid="header-mobile-drawer">
            <div className="container-tight py-4 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} className="px-3 py-2.5 text-sm text-neutral-300 hover:text-white">
                  {n.label}
                </Link>
              ))}
              <div className="border-t border-white/5 my-2 pt-2">
                {isAuthenticated() ? (
                  <>
                    <Link to="/account" className="px-3 py-2.5 text-sm text-neutral-300 hover:text-white flex items-center gap-2">
                      <User size={15} /> {user.firstName}'s account
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="px-3 py-2.5 text-sm text-neutral-300 hover:text-white flex items-center gap-2">
                        <LayoutDashboard size={15} /> Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openAuth("signin")}
                      className="w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:text-white flex items-center gap-2"
                      data-testid="mobile-signin-btn"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => openAuth("signup")}
                      className="w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:text-white flex items-center gap-2"
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 mt-1 border-t border-white/5 pt-3">
                <span className="text-sm text-neutral-300">Theme</span>
                <ThemeToggle compact />
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
    </>
  );
}
