// ── Shared admin UI primitives ────────────────────────────────────
// Used across every admin page — Toggle, Modal, StatusPill, and the
// admin-* CSS (AdminPagesStyles, rendered once in AdminDashboard.jsx).
// Extracted from the original AdminPages.jsx monolith with no
// behavioral changes — this file is pure mechanical relocation.

export function Toggle({ checked, onChange, label, pending }) {
  return (
    <label className={`admin-toggle ${pending ? 'admin-toggle-pending' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={!!pending} onChange={e => onChange(e.target.checked)} />
      <span className="admin-toggle-track">
        <span className="admin-toggle-thumb" />
        {pending && <span className="admin-toggle-spinner" />}
      </span>
      {label && <span className="admin-toggle-label">{label}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-card-title">{title}</h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({ value, colors }) {
  const color = colors[value] || '#6b7280';
  return <span className="aor-pill" style={{ background: color + '1a', color }}>{value}</span>;
}

export function AdminPagesStyles() {
  return (
    <style>{`
      .admin-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; }
      .admin-search { max-width:320px; }
      .admin-thumb { width:40px; height:40px; border-radius:var(--r-sm); background:var(--gr-6); border:1px solid var(--gr-5); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
      .admin-thumb img { width:100%; height:100%; object-fit:contain; }
      .admin-warn-text { color:#dc2626; font-weight:600; }
      .admin-btn-danger { color:#dc2626; border-color:#fca5a5; }
      .admin-btn-danger:hover { background:#fef2f2; }
      .admin-status-select { border:none; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; padding:4px 10px; border-radius:100px; cursor:pointer; }
      .admin-detail-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; font-size:13px; }
      .admin-detail-grid > div > div:last-child { margin-top:4px; font-weight:500; }
      .admin-order-totals { padding:16px 24px; border-top:1px solid var(--gr-5); font-size:13px; }
      .admin-order-totals > div { display:flex; justify-content:space-between; padding:4px 0; color:var(--gr-2); }
      .admin-order-total-final { font-weight:700; color:var(--bk); font-size:15px; border-top:1px solid var(--gr-5); margin-top:6px; padding-top:10px !important; }

      /* Toggle switch */
      .admin-toggle { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
      .admin-toggle input { position:absolute; opacity:0; width:0; height:0; }
      .admin-toggle-track { width:34px; height:19px; background:var(--gr-4); border-radius:100px; position:relative; transition:background .2s; flex-shrink:0; }
      .admin-toggle-thumb { position:absolute; top:2px; left:2px; width:15px; height:15px; background:#fff; border-radius:50%; transition:transform .2s; box-shadow:0 1px 2px rgba(0,0,0,.2); }
      .admin-toggle input:checked + .admin-toggle-track { background:var(--cr); }
      .admin-toggle input:checked + .admin-toggle-track .admin-toggle-thumb { transform:translateX(15px); }
      .admin-toggle-label { font-size:12px; color:var(--gr-1); }
      .admin-toggle-pending { opacity:.6; cursor:default; }
      .admin-toggle-spinner {
        position:absolute; inset:0; border-radius:100px;
        border:2px solid transparent; border-top-color:rgba(255,255,255,.9);
        animation: admin-spin .7s linear infinite;
      }
      @keyframes admin-spin { to { transform:rotate(360deg); } }

      /* Products page — header */
      .apc-header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:28px; }
      .apc-subtitle { font-size:13px; color:var(--gr-2); margin-top:6px; }
      .apc-header-right { display:flex; align-items:center; gap:16px; flex-shrink:0; padding-top:4px; }

      /* Filters — its own breathing section */
      .apc-filters-section { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); padding:18px 20px; margin-bottom:24px; }
      .apc-filters { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
      .apc-search { max-width:320px; flex:1; min-width:200px; }
      .apc-filters .select { width:auto; padding-right:28px; }

      /* Bulk actions bar */
      .apc-bulk-bar {
        display:flex; align-items:center; gap:8px; flex-wrap:wrap;
        background:var(--bk); color:#fff; padding:10px 16px; border-radius:var(--r);
        margin-bottom:16px; overflow:hidden;
      }
      .apc-bulk-bar .btn-outline { border-color:rgba(255,255,255,.3); color:#fff; }
      .apc-bulk-bar .btn-outline:hover { background:rgba(255,255,255,.1); }
      .apc-bulk-bar .admin-link { color:#fff; opacity:.7; }
      .apc-bulk-bar .admin-link:hover { opacity:1; }

      /* Category sections */
      .apc-categories { display:flex; flex-direction:column; gap:12px; }
      .apc-category { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); overflow:hidden; }
      .apc-category-header {
        display:flex; align-items:center; gap:12px; width:100%;
        padding:20px 24px; font-size:14px; font-weight:600; text-align:left;
      }
      .apc-chevron { transition:transform .2s; color:var(--gr-2); flex-shrink:0; }
      .apc-chevron-open { transform:rotate(90deg); }
      .apc-category-name { flex:1; }
      .apc-category-count {
        font-size:11px; font-weight:600; color:var(--gr-2); background:var(--gr-6);
        padding:2px 9px; border-radius:100px;
      }
      .apc-select-all { padding:0 24px 12px; border-top:1px solid var(--gr-6); padding-top:12px; margin-top:-1px; }
      .apc-checkbox-label { display:flex; align-items:center; gap:8px; cursor:pointer; }
      .apc-checkbox-label input { width:15px; height:15px; accent-color:var(--cr); cursor:pointer; }

      /* Product rows — grid-aligned, generous spacing */
      .apc-rows { display:flex; flex-direction:column; }
      .apc-row {
        display:grid;
        grid-template-columns: 20px 56px 1fr 100px 110px auto;
        align-items:center; gap:20px;
        padding:22px 24px; border-top:1px solid var(--gr-6);
      }
      .apc-row-check { flex-shrink:0; }
      .apc-row-thumb.apc-row-thumb { width:56px; height:56px; }
      .apc-row-info { min-width:0; }
      .apc-row-name { font-size:14px; font-weight:600; margin-bottom:4px; }
      .apc-row-meta { display:flex; gap:10px; font-size:12px; color:var(--gr-2); }
      .apc-row-sku { color:var(--gr-3); }
      .apc-row-price { font-size:13px; font-weight:600; }
      .apc-row-stock { font-size:12px; color:var(--gr-2); }
      .apc-row-actions { display:flex; align-items:center; gap:18px; flex-shrink:0; }
      .apc-action-group { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding-right:18px; border-right:1px solid var(--gr-5); }
      .apc-action-group-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--gr-3); }
      .apc-action-group-row { display:flex; align-items:center; gap:14px; }
      .apc-row-menu { position:relative; }
      .apc-row-menu-btn { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gr-2); }
      .apc-row-menu-btn:hover { background:var(--gr-6); color:var(--bk); }
      .apc-row-menu-popover {
        position:absolute; top:calc(100% + 4px); right:0; z-index:20;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r-sm);
        box-shadow:var(--shadow-md); min-width:150px; overflow:hidden;
      }
      .apc-row-menu-item { display:block; width:100%; text-align:left; padding:9px 14px; font-size:13px; }
      .apc-row-menu-item:hover { background:var(--gr-6); }
      .apc-row-menu-danger { color:#dc2626; }
      .apc-row-menu-danger:hover { background:#fef2f2; }
      @media(max-width:900px){
        .apc-row{ grid-template-columns:20px 56px 1fr; }
        .apc-row-price, .apc-row-stock { grid-column:2 / 4; }
        .apc-row-actions{ grid-column:1 / -1; width:100%; justify-content:space-between; padding-top:12px; margin-top:8px; border-top:1px solid var(--gr-6); }
      }

      /* Customers page */
      .acu-list { display:flex; flex-direction:column; gap:12px; }
      .acu-card {
        display:grid;
        grid-template-columns: 48px 1.6fr 90px 130px 100px 100px 80px auto;
        align-items:center; gap:20px;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r);
        padding:20px 24px; transition:border-color .2s, box-shadow .2s;
      }
      .acu-card:hover { border-color:var(--gr-4); box-shadow:var(--shadow); }
      .acu-avatar {
        width:48px; height:48px; border-radius:50%; background:var(--bk); color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-size:14px; font-weight:700; letter-spacing:.02em; flex-shrink:0;
      }
      .acu-info { min-width:0; }
      .acu-name { font-size:14px; font-weight:600; margin-bottom:4px; }
      .acu-meta { display:flex; flex-direction:column; gap:2px; font-size:12px; color:var(--gr-2); }
      .acu-stat { display:flex; flex-direction:column; gap:4px; }
      .acu-stat-label { font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--gr-3); }
      .acu-stat-value { font-size:13px; font-weight:600; }
      .acu-stat-muted { font-weight:500; color:var(--gr-2); }
      .acu-status-pill { font-size:11px; font-weight:700; letter-spacing:.03em; padding:5px 12px; border-radius:100px; text-align:center; }
      @media(max-width:1100px){
        .acu-card { grid-template-columns:48px 1fr auto; row-gap:14px; }
        .acu-card > .acu-stat, .acu-card > .acu-status-pill { grid-column:span 1; }
      }

      /* Orders page */
      .aor-list { display:flex; flex-direction:column; gap:12px; }
      .aor-row {
        display:grid;
        grid-template-columns: 130px 1.4fr 90px 110px 90px 130px auto;
        align-items:center; gap:20px;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r);
        padding:20px 24px; transition:border-color .2s, box-shadow .2s;
      }
      .aor-row:hover { border-color:var(--gr-4); box-shadow:var(--shadow); }
      .aor-cell { display:flex; flex-direction:column; gap:3px; min-width:0; }
      .aor-cell-center { align-items:center; text-align:center; }
      .aor-cell-actions { align-items:flex-end; }
      .aor-order-number { font-size:13px; font-weight:600; }
      .aor-customer-name { font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; }
      .aor-guest-badge { font-size:10px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--gr-2); background:var(--gr-6); border:1px solid var(--gr-4); border-radius:100px; padding:1px 7px; }
      .aor-amount { font-size:14px; font-weight:700; }
      .aor-pill { font-size:11px; font-weight:700; letter-spacing:.03em; text-transform:capitalize; padding:5px 12px; border-radius:100px; }
      .aor-status-select { font-size:11px; font-weight:600; text-transform:capitalize; padding:6px 10px; border-radius:100px; cursor:pointer; }
      @media(max-width:1000px){
        .aor-row { grid-template-columns:1fr 1fr; row-gap:14px; }
        .aor-cell-center { align-items:flex-start; text-align:left; }
        .aor-cell-actions { grid-column:1 / -1; align-items:flex-start; }
      }

      /* Modal */
      .admin-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:flex-start; justify-content:center; padding:40px 20px; overflow-y:auto; z-index:1000; }
      .admin-modal { background:var(--wh); border-radius:var(--r); max-width:520px; width:100%; max-height:calc(100vh - 80px); display:flex; flex-direction:column; }
      .admin-modal-wide { max-width:780px; }
      .admin-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); flex-shrink:0; }
      .admin-modal-close { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gr-2); }
      .admin-modal-close:hover { background:var(--gr-6); color:var(--bk); }
      .admin-modal-body { padding:24px; overflow-y:auto; }
      .admin-modal-actions { display:flex; justify-content:flex-end; gap:8px; padding:16px 24px; border-top:1px solid var(--gr-5); }

      /* Forms */
      .admin-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .admin-field { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:500; color:var(--gr-1); }
      .admin-field-wide { grid-column:1 / -1; }
      .admin-field input, .admin-field select, .admin-field textarea { font-size:13px; }
      .admin-form-error { color:#dc2626; font-size:12px; margin-top:12px; }
      .admin-variants-panel { margin-top:24px; padding-top:20px; border-top:1px solid var(--gr-5); }
      .admin-variants-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
      .admin-variant-row { display:flex; align-items:center; gap:12px; padding:8px 12px; background:var(--gr-6); border-radius:var(--r-sm); }
      .admin-variant-label { font-size:13px; flex:1; }
      .admin-variant-stock-input { width:70px; padding:6px 8px; font-size:13px; }
      .admin-variant-remove { width:24px; height:24px; border-radius:50%; color:var(--gr-2); font-size:16px; line-height:1; flex-shrink:0; }
      .admin-variant-remove:hover { background:#fef2f2; color:#dc2626; }
      .admin-variant-add-row { display:flex; gap:8px; align-items:center; }
      .admin-color-input { display:flex; gap:8px; align-items:center; }
      .admin-color-input input[type="color"] { width:36px; height:36px; padding:0; border:1px solid var(--gr-4); border-radius:var(--r-sm); cursor:pointer; flex-shrink:0; }
      .admin-color-input .input { flex:1; }
      @media(max-width:640px){ .admin-form-grid{grid-template-columns:1fr;} }

      /* Content Management */
      .acm-tabs { display:flex; gap:2px; margin-bottom:24px; border-bottom:1px solid var(--gr-5); }
      .acm-tab { padding:10px 18px; font-size:13px; font-weight:500; color:var(--gr-2); border-bottom:2px solid transparent; margin-bottom:-1px; }
      .acm-tab:hover { color:var(--bk); }
      .acm-tab-active { color:var(--bk); border-bottom-color:var(--cr); font-weight:600; }

      /* Modern CMS editor: section nav + fields/preview panel */
      .acm-sections { display:flex; flex-direction:column; gap:16px; }
      .acm-editor { display:grid; grid-template-columns:200px 1fr; gap:24px; align-items:start; }
      .acm-section-nav { display:flex; flex-direction:column; gap:2px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); padding:8px; position:sticky; top:0; }
      .acm-section-nav-item { text-align:left; padding:10px 14px; font-size:13px; font-weight:500; color:var(--gr-1); border-radius:var(--r-sm); transition:var(--trans); }
      .acm-section-nav-item:hover { background:var(--gr-6); }
      .acm-section-nav-active { background:var(--bk); color:#fff; font-weight:600; }
      .acm-section-nav-active:hover { background:var(--bk); }
      .acm-editor-panel { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); overflow:hidden; }
      .acm-editor-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); }
      .acm-section-body { display:grid; grid-template-columns:1.4fr 1fr; gap:24px; padding:24px; }
      .acm-fields { display:flex; flex-direction:column; gap:16px; }
      .acm-saved-flash { font-size:12px; font-weight:600; color:#16a34a; }
      @media(max-width:900px){ .acm-editor{ grid-template-columns:1fr; } .acm-section-nav{ flex-direction:row; overflow-x:auto; position:static; } .acm-section-body{ grid-template-columns:1fr; } }

      /* Live preview card */
      .acm-preview { background:var(--gr-6); border-radius:var(--r); padding:24px; align-self:start; position:sticky; top:0; }
      .acm-preview-eyebrow { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--gr-2); margin-bottom:14px; }
      .acm-preview-hero-title { font-size:22px; font-weight:700; letter-spacing:-.03em; margin-bottom:8px; }
      .acm-preview-hero-sub { font-size:13px; color:var(--gr-1); line-height:1.5; }
      .acm-preview-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--gr-2); margin-bottom:6px; }
      .acm-preview-divider { height:1px; background:var(--gr-5); margin:20px 0; }
      .acm-preview-dark { background:var(--bk); color:#fff; }
      .acm-footer-preview-text { font-size:13px; color:rgba(255,255,255,.55); line-height:1.6; max-width:220px; }
      .acm-footer-preview-copy { font-size:11px; color:rgba(255,255,255,.3); margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1); }
      .acm-preview-brand { background:var(--cr); color:#fff; text-align:center; }
      .acm-newsletter-preview-title { font-size:18px; font-weight:700; margin-bottom:8px; }
      .acm-newsletter-preview-body { font-size:12px; color:rgba(255,255,255,.75); line-height:1.5; margin-bottom:16px; }
      .acm-newsletter-preview-form { display:flex; gap:6px; }
      .acm-newsletter-preview-input { flex:1; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3); border-radius:var(--r-sm); font-size:11px; color:rgba(255,255,255,.6); padding:8px 10px; text-align:left; }

      /* Media library */
      .acm-media-folders { display:flex; gap:6px; flex-wrap:wrap; padding:16px 24px 0; }
      .acm-folder-tab { padding:6px 14px; font-size:12px; font-weight:500; border:1px solid var(--gr-4); border-radius:100px; color:var(--gr-1); transition:var(--trans); }
      .acm-folder-tab:hover { border-color:var(--bk); }
      .acm-folder-tab-active { background:var(--bk); color:#fff; border-color:var(--bk); }
      .acm-media-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:16px; padding:24px; }
      .acm-media-item { border:1px solid var(--gr-5); border-radius:var(--r-sm); overflow:hidden; background:var(--gr-6); }
      .acm-media-item img { width:100%; height:120px; object-fit:cover; display:block; }
      .acm-media-item-actions { display:flex; gap:6px; padding:8px; flex-wrap:wrap; }
      .acm-media-item-actions .btn { flex:1; padding:6px 8px; font-size:11px; min-width:60px; }
      .acm-replace-btn { cursor:pointer; text-align:center; }
      .acm-upload-preview { background:var(--gr-6); border-radius:var(--r); overflow:hidden; display:flex; align-items:center; justify-content:center; max-height:320px; }
      .acm-upload-preview img { width:100%; max-height:320px; object-fit:contain; display:block; }

      /* Shared empty-state pattern — icon + headline + description +
         primary action — used across multiple admin pages (Categories,
         Order Detail, and any future page needing one), so it lives
         here rather than being duplicated per-page. */
      .admin-empty { text-align:center; padding:64px 24px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); }
      .admin-empty-icon { width:56px; height:56px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; background:var(--gr-6); border-radius:50%; color:var(--gr-3); }
      .admin-empty h3 { font-size:16px; font-weight:600; margin-bottom:6px; }
      .admin-empty p { font-size:13px; color:var(--gr-2); max-width:340px; margin:0 auto 20px; line-height:1.5; }

      /* ── Shared admin page/card system ──────────────────────────
         Relocated from AdminHome's own component-local <style> tag,
         where it only ever existed in the DOM while that specific page
         was mounted — meaning every OTHER admin page had no card
         styling at all the moment you navigated away from /admin. This
         is the one place it needs to live, since AdminPagesStyles
         renders once in AdminLayout and is present on every route.
         Card radius/shadow are intentionally distinct from the base
         --r token (used for buttons/inputs site-wide) — bumped up
         slightly for a more premium container feel without going as
         far as a fully rounded/pill look. */
      .admin-page { max-width:1480px; margin:0 auto; padding:24px 32px 48px; }
      .admin-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
      .admin-page-title { font-size:28px; font-weight:700; letter-spacing:-.02em; }
      .admin-page-loading { padding:48px; text-align:center; color:var(--gr-2); font-size:14px; }
      .admin-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
      .admin-stat-card { background:var(--wh); border:1px solid rgba(15,23,42,.08); border-radius:12px; box-shadow:0 2px 8px rgba(15,23,42,.04); padding:20px 24px; }
      .admin-stat-warn { border-color:#fca5a5; background:#fff5f5; }
      .admin-stat-value { font-size:28px; font-weight:700; letter-spacing:-.04em; margin-bottom:4px; }
      .admin-stat-label { font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--gr-2); }
      .admin-alert { padding:12px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:var(--r-sm); font-size:13px; margin-bottom:20px; }
      /* No default padding here, deliberately — matches the original,
         proven layout model where .admin-card-header carries its own
         padding and each page adds padding to its own body content
         below the header. Introducing card-level default padding was
         tried and reverted: it silently conflicts with per-instance
         overrides several pages already rely on (e.g. the Shipment
         panel's header, which opts out of the boxed-header look
         entirely via padding:0). Fixing what actually caused the
         reported bug (this rule not being in scope on any page except
         AdminHome) doesn't require changing that model too. */
      .admin-card { background:var(--wh); border:1px solid rgba(15,23,42,.08); border-radius:12px; box-shadow:0 2px 8px rgba(15,23,42,.04); margin-bottom:20px; }
      .admin-card-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid rgba(15,23,42,.08); }
      .admin-card-title { font-size:18px; font-weight:600; letter-spacing:-.01em; }
      /* Standard body-content padding for anything sitting below a
         .admin-card-header — wrap a card's content in this rather than
         adding ad-hoc padding per page. Kept separate from .admin-card
         itself (see note above) so pages that need edge-to-edge content
         (tables, image grids) can simply not use it. */
      .admin-card-body { padding:20px 24px; }
      .admin-table { width:100%; border-collapse:collapse; font-size:13px; }
      .admin-table th { padding:10px 24px; text-align:left; font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--gr-2); border-bottom:1px solid var(--gr-5); }
      .admin-table td { padding:12px 24px; border-bottom:1px solid var(--gr-5); }
      .admin-table tr:last-child td { border-bottom:none; }
      .admin-link { color:var(--cr); font-weight:500; }
      .admin-muted { color:var(--gr-2); }
      .admin-status-pill { display:inline-block; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
      @media(max-width:1024px){ .admin-page { padding:24px 24px 40px; } }
      @media(max-width:900px){ .admin-stats-grid{grid-template-columns:1fr 1fr;} }
      @media(max-width:640px){ .admin-page { padding:16px 16px 32px; } }
    `}</style>
  );
}
