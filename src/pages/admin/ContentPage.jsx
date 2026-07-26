// ── Admin: Content (site copy, FAQs, media) ───────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes.
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  fetchAllContent, updateContent, fetchFaqs, createFaq, updateFaq, deleteFaq,
} from '../../lib/api/content';
import { fetchSiteSettings, updateSiteSettings } from '../../lib/api/admin';
import { listMedia, uploadMedia, replaceMedia, deleteMedia } from '../../lib/api/media';
import { Toggle, Modal } from './shared/AdminUI';

const CONTENT_SECTIONS = [
  {
    title: 'Homepage',
    source: 'content',
    fields: [
      ['homepage.hero_title', 'Hero Title', 'input'],
      ['homepage.hero_subtitle', 'Hero Subtitle', 'textarea'],
      ['homepage.hero_cta', 'Hero CTA Button Text', 'input'],
      ['homepage.brand_story_title', 'Brand Story Title', 'input'],
      ['homepage.brand_story_body', 'Brand Story Body', 'textarea'],
    ],
  },
  {
    title: 'About',
    source: 'content',
    fields: [
      ['about.mission', 'Mission', 'textarea'],
      ['about.vision', 'Vision', 'textarea'],
      ['about.story', 'Story', 'textarea'],
    ],
  },
  {
    title: 'Footer',
    source: 'content',
    fields: [
      ['footer.text', 'Footer Description', 'textarea'],
      ['footer.copyright', 'Copyright Line', 'input'],
    ],
  },
  {
    title: 'Newsletter',
    source: 'content',
    fields: [
      ['homepage.newsletter_title', 'Newsletter Section Title', 'input'],
      ['homepage.newsletter_body', 'Newsletter Section Body', 'textarea'],
    ],
  },
  {
    title: 'Legal',
    source: 'content',
    fields: [
      ['legal.privacy_policy', 'Privacy Policy (Markdown)', 'textarea'],
      ['legal.terms_conditions', 'Terms & Conditions (Markdown)', 'textarea'],
    ],
  },
];

function ContentPreview({ section, values }) {
  if (section.title === 'Homepage') {
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Preview — Hero</div>
        <div className="acm-preview-hero-title">{values['homepage.hero_title'] || 'Hero Title'}</div>
        <div className="acm-preview-hero-sub">{values['homepage.hero_subtitle'] || 'Hero subtitle text'}</div>
        <span className="btn btn-primary btn-sm" style={{ marginTop: 10, display: 'inline-block' }}>{values['homepage.hero_cta'] || 'CTA'}</span>
        <div className="acm-preview-divider" />
        <div className="acm-preview-eyebrow">Preview — Brand Story</div>
        <div className="acm-preview-label">{values['homepage.brand_story_title'] || 'Brand story title'}</div>
        <p className="t-body" style={{ marginTop: 8 }}>{values['homepage.brand_story_body'] || '—'}</p>
      </div>
    );
  }
  if (section.title === 'About') {
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Preview</div>
        <div className="acm-preview-label">Mission</div>
        <p className="t-body" style={{ marginBottom: 16 }}>{values['about.mission'] || '—'}</p>
        <div className="acm-preview-label">Vision</div>
        <p className="t-body" style={{ marginBottom: 16 }}>{values['about.vision'] || '—'}</p>
        <div className="acm-preview-label">Story</div>
        <p className="t-body">{values['about.story'] || '—'}</p>
      </div>
    );
  }
  if (section.title === 'Footer') {
    return (
      <div className="acm-preview acm-preview-dark">
        <div className="acm-preview-eyebrow" style={{ color: 'rgba(255,255,255,.4)' }}>Preview</div>
        <p className="acm-footer-preview-text">{values['footer.text'] || 'Footer description text'}</p>
        <div className="acm-footer-preview-copy">{values['footer.copyright'] || `© ${new Date().getFullYear()} RacquetIn. All rights reserved.`}</div>
      </div>
    );
  }
  if (section.title === 'Newsletter') {
    return (
      <div className="acm-preview acm-preview-brand">
        <div className="acm-preview-eyebrow" style={{ color: 'rgba(255,255,255,.6)' }}>Preview</div>
        <div className="acm-newsletter-preview-title">{values['homepage.newsletter_title'] || 'Newsletter title'}</div>
        <p className="acm-newsletter-preview-body">{values['homepage.newsletter_body'] || 'Newsletter body text'}</p>
        <div className="acm-newsletter-preview-form">
          <span className="acm-newsletter-preview-input">Enter your email address</span>
          <span className="btn btn-primary btn-sm">Subscribe</span>
        </div>
      </div>
    );
  }
  if (section.title === 'Legal') {
    const privacyLen = (values['legal.privacy_policy'] || '').trim().length;
    const termsLen = (values['legal.terms_conditions'] || '').trim().length;
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Live Pages</div>
        <div className="acm-preview-label">Privacy Policy</div>
        <p className="t-small admin-muted" style={{ marginBottom: 16 }}>
          {privacyLen ? `${privacyLen.toLocaleString()} characters — published at ` : 'Not published yet — '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cr)' }}>/privacy-policy</a>
        </p>
        <div className="acm-preview-label">Terms &amp; Conditions</div>
        <p className="t-small admin-muted">
          {termsLen ? `${termsLen.toLocaleString()} characters — published at ` : 'Not published yet — '}
          <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cr)' }}>/terms-and-conditions</a>
        </p>
        <p className="admin-muted t-small" style={{ marginTop: 16 }}>Supports Markdown: # / ## headings, "- " bullets, **bold**, and [text](url) links.</p>
      </div>
    );
  }
  return null;
}

