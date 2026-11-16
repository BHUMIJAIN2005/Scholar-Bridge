'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { profileApi } from '@/api/profileApi';
import { publicationsApi } from '@/api/publicationsApi';
import type { Publication, PublicationRequest } from '@/api/publicationsApi';
import type {
  EducationItem,
  FacultyProjectItem,
  StudentEducationItem,
  StudentExperienceItem,
  StudentProjectItem,
  User,
} from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Avatar } from '@/components/Avatar';
import type { StudentResumeAnalysisResponse } from '@/api/profileApi';
import {
  mergeStudentResumeDraft,
  missingResumeProfileFields,
  type ResumeConflict,
  type StudentResumeFormDetails,
} from '@/lib/studentResumeDraft';

interface ProfileDraft {
  name: string;
  photoUrl: string;
  department: string;
  designation: string;
  qualifications: string;
  bio: string;
  researchDomains: string;
  researchInterests: string;
  officeRoom: string;
  officeHours: string;
  scholarUrl: string;
  orcidUrl: string;
  researchGateUrl: string;
  facultyLinkedinUrl: string;
  websiteUrl: string;
  citationsCount: string;
  hIndex: string;
  i10Index: string;
  statsAsOf: string;
  acceptingStudents: boolean;
  education: EducationItem[];
  awards: string;
  facultyProjects: FacultyProjectItem[];
  year: string;
  skills: string;
  skillTags: string;
  interests: string;
  studentProjects: StudentProjectItem[];
  studentResumeDetails: StudentResumeFormDetails;
  githubUrl: string;
  linkedinUrl: string;
  visibility: 'ALL_USERS' | 'APPLIED_FACULTY_ONLY';
}

const emptyDraft: ProfileDraft = {
  name: '', photoUrl: '', department: '', designation: '', qualifications: '', bio: '',
  researchDomains: '', researchInterests: '', officeRoom: '', officeHours: '', scholarUrl: '',
  orcidUrl: '', researchGateUrl: '', facultyLinkedinUrl: '', websiteUrl: '', citationsCount: '',
  hIndex: '', i10Index: '', statsAsOf: '', acceptingStudents: false, education: [], awards: '',
  facultyProjects: [], year: '', skills: '', skillTags: '', interests: '', studentProjects: [],
  studentResumeDetails: {
    contactEmail: '', phone: '', education: [], internships: [], workExperience: [],
    certifications: [], achievements: [], researchExperience: [],
  },
  githubUrl: '', linkedinUrl: '', visibility: 'ALL_USERS',
};

interface PublicationDraft {
  title: string;
  authors: string;
  venue: string;
  year: string;
  doi: string;
  url: string;
}

const emptyPublicationDraft: PublicationDraft = {
  title: '', authors: '', venue: '', year: '', doi: '', url: '',
};

const listText = (values?: string[] | null) => values?.join(', ') ?? '';
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const optional = (value: string) => value.trim() || undefined;
const optionalNumber = (value: string) => value.trim() ? Number(value) : undefined;
const text = (value?: string | number | null) => value == null ? '' : String(value);

function missingProfileItems(draft: ProfileDraft, isFaculty: boolean) {
  const missing: string[] = [];
  if (!draft.name.trim()) missing.push('Add your name');
  if (!draft.photoUrl) missing.push('Upload a profile photo');
  if (isFaculty) {
    if (!draft.designation.trim()) missing.push('Add your designation');
    if (!draft.bio.trim()) missing.push('Write a short biography');
    if (!draft.researchInterests.trim()) missing.push('Add research interests');
  } else {
    if (!draft.year.trim()) missing.push('Add your year or program');
    if (!draft.skills.trim()) missing.push('Add your skills');
    if (!draft.interests.trim()) missing.push('Add your interests');
  }
  return missing.slice(0, 4);
}

