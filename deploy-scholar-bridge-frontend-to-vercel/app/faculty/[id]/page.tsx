'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BookOpen, Briefcase, Building2, GraduationCap, MapPin, Users } from 'lucide-react';
import { directoryApi, type FacultyDetail } from '@/api/directoryApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DirectoryState, DirectoryTags } from '@/components/directory/DirectoryComponents';

function FacultyProfile() {
  const { id } = useParams<{ id: string }>();
  const [faculty, setFaculty] = useState<FacultyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFaculty = useCallback(async () => {
    const facultyId = Number(id);
    if (!Number.isInteger(facultyId) || facultyId < 1) {
      setError('This faculty profile link is invalid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setFaculty(await directoryApi.getFacultyById(facultyId));
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status === 403 ? 'FORBIDDEN' : response?.data?.message ?? 'Could not load this faculty profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadFaculty(); }, [loadFaculty]);

  const links = faculty ? [
    ['Google Scholar', faculty.scholarUrl],
    ['ORCID', faculty.orcidUrl],
    ['ResearchGate', faculty.researchGateUrl],
    ['LinkedIn', faculty.linkedinUrl],
    ['Website', faculty.websiteUrl],
  ].filter((item): item is [string, string] => Boolean(item[1])) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/faculty" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft size={16} />Faculty directory</Link>
      <div className="mt-6">
        <DirectoryState loading={loading} error={error} onRetry={() => void loadFaculty()} forbiddenMessage="This profile is available to signed-in ScholarBridge members. Please sign in with an authorized account." />
      </div>
      {!loading && !error && faculty && (
        <article className="mt-6 space-y-6">
          <header className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-800 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {faculty.photoUrl ? <img src={faculty.photoUrl} alt="" className="h-20 w-20 rounded-full border-2 border-white/50 object-cover" /> : <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{faculty.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>}
              <div>
                <p className="text-sm font-medium text-indigo-200">{[faculty.designation, faculty.department].filter(Boolean).join(' · ') || 'Faculty member'}</p>
                <h1 className="mt-1 text-3xl font-bold">{faculty.name}</h1>
                {faculty.qualifications && <p className="mt-1 text-sm text-indigo-100">{faculty.qualifications}</p>}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20">{label}<ArrowUpRight size={14} /></a>)}
            </div>
          </header>

          <section className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-bold text-neutral-900">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{faculty.bio || 'This faculty member has not added a biography yet.'}</p>
                {faculty.researchInterests?.length ? <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-neutral-700">Research interests</h3><DirectoryTags values={faculty.researchInterests} /></div> : null}
                {faculty.education?.length ? <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-neutral-700">Education</h3><ul className="space-y-2">{faculty.education.map((item, index) => <li key={`${item.degree}-${item.institution}-${index}`} className="text-sm text-neutral-700"><span className="font-medium">{item.degree}</span>{item.institution && ` · ${item.institution}`}{item.year && ` (${item.year})`}</li>)}</ul></div> : null}
              </section>

              {faculty.openOpenings?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900"><Briefcase size={19} />Open research openings</h2>
                <ul className="mt-3 divide-y divide-neutral-100">{faculty.openOpenings.map((opening) => <li key={opening.id} className="py-3 first:pt-0 last:pb-0"><p className="font-semibold text-indigo-800">{opening.title}</p>{opening.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{opening.description}</p>}</li>)}</ul>
              </section> : <section className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600"><Briefcase size={18} className="mb-2 text-neutral-400" />No open research openings at the moment.</section>}

              {faculty.publishedBlogPosts?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900"><BookOpen size={19} />Published research posts</h2>
                <ul className="mt-3 divide-y divide-neutral-100">{faculty.publishedBlogPosts.map((post) => <li key={post.id} className="py-3 first:pt-0 last:pb-0"><Link href={`/blog/${post.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">{post.title}</Link>{post.summary && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.summary}</p>}</li>)}</ul>
              </section> : null}

              {faculty.publications?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-bold text-neutral-900">Publications</h2>
                <ul className="mt-3 divide-y divide-neutral-100">
                  {faculty.publications.map((publication) => <li key={publication.id} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="font-semibold text-neutral-900">{publication.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">
                      {publication.authors}
                      {publication.venue && ` · ${publication.venue}`}
                      {publication.year != null && ` · ${publication.year}`}
                    </p>
                    {publication.url && <a href={publication.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900">View publication<ArrowUpRight size={14} /></a>}
                  </li>)}
                </ul>
              </section> : null}
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="font-bold text-neutral-900">Research metrics</h2>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[{ label: 'Citations', value: faculty.citationsCount }, { label: 'h-index', value: faculty.hIndex }, { label: 'i10-index', value: faculty.i10Index }].map(({ label, value }) => <div key={label} className="rounded-lg bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-lg font-bold text-neutral-900">{value ?? '—'}</dd></div>)}
                </dl>
                {faculty.statsAsOf && <p className="mt-3 text-xs text-neutral-500">Statistics as of {faculty.statsAsOf}</p>}
                <p className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${faculty.acceptingStudents ? 'text-emerald-700' : 'text-neutral-500'}`}><Users size={16} />{faculty.acceptingStudents ? 'Accepting students' : 'Not currently accepting students'}</p>
              </section>
              <section className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="font-bold text-neutral-900">Office information</h2>
                {faculty.officeRoom || faculty.officeHours ? <div className="mt-3 space-y-3 text-sm text-neutral-700">
                  {faculty.officeRoom && <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-neutral-400" />{faculty.officeRoom}</p>}
                  {faculty.officeHours && <p className="flex items-start gap-2"><Building2 size={16} className="mt-0.5 shrink-0 text-neutral-400" />{faculty.officeHours}</p>}
                </div> : <p className="mt-2 text-sm text-neutral-500">Office details have not been added.</p>}
              </section>
              {faculty.awards?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="flex items-center gap-2 font-bold text-neutral-900"><GraduationCap size={18} />Awards</h2><ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-700">{faculty.awards.map((award) => <li key={award}>{award}</li>)}</ul></section> : null}
              {faculty.projects?.length ? <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="font-bold text-neutral-900">Selected projects</h2><ul className="mt-3 space-y-3">{faculty.projects.map((project, index) => <li key={`${project.title}-${index}`} className="text-sm"><p className="font-medium text-neutral-800">{project.title}</p><p className="mt-1 text-neutral-500">{[project.role, project.fundingAgency, project.years].filter(Boolean).join(' · ')}</p></li>)}</ul></section> : null}
            </aside>
          </section>
        </article>
      )}
    </main>
  );
}

export default function FacultyDetailPage() {
  return <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY']}><FacultyProfile /></ProtectedRoute>;
}
