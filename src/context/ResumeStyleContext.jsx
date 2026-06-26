import React, { createContext, useContext, useState, useEffect } from 'react';

export const RESUME_FONTS = [
  { id: 'georgia',     label: 'Georgia',       family: 'Georgia, "Times New Roman", serif',       preview: 'Aa' },
  { id: 'garamond',    label: 'Garamond',      family: '"EB Garamond", Garamond, serif',           preview: 'Aa' },
  { id: 'times',       label: 'Times New Roman', family: '"Times New Roman", Times, serif',         preview: 'Aa' },
  { id: 'palatino',    label: 'Palatino',      family: '"Palatino Linotype", "Book Antiqua", serif', preview: 'Aa' },
  { id: 'lora',        label: 'Lora',          family: 'Lora, Georgia, serif',                     preview: 'Aa' },
  { id: 'merriweather',label: 'Merriweather',  family: 'Merriweather, Georgia, serif',             preview: 'Aa' },
  { id: 'crimson',     label: 'Crimson Pro',   family: '"Crimson Pro", Georgia, serif',            preview: 'Aa' },
];

// Standard resume pt sizes — 10 to 14
export const RESUME_SIZES = [10, 11, 12, 13, 14];

// Maps pt → scale factor (12pt = 1.0 baseline)
export const ptToScale = (pt) => pt / 12;

const ResumeStyleContext = createContext(null);

export function ResumeStyleProvider({ children }) {
  const [fontId, setFontId] = useState(() => {
    return localStorage.getItem('rf_font') || 'georgia';
  });
  const [sizePt, setSizePt] = useState(() => {
    return Number(localStorage.getItem('rf_size')) || 12;
  });

  const font = RESUME_FONTS.find(f => f.id === fontId) || RESUME_FONTS[0];
  const scale = ptToScale(sizePt);

  useEffect(() => { localStorage.setItem('rf_font', fontId); }, [fontId]);
  useEffect(() => { localStorage.setItem('rf_size', String(sizePt)); }, [sizePt]);

  return (
    <ResumeStyleContext.Provider value={{ fontId, setFontId, sizePt, setSizePt, font, scale }}>
      {children}
    </ResumeStyleContext.Provider>
  );
}

export function useResumeStyle() {
  const ctx = useContext(ResumeStyleContext);
  if (!ctx) throw new Error('useResumeStyle must be used inside ResumeStyleProvider');
  return ctx;
}
