import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_RESUME, generateId } from '../constants';
import SuggestInput from './SuggestInput';
import MonthYearInput from './MonthYearInput';
import {
  UNIVERSITIES, DEGREE_TYPES, FIELDS, LANGUAGES, FRAMEWORKS,
  TOOLS, DATABASES, TECH_STACKS, SKILL_CATEGORIES, CERTIFICATIONS
} from '../data/suggestions';
import {
  X, User, GraduationCap, FolderGit2, Wrench, Trophy,
  BadgeCheck, FileText, Plus, Trash2, AlertCircle
} from 'lucide-react';

// ─── Action verbs ─────────────────────────────────────────────────────────────
const ACTION_VERBS = [
  'built','developed','designed','implemented','created','architected','engineered',
  'deployed','automated','optimized','improved','reduced','increased','scaled',
  'led','managed','mentored','collaborated','contributed','integrated','migrated',
  'analyzed','researched','launched','shipped','refactored','wrote','published',
  'achieved','earned','won','ranked','solved','trained','fine-tuned','accelerated',
];
function isBulletGood(b) {
  if (!b.trim()) return true;
  const first = b.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'');
  return ACTION_VERBS.includes(first);
}

// ─── Reusable plain input ─────────────────────────────────────────────────────
function FInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input
        type={type}
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
}

