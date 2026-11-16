import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ConferenceFormatValidation } from '@/api/conferenceApi';

export function ConferenceFormatReport({
  result,
}: {
  result?: ConferenceFormatValidation | null;
}) {
  if (!result) return null;

  return (
    <section className="space-y-3 rounded-xl border border-sage/30 bg-mist p-4" aria-label="Preliminary paper format screening">
      <div className="flex items-center gap-2">
        {result.passed
          ? <CheckCircle2 size={17} className="shrink-0 text-forest" />
          : <AlertCircle size={17} className="shrink-0 text-amber-700" />}
        <h3 className="text-sm font-semibold text-ink">
          {result.passed ? 'Preliminary checks passed' : 'Format screening found issues'}
        </h3>
      </div>
      <dl className="grid gap-2 text-xs text-ink/75 sm:grid-cols-2">
        <div><dt className="font-semibold text-ink">Pages</dt><dd>{result.pageCount}</dd></div>
        <div><dt className="font-semibold text-ink">Detected fonts</dt><dd>{result.detectedFonts.length ? result.detectedFonts.join(', ') : 'None detected'}</dd></div>
        <div className="sm:col-span-2"><dt className="font-semibold text-ink">Detected sections</dt><dd>{result.detectedSections.length ? result.detectedSections.join(', ') : 'None detected'}</dd></div>
      </dl>
      {result.errors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rose-800">Checks needing attention</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-rose-800">
            {result.errors.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
          </ul>
        </div>
      )}
      {result.warnings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-900">Warnings</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-900">
            {result.warnings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
          </ul>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-ink/60">
        This is a preliminary format screen, not an IEEE compliance certification. Warnings do not automatically reject a submission; faculty review remains authoritative.
      </p>
    </section>
  );
}
