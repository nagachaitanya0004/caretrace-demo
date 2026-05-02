import { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../AppContext';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import Button from '../components/Button';

const springTransition = { type: 'spring', stiffness: 280, damping: 24 };

function TimelineEntry({ item, t, isLast }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severity = Number(item.severity);
  
  const badgeVariant = 
    severity >= 7 ? 'danger' : 
    severity >= 4 ? 'warning' : 'success';

  const dotSize = severity >= 8 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const dotGlow = severity >= 8 ? 'shadow-[0_0_12px_rgba(226,255,50,0.6)]' : '';

  return (
    <div className="relative pl-10 pb-8 last:pb-0 group">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[5px] top-6 bottom-0 w-[2px] bg-[rgba(255,255,255,0.08)]" />
      )}
      
      {/* Dot */}
      <div className={`absolute left-0 top-2 rounded-full border-2 border-[var(--app-accent)] bg-[var(--app-surface)] z-10 transition-transform group-hover:scale-110 ${dotSize} ${dotGlow}`} />
      
      {/* Horizontal Line Connector */}
      <div className="absolute left-[8px] top-[14px] w-6 h-[1px] bg-[rgba(255,255,255,0.08)]" />

      {/* Entry Card */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-[var(--app-surface)] border-[0.5px] border-[rgba(255,255,255,0.08)] rounded-[20px] p-5 [box-shadow:0_12px_48px_rgba(0,0,0,0.4)] hover:border-[rgba(255,255,255,0.16)] transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)]">
            {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Badge variant={badgeVariant}>
            {severity}/10
          </Badge>
        </div>

        <h4 className="text-lg font-bold text-[var(--app-text)] mb-3">
          {t(`symptoms.options.${item.symptom}`, item.symptom.charAt(0).toUpperCase() + item.symptom.slice(1))}
        </h4>

        {item.notes && (
          <div className="mt-3">
            <p className={`text-sm text-[var(--app-text-muted)] italic leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
              "{item.notes}"
            </p>
            {item.notes.length > 100 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[10px] font-bold text-[var(--app-accent)] uppercase tracking-wider mt-2 hover:underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PatternCard({ pattern }) {
  return (
    <div className="relative pl-10 pb-8">
      <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-[rgba(255,255,255,0.08)]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-[rgba(226,255,50,0.08)] border border-[rgba(226,255,50,0.2)] rounded-2xl p-5 relative overflow-hidden flex gap-4"
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--app-accent)]" />
        <div className="w-10 h-10 rounded-xl bg-[rgba(226,255,50,0.1)] flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-accent)] mb-1">Pattern Detected</p>
          <p className="text-sm font-medium text-[var(--app-text)] leading-relaxed">
            {pattern.message}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GapIndicator({ days }) {
  return (
    <div className="relative pl-10 pb-8 py-4">
      <div className="absolute left-[5px] top-0 bottom-0 w-[2px] border-l-2 border-dashed border-[rgba(255,255,255,0.04)]" />
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] italic pl-4">
        {days} days with no log
      </div>
    </div>
  );
}

function Timeline() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { symptoms = [] } = useContext(AppContext);
  const [filter, setFilter] = useState('all');

  const filteredSymptoms = useMemo(() => {
    let base = [...symptoms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filter === 'high') return base.filter(s => s.severity >= 7);
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return base.filter(s => new Date(s.date) >= weekAgo);
    }
    if (filter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return base.filter(s => new Date(s.date) >= monthAgo);
    }
    return base;
  }, [symptoms, filter]);

  const timelineData = useMemo(() => {
    if (!filteredSymptoms.length) return [];
    
    const groups = [];
    let currentGroup = null;

    filteredSymptoms.forEach((s, idx) => {
      const date = new Date(s.date);
      const dateStr = date.toLocaleDateString('en-CA');
      
      const today = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-CA');
      
      let label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      if (dateStr === today) label = 'Today';
      else if (dateStr === yesterday) label = 'Yesterday';

      if (!currentGroup || currentGroup.label !== label) {
        // Check for gap before adding new group
        if (currentGroup && filter === 'all') {
          const lastDate = new Date(currentGroup.entries[currentGroup.entries.length - 1].date);
          const gap = Math.floor((lastDate - date) / (1000 * 60 * 60 * 24));
          if (gap >= 3) {
            groups.push({ type: 'gap', days: gap });
          }
        }

        currentGroup = { type: 'group', label, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(s);

      // Simple Pattern Detection Logic
      // 5+ consecutive logs of same symptom
      if (idx > 4 && filter === 'all') {
        const last5 = filteredSymptoms.slice(idx - 4, idx + 1);
        const allSame = last5.every(item => item.symptom === s.symptom);
        if (allSame) {
          groups.push({ 
            type: 'pattern', 
            message: `${s.symptom.charAt(0).toUpperCase() + s.symptom.slice(1)} has appeared 5 days in a row.` 
          });
        }
      }
    });

    return groups;
  }, [filteredSymptoms, filter]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High Severity' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' }
  ];

  return (
    <PageFrame 
      title={t('timeline.title', 'Your Health Arc')} 
      subtitle={t('timeline.subtitle', 'A longitudinal view of your clinical data.')} 
      maxWidthClass="max-w-3xl"
    >
      {/* Filter Bar */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              filter === f.id
                ? 'bg-[var(--app-accent)] text-black shadow-[0_12px_32px_rgba(226,255,50,0.15)]'
                : 'bg-[#080f1c] border border-[rgba(255,255,255,0.08)] text-[var(--app-text-disabled)] hover:text-[var(--app-text-muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {symptoms.length === 0 ? (
        <div className="text-center py-20 bg-[#080f1c] rounded-[32px] border border-[rgba(255,255,255,0.08)]">
          <div className="w-16 h-16 bg-[rgba(226,255,50,0.05)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--app-text)] mb-2">{t('timeline.empty.title')}</h3>
          <p className="text-[var(--app-text-muted)] mb-8">{t('timeline.empty.body')}</p>
          <Button intent="cta" onClick={() => navigate('/symptoms')}>
            {t('symptoms.submit_btn', 'Log now')}
          </Button>
        </div>
      ) : (
        <div className="relative">
          {timelineData.map((item, idx) => {
            if (item.type === 'gap') return <GapIndicator key={`gap-${idx}`} days={item.days} />;
            if (item.type === 'pattern') return <PatternCard key={`pattern-${idx}`} pattern={item} />;
            
            return (
              <div key={item.label} className="mb-4">
                {/* Sticky Header */}
                <div className="sticky top-[3.5rem] z-30 bg-[var(--app-bg)]/80 backdrop-blur-md py-4 mb-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--app-accent)]">
                    {item.label}
                  </h3>
                </div>
                
                <div className="space-y-0">
                  {item.entries.map((entry, entryIdx) => (
                    <TimelineEntry 
                      key={entry.id} 
                      item={entry} 
                      t={t} 
                      isLast={idx === timelineData.length - 1 && entryIdx === item.entries.length - 1} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50]">
        <Button 
          intent="cta" 
          onClick={() => navigate('/analysis')}
          className="shadow-[0_28px_80px_rgba(226,255,50,0.3)]"
        >
          {t('timeline.get_analysis', 'Analyze patterns')}
        </Button>
      </div>
    </PageFrame>
  );
}

export default Timeline;
