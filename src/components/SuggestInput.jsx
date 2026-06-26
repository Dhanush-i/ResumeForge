import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * SuggestInput — text input with dropdown autocomplete suggestions.
 * Props:
 *   label, value, onChange, placeholder, suggestions (string[]),
 *   type, inputStyle, fullWidth
 */
export default function SuggestInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  type = 'text',
  inputStyle = {},
  fullWidth = true,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = value.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  const showDropdown = open && filtered.length > 0;

  const select = useCallback((item) => {
    onChange(item);
    setOpen(false);
    setActiveIdx(-1);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx >= 0) {
      e.preventDefault();
      select(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="form-group"
      style={{ position: 'relative', flex: fullWidth ? 1 : undefined }}
    >
      {label && <label className="form-label">{label}</label>}
      <input
        ref={inputRef}
        type={type}
        className="form-input"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="suggest-dropdown">
          {filtered.map((item, idx) => (
            <div
              key={item}
              className={`suggest-item ${idx === activeIdx ? 'active' : ''}`}
              onMouseDown={e => { e.preventDefault(); select(item); }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
