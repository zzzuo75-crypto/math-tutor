import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({ content, className = '', inline = false }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Split text by LaTeX block formulas $$...$$ and inline formulas $...$
    // Also support LaTeX patterns like \[...\] or \(...\)
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;

    const parts = content.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        let math = '';
        let isDisplayMode = false;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          math = part.slice(2, -2).trim();
          isDisplayMode = true;
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          math = part.slice(2, -2).trim();
          isDisplayMode = true;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          math = part.slice(1, -1).trim();
          isDisplayMode = false;
        } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          math = part.slice(2, -2).trim();
          isDisplayMode = false;
        } else {
          // Regular text: escape HTML and preserve line breaks
          const escaped = part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');
          return escaped;
        }

        try {
          return katex.renderToString(math, {
            displayMode: isDisplayMode,
            throwOnError: false,
          });
        } catch {
          return `<span class="text-amber-700 font-mono bg-amber-50 px-1 rounded">${part}</span>`;
        }
      })
      .join('');
  }, [content]);

  if (inline) {
    return (
      <span
        className={`math-rendered inline-block leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <div
      className={`math-rendered leading-relaxed break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
