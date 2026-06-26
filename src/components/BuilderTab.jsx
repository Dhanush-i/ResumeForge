import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_RESUME, generateId } from '../constants';
import ResumePreview from './ResumePreview';
import SuggestInput from './SuggestInput';
import MonthYearInput from './MonthYearInput';
import {
  UNIVERSITIES, DEGREE_TYPES, FIELDS, LANGUAGES, FRAMEWORKS,
  TOOLS, DATABASES, TECH_STACKS, SKILL_CATEGORIES, CERTIFICATIONS
} from '../data/suggestions';
import {
  User, GraduationCap, FolderGit2, Wrench, Trophy, BadgeCheck,
  FileText, Plus, Trash2, Download, AlertCircle, RotateCcw
} from 'lucide-react';

// ─── Action verbs for bullet quality check ────────────────────────────────────
const ACTION_VERBS = [
  'built','developed','designed','implemented','created','architected','engineered',
  'deployed','automated','optimized','improved','reduced','increased','scaled',
  'led','managed','mentored','collaborated','contributed','integrated','migrated',
  'analyzed','researched','launched','shipped','refactored','wrote','published',
  'achieved','earned','won','ranked','solved','trained','fine-tuned','accelerated',
];

function isBulletGood(bullet) {
  if (!bullet.trim()) return true; // empty is fine
  const first = bullet.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'');
  return ACTION_VERBS.includes(first);
}

// ─── Completeness calculator ──────────────────────────────────────────────────
function calcCompleteness(resume) {
  let total = 0, filled = 0;
  const check = (val) => { total++; if (val?.trim()) filled++; };
  const p = resume.personalInfo;
  check(p.name); check(p.email); check(p.phone); check(p.location);
  check(p.linkedin); check(p.github);
  check(resume.summary);
  resume.education.forEach(e => { check(e.school); check(e.degree); check(e.field); });
  resume.projects.forEach(proj => {
    check(proj.title); check(proj.techStack);
    proj.bullets.forEach(b => check(b));
  });
  resume.skills.forEach(s => { check(s.category); check(s.items); });
  resume.achievements.forEach(a => check(a));
  resume.certifications.forEach(c => check(c));
  return Math.round((filled / total) * 100);
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'rf_draft';
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function saveDraft(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, icon = '✓' }) {
  return (
    <div className="toast">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="form-section-header">
      <Icon size={15} className="form-section-icon" />
      <span className="form-section-title">{title}</span>
      <div className="form-section-actions">{children}</div>
    </div>
  );
}

