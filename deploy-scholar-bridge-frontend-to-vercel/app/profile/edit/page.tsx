'use client';

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { profileApi } from '@/api/profileApi';
import { publicationsApi } from '@/api/publicationsApi';
import type { Publication, PublicationRequest } from '@/api/publicationsApi';
import type { EducationItem, FacultyProjectItem, StudentProjectItem, User } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  githubUrl: string;
  linkedinUrl: string;
  visibility: 'ALL_FACULTY' | 'APPLIED_FACULTY_ONLY';
}

const emptyDraft: ProfileDraft = {
  name: '', photoUrl: '', department: '', designation: '', qualifications: '', bio: '',
  researchDomains: '', researchInterests: '', officeRoom: '', officeHours: '', scholarUrl: '',
  orcidUrl: '', researchGateUrl: '', facultyLinkedinUrl: '', websiteUrl: '', citationsCount: '',
  hIndex: '', i10Index: '', statsAsOf: '', acceptingStudents: false, education: [], awards: '',
  facultyProjects: [], year: '', skills: '', skillTags: '', interests: '', studentProjects: [],
  githubUrl: '', linkedinUrl: '', visibility: 'ALL_FACULTY',
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

const listText = (values?: string[]) => values?.join(', ') ?? '';
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const optional = (value: string) => value.trim() || undefined;
const optionalNumber = (value: string) => value.trim() ? Number(value) : undefined;
const text = (value?: string | number | null) => value == null ? '' : String(value);

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
    githubUrl: user.githubUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    visibility: user.visibility ?? 'ALL_FACULTY',
  };
}

function ProfileEditForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [completeness, setCompleteness] = useState<number | undefined>(user?.profileCompleteness);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [publicationDraft, setPublicationDraft] = useState<PublicationDraft>(emptyPublicationDraft);
  const [editingPublicationId, setEditingPublicationId] = useState<number | null>(null);
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [publicationDeletingId, setPublicationDeletingId] = useState<number | null>(null);
  const [publicationError, setPublicationError] = useState('');
  const [publicationNotice, setPublicationNotice] = useState('');
  const isFaculty = user?.role === 'FACULTY';

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const profile = await profileApi.updateMyProfile({
        name: optional(draft.name),
        photoUrl: optional(draft.photoUrl),
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
          githubUrl: optional(draft.githubUrl),
          linkedinUrl: optional(draft.linkedinUrl),
          visibility: draft.visibility,
        }),
      });
      setDraft(draftFromUser(profile));
      setCompleteness(profile.profileCompleteness);
      await refreshUser();
      setSaved(true);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
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

  const inputClass = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
  const labelClass = 'block text-sm font-medium text-neutral-700';
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
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-neutral-600"><Loader2 size={18} className="animate-spin" />Loading profile...</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-emerald-700">My Profile</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Edit your profile</h1>
        <p className="mt-1 text-sm text-neutral-600">Share your experience and interests with the ScholarBridge community.</p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6" aria-label="Profile completeness">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-neutral-800">Profile completeness</h2>
          <span className="text-sm font-bold text-emerald-700">{completeness ?? 0}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, completeness ?? 0))}%` }} />
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {saved && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={17} />Profile saved successfully.</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {section('Basic information', <div className="grid gap-4 sm:grid-cols-2">{input('Name', 'name', { max: 120 })}{input('Photo URL', 'photoUrl', { type: 'url', max: 500 })}</div>)}

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
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                <input type="checkbox" checked={draft.acceptingStudents} onChange={(event) => setField('acceptingStudents', event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
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
              {draft.education.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-[1fr_1fr_120px_auto]">
                <input aria-label="Degree" placeholder="Degree" className={inputClass} value={item.degree ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'degree', event.target.value)} />
                <input aria-label="Institution" placeholder="Institution" className={inputClass} value={item.institution ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'institution', event.target.value)} />
                <input aria-label="Year" placeholder="Year" className={inputClass} value={item.year ?? ''} onChange={(event) => updateRow('education', draft.education, index, 'year', event.target.value)} />
                <button type="button" onClick={() => setField('education', draft.education.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove education" className="justify-self-end p-2 text-rose-600"><Trash2 size={17} /></button>
              </div>)}
              <button type="button" onClick={() => setField('education', [...draft.education, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700"><Plus size={16} />Add education</button>
            </>)}
            {section('Awards and projects', <>
              <label className={labelClass}>Awards (comma-separated)<input className={inputClass} value={draft.awards} onChange={(event) => setField('awards', event.target.value)} /></label>
              {draft.facultyProjects.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
                <input aria-label="Project title" placeholder="Project title" className={inputClass} value={item.title ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'title', event.target.value)} />
                <input aria-label="Funding agency" placeholder="Funding agency" className={inputClass} value={item.fundingAgency ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'fundingAgency', event.target.value)} />
                <input aria-label="Years" placeholder="Years" className={inputClass} value={item.years ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'years', event.target.value)} />
                <div className="flex gap-2"><input aria-label="Role" placeholder="Role" className={inputClass} value={item.role ?? ''} onChange={(event) => updateRow('facultyProjects', draft.facultyProjects, index, 'role', event.target.value)} /><button type="button" onClick={() => setField('facultyProjects', draft.facultyProjects.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove project" className="p-2 text-rose-600"><Trash2 size={17} /></button></div>
              </div>)}
              <button type="button" onClick={() => setField('facultyProjects', [...draft.facultyProjects, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700"><Plus size={16} />Add project</button>
            </>)}
            {section('Publications', <>
              <p className="text-sm text-neutral-600">Manage the publications shown on your faculty profile.</p>
              {publicationError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{publicationError}</p>}
              {publicationNotice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{publicationNotice}</p>}
              {publications.length ? <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {publications.map((publication) => <li key={publication.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{publication.title}</p>
                    <p className="mt-1 text-sm text-neutral-600">{publication.authors}{publication.venue && ` · ${publication.venue}`}{publication.year != null && ` · ${publication.year}`}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editPublication(publication)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Edit</button>
                    <button type="button" disabled={publicationDeletingId === publication.id} onClick={() => void deletePublication(publication)} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{publicationDeletingId === publication.id ? 'Deleting...' : 'Delete'}</button>
                  </div>
                </li>)}
              </ul> : <p className="rounded-lg bg-neutral-50 px-3 py-4 text-sm text-neutral-500">No publications added yet.</p>}

              <div className="grid gap-4 rounded-lg bg-neutral-50 p-4 sm:grid-cols-2">
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
                  <button type="button" disabled={publicationLoading} onClick={() => void savePublication()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
                    {publicationLoading && <Loader2 size={15} className="animate-spin" />}
                    {editingPublicationId == null ? 'Add publication' : 'Save publication'}
                  </button>
                  {editingPublicationId != null && <button type="button" onClick={resetPublicationDraft} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-white">Cancel edit</button>}
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
              {input('GitHub URL', 'githubUrl', { type: 'url', max: 500 })}{input('LinkedIn URL', 'linkedinUrl', { type: 'url', max: 500 })}
              <label className={`${labelClass} sm:col-span-2`}>Profile visibility
                <select className={inputClass} value={draft.visibility} onChange={(event) => setField('visibility', event.target.value as ProfileDraft['visibility'])}>
                  <option value="ALL_FACULTY">Visible to all faculty</option>
                  <option value="APPLIED_FACULTY_ONLY">Only faculty whose openings I applied to</option>
                </select>
              </label>
            </div>)}
            {section('Projects', <>
              {draft.studentProjects.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-[1fr_2fr_auto]">
                <input aria-label="Project title" placeholder="Project title" className={inputClass} value={item.title ?? ''} onChange={(event) => updateRow('studentProjects', draft.studentProjects, index, 'title', event.target.value)} />
                <input aria-label="Project description" placeholder="Description" className={inputClass} value={item.description ?? ''} onChange={(event) => updateRow('studentProjects', draft.studentProjects, index, 'description', event.target.value)} />
                <button type="button" onClick={() => setField('studentProjects', draft.studentProjects.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove project" className="justify-self-end p-2 text-rose-600"><Trash2 size={17} /></button>
              </div>)}
              <button type="button" onClick={() => setField('studentProjects', [...draft.studentProjects, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Plus size={16} />Add project</button>
            </>)}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
          <button type="submit" disabled={saving} className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${isFaculty ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save profile'}
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
