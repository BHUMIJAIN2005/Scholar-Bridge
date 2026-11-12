import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/api/axiosClient';

export function photoSrc(photoUrl?: string) {
  const value = photoUrl?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\/+/, '/'), `${API_BASE_URL.replace(/\/$/, '')}/`).toString();
}

export function Avatar({
  name,
  photoUrl,
  className = 'h-14 w-14',
  textClassName = 'text-lg',
}: {
  name: string;
  photoUrl?: string;
  className?: string;
  textClassName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  const src = photoSrc(photoUrl);

  useEffect(() => { setImageFailed(false); }, [src]);

  return src && !imageFailed ? (
    <img key={src} src={src} alt={`${name} profile photo`} onError={() => setImageFailed(true)} className={`${className} shrink-0 rounded-full border-2 border-sage/30 object-cover`} />
  ) : (
    <div aria-hidden="true" className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-mint font-bold text-forest ${textClassName}`}>
      {initials}
    </div>
  );
}
