// ── Admin: Newsletter ─────────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes. View/list-only today (no
// campaign-sending capability).
import { useState, useEffect } from 'react';
import { fetchNewsletterSubscribers } from '../../lib/api/admin';

export function AdminNewsletterPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsletterSubscribers({ limit: 200 }).then(({ data }) => { setSubs(data); setLoading(false); });
  }, []);

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Newsletter</h1>
          <p className="apc-subtitle">See who's subscribed for updates and launches.</p>
        </div>
        <div className="apc-header-right">
          <span className="admin-muted t-small">{subs.length} subscriber{subs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="admin-card">
        {loading ? (
          <div className="admin-page-loading">Loading subscribers…</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td className="admin-muted">{new Date(s.subscribed_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={2} className="admin-muted" style={{ textAlign: 'center', padding: 32 }}>No subscribers yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
