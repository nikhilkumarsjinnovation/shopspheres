'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Info, AlertTriangle, Lightbulb } from 'lucide-react';

export interface FormattedMessageProps {
  content: string;
  isUser?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Pre-processes text from AI/Gemini outputs:
 * 1. Converts LaTeX math commands like $\le 5$ or $\ge 10$ into standard Unicode (≤ 5, ≥ 10)
 * 2. Cleans unescaped raw LaTeX symbols
 */
export function cleanAiOutputText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Convert LaTeX math commands wrapped in $ ... $ or $$ ... $$
  text = text.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, inner) => {
    // If it's a plain currency like $50 or $1,000 without math commands, leave as is
    if (/^\s*\d+([,.]\d+)?\s*(usd|inr|eur|k|m|b)?\s*$/i.test(inner)) {
      return match;
    }

    const s = inner
      .replace(/\\le(q)?\b/g, '≤')
      .replace(/\\ge(q)?\b/g, '≥')
      .replace(/\\neq\b/g, '≠')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\times\b/g, '×')
      .replace(/\\div\b/g, '÷')
      .replace(/\\pm\b/g, '±')
      .replace(/\\cdot\b/g, '·')
      .replace(/\\dots\b/g, '…')
      .replace(/\\to\b|\\rightarrow\b/g, '→')
      .replace(/\\leftarrow\b/g, '←')
      .replace(/\\infty\b/g, '∞')
      .replace(/\\alpha\b/g, 'α')
      .replace(/\\beta\b/g, 'β')
      .replace(/\\mu\b/g, 'µ')
      .replace(/\\sum\b/g, '∑')
      .replace(/\\prod\b/g, '∏')
      .replace(/\\{1,2}/g, '')
      .trim();

    return s;
  });

  // 2. Catch unescaped / raw standalone \le, \ge, etc. outside of $
  text = text
    .replace(/(^|\s)\\le(q)?(\s|$)/g, '$1≤$3')
    .replace(/(^|\s)\\ge(q)?(\s|$)/g, '$1≥$3')
    .replace(/(^|\s)\\approx(\s|$)/g, '$1≈$2')
    .replace(/(^|\s)\\neq(\s|$)/g, '$1≠$2')
    .replace(/(^|\s)\\times(\s|$)/g, '$1×$2')
    .replace(/(^|\s)\\pm(\s|$)/g, '$1±$2');

  return text;
}

