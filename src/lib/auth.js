// ── Authentication helpers ────────────────────────────────────────
// Wraps Supabase Auth for both customers and admins.
// Admin status is determined by the `admin_users` table (role-based).

import { supabase, isSupabaseConfigured } from './supabase';

// ── Customer Auth ─────────────────────────────────────────────────

export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// ── Google OAuth ──────────────────────────────────────────────────
// Supabase handles account linking automatically: if a Google sign-in's
// email matches an existing email/password account, Supabase links the
// Google identity to that same user (rather than creating a duplicate)
// as long as "Confirm email" is satisfied on both sides — see the
// Supabase Dashboard config note in the project README. This works for
// both signup and login since Supabase treats OAuth as "sign in or
// create" in one step; there's no separate "Google signup" call.
//
// redirectPath lets the caller preserve where the user was trying to
// go (e.g. checkout) across the OAuth round trip — it's appended as a
// query param on the callback URL, which Supabase/Google preserve.
export async function signInWithGoogle(redirectPath) {
  const redirectTo = redirectPath
    ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function forgotPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
}

export async function resetPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

export async function getSession() {
  if (!isSupabaseConfigured()) return { session: null, error: null };
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  } catch (error) {
    return { session: null, error };
  }
}

export async function getUser() {
  if (!isSupabaseConfigured()) return { user: null, error: null };
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    return { user: null, error };
  }
}

// Listen to auth state changes
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => callback(event, session)
  );
  return () => subscription.unsubscribe();
}

// ── Admin Auth ────────────────────────────────────────────────────

// Check if the current user has admin role.
// Queries the admin_users table protected by RLS.
export async function isAdmin() {
  const { user } = await getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return false;
  return ['admin', 'super_admin'].includes(data.role);
}

export async function getAdminRole() {
  const { user } = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.role ?? null;
}
