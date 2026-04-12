import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function TestimonialCard({ item }) {
  const parts = item.text.split(item.highlight);
  
  return (
    <div className="flex-none w-72 sm:w-80 bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-100/50 hover:shadow-2xl hover:shadow-zinc-200/40 hover:-translate-y-2 hover:scale-[1.03] hover:border-zinc-200 transition-all duration-500 relative group overflow-hidden h-full">
      {/* Decorative premium accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-300 opacity-20 group-hover:opacity-60 transition-opacity duration-500"></div>
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${item.color}`}>
            {item.initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-slate-800 truncate">{item.name}</h4>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{item.role}</p>
          </div>
        </div>
        <div className="flex text-amber-400 gap-0.5 mt-1 shrink-0">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-3.5 h-3.5 ${i < item.rating ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed italic">
        "{parts[0]}<span className="font-bold text-slate-800 not-italic">{item.highlight}</span>{parts[1]}"
      </p>
    </div>
  );
}

export default function TestimonialsSection() {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -340 : 340;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const testimonialsData = [
    {
      name: t('testimonials.items.ravi.name'),
      role: t('testimonials.roles.pilot'),
      text: t('testimonials.items.ravi.text'),
      highlight: t('testimonials.items.ravi.highlight'),
      rating: 5,
      initials: "RK",
      color: "bg-zinc-100 text-zinc-800"
    },
    {
      name: t('testimonials.items.anitha.name'),
      role: t('testimonials.roles.caregiver'),
      text: t('testimonials.items.anitha.text'),
      highlight: t('testimonials.items.anitha.highlight'),
      rating: 5,
      initials: "AR",
      color: "bg-green-100 text-green-700"
    },
    {
      name: t('testimonials.items.suresh.name'),
      role: t('testimonials.roles.tester'),
      text: t('testimonials.items.suresh.text'),
      highlight: t('testimonials.items.suresh.highlight'),
      rating: 4,
      initials: "S",
      color: "bg-teal-100 text-teal-700"
    },
    {
      name: t('testimonials.items.priya.name'),
      role: t('testimonials.roles.physician'),
      text: t('testimonials.items.priya.text'),
      highlight: t('testimonials.items.priya.highlight'),
      rating: 5,
      initials: "PS",
      color: "bg-indigo-100 text-indigo-700"
    }
  ];

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        if (scrollLeft >= maxScroll - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="w-full py-6 pb-2 fade-in relative group/section">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-50 text-zinc-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{t('testimonials.title')}</h2>
            <p className="text-xs font-medium text-slate-500">{t('testimonials.subtitle')}</p>
          </div>
        </div>
        
        {/* Physical Scroll Navigation Buttons */}
        <div className="flex items-center gap-2 transition-opacity duration-300 sm:opacity-0 sm:group-hover/section:opacity-100">
          <button 
            type="button"
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm transition-all active:scale-95"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            type="button"
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm transition-all active:scale-95"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef} 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex overflow-x-auto gap-4 pb-6 pt-1 px-2 snap-x snap-mandatory hide-scrollbars no-scrollbar cursor-grab active:cursor-grabbing" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {testimonialsData.map((item, idx) => (
          <div key={idx} className="snap-start shrink-0">
            <TestimonialCard item={item} />
          </div>
        ))}
      </div>
      
      {/* Optional styling to force hide scrollbars if standard classes fail */}
      <style>{`
        .hide-scrollbars::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
