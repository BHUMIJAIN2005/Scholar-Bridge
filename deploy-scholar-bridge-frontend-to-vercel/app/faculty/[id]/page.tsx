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
      <Link href="/faculty" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-forest"><ArrowLeft size={16} />Faculty directory</Link>
      <div className="mt-6">
        <DirectoryState loading={loading} error={error} onRetry={() => void loadFaculty()} forbiddenMessage="This profile is available to signed-in ScholarBridge members. Please sign in with an authorized account." />
      </div>
      {!loading && !error && faculty && (
        <article className="mt-6 space-y-6">
          <header className="solid-card p-6 sm:p-8 space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {faculty.photoUrl ? (
                <img src={faculty.photoUrl} alt="" className="h-20 w-20 rounded-full border-2 border-sage/30 object-cover" />
              ) : (
                <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-mint text-2xl font-bold text-forest">
                  {faculty.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-forest">{[faculty.designation, faculty.department].filter(Boolean).join(' · ') || 'Faculty member'}</p>
                <h1 className="mt-1 text-3xl font-bold text-ink">{faculty.name}</h1>
                {faculty.qualifications && <p className="mt-1 text-sm text-ink/70">{faculty.qualifications}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
                  {label}<ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          </header>

          <section className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <section className="solid-card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-ink">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{faculty.bio || 'This faculty member has not added a biography yet.'}</p>
                {faculty.researchInterests?.length ? <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-ink">Research interests</h3><DirectoryTags values={faculty.researchInterests} /></div> : null}
                {faculty.education?.length ? <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-ink">Education</h3><ul className="space-y-2">{faculty.education.map((item, index) => <li key={`${item.degree}-${item.institution}-${index}`} className="text-sm text-ink/80"><span className="font-semibold text-ink">{item.degree}</span>{item.institution && ` · ${item.institution}`}{item.year && ` (${item.year})`}</li>)}</ul></div> : null}
              </section>

              {faculty.openOpenings?.length ? <section className="solid-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Briefcase size={19} className="text-forest" />Open research openings</h2>
                <ul className="mt-3 divide-y divide-forest/10">{faculty.openOpenings.map((opening) => <li key={opening.id} className="py-3 first:pt-0 last:pb-0"><p className="font-semibold text-forest">{opening.title}</p>{opening.description && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{opening.description}</p>}</li>)}</ul>
              </section> : <section className="solid-card p-5 text-sm text-ink/70"><Briefcase size={18} className="mb-2 text-sage" />No open research openings at the moment.</section>}

              {faculty.publishedBlogPosts?.length ? <section className="solid-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><BookOpen size={19} className="text-forest" />Published research posts</h2>
                <ul className="mt-3 divide-y divide-forest/10">{faculty.publishedBlogPosts.map((post) => <li key={post.id} className="py-3 first:pt-0 last:pb-0"><Link href={`/blog/${post.id}`} className="font-semibold text-forest hover:text-mid-green">{post.title}</Link>{post.summary && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{post.summary}</p>}</li>)}</ul>
              </section> : null}

              {faculty.publications?.length ? <section className="solid-card p-5 sm:p-6">
                <h2 className="text-lg font-bold text-ink">Publications</h2>
                <ul className="mt-3 divide-y divide-forest/10">
                  {faculty.publications.map((publication) => <li key={publication.id} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="font-semibold text-ink">{publication.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ink/70">
                      {publication.authors}
                      {publication.venue && ` · ${publication.venue}`}
                      {publication.year != null && ` · ${publication.year}`}
                    </p>
                    {publication.url && <a href={publication.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-mid-green">View publication<ArrowUpRight size={14} /></a>}
                  </li>)}
                </ul>
              </section> : null}
            </div>

            <aside className="space-y-5">
              <section className="solid-card p-5">
                <h2 className="font-bold text-ink">Research metrics</h2>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[{ label: 'Citations', value: faculty.citationsCount }, { label: 'h-index', value: faculty.hIndex }, { label: 'i10-index', value: faculty.i10Index }].map(({ label, value }) => <div key={label} className="rounded-lg bg-mist p-3 border border-sage/20"><dt className="text-xs text-ink/60">{label}</dt><dd className="mt-1 text-lg font-bold text-ink">{value ?? '—'}</dd></div>)}
                </dl>
                {faculty.statsAsOf && <p className="mt-3 text-xs text-ink/60">Statistics as of {faculty.statsAsOf}</p>}
                <p className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${faculty.acceptingStudents ? 'text-forest' : 'text-ink/60'}`}><Users size={16} />{faculty.acceptingStudents ? 'Accepting students' : 'Not currently accepting students'}</p>
              </section>
              <section className="solid-card p-5">
                <h2 className="font-bold text-ink">Office information</h2>
                {faculty.officeRoom || faculty.officeHours ? <div className="mt-3 space-y-3 text-sm text-ink/80">
                  {faculty.officeRoom && <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-leaf" />{faculty.officeRoom}</p>}
                  {faculty.officeHours && <p className="flex items-start gap-2"><Building2 size={16} className="mt-0.5 shrink-0 text-leaf" />{faculty.officeHours}</p>}
                </div> : <p className="mt-2 text-sm text-ink/60">Office details have not been added.</p>}
              </section>
              {faculty.awards?.length ? <section className="solid-card p-5"><h2 className="flex items-center gap-2 font-bold text-ink"><GraduationCap size={18} className="text-leaf" />Awards</h2><ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink/80">{faculty.awards.map((award) => <li key={award}>{award}</li>)}</ul></section> : null}
              {faculty.projects?.length ? <section className="solid-card p-5"><h2 className="font-bold text-ink">Selected projects</h2><ul className="mt-3 space-y-3">{faculty.projects.map((project, index) => <li key={`${project.title}-${index}`} className="text-sm"><p className="font-semibold text-ink">{project.title}</p><p className="mt-1 text-ink/60">{[project.role, project.fundingAgency, project.years].filter(Boolean).join(' · ')}</p></li>)}</ul></section> : null}
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