const SECTION_TABS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'summary',  label: 'Summary',  icon: FileText },
  { id: 'education',label: 'Education',icon: GraduationCap },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'skills',   label: 'Skills',   icon: Wrench },
  { id: 'other',    label: 'Other',    icon: Trophy },
];

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export default function ResumeEditDrawer({ resume, onSave, onClose }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(resume)));
  const [activeSection, setActiveSection] = useState('personal');
  const ALL_SKILLS = [...LANGUAGES, ...FRAMEWORKS, ...TOOLS, ...DATABASES];

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Helpers ──
  const updatePersonal = (key, val) =>
    setDraft(p => ({ ...p, personalInfo: { ...p.personalInfo, [key]: val } }));

  const updateEdu = (idx, key, val) =>
    setDraft(p => ({ ...p, education: p.education.map((e, i) => i === idx ? { ...e, [key]: val } : e) }));
  const addEdu = () =>
    setDraft(p => ({ ...p, education: [...p.education, { id: generateId('edu'), school:'', degree:'', field:'', startDate:'', endDate:'', gpa:'', location:'' }] }));
  const removeEdu = idx =>
    setDraft(p => ({ ...p, education: p.education.filter((_, i) => i !== idx) }));

  const updateProject = (idx, key, val) =>
    setDraft(p => ({ ...p, projects: p.projects.map((pr, i) => i === idx ? { ...pr, [key]: val } : pr) }));
  const updateBullet = (pIdx, bIdx, val) =>
    setDraft(p => ({ ...p, projects: p.projects.map((pr, i) => i === pIdx ? { ...pr, bullets: pr.bullets.map((b, j) => j === bIdx ? val : b) } : pr) }));
  const addProject = () => {
    if (draft.projects.length >= 4) return;
    setDraft(p => ({ ...p, projects: [...p.projects, { id: generateId('proj'), title:'', techStack:'', githubLink:'', bullets:['','',''] }] }));
  };
  const removeProject = idx =>
    setDraft(p => ({ ...p, projects: p.projects.filter((_, i) => i !== idx) }));

  const updateSkill = (idx, key, val) =>
    setDraft(p => ({ ...p, skills: p.skills.map((s, i) => i === idx ? { ...s, [key]: val } : s) }));
  const addSkill = () =>
    setDraft(p => ({ ...p, skills: [...p.skills, { id: generateId('skill'), category:'', items:'' }] }));
  const removeSkill = idx =>
    setDraft(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));

  const updateList = (field, idx, val) =>
    setDraft(p => ({ ...p, [field]: p[field].map((a, i) => i === idx ? val : a) }));
  const addListItem = field =>
    setDraft(p => ({ ...p, [field]: [...p[field], ''] }));
  const removeListItem = (field, idx) =>
    setDraft(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  // ── Section content ──
  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SuggestInput label="Full Name" value={draft.personalInfo.name} onChange={v => updatePersonal('name', v)} placeholder="Jane Smith" suggestions={[]} />
            <div className="form-row">
              <FInput label="Email" value={draft.personalInfo.email} onChange={v => updatePersonal('email', v)} placeholder="jane@email.com" type="email" />
              <FInput label="Phone" value={draft.personalInfo.phone} onChange={v => updatePersonal('phone', v)} placeholder="+1 234 567 8900" />
            </div>
            <FInput label="Location" value={draft.personalInfo.location} onChange={v => updatePersonal('location', v)} placeholder="City, State / Country" />
            <div className="form-row">
              <FInput label="LinkedIn" value={draft.personalInfo.linkedin} onChange={v => updatePersonal('linkedin', v)} placeholder="linkedin.com/in/jane" />
              <FInput label="GitHub" value={draft.personalInfo.github} onChange={v => updatePersonal('github', v)} placeholder="github.com/jane" />
            </div>
            <FInput label="Portfolio (optional)" value={draft.personalInfo.portfolio} onChange={v => updatePersonal('portfolio', v)} placeholder="jane.dev" />
          </div>
        );

      case 'summary':
        return (
          <div className="form-group">
            <label className="form-label">Professional Summary</label>
            <textarea
              className="form-textarea"
              value={draft.summary}
              onChange={e => setDraft(p => ({ ...p, summary: e.target.value }))}
              placeholder="Passionate CS student with experience in full-stack development..."
              rows={6}
              spellCheck
              style={{ minHeight: 140 }}
            />
            <span className={`char-count ${draft.summary.length > 500 ? 'over' : draft.summary.length > 380 ? 'warn' : ''}`}>
              {draft.summary.length} / 450 chars recommended
            </span>
          </div>
        );

      case 'education':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {draft.education.map((edu, idx) => (
              <div key={edu.id} className="item-card">
                <div className="item-card-header">
                  <span className="item-card-label">Education {idx + 1}</span>
                  {draft.education.length > 1 && (
                    <button className="btn-icon" onClick={() => removeEdu(idx)}><Trash2 size={13} /></button>
                  )}
                </div>
                <SuggestInput label="University / School" value={edu.school} onChange={v => updateEdu(idx,'school',v)} placeholder="MIT" suggestions={UNIVERSITIES} />
                <div className="form-row" style={{ marginTop: 8 }}>
                  <SuggestInput label="Degree" value={edu.degree} onChange={v => updateEdu(idx,'degree',v)} placeholder="B.Tech" suggestions={DEGREE_TYPES} />
                  <SuggestInput label="Field of Study" value={edu.field} onChange={v => updateEdu(idx,'field',v)} placeholder="Computer Science" suggestions={FIELDS} />
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <MonthYearInput label="Start" value={edu.startDate} onChange={v => updateEdu(idx,'startDate',v)} />
                  <MonthYearInput label="End / Expected" value={edu.endDate} onChange={v => updateEdu(idx,'endDate',v)} />
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <FInput label="GPA (optional)" value={edu.gpa} onChange={v => updateEdu(idx,'gpa',v)} placeholder="3.8/4.0" />
                  <FInput label="Location" value={edu.location} onChange={v => updateEdu(idx,'location',v)} placeholder="Cambridge, MA" />
                </div>
              </div>
            ))}
            <button className="btn-add-row" onClick={addEdu}><Plus size={14} /> Add Education</button>
          </div>
        );

      case 'projects':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {draft.projects.map((proj, pIdx) => (
              <div key={proj.id} className="item-card">
                <div className="item-card-header">
                  <span className="item-card-label">Project {pIdx + 1}</span>
                  {draft.projects.length > 1 && (
                    <button className="btn-icon" onClick={() => removeProject(pIdx)}><Trash2 size={13} /></button>
                  )}
                </div>
                <FInput label="Project Title" value={proj.title} onChange={v => updateProject(pIdx,'title',v)} placeholder="E-Commerce Platform" />
                <div className="form-row" style={{ marginTop: 8 }}>
                  <SuggestInput label="Tech Stack" value={proj.techStack} onChange={v => updateProject(pIdx,'techStack',v)} placeholder="React, Node.js, MongoDB" suggestions={TECH_STACKS} />
                  <FInput label="GitHub Link" value={proj.githubLink} onChange={v => updateProject(pIdx,'githubLink',v)} placeholder="github.com/..." />
                </div>
                <label className="form-label" style={{ marginTop: 8, display: 'block' }}>Bullet Points (up to 3)</label>
                {proj.bullets.map((b, bIdx) => (
                  <div key={bIdx} style={{ marginTop: 6 }}>
                    <SuggestInput
                      value={b}
                      onChange={v => updateBullet(pIdx, bIdx, v)}
                      placeholder={`Bullet ${bIdx + 1}: Start with an action verb...`}
                      suggestions={[]}
                    />
                    {b.trim() && !isBulletGood(b) && (
                      <div className="bullet-tip"><AlertCircle size={10} /> Start with an action verb (Built, Developed, Reduced…)</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {draft.projects.length < 4 && (
              <button className="btn-add-row" onClick={addProject}><Plus size={14} /> Add Project</button>
            )}
          </div>
        );

      case 'skills':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {draft.skills.map((skill, idx) => (
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
            <button className="btn-add-row" onClick={addSkill}><Plus size={14} /> Add Skill Category</button>
          </div>
        );

      case 'other':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Achievements */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Achievements</span>
                <button className="btn-icon add" onClick={() => addListItem('achievements')}><Plus size={14} /></button>
              </div>
              {draft.achievements.map((a, idx) => (
                <div key={idx} className="form-row" style={{ marginBottom: 6 }}>
                  <FInput value={a} onChange={v => updateList('achievements', idx, v)} placeholder="Dean's List, Hackathon Winner…" />
                  {draft.achievements.length > 1 && (
                    <button className="btn-icon" style={{ alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeListItem('achievements', idx)}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            {/* Certifications */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Certifications</span>
                <button className="btn-icon add" onClick={() => addListItem('certifications')}><Plus size={14} /></button>
              </div>
              {draft.certifications.map((c, idx) => (
                <div key={idx} className="form-row" style={{ marginBottom: 6 }}>
                  <SuggestInput value={c} onChange={v => updateList('certifications', idx, v)} placeholder="AWS Solutions Architect, Google Cloud…" suggestions={CERTIFICATIONS} />
                  {draft.certifications.length > 1 && (
                    <button className="btn-icon" style={{ alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeListItem('certifications', idx)}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <span className="drawer-title">✏️ Edit Resume</span>
          <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="drawer-section-tabs">
          {SECTION_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`drawer-tab ${activeSection === tab.id ? 'active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="drawer-body">
          {renderSection()}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn-primary" onClick={handleSave} style={{ flex: 1, justifyContent: 'center' }}>
            Save Changes
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
