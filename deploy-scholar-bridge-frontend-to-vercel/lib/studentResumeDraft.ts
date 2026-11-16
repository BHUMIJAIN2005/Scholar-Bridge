import type {
  StudentEducationItem,
  StudentExperienceItem,
  StudentProjectItem,
  StudentResumeDetails,
} from '@/api/authApi';
import type { StudentResumeProfileDraft } from '@/api/profileApi';

export interface StudentResumeFormDetails extends StudentResumeDetails {
  contactEmail: string;
  phone: string;
  education: StudentEducationItem[];
  internships: StudentExperienceItem[];
  workExperience: StudentExperienceItem[];
  certifications: string[];
  achievements: string[];
  researchExperience: StudentExperienceItem[];
}

export interface StudentResumeEditableProfile {
  name: string;
  year: string;
  skills: string;
  skillTags: string;
  interests: string;
  studentProjects: StudentProjectItem[];
  studentResumeDetails: StudentResumeFormDetails;
}

export type ResumeConflictField = 'name' | 'year' | 'contactEmail' | 'phone';

export interface ResumeConflict {
  field: ResumeConflictField;
  current: string;
  extracted: string;
}

export interface ResumeMergeResult {
  profile: StudentResumeEditableProfile;
  conflicts: ResumeConflict[];
}

function splitCommaList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function mergeText(current: string, extracted: string[] | undefined): string {
  const existing = splitCommaList(current);
  const values = new Map(existing.map((item) => [item.toLocaleLowerCase(), item]));
  for (const item of extracted ?? []) {
    const value = item.trim();
    if (value && !values.has(value.toLocaleLowerCase())) values.set(value.toLocaleLowerCase(), value);
  }
  return [...values.values()].join(', ');
}

function mergeStringArray(existing: string[], extracted: string[] | undefined): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((item) => item.toLocaleLowerCase()));
  for (const item of extracted ?? []) {
    const value = item.trim();
    if (value && !seen.has(value.toLocaleLowerCase())) {
      result.push(value);
      seen.add(value.toLocaleLowerCase());
    }
  }
  return result;
}

function mergeRecords<T extends object>(existing: T[], extracted: T[] | undefined): T[] {
  const result = [...existing];
  const seen = new Set(existing.map((item) => JSON.stringify(item)));
  for (const item of extracted ?? []) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      result.push(item);
      seen.add(key);
    }
  }
  return result;
}

function preserveOrSuggest(
  field: ResumeConflictField,
  current: string,
  extracted: string | null | undefined,
  conflicts: ResumeConflict[],
): string {
  const suggestion = extracted?.trim() ?? '';
  if (!suggestion || suggestion === current.trim()) return current;
  if (current.trim()) {
    conflicts.push({ field, current, extracted: suggestion });
    return current;
  }
  return suggestion;
}

export function mergeStudentResumeDraft(
  current: StudentResumeEditableProfile,
  extracted: StudentResumeProfileDraft,
): ResumeMergeResult {
  const conflicts: ResumeConflict[] = [];
  const details = current.studentResumeDetails;
  const skillTags = mergeText(current.skillTags, extracted.skillTags);
  const extractedSkills = extracted.technicalSkills ?? [];
  const projects = mergeRecords(current.studentProjects, extracted.projects);

  return {
    profile: {
      ...current,
      name: preserveOrSuggest('name', current.name, extracted.name, conflicts),
      year: preserveOrSuggest('year', current.year, extracted.academicYear, conflicts),
      skills: mergeText(current.skills, extractedSkills),
      skillTags,
      interests: mergeText(current.interests, extracted.researchInterests),
      studentProjects: projects,
      studentResumeDetails: {
        ...details,
        contactEmail: preserveOrSuggest(
          'contactEmail',
          details.contactEmail,
          extracted.email,
          conflicts,
        ),
        phone: preserveOrSuggest('phone', details.phone, extracted.phone, conflicts),
        education: mergeRecords(details.education, extracted.education),
        internships: mergeRecords(details.internships, extracted.internships),
        workExperience: mergeRecords(details.workExperience, extracted.workExperience),
        certifications: mergeStringArray(details.certifications, extracted.certifications),
        achievements: mergeStringArray(details.achievements, extracted.achievements),
        researchExperience: mergeRecords(details.researchExperience, extracted.researchExperience),
      },
    },
    conflicts,
  };
}

export function missingResumeProfileFields(profile: StudentResumeEditableProfile): string[] {
  const missing: string[] = [];
  if (!profile.name.trim()) missing.push('Name');
  if (!profile.studentResumeDetails.contactEmail.trim()) missing.push('Contact email');
  if (!profile.studentResumeDetails.phone.trim()) missing.push('Phone');
  if (!profile.year.trim()) missing.push('Academic year');
  if (!profile.studentResumeDetails.education.length) missing.push('Education');
  if (!profile.skills.trim()) missing.push('Technical skills');
  if (!profile.studentProjects.length) missing.push('Projects');
  if (!profile.studentResumeDetails.internships.length && !profile.studentResumeDetails.workExperience.length) {
    missing.push('Internships or work experience');
  }
  if (!profile.studentResumeDetails.certifications.length) missing.push('Certifications');
  if (!profile.studentResumeDetails.achievements.length) missing.push('Achievements');
  if (!profile.interests.trim()) missing.push('Research interests');
  if (!profile.studentResumeDetails.researchExperience.length) missing.push('Research experience');
  return missing;
}