/**
 * Code Block component with header, language badge, and 1-tap copy
 */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="fmt-code-block">
      <div className="fmt-code-header">
        <span className="fmt-code-lang">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="fmt-copy-btn"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} style={{ color: '#10b981' }} />
              <span style={{ color: '#10b981' }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="fmt-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Tokenizes and renders inline markdown formatting:
 * - Bold + Italic: ***text***
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Strikethrough: ~~text~~
 * - Links: [label](url)
 * - Raw URLs: https://...
 */
export function renderInlineContent(text: string, isUser: boolean = false): React.ReactNode[] {
  if (!text) return [];

  // Regex matching inline formatting tokens in priority order:
  // 1. `inline code`
  // 2. ***bold italic***
  // 3. **bold**
  // 4. *italic*
  // 5. ~~strikethrough~~
  // 6. [link](url)
  // 7. raw URL
  const INLINE_REGEX =
    /(`[^`]+`|\*\*\*(?:[^*]|\*[^*])+\*\*\*|\*\*(?:[^*]|\*[^*])+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('`') && token.endsWith('`')) {
      result.push(
        <code key={match.index} className="fmt-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      result.push(
        <strong key={match.index}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      result.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      result.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      result.push(<del key={match.index}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith('[') && match[2] && match[3]) {
      const label = match[2];
      const href = match[3];
      result.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="fmt-link"
        >
          {label}
          <ExternalLink size={10} style={{ display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />
        </a>
      );
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      result.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="fmt-link"
        >
          {token}
          <ExternalLink size={10} style={{ display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />
        </a>
      );
    } else {
      result.push(token);
    }

    lastIndex = INLINE_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface ListItem {
  text: string;
  subItems?: string[];
}

type Block =
  | { type: 'code'; language: string; content: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'ul'; items: ListItem[] }
  | { type: 'ol'; items: ListItem[] }
  | { type: 'table'; data: TableData }
  | { type: 'blockquote'; calloutType?: 'note' | 'tip' | 'warning'; lines: string[] }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

/**
 * Parses markdown text into structural block nodes
 */
function parseMarkdownBlocks(cleanedText: string): Block[] {
  const lines = cleanedText.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code blocks (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({
        type: 'code',
        language,
        content: codeLines.join('\n'),
      });
      continue;
    }

    // 2. Empty lines -> Skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 3. Horizontal rules (--- or *** or ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Headings (# h1, ## h2, ### h3, #### h4)
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'heading', level: 4, text: trimmed.slice(5).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // 5. Blockquotes / Callouts (> [!NOTE] or > text)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      let calloutType: 'note' | 'tip' | 'warning' | undefined;

      while (i < lines.length && lines[i].trim().startsWith('>')) {
        let qLine = lines[i].trim().replace(/^>\s?/, '');
        if (qLine.startsWith('[!NOTE]') || qLine.startsWith('[!INFO]')) {
          calloutType = 'note';
          qLine = qLine.replace(/^\[!(NOTE|INFO)\]\s?/, '');
        } else if (qLine.startsWith('[!TIP]')) {
          calloutType = 'tip';
          qLine = qLine.replace(/^\[!TIP\]\s?/, '');
        } else if (qLine.startsWith('[!WARNING]') || qLine.startsWith('[!CAUTION]')) {
          calloutType = 'warning';
          qLine = qLine.replace(/^\[!(WARNING|CAUTION)\]\s?/, '');
        }
        if (qLine) quoteLines.push(qLine);
        i++;
      }
      blocks.push({
        type: 'blockquote',
        calloutType,
        lines: quoteLines,
      });
      continue;
    }

    // 6. Markdown Tables (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const parseCells = (row: string) =>
        row
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(trimmed);
      i += 2; // skip header and divider row
      const rows: string[][] = [];

      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        rows.push(parseCells(lines[i].trim()));
        i++;
      }

      blocks.push({
        type: 'table',
        data: { headers, rows },
      });
      continue;
    }

    // 7. Unordered Lists (* item, - item, + item, • item)
    const isUnordered = /^(\*|-|\+|•)\s+/.test(trimmed);
    const isOrdered = /^\d+\.\s+/.test(trimmed);

    if (isUnordered || isOrdered) {
      const listType = isOrdered ? 'ol' : 'ul';
      const items: ListItem[] = [];

      while (i < lines.length) {
        const curLine = lines[i];
        const curTrimmed = curLine.trim();

        if (!curTrimmed) {
          // If next line is not a list item, stop list
          if (!lines[i + 1] || (!/^(\*|-|\+|•)\s+/.test(lines[i + 1].trim()) && !/^\d+\.\s+/.test(lines[i + 1].trim()))) {
            i++;
            break;
          }
          i++;
          continue;
        }

        const isCurUnordered = /^(\*|-|\+|•)\s+/.test(curTrimmed);
        const isCurOrdered = /^\d+\.\s+/.test(curTrimmed);
        const isIndented = /^\s{2,}/.test(curLine) && (isCurUnordered || isCurOrdered);

        if (isIndented && items.length > 0) {
          // Sub-item for previous list item
          const subText = curTrimmed.replace(/^(\*|-|\+|•|\d+\.)\s+/, '');
          const lastItem = items[items.length - 1];
          if (!lastItem.subItems) lastItem.subItems = [];
          lastItem.subItems.push(subText);
          i++;
          continue;
        }

        if ((listType === 'ul' && isCurUnordered) || (listType === 'ol' && isCurOrdered) || (isCurUnordered || isCurOrdered)) {
          const itemText = curTrimmed.replace(/^(\*|-|\+|•|\d+\.)\s+/, '');
          items.push({ text: itemText });
          i++;
        } else {
          break;
        }
      }

      if (items.length > 0) {
        blocks.push({
          type: listType,
          items,
        });
      }
      continue;
    }

    // 8. Paragraph (Regular text, grouping consecutive normal lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      const curT = cur.trim();
      if (!curT) break;
      // Stop if entering a new block
      if (
        curT.startsWith('```') ||
        curT.startsWith('#') ||
        curT.startsWith('>') ||
        /^(\-{3,}|\*{3,}|_{3,})$/.test(curT) ||
        /^(\*|-|\+|•)\s+/.test(curT) ||
        /^\d+\.\s+/.test(curT) ||
        (curT.startsWith('|') && curT.endsWith('|'))
      ) {
        break;
      }
      paraLines.push(curT);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paraLines.join(' '),
      });
    }
  }

  return blocks;
}

