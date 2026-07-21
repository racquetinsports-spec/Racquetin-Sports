// ── on-email-verified ────────────────────────────────────────────
// Called by a Postgres trigger on auth.users (see
// supabase/migration_email_verification_webhook.sql) — NOT called
// from the frontend. Fires exactly once, server-side, the moment a
// user's email_confirmed_at transitions from null to a real
// timestamp, so the welcome email goes out reliably even if the
// person closes the tab immediately after clicking the verification
// link.
//
// Auth: this endpoint has no user JWT to check (Postgres is calling
// it, not a logged-in browser), so it's gated by a shared secret
// header instead — set EMAIL_WEBHOOK_SECRET as an Edge Function
// secret and pass the same value as the trigger's x-webhook-secret
// header. Reject anything that doesn't match, so the URL alone (which
// is not secret — it's visible in the trigger definition to anyone
// with database access, and technically guessable) can't be used to
// spam arbitrary email addresses.
import { jsonResponse } from '../_shared/cors.ts';
import { sendVerificationWelcomeEmail } from '../_shared/email.ts';

const EMAIL_WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    if (!EMAIL_WEBHOOK_SECRET) {
      // Fail closed, not open — an unconfigured secret must never be
      // treated as "no auth required".
      return jsonResponse({ error: 'EMAIL_WEBHOOK_SECRET not configured' }, 500);
    }
    if (req.headers.get('x-webhook-secret') !== EMAIL_WEBHOOK_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const record = body?.record;
    const oldRecord = body?.old_record;

    // Defense in depth: the SQL trigger's WHEN clause already only
    // fires on a genuine null → non-null transition, but re-checking
    // here means this function is safe even if called directly or
    // retried by Postgres with a stale payload.
    const justVerified = !oldRecord?.email_confirmed_at && !!record?.email_confirmed_at;
    if (!justVerified) {
      return jsonResponse({ skipped: true, reason: 'Not a verification transition' });
    }

    const email = record?.email;
    if (!email) return jsonResponse({ error: 'Missing email on user record' }, 400);

    const fullName = record?.raw_user_meta_data?.full_name || null;

    // Best-effort — a failed send here should never make the
    // underlying auth.users update (or the trigger that called this)
    // look like it failed. Delivery status is visible in the Resend
    // dashboard if you need to check it.
    const result = await sendVerificationWelcomeEmail({ toEmail: email, toName: fullName });

    return jsonResponse({ success: true, emailSent: result.sent, emailError: result.error || null });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
