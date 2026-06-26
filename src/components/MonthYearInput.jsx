import React from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 7 }, (_, i) => 1990 + i).reverse();

/**
 * Parses "Aug 2021" → { month: 'Aug', year: '2021' }
 * Returns { month: '', year: '' } for empty/invalid strings
 */
function parse(val = '') {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2 && MONTHS.includes(parts[0])) {
    return { month: parts[0], year: parts[1] };
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return { month: '', year: parts[0] };
  }
  return { month: '', year: '' };
}

function format(month, year) {
  if (month && year) return `${month} ${year}`;
  if (year) return year;
  return '';
}

export default function MonthYearInput({ label, value, onChange, placeholder }) {
  const { month, year } = parse(value);

  const handleMonth = (m) => onChange(format(m, year));
  const handleYear  = (y) => onChange(format(month, y));

  return (
    <div className="form-group" style={{ flex: 1 }}>
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          className="form-input"
          value={month}
          onChange={e => handleMonth(e.target.value)}
          style={{ flex: '0 0 80px', cursor: 'pointer' }}
        >
          <option value="">Month</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          className="form-input"
          value={year}
          onChange={e => handleYear(e.target.value)}
          style={{ flex: 1, cursor: 'pointer' }}
        >
          <option value="">Year</option>
          {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}