export default function FormattedMessage({
  content,
  isUser = false,
  className = '',
  style,
}: FormattedMessageProps) {
  if (!content) return null;

  const cleaned = cleanAiOutputText(content);
  const blocks = parseMarkdownBlocks(cleaned);

  return (
    <div
      className={`formatted-markdown ${isUser ? 'user-formatted' : 'assistant-formatted'} ${className}`}
      style={style}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const children = renderInlineContent(block.text, isUser);
            if (block.level === 1) return <h1 key={idx} className="fmt-h1">{children}</h1>;
            if (block.level === 2) return <h2 key={idx} className="fmt-h2">{children}</h2>;
            if (block.level === 3) return <h3 key={idx} className="fmt-h3">{children}</h3>;
            return <h4 key={idx} className="fmt-h4">{children}</h4>;
          }

          case 'code':
            return <CodeBlock key={idx} code={block.content} language={block.language} />;

          case 'ul':
            return (
              <ul key={idx} className="fmt-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="fmt-li">
                    {renderInlineContent(item.text, isUser)}
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="fmt-ul-nested">
                        {item.subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="fmt-li-nested">
                            {renderInlineContent(sub, isUser)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="fmt-ol">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="fmt-li">
                    {renderInlineContent(item.text, isUser)}
                    {item.subItems && item.subItems.length > 0 && (
                      <ol className="fmt-ol-nested">
                        {item.subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="fmt-li-nested">
                            {renderInlineContent(sub, isUser)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
            );

          case 'table':
            return (
              <div key={idx} className="fmt-table-container">
                <table className="fmt-table">
                  <thead>
                    <tr>
                      {block.data.headers.map((h, hIdx) => (
                        <th key={hIdx} className="fmt-th">
                          {renderInlineContent(h, isUser)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.data.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="fmt-td">
                            {renderInlineContent(cell, isUser)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'blockquote': {
            let icon = null;
            if (block.calloutType === 'note') icon = <Info size={15} style={{ color: 'var(--accent-electric)' }} />;
            if (block.calloutType === 'tip') icon = <Lightbulb size={15} style={{ color: '#10b981' }} />;
            if (block.calloutType === 'warning') icon = <AlertTriangle size={15} style={{ color: '#f59e0b' }} />;

            return (
              <blockquote
                key={idx}
                className={`fmt-blockquote ${block.calloutType ? `fmt-callout-${block.calloutType}` : ''}`}
              >
                {icon && <div className="fmt-callout-icon">{icon}</div>}
                <div className="fmt-callout-text">
                  {block.lines.map((line, lIdx) => (
                    <p key={lIdx} style={{ margin: lIdx === 0 ? 0 : '0.35rem 0 0' }}>
                      {renderInlineContent(line, isUser)}
                    </p>
                  ))}
                </div>
              </blockquote>
            );
          }

          case 'hr':
            return <hr key={idx} className="fmt-hr" />;

          case 'paragraph':
          default:
            return (
              <p key={idx} className="fmt-p">
                {renderInlineContent(block.text, isUser)}
              </p>
            );
        }
      })}
    </div>
  );
}
