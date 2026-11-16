import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeStudentResumeDraft, missingResumeProfileFields } from '../lib/studentResumeDraft.ts';

const existingProfile = {
  name: 'Existing Name',
  year: '2nd Year',
  skills: 'Java',
  skillTags: 'Java',
  interests: 'Distributed systems',
  studentProjects: [{ title: 'Existing project', technologies: ['Java'] }],
  studentResumeDetails: {
    contactEmail: 'existing@example.org',
    phone: '',
    education: [],
    internships: [],
    workExperience: [],
    certifications: [],
    achievements: [],
    researchExperience: [],
  },
};

test('resume merge preserves existing data and adds extracted suggestions', () => {
  const result = mergeStudentResumeDraft(existingProfile, {
    name: 'Resume Name',
    academicYear: '3rd Year',
    technicalSkills: ['Python', 'Java'],
    skillTags: ['NLP'],
    researchInterests: ['Machine learning'],
    projects: [{ title: 'Resume project', technologies: ['Python'] }],
    email: 'resume@example.org',
  });

  assert.equal(result.profile.name, 'Existing Name');
  assert.equal(result.profile.year, '2nd Year');
  assert.equal(result.profile.skills, 'Java, Python');
  assert.deepEqual(result.profile.studentProjects, [
    { title: 'Existing project', technologies: ['Java'] },
    { title: 'Resume project', technologies: ['Python'] },
  ]);
  assert.equal(result.profile.studentResumeDetails.contactEmail, 'existing@example.org');
  assert.deepEqual(result.conflicts.map(({ field }) => field), ['name', 'year', 'contactEmail']);
});

test('missing resume fields stay missing instead of being invented', () => {
  const result = mergeStudentResumeDraft(existingProfile, {});

  assert.equal(result.profile.studentResumeDetails.phone, '');
  assert.deepEqual(result.profile.studentResumeDetails.education, []);
  assert.ok(missingResumeProfileFields(result.profile).includes('Phone'));
  assert.ok(missingResumeProfileFields(result.profile).includes('Education'));
});
