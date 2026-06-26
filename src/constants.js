// Default empty resume data
export const DEFAULT_RESUME = {
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  summary: '',
  education: [
    {
      id: 'edu-1',
      school: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      location: '',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: '',
      techStack: '',
      githubLink: '',
      bullets: ['', '', ''],
    },
  ],
  skills: [
    { id: 'skill-1', category: 'Languages', items: '' },
    { id: 'skill-2', category: 'Frameworks', items: '' },
    { id: 'skill-3', category: 'Tools', items: '' },
    { id: 'skill-4', category: 'Databases', items: '' },
  ],
  achievements: [''],
  certifications: [''],
};

export function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
