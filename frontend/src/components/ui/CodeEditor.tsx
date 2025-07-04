import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Sun, Moon, ChevronDown } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string | number;
  width?: string | number;
  theme?: string;
  readOnly?: boolean;
  className?: string;
  loading?: React.ReactNode;
  options?: any;
  defaultLanguage?: string;
  defaultValue?: string;
  onMount?: (editor: any, monaco: any) => void;
  beforeMount?: (monaco: any) => void;
  onValidate?: (markers: any[]) => void;
  keepCurrentModel?: boolean;
  path?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'python',
  height = '400px',
  width = '100%',
  readOnly = false,
  className = '',
  loading,
  options: customOptions,
  defaultLanguage,
  defaultValue,
  onMount,
  beforeMount,
  onValidate,
  keepCurrentModel,
  path
}) => {
  const editorRef = useRef<any>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const { t } = useTranslation(['common', 'coding']);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    try {
      console.log('🎨 Configuring Monaco Editor themes...');
      
      // Configure Monaco Editor with Arena theme
      monaco.editor.defineTheme('arena-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '00ff88', fontStyle: 'bold' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'function', foreground: 'DCDCAA' },
          { token: 'variable', foreground: '9CDCFE' },
          { token: 'operator', foreground: 'D4D4D4' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#d4d4d4',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#00ff88',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#1a1a1a',
          'editorCursor.foreground': '#00ff88',
          'editor.findMatchBackground': '#515c6a',
          'editor.findMatchHighlightBackground': '#ea5c0055',
          'editorWidget.background': '#1a1a1a',
          'editorWidget.border': '#454545',
          'editorSuggestWidget.background': '#1a1a1a',
          'editorSuggestWidget.border': '#454545',
          'editorSuggestWidget.selectedBackground': '#264f78',
        }
      });

      monaco.editor.defineTheme('arena-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0066cc', fontStyle: 'bold' },
          { token: 'string', foreground: 'A31515' },
          { token: 'number', foreground: '098658' },
          { token: 'type', foreground: '267f99' },
          { token: 'function', foreground: '795E26' },
          { token: 'variable', foreground: '001080' },
          { token: 'operator', foreground: '000000' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editorLineNumber.foreground': '#237893',
          'editorLineNumber.activeForeground': '#0066cc',
          'editor.selectionBackground': '#ADD6FF',
          'editor.lineHighlightBackground': '#f7f7f7',
          'editorCursor.foreground': '#0066cc',
        }
      });

      // Set the arena theme
      monaco.editor.setTheme('arena-dark');

      // Call custom onMount if provided
      if (onMount) {
        onMount(editor, monaco);
      }
    } catch (error) {
      console.error('Monaco Editor theme configuration failed:', error);
      setEditorError(t('codeEditor.themeConfigFailed'));
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (onChange) {
      onChange(value);
    }
  };

  const handleBeforeMount = (monaco: any) => {
    try {
      if (beforeMount) {
        beforeMount(monaco);
      }
    } catch (error) {
      console.error('Monaco Editor beforeMount error:', error);
      setEditorError(t('codeEditor.initializationFailed'));
    }
  };

  // Merge default options with custom options
  const editorOptions = {
    readOnly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'on',
    contextmenu: true,
    selectOnLineNumbers: true,
    matchBrackets: 'always',
    autoIndent: 'advanced',
    formatOnPaste: true,
    formatOnType: true,
    padding: { top: 16, bottom: 16 },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'all',
    ...customOptions
  };

  // Custom loading component
  const defaultLoading = (
    <div className="flex items-center justify-center h-full bg-arena-dark border border-arena-border rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-arena-accent border-t-transparent"></div>
        <span className="text-arena-text-muted text-sm">{t('codeEditor.loading')}</span>
      </div>
    </div>
  );

  // Fallback textarea editor
  const FallbackEditor = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 bg-arena-surface/50 border-b border-arena-border">
        <span className="text-xs text-arena-text-muted">
          {t('codeEditor.fallbackEditor', { language })}
        </span>
        <span className="text-xs text-yellow-400">
          {t('codeEditor.monacoUnavailable')}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="flex-1 w-full p-4 bg-arena-dark text-arena-text border-0 outline-none resize-none font-mono text-sm leading-relaxed"
        style={{
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          tabSize: 4,
        }}
        placeholder={t('codeEditor.writeCodePlaceholder', { language })}
        spellCheck={false}
      />
    </div>
  );

  // Show fallback editor if there's an error
  if (editorError) {
    return (
      <div className={`border border-arena-border rounded-lg overflow-hidden bg-arena-dark ${className}`} style={{ height }}>
        <FallbackEditor />
      </div>
    );
  }

  const containerStyle = height === '100%' 
    ? { height: '100%', minHeight: '400px' }
    : { height: typeof height === 'string' ? height : `${height}px` };

  try {
    return (
      <div className={`border border-arena-border rounded-lg overflow-hidden bg-arena-dark ${className}`} style={containerStyle}>
        <Editor
          height={height}
          width={width}
          language={language}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={handleBeforeMount}
          onValidate={onValidate}
          theme="arena-dark"
          options={editorOptions}
          loading={loading || defaultLoading}
          defaultLanguage={defaultLanguage}
          defaultValue={defaultValue}
          keepCurrentModel={keepCurrentModel}
          path={path}
        />
      </div>
    );
  } catch (error) {
    console.error('Monaco Editor failed to render:', error);
    return (
      <div className={`border border-arena-border rounded-lg overflow-hidden bg-arena-dark ${className}`} style={containerStyle}>
        <FallbackEditor />
      </div>
    );
  }
};

// Language selector component
interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (language: string) => void;
  languages: string[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  languages,
}) => {

  const handleSelect = (language: string) => {
    onSelectLanguage(language);
  };

  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => handleSelect(e.target.value)}
        className="appearance-none bg-arena-dark border border-arena-border text-arena-text pr-8 rounded-md pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-transparent"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-arena-text-muted pointer-events-none w-4 h-4" />
    </div>
  );
};

// Theme toggle component
interface ThemeToggleProps {
  theme: 'vs-dark' | 'vs-light';
  onToggleTheme: (theme: 'vs-dark' | 'vs-light') => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggleTheme }) => {
  const { t } = useTranslation('common');
  const toggle = () => {
    onToggleTheme(theme === 'vs-dark' ? 'vs-light' : 'vs-dark');
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md hover:bg-arena-secondary/30 transition-colors text-arena-text-muted hover:text-white"
      title={t('themeToggle.toggleTheme')}
    >
      {theme === 'vs-dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}; 