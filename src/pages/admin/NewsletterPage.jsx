// ── Admin: Newsletter ─────────────────────────────────────────────
// Redesigned (Phase 4 of the admin UI pass). Subscriber data, growth
// stats, search/filter, and CSV export are all real and functional —
// computed from the actual newsletter_subscribers table, no fabricated
// numbers. Campaigns/Templates/Scheduled sections are genuinely not
// built yet (no backend capability exists to send anything) — shown as
// tasteful empty states rather than working UI, per the brief's own
// instruction to design for where this is headed without faking
// functionality that doesn't exist.
import { useState, useEffect, useMemo } from 'react';
import { fetchNewsletterSubscribers } from '../../lib/api/admin';
import { StatusPill } from './shared/AdminUI';

const STATUS_COLORS = { active: '#10b981', unsubscribed: '#6b7280' };

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function downloadCsv(subs) {
  const header = 'Email,Status,Subscribed At,Unsubscribed At';
  const rows = subs.map(s => [
    s.email,
    s.is_active ? 'active' : 'unsubscribed',
    s.subscribed_at ? new Date(s.subscribed_at).toISOString() : '',
    s.unsubscribed_at ? new Date(s.unsubscribed_at).toISOString() : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminNewsletterPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchNewsletterSubscribers({ limit: 500 }).then(({ data }) => { setSubs(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = subs;
    if (statusFilter) list = list.filter(s => (statusFilter === 'active' ? s.is_active : !s.is_active));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.email.toLowerCase().includes(q));
    }
    return list;
  }, [subs, statusFilter, search]);

  const stats = useMemo(() => {
    const active = subs.filter(s => s.is_active).length;
    const unsubscribed = subs.length - active;
    const last30 = subs.filter(s => new Date(s.subscribed_at) > daysAgo(30)).length;
    const prev30 = subs.filter(s => {
      const d = new Date(s.subscribed_at);
      return d > daysAgo(60) && d <= daysAgo(30);
    }).length;
    // Growth vs the prior 30-day window — null (shown as "—") rather
    // than a misleading 0%/100% when there's nothing to compare against.
    const growthPct = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null;
    return { active, unsubscribed, last30, growthPct };
  }, [subs]);

  const recent = useMemo(() => [...subs].sort((a, b) => new Date(b.subscribed_at) - new Date(a.subscribed_at)).slice(0, 5), [subs]);
  const hasFilters = search.trim() || statusFilter;

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Newsletter</h1>
          <p className="apc-subtitle">See who's subscribed for updates and launches.</p>
        </div>
        <div className="apc-header-right">
          {subs.length > 0 && <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(filtered)}>Export CSV</button>}
        </div>
      </div>

      {!loading && subs.length > 0 && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{subs.length}</div>
            <div className="admin-stat-label">Total Subscribers</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.active}</div>
            <div className="admin-stat-label">Active</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.last30}</div>
            <div className="admin-stat-label">New (Last 30 Days)</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.growthPct === null ? '—' : `${stats.growthPct > 0 ? '+' : ''}${stats.growthPct}%`}</div>
            <div className="admin-stat-label">Growth vs Prior 30 Days</div>
          </div>
        </div>
      )}

      {!loading && subs.length > 0 && (
        <>
          {/* Segment cards — real, derived from actual subscriber status.
              No list/tag segmentation exists in the schema, so this
              stays honest about the one segmentation that's actually
              real: active vs unsubscribed. */}
          <div className="anl-segments">
            <div className="admin-card anl-segment-card">
              <div className="anl-segment-head"><span>Active Subscribers</span><span className="anl-segment-pct">{subs.length ? Math.round((stats.active / subs.length) * 100) : 0}%</span></div>
              <div className="anl-segment-bar"><div className="anl-segment-fill" style={{ width: `${subs.length ? (stats.active / subs.length) * 100 : 0}%`, background: STATUS_COLORS.active }} /></div>
              <div className="admin-muted t-small" style={{ marginTop: 8 }}>{stats.active} of {subs.length}</div>
            </div>
            <div className="admin-card anl-segment-card">
              <div className="anl-segment-head"><span>Unsubscribed</span><span className="anl-segment-pct">{subs.length ? Math.round((stats.unsubscribed / subs.length) * 100) : 0}%</span></div>
              <div className="anl-segment-bar"><div className="anl-segment-fill" style={{ width: `${subs.length ? (stats.unsubscribed / subs.length) * 100 : 0}%`, background: STATUS_COLORS.unsubscribed }} /></div>
              <div className="admin-muted t-small" style={{ marginTop: 8 }}>{stats.unsubscribed} of {subs.length}</div>
            </div>
          </div>

          <div className="admin-card" style={{ marginBottom: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Recent Subscribers</h2></div>
            <div className="admin-card-body">
              {recent.map(s => (
                <div key={s.id} className="anl-recent-row">
                  <span>{s.email}</span>
                  <span className="admin-muted t-small">{new Date(s.subscribed_at).toLocaleDateString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && subs.length > 0 && (
        <div className="acg-toolbar">
          <div className="acg-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="admin-card" style={{ padding: 24 }}><p className="admin-muted">Loading subscribers…</p></div>
      ) : subs.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h3>No subscribers yet</h3>
          <p>Once customers subscribe from the storefront footer, they'll show up here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No subscribers match your filters</h3>
          <p>Try a different search term or clear the status filter.</p>
          {hasFilters && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>}
        </div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Status</th><th>Subscribed</th><th>Unsubscribed</th></tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td><StatusPill value={s.is_active ? 'active' : 'unsubscribed'} colors={STATUS_COLORS} /></td>
                  <td className="admin-muted">{new Date(s.subscribed_at).toLocaleDateString('en-IN')}</td>
                  <td className="admin-muted">{s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaigns — genuinely not built yet. No email-sending capability
          exists anywhere in this codebase beyond the two transactional
          emails (order confirmation, email-verified welcome), both of
          which fire automatically server-side, not from a UI like this.
          Shown honestly as "coming soon" rather than a working-looking
          button that does nothing. */}
      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Campaigns</h2>
          <button className="btn btn-outline btn-sm" disabled title="Campaign sending isn't available yet.">+ Create Campaign</button>
        </div>
        <div className="admin-card-body">
          <div className="anl-campaign-empty">
            <p className="admin-muted t-small" style={{ marginBottom: 4 }}><strong>Templates</strong> — not yet available.</p>
            <p className="admin-muted t-small" style={{ marginBottom: 4 }}><strong>Scheduled emails</strong> — not yet available.</p>
            <p className="admin-muted t-small" style={{ marginBottom: 0 }}><strong>Recent campaigns</strong> — none sent yet; this list will populate once campaign sending is built.</p>
          </div>
        </div>
      </div>

      <style>{`
        .acg-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .acg-search { display:flex; align-items:center; gap:8px; flex:1; min-width:200px; padding:8px 14px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); color:var(--gr-2); }
        .acg-search input { border:none; outline:none; font-size:13px; width:100%; background:transparent; color:var(--bk); }
        .acg-search svg { flex-shrink:0; }

        .anl-segments { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .anl-segment-card { padding:20px; }
        .anl-segment-head { display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:10px; }
        .anl-segment-pct { color:var(--gr-2); font-weight:500; }
        .anl-segment-bar { height:6px; border-radius:100px; background:var(--gr-6); overflow:hidden; }
        .anl-segment-fill { height:100%; border-radius:100px; transition:width .4s cubic-bezier(.16,1,.3,1); }

        .anl-recent-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--gr-6); font-size:13px; }
        .anl-recent-row:last-child { border-bottom:none; }

        .anl-campaign-empty { padding:8px 0; }

        @media(max-width:640px){ .anl-segments { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
