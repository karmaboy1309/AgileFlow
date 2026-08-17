import { useState, useEffect } from 'react';

const SUGGESTIONS = [
  { term: 'status = ', desc: 'Filter by issue status' },
  { term: 'assignee = ', desc: 'Filter by assigned user' },
  { term: 'priority = ', desc: 'Filter by priority level' },
  { term: 'sprint = ', desc: 'Filter by sprint name' },
  { term: 'epicId = ', desc: 'Filter by epic reference' },
];

export default function JQLAutocomplete({ value, onChange, onSearch }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const lastWord = value.split(/\s+/).pop();
    if (!lastWord) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      SUGGESTIONS.filter(s => s.term.startsWith(lastWord.toLowerCase()))
    );
  }, [value]);

  const selectSuggestion = (term) => {
    const words = value.split(/\s+/);
    words.pop(); // remove last word being typed
    const newValue = [...words, term].join(' ');
    onChange(newValue);
    setSuggestions([]);
  };

  return (
    <div className="jql-autocomplete-wrapper" style={{ position: 'relative' }}>
      <input
        className="jql-input"
        placeholder="Enter JQL query (e.g. status = todo)..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch?.()}
        style={{ width: '100%', background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: '0.5rem', padding: '0.65rem 1rem', color: 'var(--theme-text)', outline: 'none' }}
      />
      {suggestions.length > 0 && (
        <div className="jql-suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--theme-card)', border: '1px solid var(--theme-border)', borderRadius: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
          {suggestions.map(s => (
            <div
              key={s.term}
              onClick={() => selectSuggestion(s.term)}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--theme-text)' }}
              className="jql-suggestion-item"
            >
              <strong>{s.term}</strong>
              <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.75rem' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
