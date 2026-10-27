// Place icon: falls back to a pastel circle initial if there's no image
import type { Place } from '../data/places';
import { useImageOk } from '../lib/useImageOk';

export function PlaceIcon({ place, className }: { place: Place; className?: string }) {
  const status = useImageOk(place.icon);
  if (status === 'ok') return <img className={className} src={place.icon} alt="" draggable={false} />;
  return (
    <div
      className={className}
      aria-hidden
      style={{
        display: 'grid',
        placeItems: 'center',
        aspectRatio: '1',
        maxWidth: 160,
        width: '100%',
        margin: '0 auto',
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, #fff8, ${place.tint})`,
        color: 'var(--charcoal)',
        fontWeight: 900,
        fontSize: '1.4em',
        opacity: status === 'loading' ? 0.4 : 1,
      }}
    >
      {place.name[0]}
    </div>
  );
}