function draftFromUser(user: User): ProfileDraft {
  return {
    ...emptyDraft,
    name: user.name ?? '',
    photoUrl: user.photoUrl ?? '',
    department: user.department ?? '',
    designation: user.designation ?? '',
    qualifications: user.qualifications ?? '',
    bio: user.bio ?? '',
    researchDomains: user.researchDomains ?? '',
    researchInterests: listText(user.researchInterests),
    officeRoom: user.officeRoom ?? '',
    officeHours: user.officeHours ?? '',
    scholarUrl: user.scholarUrl ?? '',
    orcidUrl: user.orcidUrl ?? '',
    researchGateUrl: user.researchGateUrl ?? '',
    facultyLinkedinUrl: user.facultyLinkedinUrl ?? '',
    websiteUrl: user.websiteUrl ?? '',
    citationsCount: text(user.citationsCount),
    hIndex: text(user.hIndex),
    i10Index: text(user.i10Index),
    statsAsOf: user.statsAsOf ?? '',
    acceptingStudents: user.acceptingStudents ?? false,
    education: user.education?.length ? user.education : [],
    awards: listText(user.awards),
    facultyProjects: user.facultyProjects?.length ? user.facultyProjects : [],
    year: user.year ?? '',
    skills: user.skills ?? '',
    skillTags: listText(user.skillTags),
    interests: listText(user.interests),
    studentProjects: user.studentProjects?.length ? user.studentProjects : [],
    studentResumeDetails: {
      contactEmail: user.studentResumeDetails?.contactEmail ?? '',
      phone: user.studentResumeDetails?.phone ?? '',
      education: user.studentResumeDetails?.education ?? [],
      internships: user.studentResumeDetails?.internships ?? [],
      workExperience: user.studentResumeDetails?.workExperience ?? [],
      certifications: user.studentResumeDetails?.certifications ?? [],
      achievements: user.studentResumeDetails?.achievements ?? [],
      researchExperience: user.studentResumeDetails?.researchExperience ?? [],
    },
    githubUrl: user.githubUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    visibility: user.visibility ?? 'ALL_USERS',
  };
}

function ProfileEditForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [completeness, setCompleteness] = useState<number | undefined>(user?.profileCompleteness);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [recommendationSyncWarning, setRecommendationSyncWarning] = useState('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [publicationDraft, setPublicationDraft] = useState<PublicationDraft>(emptyPublicationDraft);
  const [editingPublicationId, setEditingPublicationId] = useState<number | null>(null);
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [publicationDeletingId, setPublicationDeletingId] = useState<number | null>(null);
  const [publicationError, setPublicationError] = useState('');
  const [publicationNotice, setPublicationNotice] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeNotice, setResumeNotice] = useState('');
  const [resumeWarnings, setResumeWarnings] = useState<string[]>([]);
  const [resumeConflicts, setResumeConflicts] = useState<ResumeConflict[]>([]);
  const [resumeExtraction, setResumeExtraction] = useState<StudentResumeAnalysisResponse['extractionMetadata'] | null>(null);
  const isFaculty = user?.role === 'FACULTY';

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  useEffect(() => {
    let active = true;
    profileApi.getMyProfile()
      .then(async (profile) => {
        if (!active) return;
        setDraft(draftFromUser(profile));
        setCompleteness(profile.profileCompleteness);
        if (profile.role === 'FACULTY') {
          try {
            setPublications(await publicationsApi.getMine());
          } catch (err) {
            const response = (err as { response?: { data?: { message?: string } } }).response;
            if (active) setPublicationError(response?.data?.message ?? 'Could not load your publications. Please try again.');
          }
        }
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (active) setError(err.response?.data?.message ?? 'Could not load your profile. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const setField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setRecommendationSyncWarning('');
  };

  const updateRow = <T, K extends keyof T>(
    key: 'education' | 'facultyProjects' | 'studentProjects',
    rows: T[],
    index: number,
    field: K,
    value: T[K],
  ) => {
    const updated = rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    setField(key, updated as ProfileDraft[typeof key]);
  };

  const updateStudentEducation = (index: number, field: keyof StudentEducationItem, value: string) => {
    const education = draft.studentResumeDetails.education.map((item, rowIndex) =>
      rowIndex === index ? { ...item, [field]: value } : item);
    setField('studentResumeDetails', { ...draft.studentResumeDetails, education });
  };

  const updateStudentExperience = (
    key: 'internships' | 'workExperience' | 'researchExperience',
    index: number,
    field: keyof StudentExperienceItem,
    value: string | string[],
  ) => {
    const rows = draft.studentResumeDetails[key].map((item, rowIndex) =>
      rowIndex === index ? { ...item, [field]: value } : item);
    setField('studentResumeDetails', { ...draft.studentResumeDetails, [key]: rows });
  };

  const selectResume = (file: File | undefined) => {
    setResumeError('');
    setResumeNotice('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setResumeFile(null);
      setResumeError('Choose a PDF resume.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setResumeFile(null);
      setResumeError('Resume PDFs must be 20 MB or smaller.');
      return;
    }
    setResumeFile(file);
  };

  const analyzeResume = async () => {
    if (!resumeFile) return;
    setResumeBusy(true);
    setResumeError('');
    setResumeNotice('');
    setResumeConflicts([]);
    setResumeWarnings([]);
    setSaved(false);
    setRecommendationSyncWarning('');
    try {
      const result = await profileApi.analyzeResume(resumeFile);
      const merged = mergeStudentResumeDraft(draftRef.current, result.profile);
      setDraft((current) => ({ ...current, ...merged.profile }));
      setResumeConflicts(merged.conflicts);
      setResumeWarnings([...new Set([...(result.warnings ?? []), ...(result.extractionMetadata.warnings ?? [])])]);
      setResumeExtraction(result.extractionMetadata);
      setResumeNotice('Resume analyzed. Review and edit the draft below; it has not been saved.');
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string; detail?: string } } }).response;
      setResumeError(response?.data?.message ?? response?.data?.detail ?? 'Could not analyze your resume. Please try again.');
    } finally {
      setResumeBusy(false);
    }
  };

  const useResumeSuggestion = (field: ResumeConflict['field'], value: string) => {
    if (field === 'name' || field === 'year') {
      setField(field, value);
    } else {
      setField('studentResumeDetails', { ...draft.studentResumeDetails, [field]: value });
    }
    setResumeConflicts((current) => current.filter((conflict) => conflict.field !== field));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFaculty && draft.studentResumeDetails.contactEmail.trim()
      && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.studentResumeDetails.contactEmail.trim())) {
      setError('Enter a valid contact email or clear the field.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    setRecommendationSyncWarning('');
    try {
      const profile = await profileApi.updateMyProfile({
        name: optional(draft.name),
        ...(isFaculty ? {
          department: optional(draft.department),
          designation: optional(draft.designation),
          qualifications: optional(draft.qualifications),
          bio: optional(draft.bio),
          researchDomains: optional(draft.researchDomains),
          researchInterests: splitList(draft.researchInterests),
          officeRoom: optional(draft.officeRoom),
          officeHours: optional(draft.officeHours),
          scholarUrl: optional(draft.scholarUrl),
          orcidUrl: optional(draft.orcidUrl),
          researchGateUrl: optional(draft.researchGateUrl),
          linkedinUrl: optional(draft.facultyLinkedinUrl),
          websiteUrl: optional(draft.websiteUrl),
          citationsCount: optionalNumber(draft.citationsCount),
          hIndex: optionalNumber(draft.hIndex),
          i10Index: optionalNumber(draft.i10Index),
          statsAsOf: optional(draft.statsAsOf),
          acceptingStudents: draft.acceptingStudents,
          education: draft.education,
          awards: splitList(draft.awards),
          facultyProjects: draft.facultyProjects,
        } : {
          year: optional(draft.year),
          skills: optional(draft.skills),
          skillTags: splitList(draft.skillTags),
          interests: splitList(draft.interests),
          studentProjects: draft.studentProjects,
          studentResumeDetails: {
            ...draft.studentResumeDetails,
            contactEmail: draft.studentResumeDetails.contactEmail,
            phone: draft.studentResumeDetails.phone,
          },
          githubUrl: optional(draft.githubUrl),
          linkedinUrl: optional(draft.linkedinUrl),
          visibility: draft.visibility,
        }),
      });
      setDraft(draftFromUser(profile));
      setCompleteness(profile.profileCompleteness);
      setRecommendationSyncWarning(profile.recommendationSyncWarning ?? '');
      await refreshUser();
      setSaved(true);
      setResumeNotice('');
      setResumeConflicts([]);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectPhoto = (file: File | undefined) => {
    setPhotoError('');
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSelectedPhoto(null);
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSelectedPhoto(null);
      setPhotoError('Profile photos must be 2 MB or smaller.');
      return;
    }
    setSelectedPhoto(file);
  };

  const uploadPhoto = async () => {
    if (!selectedPhoto) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const profile = await profileApi.uploadPhoto(selectedPhoto);
      setDraft(draftFromUser(profile));
      setSelectedPhoto(null);
      await refreshUser();
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setPhotoError(response?.data?.message ?? 'Could not upload your profile photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const profile = await profileApi.removePhoto();
      setDraft(draftFromUser(profile));
      setDraft((current) => ({ ...current, photoUrl: '' }));
      setSelectedPhoto(null);
      await refreshUser();
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setPhotoError(response?.data?.message ?? 'Could not remove your profile photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const editPublication = (publication: Publication) => {
    setEditingPublicationId(publication.id);
    setPublicationDraft({
      title: publication.title,
      authors: publication.authors,
      venue: publication.venue ?? '',
      year: publication.year == null ? '' : String(publication.year),
      doi: publication.doi ?? '',
      url: publication.url ?? '',
    });
    setPublicationError('');
    setPublicationNotice('');
  };

  const resetPublicationDraft = () => {
    setEditingPublicationId(null);
    setPublicationDraft(emptyPublicationDraft);
    setPublicationError('');
    setPublicationNotice('');
  };

  const savePublication = async () => {
    const title = publicationDraft.title.trim();
    const authors = publicationDraft.authors.trim();
    if (!title || !authors) {
      setPublicationError('Enter both a publication title and authors.');
      setPublicationNotice('');
      return;
    }
    if (publicationDraft.year.trim() && (!Number.isInteger(Number(publicationDraft.year)) || Number(publicationDraft.year) < 0)) {
      setPublicationError('Enter a valid non-negative whole-number year.');
      setPublicationNotice('');
      return;
    }

    const request: PublicationRequest = {
      title,
      authors,
      venue: optional(publicationDraft.venue),
      year: optionalNumber(publicationDraft.year),
      doi: optional(publicationDraft.doi),
      url: optional(publicationDraft.url),
    };

    setPublicationLoading(true);
    setPublicationError('');
    setPublicationNotice('');
    try {
      const savedPublication = editingPublicationId == null
        ? await publicationsApi.create(request)
        : await publicationsApi.update(editingPublicationId, request);
      setPublications((current) => [
        savedPublication,
        ...current.filter((publication) => publication.id !== savedPublication.id),
      ].sort((first, second) => (second.year ?? -1) - (first.year ?? -1) || second.id - first.id));
      resetPublicationDraft();
      setPublicationNotice(editingPublicationId == null ? 'Publication added.' : 'Publication updated.');
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setPublicationError(response?.data?.message ?? 'Could not save this publication. Please try again.');
    } finally {
      setPublicationLoading(false);
    }
  };

  const deletePublication = async (publication: Publication) => {
    if (!window.confirm(`Delete "${publication.title}" from your publications?`)) return;
    setPublicationDeletingId(publication.id);
    setPublicationError('');
    setPublicationNotice('');
    try {
      await publicationsApi.delete(publication.id);
      setPublications((current) => current.filter((item) => item.id !== publication.id));
      if (editingPublicationId === publication.id) resetPublicationDraft();
      setPublicationNotice('Publication deleted.');
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setPublicationError(response?.data?.message ?? 'Could not delete this publication. Please try again.');
    } finally {
      setPublicationDeletingId(null);
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-sage/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-leaf focus:ring-3 focus:ring-leaf/40';
  const labelClass = 'block text-sm font-medium text-ink';
  const input = (label: string, key: keyof ProfileDraft, options: { type?: string; max?: number } = {}) => (
    <label className={labelClass} key={key}>
      {label}
      <input
        className={inputClass}
        type={options.type ?? 'text'}
        maxLength={options.max}
        min={options.type === 'number' ? 0 : undefined}
        value={draft[key] as string}
        onChange={(event) => setField(key, event.target.value as ProfileDraft[typeof key])}
      />
    </label>
  );
  const textarea = (label: string, key: keyof ProfileDraft, rows = 4) => (
    <label className={`${labelClass} sm:col-span-2`} key={key}>
      {label}
      <textarea className={inputClass} rows={rows} value={draft[key] as string} onChange={(event) => setField(key, event.target.value as ProfileDraft[typeof key])} />
    </label>
  );
  const section = (title: string, children: ReactNode) => (
    <section className="solid-card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
  const experienceSection = (
    title: string,
    key: 'internships' | 'workExperience' | 'researchExperience',
    includeTitle = false,
  ) => {
    const records = draft.studentResumeDetails[key];
    return section(title, <>
      {records.map((item, index) => <div key={`${key}-${index}`} className="grid gap-3 rounded-lg border border-sage/20 bg-mist p-3 sm:grid-cols-2">
        {includeTitle && <label className={labelClass}>Title
          <input className={inputClass} value={item.title ?? ''} onChange={(event) => updateStudentExperience(key, index, 'title', event.target.value)} />
        </label>}
        <label className={labelClass}>Role
          <input className={inputClass} value={item.role ?? ''} onChange={(event) => updateStudentExperience(key, index, 'role', event.target.value)} />
        </label>
        <label className={labelClass}>Organization
          <input className={inputClass} value={item.organization ?? ''} onChange={(event) => updateStudentExperience(key, index, 'organization', event.target.value)} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Description
          <textarea className={inputClass} rows={2} value={item.description ?? ''} onChange={(event) => updateStudentExperience(key, index, 'description', event.target.value)} />
        </label>
        <label className={labelClass}>Technologies (comma-separated)
          <input className={inputClass} value={listText(item.technologies)} onChange={(event) => updateStudentExperience(key, index, 'technologies', splitList(event.target.value))} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>Start date
            <input className={inputClass} value={item.startDate ?? ''} onChange={(event) => updateStudentExperience(key, index, 'startDate', event.target.value)} />
          </label>
          <label className={labelClass}>End date
            <input className={inputClass} value={item.endDate ?? ''} onChange={(event) => updateStudentExperience(key, index, 'endDate', event.target.value)} />
          </label>
        </div>
        <button type="button" onClick={() => setField('studentResumeDetails', {
          ...draft.studentResumeDetails,
          [key]: records.filter((_, rowIndex) => rowIndex !== index),
        })} aria-label={`Remove ${title.toLowerCase()} entry`} className="justify-self-start p-2 text-rose-600 hover:text-rose-800">
          <Trash2 size={17} /> Remove
        </button>
      </div>)}
      <button type="button" onClick={() => setField('studentResumeDetails', {
        ...draft.studentResumeDetails,
        [key]: [...records, {}],
      })} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green">
        <Plus size={16} />Add {title.toLowerCase().replace(/s$/, '')}
      </button>
    </>);
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-ink/70"><Loader2 size={18} className="animate-spin text-forest" />Loading profile...</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-forest">My Profile</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Edit your profile</h1>
        <p className="mt-1 text-sm text-ink/70">Share your experience and interests with the ScholarBridge community.</p>
      </header>

      <section className="solid-card p-5 sm:p-6" aria-label="Profile completeness">
        <div className="grid gap-5 md:grid-cols-[1fr_240px] md:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-ink">Profile completeness</h2>
              <span className="text-sm font-bold text-forest">{completeness ?? 0}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${Math.min(100, Math.max(0, completeness ?? 0))}%` }} />
            </div>
          </div>
          <div className="border-t border-sage/20 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Next steps</h3>
            {missingProfileItems(draft, isFaculty).length ? <ul className="mt-2 space-y-1 text-sm text-ink/80">{missingProfileItems(draft, isFaculty).map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{item}</li>)}</ul> : <p className="mt-2 text-sm font-semibold text-forest">Your profile has all key details.</p>}
          </div>
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {saved && <div role="status" className="flex items-center gap-2 rounded-lg border border-leaf/40 bg-mint/50 px-4 py-3 text-sm font-semibold text-forest"><CheckCircle2 size={17} />{isFaculty ? 'Profile saved successfully.' : 'Profile confirmed and saved successfully.'}</div>}
      {recommendationSyncWarning && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Your profile was saved, but recommendations could not be updated: {recommendationSyncWarning}</div>}

      {!isFaculty && section('Generate a profile from your resume', <>
        <p className="text-sm text-ink/70">Upload a PDF to create an editable draft. Nothing is saved until you confirm below.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`${labelClass} flex-1`}>Resume PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => selectResume(event.target.files?.[0])}
              className="mt-1 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:font-semibold file:text-forest hover:file:bg-mint/70"
            />
          </label>
          <button type="button" disabled={!resumeFile || resumeBusy} onClick={() => void analyzeResume()} className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {resumeBusy && <Loader2 size={15} className="animate-spin" />}
            {resumeBusy ? 'Analyzing resume...' : 'Analyze resume'}
          </button>
        </div>
        <p className="text-xs text-ink/60">PDF only, up to 20 MB. Existing profile details are preserved; conflicting resume values require your choice.</p>
        {resumeError && <p role="alert" className="text-sm text-rose-700">{resumeError}</p>}
        {resumeNotice && <p role="status" className="text-sm font-semibold text-forest">{resumeNotice}</p>}
        {resumeExtraction && <p className="text-xs text-ink/60">Extracted {resumeExtraction.extractedCharCount} characters using {resumeExtraction.extractionMethod}.</p>}
        {resumeWarnings.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">{resumeWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>}
        {resumeExtraction && missingResumeProfileFields(draft).length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Not found in the saved profile or resume draft:</p>
          <p className="mt-1">{missingResumeProfileFields(draft).join(', ')}</p>
        </div>}
        {resumeConflicts.length > 0 && <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <p className="font-semibold">These existing values were preserved. Choose a resume suggestion only if you want to replace one.</p>
          {resumeConflicts.map((conflict) => <div key={conflict.field} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p><span className="font-semibold">{conflict.field === 'contactEmail' ? 'Contact email' : conflict.field === 'year' ? 'Academic year' : conflict.field}:</span> current “{conflict.current}”; resume “{conflict.extracted}”</p>
            <button type="button" onClick={() => useResumeSuggestion(conflict.field, conflict.extracted)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs font-semibold">Use resume value</button>
          </div>)}
        </div>}
      </>)}

      <form onSubmit={handleSubmit} className="space-y-5">
        {section('Basic information', <div className="grid gap-4 sm:grid-cols-2">{input('Name', 'name', { max: 120 })}</div>)}

        {section('Profile photo', <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={draft.name || 'Profile'} photoUrl={photoPreviewUrl || draft.photoUrl} className="h-24 w-24" textClassName="text-3xl" />
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Choose a photo
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0])} className="mt-1 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:font-semibold file:text-forest hover:file:bg-mint/70" />
              </label>
              <p className="mt-1 text-xs text-ink/60">JPEG, PNG, or WebP up to 2 MB.</p>
            </div>
            {photoError && <p role="alert" className="text-sm text-rose-700">{photoError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!selectedPhoto || photoBusy} onClick={() => void uploadPhoto()} className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{photoBusy ? 'Uploading...' : 'Upload'}</button>
              <button type="button" disabled={(!draft.photoUrl && !selectedPhoto) || photoBusy} onClick={() => void removePhoto()} className="btn-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50">{photoBusy ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>)}

        {isFaculty ? (
          <>
            {section('Faculty details', <div className="grid gap-4 sm:grid-cols-2">
              {input('Department', 'department', { max: 160 })}{input('Designation', 'designation', { max: 160 })}
              {input('Qualifications', 'qualifications', { max: 2000 })}{input('Office room', 'officeRoom', { max: 120 })}
              {input('Office hours', 'officeHours', { max: 160 })}{input('Research domains', 'researchDomains', { max: 1000 })}
              {textarea('Biography', 'bio')}
              <label className={`${labelClass} sm:col-span-2`}>Research interests (comma-separated)
                <input className={inputClass} value={draft.researchInterests} onChange={(event) => setField('researchInterests', event.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink sm:col-span-2">
                <input type="checkbox" checked={draft.acceptingStudents} onChange={(event) => setField('acceptingStudents', event.target.checked)} className="h-4 w-4 rounded border-sage/40 text-forest focus:ring-leaf/40" />
                Accepting student researchers
              </label>
            </div>)}
            {section('Research links and metrics', <div className="grid gap-4 sm:grid-cols-2">
              {input('Google Scholar URL', 'scholarUrl', { type: 'url', max: 500 })}{input('ORCID URL', 'orcidUrl', { type: 'url', max: 500 })}
              {input('ResearchGate URL', 'researchGateUrl', { type: 'url', max: 500 })}{input('LinkedIn URL', 'facultyLinkedinUrl', { type: 'url', max: 500 })}
              {input('Website URL', 'websiteUrl', { type: 'url', max: 500 })}{input('Statistics as of', 'statsAsOf', { type: 'date' })}
              {input('Citations', 'citationsCount', { type: 'number' })}{input('h-index', 'hIndex', { type: 'number' })}{input('i10-index', 'i10Index', { type: 'number' })}
            </div>)}
            {section('Education', <>
              {draft.education.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-mist p-3 border border-sage/20 sm:grid-cols-[1fr_1fr_120px_auto]">
                <input aria-label="Degree" placeholder="Degree" className={inputClass} value={item.degree ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'degree', event.target.value)} />
                <input aria-label="Institution" placeholder="Institution" className={inputClass} value={item.institution ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'institution', event.target.value)} />
                <input aria-label="Year" placeholder="Year" className={inputClass} value={item.year ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'year', event.target.value)} />
                <button type="button" onClick={() => setField('education', draft.education.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove education" className="justify-self-end p-2 text-rose-600 hover:text-rose-800"><Trash2 size={17} /></button>
              </div>)}
              <button type="button" onClick={() => setField('education', [...draft.education, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green"><Plus size={16} />Add education</button>
            </>)}
            {section('Awards and projects', <>
              <label className={labelClass}>Awards (comma-separated)<input className={inputClass} value={draft.awards} onChange={(event) => setField('awards', event.target.value)} /></label>
              {draft.facultyProjects.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-mist p-3 border border-sage/20 sm:grid-cols-2">
                <input aria-label="Project title" placeholder="Project title" className={inputClass} value={item.title ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'title', event.target.value)} />
                <input aria-label="Funding agency" placeholder="Funding agency" className={inputClass} value={item.fundingAgency ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'fundingAgency', event.target.value)} />
                <input aria-label="Years" placeholder="Years" className={inputClass} value={item.years ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'years', event.target.value)} />
                <div className="flex gap-2"><input aria-label="Role" placeholder="Role" className={inputClass} value={item.role ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'role', event.target.value)} /><button type="button" onClick={() => setField('facultyProjects', draft.facultyProjects.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove project" className="p-2 text-rose-600 hover:text-rose-800"><Trash2 size={17} /></button></div>
              </div>)}
              <button type="button" onClick={() => setField('facultyProjects', [...draft.facultyProjects, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green"><Plus size={16} />Add project</button>
            </>)}
            {section('Publications', <>
              <p className="text-sm text-ink/70">Manage the publications shown on your faculty profile.</p>
              {publicationError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{publicationError}</p>}
              {publicationNotice && <p role="status" className="rounded-lg border border-leaf/40 bg-mint/50 px-3 py-2 text-sm font-semibold text-forest">{publicationNotice}</p>}
              {publications.length ? <ul className="divide-y divide-forest/10 rounded-lg border border-sage/30">
                {publications.map((publication) => <li key={publication.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{publication.title}</p>
                    <p className="mt-1 text-sm text-ink/70">{publication.authors}{publication.venue && ` · ${publication.venue}`}{publication.year != null && ` · ${publication.year}`}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editPublication(publication)} className="btn-secondary px-3 py-1.5 text-xs font-semibold">Edit</button>
                    <button type="button" disabled={publicationDeletingId === publication.id} onClick={() => void deletePublication(publication)} className="inline-flex items-center gap-1 rounded-[12px] border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition">{publicationDeletingId === publication.id ? 'Deleting...' : 'Delete'}</button>
                  </div>
                </li>)}
              </ul> : <p className="rounded-lg bg-mist p-4 text-sm text-ink/60 border border-sage/20">No publications added yet.</p>}

              <div className="grid gap-4 rounded-lg bg-mist p-4 border border-sage/20 sm:grid-cols-2">
                <label className={labelClass}>Title *
                  <input aria-required="true" maxLength={300} className={inputClass} value={publicationDraft.title} onChange={(event) => setPublicationDraft((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label className={labelClass}>Authors *
                  <input aria-required="true" maxLength={2000} className={inputClass} value={publicationDraft.authors} onChange={(event) => setPublicationDraft((current) => ({ ...current, authors: event.target.value }))} />
                </label>
                <label className={labelClass}>Venue
                  <input maxLength={300} className={inputClass} value={publicationDraft.venue} onChange={(event) => setPublicationDraft((current) => ({ ...current, venue: event.target.value }))} />
                </label>
                <label className={labelClass}>Year
                  <input type="number" min={0} step={1} className={inputClass} value={publicationDraft.year} onChange={(event) => setPublicationDraft((current) => ({ ...current, year: event.target.value }))} />
                </label>
                <label className={labelClass}>DOI
                  <input maxLength={200} className={inputClass} value={publicationDraft.doi} onChange={(event) => setPublicationDraft((current) => ({ ...current, doi: event.target.value }))} />
                </label>
                <label className={labelClass}>Publication URL
                  <input type="text" inputMode="url" maxLength={500} className={inputClass} value={publicationDraft.url} onChange={(event) => setPublicationDraft((current) => ({ ...current, url: event.target.value }))} />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="button" disabled={publicationLoading} onClick={() => void savePublication()} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {publicationLoading && <Loader2 size={15} className="animate-spin" />}
                    {editingPublicationId == null ? 'Add publication' : 'Save publication'}
                  </button>
                  {editingPublicationId != null && <button type="button" onClick={resetPublicationDraft} className="btn-secondary px-4 py-2 text-sm font-semibold">Cancel edit</button>}
                </div>
              </div>
            </>)}
          </>
        ) : (
          <>
            {section('Student details', <div className="grid gap-4 sm:grid-cols-2">
              {input('Year of study', 'year', { max: 120 })}{input('Skills summary', 'skills', { max: 1000 })}
              <label className={labelClass}>Skills (comma-separated)<input className={inputClass} value={draft.skillTags} onChange={(event) => setField('skillTags', event.target.value)} /></label>
              <label className={labelClass}>Interests (comma-separated)<input className={inputClass} value={draft.interests} onChange={(event) => setField('interests', event.target.value)} /></label>
              <label className={labelClass}>Resume contact email
                <input type="email" maxLength={254} className={inputClass} value={draft.studentResumeDetails.contactEmail} onChange={(event) => setField('studentResumeDetails', { ...draft.studentResumeDetails, contactEmail: event.target.value })} />
              </label>
              <label className={labelClass}>Phone
                <input type="tel" maxLength={80} className={inputClass} value={draft.studentResumeDetails.phone} onChange={(event) => setField('studentResumeDetails', { ...draft.studentResumeDetails, phone: event.target.value })} />
              </label>
              {input('GitHub URL', 'githubUrl', { type: 'url', max: 500 })}{input('LinkedIn URL', 'linkedinUrl', { type: 'url', max: 500 })}
              <label className={`${labelClass} sm:col-span-2`}>Profile visibility
                <select className={inputClass} value={draft.visibility} onChange={(event) => setField('visibility', event.target.value as ProfileDraft['visibility'])}>
                  <option value="ALL_USERS">Visible to everyone logged in</option>
                  <option value="APPLIED_FACULTY_ONLY">Visible only to faculty I apply to</option>
                </select>
              </label>
            </div>)}
            {section('Education', <>
              {draft.studentResumeDetails.education.map((item, index) => <div key={`student-education-${index}`} className="grid gap-3 rounded-lg border border-sage/20 bg-mist p-3 sm:grid-cols-2">
                <label className={labelClass}>Degree
                  <input className={inputClass} value={item.degree ?? ''} onChange={(event) => updateStudentEducation(index, 'degree', event.target.value)} />
                </label>
                <label className={labelClass}>Field of study
                  <input className={inputClass} value={item.fieldOfStudy ?? ''} onChange={(event) => updateStudentEducation(index, 'fieldOfStudy', event.target.value)} />
                </label>
                <label className={labelClass}>University
                  <input className={inputClass} value={item.university ?? ''} onChange={(event) => updateStudentEducation(index, 'university', event.target.value)} />
                </label>
                <label className={labelClass}>Academic years
                  <input className={inputClass} value={item.academicYear ?? ''} onChange={(event) => updateStudentEducation(index, 'academicYear', event.target.value)} />
                </label>
                <label className={labelClass}>CGPA
                  <input className={inputClass} value={item.cgpa ?? ''} onChange={(event) => updateStudentEducation(index, 'cgpa', event.target.value)} />
                </label>
                <button type="button" onClick={() => setField('studentResumeDetails', {
                  ...draft.studentResumeDetails,
                  education: draft.studentResumeDetails.education.filter((_, rowIndex) => rowIndex !== index),
                })} aria-label="Remove education" className="justify-self-start p-2 text-rose-600 hover:text-rose-800"><Trash2 size={17} /> Remove</button>
              </div>)}
              <button type="button" onClick={() => setField('studentResumeDetails', {
                ...draft.studentResumeDetails,
                education: [...draft.studentResumeDetails.education, {}],
              })} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green"><Plus size={16} />Add education</button>
            </>)}
            {section('Projects', <>
              {draft.studentProjects.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-mist p-3 border border-sage/20 sm:grid-cols-[1fr_2fr_auto]">
                <input aria-label="Project title" placeholder="Project title" className={inputClass} value={item.title ?? ''} onChange={(event) => updateRow('studentProjects', draft.studentProjects, index, 'title', event.target.value)} />
                <input aria-label="Project description" placeholder="Description" className={inputClass} value={item.description ?? ''} onChange={(event) => updateRow('studentProjects', draft.studentProjects, index, 'description', event.target.value)} />
                <input aria-label="Project technologies" placeholder="Technologies (comma-separated)" className={inputClass} value={listText(item.technologies)} onChange={(event) => updateRow('studentProjects', draft.studentProjects, index, 'technologies', splitList(event.target.value))} />
                <button type="button" onClick={() => setField('studentProjects', draft.studentProjects.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove project" className="justify-self-end p-2 text-rose-600 hover:text-rose-800"><Trash2 size={17} /></button>
              </div>)}
              <button type="button" onClick={() => setField('studentProjects', [...draft.studentProjects, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green"><Plus size={16} />Add project</button>
            </>)}
            {experienceSection('Internships', 'internships')}
            {experienceSection('Work experience', 'workExperience')}
            {section('Certifications and achievements', <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Certifications (comma-separated)
                <textarea className={inputClass} rows={3} value={listText(draft.studentResumeDetails.certifications)} onChange={(event) => setField('studentResumeDetails', { ...draft.studentResumeDetails, certifications: splitList(event.target.value) })} />
              </label>
              <label className={labelClass}>Achievements (comma-separated)
                <textarea className={inputClass} rows={3} value={listText(draft.studentResumeDetails.achievements)} onChange={(event) => setField('studentResumeDetails', { ...draft.studentResumeDetails, achievements: splitList(event.target.value) })} />
              </label>
            </div>)}
            {experienceSection('Research experience', 'researchExperience', true)}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => router.back()} className="btn-secondary px-5 py-2.5 text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={saving || resumeBusy} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : saved ? 'Saved' : isFaculty ? 'Save profile' : 'Confirm and Save'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function EditProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY']}>
      <ProfileEditForm />
    </ProtectedRoute>
  );
}
