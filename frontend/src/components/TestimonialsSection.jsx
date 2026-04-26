import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Avatar color pairs — semantic, not brand colors
const AVATAR_COLORS = [
  'bg-[var(--app-surface-soft)] text-[var(--app-text)]',
  'bg-emerald-500/10 text-emerald-600',
  'bg-[var(--app-accent)]/10 text-[var(--app-text)]',
  'bg-sky-500/10 text-sky-600',
];

function StarRating({ rating, max = 5 }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400' : 'text-[var(--app-border)]'} fill-current`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ item, colorClass }) {
  const parts = item.text.split(item.highlight);
  return (
    <article className="flex-none w-[min(18rem,78vw)] sm:w-80 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-l1)] h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colorClass}`}>
            {item.initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[var(--app-text)] truncate">{item.name}</h4>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-disabled)] truncate">
              {item.role}
            </p>
          </div>
        </div>
        <div className="mt-1 shrink-0">
          <StarRating rating={item.rating} />
        </div>
      </div>
      <p className="text-sm text-[var(--app-text-muted)] leading-relaxed italic">
        &ldquo;{parts[0]}
        <strong className="font-bold text-[var(--app-text)] not-italic">{item.highlight}</strong>
        {parts[1]}&rdquo;
      </p>
    </article>
  );
}

export default function TestimonialsSection() {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  const testimonialsData = [
    {
      name:      t('testimonials.items.ravi.name'),
      role:      t('testimonials.roles.pilot'),
      text:      t('testimonials.items.ravi.text'),
      highlight: t('testimonials.items.ravi.highlight'),
      rating: 5, initials: 'RK',
    },
    {
      name:      t('testimonials.items.anitha.name'),
      role:      t('testimonials.roles.caregiver'),
      text:      t('testimonials.items.anitha.text'),
      highlight: t('testimonials.items.anitha.highlight'),
      rating: 5, initials: 'AR',
    },
    {
      name:      t('testimonials.items.suresh.name'),
      role:      t('testimonials.roles.tester'),
      text:      t('testimonials.items.suresh.text'),
      highlight: t('testimonials.items.suresh.highlight'),
      rating: 4, initials: 'S',
    },
    {
      name:      t('testimonials.items.priya.name'),
      role:      t('testimonials.roles.physician'),
      text:      t('testimonials.items.priya.text'),
      highlight: t('testimonials.items.priya.highlight'),
      rating: 5, initials: 'PS',
    },
  ];

  // Auto-scroll — pauses on hover/focus for accessibility
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section className="w-full py-6 pb-2 fade-in" aria-label="User testimonials">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--app-surface-soft)] text-[var(--app-text-muted)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--app-text)] leading-tight">{t('testimonials.title')}</h2>
            <p className="text-xs font-medium text-[var(--app-text-muted)]">{t('testimonials.subtitle')}</p>
          </div>
        </div>

        {/* Scroll controls */}
        <div className="flex items-center gap-2">
          {['left', 'right'].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => scroll(dir)}
              className="w-8 h-8 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-surface-soft)] shadow-[var(--shadow-l1)] transition-colors duration-150 active:scale-95"
              aria-label={dir === 'left' ? 'Scroll testimonials left' : 'Scroll testimonials right'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable track — no inline style tag, scrollbar hidden via globals.css */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        className="flex overflow-x-auto gap-4 pb-6 pt-1 px-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
        role="list"
        aria-label="Testimonials carousel"
      >
        {testimonialsData.map((item, idx) => (
          <div key={idx} className="snap-start shrink-0" role="listitem">
            <TestimonialCard item={item} colorClass={AVATAR_COLORS[idx % AVATAR_COLORS.length]} />
          </div>
        ))}
      </div>
    </section>
  );
}
