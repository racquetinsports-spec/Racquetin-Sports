import { Link } from 'react-router-dom';
import { useSiteContent, pick } from '../../hooks/useSiteContent';

const BRAND_TAGLINE = 'Precision equipment for players who care about the details.';

export default function Footer() {
  const { settings, content } = useSiteContent();

  const tagline   = pick(settings.tagline, BRAND_TAGLINE);
  const footerText = pick(content['footer.text'], null);
  const instagram = pick(settings.instagram_url, null);
  const facebook  = pick(settings.facebook_url, null);
  const youtube   = pick(settings.youtube_url, null);
  const whatsapp  = pick(settings.whatsapp, null);
  const email     = pick(settings.email, null);
  const phone     = pick(settings.phone, null);
  const address   = pick(settings.address, null);
  const brandName = pick(settings.company_name, 'RacquetIn');
  const year = new Date().getFullYear();
  const copyright = pick(content['footer.copyright'], `© ${year} ${brandName}. All rights reserved.`);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <img src="/logo-r-monogram.png" alt={brandName} className="footer-logo-img" />
            </div>
            <p className="footer-tagline">{footerText || tagline}</p>
            <div className="footer-socials">
              {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="footer-social">Instagram</a>}
              {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="footer-social">Facebook</a>}
              {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" className="footer-social">YouTube</a>}
              {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer-social">WhatsApp</a>}
              {!instagram && !facebook && !youtube && !whatsapp && (
                <span className="footer-social">Instagram — pending</span>
              )}
            </div>
          </div>

          <div className="footer-cols">
            {/* Shop */}
            <div className="footer-col">
              <div className="footer-col-head">Shop</div>
              <Link to="/rackets">Rackets</Link>
              <Link to="/shoes">Shoes</Link>
              <Link to="/bags">Bags</Link>
              <Link to="/shuttlecocks">Shuttlecocks</Link>
              <Link to="/strings">Strings</Link>
              <Link to="/grips">Grips</Link>
              <Link to="/apparel">Apparel</Link>
            </div>

            {/* Company */}
            <div className="footer-col">
              <div className="footer-col-head">Company</div>
              <Link to="/about">About</Link>
              <a href="#pending">Careers — pending</a>
              <a href="#pending">Press — pending</a>
            </div>

            {/* Support */}
            <div className="footer-col">
              <div className="footer-col-head">Support</div>
              <a href="#pending">Contact — pending</a>
              <a href="#pending">FAQ — pending</a>
            </div>

            {/* Contact */}
            <div className="footer-col">
              <div className="footer-col-head">Contact</div>
              <span className="footer-info">{email || 'Email — pending'}</span>
              <span className="footer-info">{phone || whatsapp || 'Phone — pending'}</span>
              <span className="footer-info">{address || 'Address — pending'}</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="t-small">{copyright}</span>
          <div className="footer-legal">
            <Link to="/privacy-policy" className="t-small">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="t-small">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>

      <style>{`
        .footer { background:var(--bk); color:var(--wh); padding:72px 0 32px; }
        .footer-top { display:grid; grid-template-columns:280px 1fr; gap:64px; padding-bottom:48px; border-bottom:1px solid rgba(255,255,255,.08); }
        .footer-logo-wrap { display:flex; align-items:center; margin-bottom:20px; }
        .footer-logo-img { width:40px; height:40px; object-fit:contain; display:block; filter:brightness(0) invert(1); }
        .footer-tagline { color:rgba(255,255,255,.45); font-size:13px; line-height:1.65; max-width:220px; }
        .footer-socials { margin-top:20px; }
        .footer-social { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.35); transition:color .2s; }
        .footer-social:hover { color:var(--wh); }
        .footer-cols { display:grid; grid-template-columns:repeat(4,1fr); gap:32px; }
        .footer-col { display:flex; flex-direction:column; gap:10px; }
        .footer-col-head { font-size:10px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.35); margin-bottom:4px; }
        .footer-col a, .footer-info { font-size:13px; color:rgba(255,255,255,.55); transition:color .2s; }
        .footer-col a:hover { color:var(--wh); }
        .footer-info { font-size:12px; color:rgba(255,255,255,.3); font-style:italic; }
        .footer-bottom { display:flex; align-items:center; justify-content:space-between; padding-top:28px; }
        .footer-bottom .t-small { color:rgba(255,255,255,.3); }
        .footer-legal { display:flex; gap:24px; }
        .footer-legal a { color:rgba(255,255,255,.3); font-size:11px; transition:color .2s; }
        .footer-legal a:hover { color:rgba(255,255,255,.6); }
        @media(max-width:1000px){ .footer-top{grid-template-columns:1fr;} .footer-cols{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:540px){ .footer-cols{grid-template-columns:1fr 1fr;} .footer-bottom{flex-direction:column;gap:12px;} }
      `}</style>
    </footer>
  );
}
