import React from 'react';
import { highlight } from '../../utils/highlighter';

export const CodeEditor = ({ code, lang = "python", isEditing = false, onChange }) => {
  if (isEditing) {
    return (
      <textarea
        value={code}
        onChange={e => onChange && onChange(e.target.value)}
        className="flex-1 p-6 font-mono overflow-auto custom-scrollbar m-0 border-0 resize-none focus:outline-none w-full"
        style={{
          background: 'var(--bg-toolbar)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          lineHeight: '1.7',
          fontFamily: '"Courier New", Courier, monospace',
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    );
  }
  return (
    <pre
      className="code-editor-bg flex-1 p-6 font-mono overflow-auto custom-scrollbar whitespace-pre-wrap leading-relaxed m-0 border-0"
      style={{background:'var(--bg-toolbar)', color:'var(--text-code)', fontSize:'14px', lineHeight:'1.7'}}
      dangerouslySetInnerHTML={{ __html: highlight(code, lang) }}
    />
  );
};
