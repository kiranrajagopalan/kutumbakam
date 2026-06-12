import { useId, useMemo } from 'react';
import { layoutRelationPath, AV_R } from '../lib/relationPath.js';
import { toneFor, initialsOf } from '../lib/avatar.js';
import { photoUrlFor } from '../lib/photos.js';

const HEART_D =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// The path schematic: vertical = generation, drawn in the line grammar
// (accent = this traced relationship; ∩ + dot = via their parents; heart =
// married, outline = former; dashes = adoptive/step). Scales down to fit,
// never up. Labels carry a card-coloured halo so risers can pass behind.
export default function RelationPathSvg({ trail, personsById }) {
  const uid = useId();
  const layout = useMemo(() => layoutRelationPath(trail), [trail]);
  if (!layout) return null;

  const halo = { paintOrder: 'stroke', stroke: 'var(--color-card)', strokeWidth: 3.5, strokeLinejoin: 'round' };

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="The relationship drawn as a small family diagram"
      width="100%"
      style={{ maxWidth: layout.width, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <clipPath id={`${uid}-av`}>
          <circle r={AV_R} />
        </clipPath>
      </defs>
      {layout.links.map((l, i) => (
        <g key={i} stroke="var(--color-accent)" fill="none" strokeWidth="1.8" strokeLinecap="round">
          <path d={l.d} strokeDasharray={l.dashed ? '4 4' : undefined} />
          {l.dot && <circle cx={l.dot.x} cy={l.dot.y} r="2.6" fill="var(--color-accent)" stroke="none" />}
          {l.heart && (
            <g transform={`translate(${l.heart.x} ${l.heart.y})`} stroke="none">
              <circle r="8" fill="var(--color-card)" />
              <path
                d={HEART_D}
                transform="scale(0.46) translate(-12 -12.2)"
                fill={l.former ? 'none' : 'var(--color-accent)'}
                stroke={l.former ? 'var(--color-accent)' : 'none'}
                strokeWidth={l.former ? 2.6 : 0}
              />
            </g>
          )}
        </g>
      ))}
      {layout.nodes.map((n) => {
        const p = personsById.get(n.id);
        if (!p) return null;
        const tone = toneFor(p.id);
        const url = photoUrlFor(p);
        const first = (p.name || '·').split(/\s+/)[0];
        const word = n.word || (p.isSelf ? 'you' : null);
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            {p.isSelf && (
              <circle
                r={AV_R + 4}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.4"
                strokeDasharray="2.5 3.5"
              />
            )}
            {url ? (
              <image
                href={url}
                x={-AV_R}
                y={-AV_R}
                width={AV_R * 2}
                height={AV_R * 2}
                clipPath={`url(#${uid}-av)`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <>
                <circle r={AV_R} fill={tone.bg} />
                <text
                  dy="0.36em"
                  textAnchor="middle"
                  fill={tone.fg}
                  fontSize="11"
                  fontWeight="600"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {initialsOf(p.name)}
                </text>
              </>
            )}
            <text
              y={AV_R + 13}
              textAnchor="middle"
              fill="var(--color-ink)"
              fontSize="11.5"
              fontWeight="500"
              style={{ fontFamily: 'var(--font-body)', ...halo }}
            >
              {first}
            </text>
            {word && (
              <text
                y={AV_R + 25}
                textAnchor="middle"
                fill="var(--color-ink-faint)"
                fontSize="10.5"
                style={{ fontFamily: 'var(--font-body)', ...halo }}
              >
                {word}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
