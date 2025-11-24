'use client';

import { useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

export default function StrategyEditor({ code, onChange }) {
  useEffect(() => {
    // Ensure Prism is loaded
    if (typeof window !== 'undefined') {
      Prism.highlightAll();
    }
  }, [code]);

  const highlight = (code) => {
    return Prism.highlight(code, Prism.languages.python, 'python');
  };

  return (
    <div className="relative">
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <Editor
          value={code}
          onValueChange={onChange}
          highlight={highlight}
          padding={16}
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 14,
            minHeight: '400px',
            maxHeight: '600px',
            overflowY: 'auto',
            backgroundColor: '#1a1a1a',
            color: '#f8f8f2',
          }}
          textareaClassName="focus:outline-none"
          className="editor-wrapper"
        />
      </div>

      <style jsx global>{`
        .editor-wrapper textarea {
          outline: none !important;
        }
        
        .editor-wrapper pre {
          font-family: 'Fira Code', 'Fira Mono', monospace !important;
        }
        
        /* Custom scrollbar */
        .editor-wrapper textarea::-webkit-scrollbar,
        .editor-wrapper pre::-webkit-scrollbar {
          width: 8px;
        }
        
        .editor-wrapper textarea::-webkit-scrollbar-track,
        .editor-wrapper pre::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        .editor-wrapper textarea::-webkit-scrollbar-thumb,
        .editor-wrapper pre::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 4px;
        }
        
        .editor-wrapper textarea::-webkit-scrollbar-thumb:hover,
        .editor-wrapper pre::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
}
