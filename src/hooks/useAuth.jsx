// ── useAuth hook ──────────────────────────────────────────────────
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mergeGuestCart } from '../lib/api/cart';
import { mergeGuestWishlist } from '../lib/api/wishlist';
import { useCartStore } from '../store/cart';
import { useWishlistStore } from '../store/wishlist';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null);
  const [admin,      setAdmin]      = useState(false);
  const [adminRole,  setAdminRole]  = useState(null); // 'admin' | 'super_admin' | null
  const [adminData,  setAdminData]  = useState(null); // raw admin_users row, for debugging
  const [adminError, setAdminError] = useState(null);  // raw Supabase error, for debugging
  const [loading,    setLoading]    = useState(true);  // true until session AND admin check (if any) are both resolved

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);
      if (u) await checkAdmin(u);
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await checkAdmin(u);
          if (event === 'SIGNED_IN') {
            await mergeGuestCart();
            await mergeGuestWishlist();
          }
        } else {
          setAdmin(false);
          setAdminRole(null);
          setAdminData(null);
          setAdminError(null);
        }
        useCartStore.getState().refresh();
        useWishlistStore.getState().refresh();
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Admin lookup ──────────────────────────────────────────────
  // Never checks email, never hardcodes a UID — role comes only from
  // the admin_users row for this user's own authenticated UUID.
  async function checkAdmin(u) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id,user_id,role,created_at')
      .eq('user_id', u.id)
      .maybeSingle();

    setAdminData(data ?? null);
    setAdminError(error ?? null);

    if (error) {
      // A real query/RLS error — not the same as "no row found" (maybeSingle
      // returns data:null, error:null for that case). Log it rather than
      // silently treating it as "not admin" with no trace of why.
      console.error('[RacquetIn] admin_users query failed:', error);
      setAdminRole(null);
      setAdmin(false);
      return;
    }

    const role = data?.role ?? null;
    setAdminRole(role);
    setAdmin(role === 'admin' || role === 'super_admin');
  }

  return (
    <AuthContext.Provider value={{ user, admin, adminRole, adminData, adminError, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
