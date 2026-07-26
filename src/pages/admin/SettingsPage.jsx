// ── Admin: Settings ───────────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes.
import { useState, useEffect } from 'react';
import { fetchSiteSettings, updateSiteSettings } from '../../lib/api/admin';

const SETTINGS_GROUPS = [
  {
    title: 'Brand',
    fields: [
      ['company_name', 'Brand Name', 'text'],
      ['tagline', 'Tagline', 'text'],
      ['primary_color', 'Primary Color', 'color'],
      ['secondary_color', 'Secondary Color', 'color'],
    ],
  },
  {
    title: 'Contact & Social',
    fields: [
      ['email', 'Support Email', 'text'], ['phone', 'Phone', 'text'], ['whatsapp', 'WhatsApp', 'text'],
      ['address', 'Address', 'text'],
      ['instagram_url', 'Instagram', 'text'], ['facebook_url', 'Facebook', 'text'],
      ['youtube_url', 'YouTube', 'text'], ['twitter_url', 'Twitter', 'text'],
    ],
  },
  {
    title: 'SEO & Analytics',
    fields: [
      ['meta_title', 'SEO Title', 'text'], ['meta_description', 'SEO Description', 'text'],
      ['analytics_id', 'Google Analytics ID', 'text'], ['meta_pixel_id', 'Meta Pixel ID', 'text'],
    ],
  },
  {
    title: 'Policies',
    fields: [
      ['shipping_policy', 'Shipping Policy', 'textarea'], ['return_policy', 'Return Policy', 'textarea'],
      ['privacy_policy', 'Privacy Policy', 'textarea'], ['terms', 'Terms & Conditions', 'textarea'],
    ],
  },
];

export function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchSiteSettings().then(({ data }) => { setForm(data || {}); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    setFormError('');
    setSaved(false);
    const { error } = await updateSiteSettings(form);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save settings.'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="admin-page"><div className="admin-page-loading">Loading settings…</div></div>;

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="apc-subtitle">Brand identity, contact details, and storefront configuration.</p>
        </div>
        <div className="apc-header-right">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}</button>
        </div>
      </div>

      <div className="acm-sections">
        {SETTINGS_GROUPS.map(group => (
          <div key={group.title} className="admin-card" style={{ padding: 24 }}>
            <h2 className="admin-card-title" style={{ marginBottom: 18 }}>{group.title}</h2>
            <div className="admin-form-grid">
              {group.fields.map(([key, label, type]) => (
                <label key={key} className={`admin-field ${type === 'textarea' ? 'admin-field-wide' : ''}`}>
                  <span>{label}</span>
                  {type === 'textarea' ? (
                    <textarea className="input" rows={4} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  ) : type === 'color' ? (
                    <div className="admin-color-input">
                      <input type="color" value={form[key] || '#000000'} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ) : (
                    <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {formError && <p className="admin-form-error">{formError}</p>}
    </div>
  );
}