// ─── Plain form input ─────────────────────────────────────────────────────────
function FInput({ label, value, onChange, placeholder, type = 'text', style }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input
        type={type}
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BuilderTab() {
  // ── Load initial state (silent restore from draft) ──
  const [resume, setResume] = useState(() => {
    const draft = loadDraft();
    return draft || DEFAULT_RESUME;
  });

  const [toast, setToast] = useState(null);
  const [wasRestored] = useState(() => !!loadDraft());
  const [exporting, setExporting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const saveTimerRef = useRef(null);
  const previewScale = 0.70;

  // Show "Session restored" toast once on mount if draft was loaded
  useEffect(() => {
    if (wasRestored) {
      setToast({ message: 'Draft restored from your last session', icon: '📋' });
      setTimeout(() => setToast(null), 3200);
    }
  }, []);

  // Auto-save every 2s when resume changes
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(resume);
    }, 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [resume]);

  // ── Helpers ──
  const updatePersonal = (key, val) =>
    setResume(p => ({ ...p, personalInfo: { ...p.personalInfo, [key]: val } }));

  const updateEdu = (idx, key, val) =>
    setResume(p => ({ ...p, education: p.education.map((e, i) => i === idx ? { ...e, [key]: val } : e) }));
  const addEdu = () =>
    setResume(p => ({ ...p, education: [...p.education, { id: generateId('edu'), school:'', degree:'', field:'', startDate:'', endDate:'', gpa:'', location:'' }] }));
  const removeEdu = idx =>
    setResume(p => ({ ...p, education: p.education.filter((_, i) => i !== idx) }));

  const updateProject = (idx, key, val) =>
    setResume(p => ({ ...p, projects: p.projects.map((pr, i) => i === idx ? { ...pr, [key]: val } : pr) }));
  const updateBullet = (pIdx, bIdx, val) =>
    setResume(p => ({ ...p, projects: p.projects.map((pr, i) => i === pIdx ? { ...pr, bullets: pr.bullets.map((b, j) => j === bIdx ? val : b) } : pr) }));
  const addProject = () => {
    if (resume.projects.length >= 4) return;
    setResume(p => ({ ...p, projects: [...p.projects, { id: generateId('proj'), title:'', techStack:'', githubLink:'', bullets:['','',''] }] }));
  };
  const removeProject = idx =>
    setResume(p => ({ ...p, projects: p.projects.filter((_, i) => i !== idx) }));

  const updateSkill = (idx, key, val) =>
    setResume(p => ({ ...p, skills: p.skills.map((s, i) => i === idx ? { ...s, [key]: val } : s) }));
  const addSkill = () =>
    setResume(p => ({ ...p, skills: [...p.skills, { id: generateId('skill'), category:'', items:'' }] }));
  const removeSkill = idx =>
    setResume(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));

  const updateList = (field, idx, val) =>
    setResume(p => ({ ...p, [field]: p[field].map((a, i) => i === idx ? val : a) }));
  const addListItem = field =>
    setResume(p => ({ ...p, [field]: [...p[field], ''] }));
  const removeListItem = (field, idx) =>
    setResume(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));

  // ── Reset ──
  const handleReset = () => {
    setResume(DEFAULT_RESUME);
    clearDraft();
    setShowConfirmReset(false);
    setToast({ message: 'Form cleared', icon: '🗑️' });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Export PDF ──
  const exportPDF = async () => {
    setExporting(true);
    try {
      const el = document.getElementById('builder-resume');
      const opt = {
        margin: 0,
        filename: `${resume.personalInfo.name || 'resume'}_ResumeForge.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await window.html2pdf().set(opt).from(el).save();
      setToast({ message: 'PDF exported!', icon: '📄' });
      setTimeout(() => setToast(null), 2800);
    } catch {
      setToast({ message: 'Export failed. Try again.', icon: '⚠️' });
      setTimeout(() => setToast(null), 2800);
    } finally {
      setExporting(false);
    }
  };

  const pct = calcCompleteness(resume);
  const summary = resume.summary;
  const ALL_SKILLS = [...LANGUAGES, ...FRAMEWORKS, ...TOOLS, ...DATABASES];

  return (
    <div className="builder-pane">
      {/* ─ Form ─ */}
      <div className="form-panel">

        {/* Completeness */}
        <div className="completeness-bar-wrap">
          <div className="completeness-top">
            <span className="completeness-label">Resume Completeness</span>
            <span className="completeness-pct">{pct}%</span>
          </div>
          <div className="completeness-track">
            <div className="completeness-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* ── Personal Info ── */}
        <div className="form-section">
          <SectionHeader icon={User} title="Personal Info" />
          <div className="form-row">
            <SuggestInput label="Full Name" value={resume.personalInfo.name} onChange={v => updatePersonal('name', v)} placeholder="Jane Smith" suggestions={[]} />
          </div>
          <div className="form-row">
            <FInput label="Email" value={resume.personalInfo.email} onChange={v => updatePersonal('email', v)} placeholder="jane@email.com" type="email" />
            <FInput label="Phone" value={resume.personalInfo.phone} onChange={v => updatePersonal('phone', v)} placeholder="+1 234 567 8900" />
          </div>
          <div className="form-row">
            <FInput label="Location" value={resume.personalInfo.location} onChange={v => updatePersonal('location', v)} placeholder="City, State / Country" />
          </div>
          <div className="form-row">
            <FInput label="LinkedIn" value={resume.personalInfo.linkedin} onChange={v => updatePersonal('linkedin', v)} placeholder="linkedin.com/in/jane" />
            <FInput label="GitHub" value={resume.personalInfo.github} onChange={v => updatePersonal('github', v)} placeholder="github.com/jane" />
          </div>
          <div className="form-row">
            <FInput label="Portfolio (optional)" value={resume.personalInfo.portfolio} onChange={v => updatePersonal('portfolio', v)} placeholder="jane.dev" />
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="form-section">
          <SectionHeader icon={FileText} title="Summary" />
          <div className="form-group">
            <textarea
              className="form-textarea"
              value={summary}
              onChange={e => setResume(p => ({ ...p, summary: e.target.value }))}
              placeholder="Passionate CS student with experience in full-stack development, ML, and competitive programming..."
              rows={4}
            />
            <span className={`char-count ${summary.length > 500 ? 'over' : summary.length > 380 ? 'warn' : ''}`}>
              {summary.length} / 450 chars recommended
            </span>
          </div>
        </div>

        {/* ── Education ── */}
        <div className="form-section">
          <SectionHeader icon={GraduationCap} title="Education">
            <button className="btn-icon add" onClick={addEdu} title="Add education"><Plus size={14} /></button>
          </SectionHeader>
          {resume.education.map((edu, idx) => (
            <div key={edu.id} className="item-card">
              <div className="item-card-header">
                <span className="item-card-label">Education {idx + 1}</span>
                {resume.education.length > 1 && (
                  <button className="btn-icon" onClick={() => removeEdu(idx)}><Trash2 size={13} /></button>
                )}
              </div>
              <div className="form-row">
                <SuggestInput label="University / School" value={edu.school} onChange={v => updateEdu(idx,'school',v)} placeholder="MIT" suggestions={UNIVERSITIES} />
              </div>
              <div className="form-row">
                <SuggestInput label="Degree" value={edu.degree} onChange={v => updateEdu(idx,'degree',v)} placeholder="B.Tech" suggestions={DEGREE_TYPES} />
                <SuggestInput label="Field of Study" value={edu.field} onChange={v => updateEdu(idx,'field',v)} placeholder="Computer Science" suggestions={FIELDS} />
              </div>
              <div className="form-row">
                <MonthYearInput label="Start" value={edu.startDate} onChange={v => updateEdu(idx,'startDate',v)} />
                <MonthYearInput label="End / Expected" value={edu.endDate} onChange={v => updateEdu(idx,'endDate',v)} />
              </div>
              <div className="form-row">
                <FInput label="GPA (optional)" value={edu.gpa} onChange={v => updateEdu(idx,'gpa',v)} placeholder="3.8/4.0" />
                <FInput label="Location" value={edu.location} onChange={v => updateEdu(idx,'location',v)} placeholder="Cambridge, MA" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Projects ── */}
        <div className="form-section">
          <SectionHeader icon={FolderGit2} title={`Projects (${resume.projects.length}/4)`}>
            {resume.projects.length < 4 && (
              <button className="btn-icon add" onClick={addProject} title="Add project"><Plus size={14} /></button>
            )}
          </SectionHeader>
          {resume.projects.map((proj, pIdx) => (
            <div key={proj.id} className="item-card">
              <div className="item-card-header">
                <span className="item-card-label">Project {pIdx + 1}</span>
                {resume.projects.length > 1 && (
                  <button className="btn-icon" onClick={() => removeProject(pIdx)}><Trash2 size={13} /></button>
                )}
              </div>
              <div className="form-row">
                <FInput label="Project Title" value={proj.title} onChange={v => updateProject(pIdx,'title',v)} placeholder="E-Commerce Platform" />
              </div>
              <div className="form-row">
                <SuggestInput label="Tech Stack" value={proj.techStack} onChange={v => updateProject(pIdx,'techStack',v)} placeholder="React, Node.js, MongoDB" suggestions={TECH_STACKS} />
                <FInput label="GitHub Link" value={proj.githubLink} onChange={v => updateProject(pIdx,'githubLink',v)} placeholder="github.com/..." />
              </div>
              <label className="form-label" style={{ marginBottom: 4, display: 'block' }}>Bullet Points (up to 3)</label>
              {proj.bullets.map((b, bIdx) => (
                <div key={bIdx} style={{ marginBottom: 6 }}>
                  <SuggestInput
                    value={b}
                    onChange={v => updateBullet(pIdx, bIdx, v)}
                    placeholder={`Bullet ${bIdx + 1}: e.g. "Built a real-time chat with 500+ concurrent users..."`}
                    suggestions={[]}
                  />
                  {b.trim() && !isBulletGood(b) && (
                    <div className="bullet-tip">
                      <AlertCircle size={10} />
                      Start with an action verb (Built, Developed, Reduced…)
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Technical Skills ── */}
        <div className="form-section">
          <SectionHeader icon={Wrench} title="Technical Skills">
            <button className="btn-icon add" onClick={addSkill} title="Add category"><Plus size={14} /></button>
          </SectionHeader>
          {resume.skills.map((skill, idx) => (
            <div key={skill.id} className="skills-row">
              <SuggestInput
                value={skill.category}
                onChange={v => updateSkill(idx,'category',v)}
                placeholder="Category"
                suggestions={SKILL_CATEGORIES}
                inputStyle={{ maxWidth: 110 }}
                fullWidth={false}
              />
              <SuggestInput
                value={skill.items}
                onChange={v => updateSkill(idx,'items',v)}
                placeholder="Python, Java, React, Docker…"
                suggestions={ALL_SKILLS}
              />
              <button className="btn-icon" onClick={() => removeSkill(idx)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>

        {/* ── Achievements ── */}
        <div className="form-section">
          <SectionHeader icon={Trophy} title="Achievements">
            <button className="btn-icon add" onClick={() => addListItem('achievements')} title="Add"><Plus size={14} /></button>
          </SectionHeader>
          {resume.achievements.map((a, idx) => (
            <div key={idx} className="form-row" style={{ marginBottom: 8 }}>
              <FInput value={a} onChange={v => updateList('achievements', idx, v)} placeholder="Dean's List, Hackathon Winner, Top 20 HackMIT 2025…" />
              {resume.achievements.length > 1 && (
                <button className="btn-icon" style={{ alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeListItem('achievements', idx)}><Trash2 size={13} /></button>
              )}
            </div>
          ))}
        </div>

        {/* ── Certifications ── */}
        <div className="form-section">
          <SectionHeader icon={BadgeCheck} title="Certifications">
            <button className="btn-icon add" onClick={() => addListItem('certifications')} title="Add"><Plus size={14} /></button>
          </SectionHeader>
          {resume.certifications.map((c, idx) => (
            <div key={idx} className="form-row" style={{ marginBottom: 8 }}>
              <SuggestInput
                value={c}
                onChange={v => updateList('certifications', idx, v)}
                placeholder="AWS Solutions Architect, Google Cloud…"
                suggestions={CERTIFICATIONS}
              />
              {resume.certifications.length > 1 && (
                <button className="btn-icon" style={{ alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeListItem('certifications', idx)}><Trash2 size={13} /></button>
              )}
            </div>
          ))}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 8, paddingBottom: 40 }}>
          <button className="btn-primary" onClick={exportPDF} disabled={exporting} style={{ flex: 1, justifyContent: 'center' }}>
            <Download size={15} />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          {!showConfirmReset ? (
            <button className="btn-secondary" onClick={() => setShowConfirmReset(true)} title="Clear all fields">
              <RotateCcw size={14} />
            </button>
          ) : (
            <button className="btn-secondary" onClick={handleReset} style={{ color: '#ff6b78', borderColor: 'rgba(244,33,46,0.4)' }}>
              Confirm Reset
            </button>
          )}
        </div>
      </div>

      {/* ─ Preview ─ */}
      <div className="preview-panel">
        <div className="preview-label">
          <FileText size={13} />
          Live Preview
        </div>
        <div style={{
          transform: `scale(${previewScale})`,
          transformOrigin: 'top center',
          marginBottom: `calc(${previewScale * 1123}px - 1123px)`,
        }}>
          <ResumePreview resume={resume} id="builder-resume" />
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} icon={toast.icon} />}
    </div>
  );
}
