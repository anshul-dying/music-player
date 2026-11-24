'use client';

import React from 'react';
import katex from 'katex';

export interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function MathView({ math, block = false, className = '' }: MathViewProps) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return math;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={`my-2 overflow-x-auto py-1 text-text-primary ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block align-baseline mx-0.5 text-text-primary ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathFormattedText({ text, className = '' }: { text: string; className?: string }) {
  const parts = React.useMemo(() => {
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(text.substring(lastIndex, match.index));
      }
      const raw = match[0];
      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        const math = raw.slice(2, -2);
        tokens.push(<MathView key={match.index} math={math} block />);
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        const math = raw.slice(1, -1);
        tokens.push(<MathView key={match.index} math={math} block={false} />);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push(text.substring(lastIndex));
    }

    return tokens;
  }, [text]);

  return <span className={className}>{parts}</span>;
}
