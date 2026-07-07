// ── Minimal markdown renderer ────────────────────────────────────
// Deliberately dependency-free (no react-markdown/marked) since this
// project can't add npm packages without touching package.json.
// Supports exactly what the legal pages need: #/##/### headings,
// paragraphs, "- " bullet lists, **bold**, [text](url) links, and
// "---" horizontal rules. Anything else is rendered as plain text —
// this is intentionally not a full CommonMark implementation.
import { Fragment } from 'react';

function renderInline(text, keyPrefix) {
  // Split on **bold** and [text](url) without a regex engine that
  // needs external deps — a simple combined-pattern tokenizer.
  const pattern = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-b-${i++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      const isExternal = /^https?:\/\//.test(match[5]);
      parts.push(
        <a
          key={`${keyPrefix}-a-${i++}`}
          href={match[5]}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          style={{ color: 'var(--cr)', textDecoration: 'underline' }}
        >
          {match[4]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function renderLegalMarkdown(source) {
  if (!source || !source.trim()) return null;

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraphBuffer = [];
  let listBuffer = [];
  let key = 0;

  function flushParagraph() {
    if (paragraphBuffer.length) {
      const text = paragraphBuffer.join(' ');
      blocks.push(<p key={`p-${key++}`} className="legal-p">{renderInline(text, `p${key}`)}</p>);
      paragraphBuffer = [];
    }
  }
  function flushList() {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${key++}`} className="legal-ul">
          {listBuffer.map((item, i) => <li key={i}>{renderInline(item, `li${key}-${i}`)}</li>)}
        </ul>
      );
      listBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') { flushParagraph(); flushList(); continue; }
    if (line === '---' || line === '***') { flushParagraph(); flushList(); blocks.push(<hr key={`hr-${key++}`} className="legal-hr" />); continue; }
    if (line.startsWith('### ')) { flushParagraph(); flushList(); blocks.push(<h3 key={`h3-${key++}`} className="legal-h3">{renderInline(line.slice(4), `h3${key}`)}</h3>); continue; }
    if (line.startsWith('## ')) { flushParagraph(); flushList(); blocks.push(<h2 key={`h2-${key++}`} className="legal-h2">{renderInline(line.slice(3), `h2${key}`)}</h2>); continue; }
    if (line.startsWith('# ')) { flushParagraph(); flushList(); blocks.push(<h1 key={`h1-${key++}`} className="legal-h1">{renderInline(line.slice(2), `h1${key}`)}</h1>); continue; }
    if (/^[-*]\s+/.test(line)) { flushParagraph(); listBuffer.push(line.replace(/^[-*]\s+/, '')); continue; }
    if (/^\*\*[A-Za-z].*\*\*$/.test(line) && line.length < 90) {
      // A short standalone bold line (e.g. "**Effective Date:** ...") —
      // treat as its own paragraph rather than merging into prose.
      flushList();
      paragraphBuffer.push(line);
      flushParagraph();
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushList();

  return <Fragment>{blocks}</Fragment>;
}