export function AdminContentPage() {
  const [tab, setTab] = useState('copy'); // copy | faq | media
  const [activeSection, setActiveSection] = useState(CONTENT_SECTIONS[0].title);
  const [content, setContent] = useState({});
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState({ content: {}, settings: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllContent(), fetchSiteSettings()]).then(([c, s]) => {
      setContent(c.data);
      setSettings(s.data || {});
      setSaved({ content: c.data, settings: s.data || {} });
      setLoading(false);
    });
  }, []);

  const section = CONTENT_SECTIONS.find(s => s.title === activeSection);
  const values = section.source === 'settings' ? settings : content;
  const setValues = section.source === 'settings' ? setSettings : setContent;

  function setField(key, value) { setValues(v => ({ ...v, [key]: value })); }

  async function handleSave() {
    setSaving(true);
    if (section.source === 'settings') {
      const entries = {};
      section.fields.forEach(([key]) => { entries[key] = settings[key] ?? ''; });
      const { error } = await updateSiteSettings(entries);
      setSaving(false);
      if (!error) {
        setSaved(s => ({ ...s, settings: { ...s.settings, ...entries } }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1600);
      }
    } else {
      const entries = {};
      section.fields.forEach(([key]) => { entries[key] = content[key] ?? ''; });
      const { error } = await updateContent(entries);
      setSaving(false);
      if (!error) {
        setSaved(s => ({ ...s, content: { ...s.content, ...entries } }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1600);
      }
    }
  }

  function handleReset() {
    const savedValues = section.source === 'settings' ? saved.settings : saved.content;
    setValues(v => {
      const next = { ...v };
      section.fields.forEach(([key]) => { next[key] = savedValues[key] ?? ''; });
      return next;
    });
  }

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Content Management</h1>
          <p className="apc-subtitle">Edit storefront copy, FAQ, and media without touching code.</p>
        </div>
      </div>

      <div className="acm-tabs">
        <button className={`acm-tab ${tab === 'copy' ? 'acm-tab-active' : ''}`} onClick={() => setTab('copy')}>Site Copy</button>
        <button className={`acm-tab ${tab === 'faq' ? 'acm-tab-active' : ''}`} onClick={() => setTab('faq')}>FAQ</button>
        <button className={`acm-tab ${tab === 'media' ? 'acm-tab-active' : ''}`} onClick={() => setTab('media')}>Media Library</button>
      </div>

      {tab === 'copy' && (
        loading ? <div className="admin-page-loading">Loading content…</div> : (
          <div className="acm-editor">
            <div className="acm-section-nav">
              {CONTENT_SECTIONS.map(s => (
                <button
                  key={s.title}
                  className={`acm-section-nav-item ${activeSection === s.title ? 'acm-section-nav-active' : ''}`}
                  onClick={() => setActiveSection(s.title)}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <motion.div key={activeSection} className="acm-editor-panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
              <div className="acm-editor-header">
                <h2 className="admin-card-title">{section.title}</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {savedFlash && <span className="acm-saved-flash">Saved ✓</span>}
                  <button className="btn btn-outline btn-sm" onClick={handleReset}>Reset</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
              <div className="acm-section-body">
                <div className="acm-fields">
                  {section.fields.map(([key, label, type]) => (
                    <label key={key} className="admin-field admin-field-wide">
                      <span>{label}</span>
                      {type === 'textarea' ? (
                        <textarea
                          className="input"
                          rows={section.title === 'Legal' ? 22 : 4}
                          style={section.title === 'Legal' ? { fontFamily: 'var(--fm)', fontSize: 12.5, lineHeight: 1.6 } : undefined}
                          value={values[key] || ''}
                          onChange={e => setField(key, e.target.value)}
                        />
                      ) : (
                        <input className="input" value={values[key] || ''} onChange={e => setField(key, e.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
                <ContentPreview section={section} values={values} />
              </div>
            </motion.div>
          </div>
        )
      )}

      {tab === 'faq' && <AdminFaqPanel />}
      {tab === 'media' && <AdminMediaPanel />}
    </div>
  );
}

function emptyFaqForm() { return { question: '', answer: '', sort_order: 0, is_active: true }; }

function AdminFaqPanel() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFaqForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => { fetchFaqs().then(({ data }) => { setFaqs(data); setLoading(false); }); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(emptyFaqForm()); setFormError(''); setEditing({}); }
  function openEdit(f) { setForm({ question: f.question, answer: f.answer, sort_order: f.sort_order ?? 0, is_active: f.is_active }); setFormError(''); setEditing(f); }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) { setFormError('Question and answer are required.'); return; }
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
    const { error } = editing.id ? await updateFaq(editing.id, payload) : await createFaq(payload);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save FAQ.'); return; }
    setEditing(null);
    load();
  }

  async function handleDelete(f) {
    if (!window.confirm('Delete this FAQ entry?')) return;
    setFaqs(list => list.filter(x => x.id !== f.id));
    await deleteFaq(f.id);
  }

  async function toggleActive(f) {
    setFaqs(list => list.map(x => x.id === f.id ? { ...x, is_active: !x.is_active } : x));
    await updateFaq(f.id, { is_active: !f.is_active });
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">FAQ Entries</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New FAQ</button>
      </div>
      {loading ? (
        <div className="admin-page-loading">Loading FAQs…</div>
      ) : (
        <div className="apc-rows">
          {faqs.map(f => (
            <div key={f.id} className="apc-row" style={{ alignItems: 'flex-start' }}>
              <div className="apc-row-info">
                <div className="apc-row-name">{f.question}</div>
                <div className="admin-muted t-small" style={{ marginTop: 4 }}>{f.answer}</div>
              </div>
              <div className="apc-row-actions">
                <Toggle checked={f.is_active} onChange={() => toggleActive(f)} label="Active" />
                <button className="btn btn-primary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(f)}>Delete</button>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <div className="admin-muted" style={{ textAlign: 'center', padding: 32 }}>No FAQ entries yet.</div>}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit FAQ' : 'New FAQ'} onClose={() => setEditing(null)}>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide"><span>Question</span><input className="input" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} /></label>
            <label className="admin-field admin-field-wide"><span>Answer</span><textarea className="input" rows={4} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} /></label>
            <label className="admin-field"><span>Sort Order</span><input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></label>
            <div className="admin-field" style={{ display: 'flex', alignItems: 'center' }}>
              <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
            </div>
          </div>
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const MEDIA_FOLDERS = [
  { prefix: 'homepage', label: 'Homepage' },
  { prefix: 'categories', label: 'Categories' },
  { prefix: 'products', label: 'Products' },
  { prefix: 'brand', label: 'Brand' },
  { prefix: 'newsletter', label: 'Newsletter' },
  { prefix: 'footer', label: 'Footer' },
  { prefix: 'logo', label: 'Logo' },
  { prefix: 'favicon', label: 'Favicon' },
];

function AdminMediaPanel() {
  const [folder, setFolder] = useState(MEDIA_FOLDERS[0].prefix);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl } awaiting confirmation
  const [replaceTarget, setReplaceTarget] = useState(null); // media item being replaced, or null for a normal new upload
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    listMedia('site-assets', folder).then(({ data }) => { setFiles(data); setLoading(false); });
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile({ file, previewUrl: URL.createObjectURL(file) });
  }

  function handlePickReplacement(e, target) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplaceTarget(target);
    setPendingFile({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelPending() {
    if (pendingFile) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setReplaceTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    if (replaceTarget) {
      await replaceMedia('site-assets', replaceTarget.path, pendingFile.file);
    } else {
      await uploadMedia('site-assets', folder, pendingFile.file);
    }
    setUploading(false);
    cancelPending();
    load();
  }

  async function handleDelete(f) {
    if (!window.confirm(`Delete "${f.name}"?`)) return;
    setFiles(list => list.filter(x => x.path !== f.path));
    await deleteMedia('site-assets', f.path);
  }

  function copyUrl(url) {
    navigator.clipboard?.writeText(url);
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Media Library</h2>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePickFile} />
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>+ Upload Image</button>
        </div>
      </div>
      <div className="acm-media-folders">
        {MEDIA_FOLDERS.map(f => (
          <button key={f.prefix} className={`acm-folder-tab ${folder === f.prefix ? 'acm-folder-tab-active' : ''}`} onClick={() => setFolder(f.prefix)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="acm-media-grid">
        {loading ? (
          <div className="admin-page-loading">Loading media…</div>
        ) : files.length === 0 ? (
          <div className="admin-muted" style={{ padding: 32, textAlign: 'center', gridColumn: '1 / -1' }}>No images in this folder yet.</div>
        ) : (
          files.map(f => (
            <motion.div key={f.path} className="acm-media-item" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}>
              <img src={f.url} alt={f.name} />
              <div className="acm-media-item-actions">
                <button className="btn btn-outline btn-sm" onClick={() => copyUrl(f.url)}>Copy URL</button>
                <label className="btn btn-outline btn-sm acm-replace-btn">
                  Replace
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePickReplacement(e, f)} />
                </label>
                <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(f)}>Delete</button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {pendingFile && (
        <Modal title={replaceTarget ? `Replace "${replaceTarget.name}"` : 'Upload Image'} onClose={cancelPending}>
          <div className="acm-upload-preview">
            <img src={pendingFile.previewUrl} alt="Preview" />
          </div>
          <p className="admin-muted t-small" style={{ marginTop: 12 }}>
            {replaceTarget
              ? 'This will replace the existing image at the same URL — anywhere it\'s already used will update automatically.'
              : `Uploading to: ${MEDIA_FOLDERS.find(f => f.prefix === folder)?.label}`}
          </p>
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={cancelPending}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={confirmUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : replaceTarget ? 'Confirm Replace' : 'Confirm Upload'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
