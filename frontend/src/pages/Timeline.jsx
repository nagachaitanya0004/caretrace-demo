import { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../AppContext';
import Badge from '../components/Badge';
import PageFrame from '../components/PageFrame';
import Button from '../components/Button';



function TimelineEntry({ item, t, isLast, i18n }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severity = Number(item.severity);
  
  const badgeVariant = 
    severity >= 7 ? 'danger' : 
    severity >= 4 ? 'warning' : 'success';

  const dotSize = severity >= 8 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const dotGlow = severity >= 8 ? 'shadow-[0_0_12px_var(--app-accent-shadow)]' : '';

  return (
    <div className="relative pl-10 pb-8 last:pb-0 group">
      {/* Connector Line - FIXED: uses token */}
      {!isLast && (
        <div className="absolute left-[5px] top-6 bottom-0 w-[2px] bg-[var(--app-border)]" />
      )}
      
      {/* Dot */}
      <div className={`absolute left-0 top-2 rounded-full border-2 border-[var(--app-accent)] bg-[var(--app-surface)] z-10 transition-transform group-hover:scale-110 ${dotSize} ${dotGlow}`} />
      
      {/* Horizontal Line Connector - FIXED: uses token */}
      <div className="absolute left-[8px] top-[14px] w-6 h-[1px] bg-[var(--app-border)]" />

      {/* Entry Card - FIXED: uses token border and shadow */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[20px] p-5 shadow-[var(--shadow-l2)] hover:border-[var(--app-border-hover)] transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-disabled)]">
            {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Badge variant={badgeVariant}>
            {new Intl.NumberFormat(i18n.language).format(severity)}/10
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
                className="text-[10px] font-bold text-[var(--badge-success-text)] uppercase tracking-wider mt-2 hover:underline"
              >
                {isExpanded ? t('timeline.show_less') : t('timeline.show_more')}
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
      <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-[var(--app-border)]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-[var(--app-accent-glow)] border border-[var(--app-accent-glow)] rounded-2xl p-5 relative overflow-hidden flex gap-4"
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--app-accent)]" />
        <div className="w-10 h-10 rounded-xl bg-[var(--app-accent-glow)] flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--badge-success-text)] mb-1">Pattern Detected</p>
          <p className="text-sm font-medium text-[var(--app-text)] leading-relaxed">
            {pattern.message}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GapIndicator({ days, t }) {
  return (
    <div className="relative pl-10 pb-8 py-4">
      <div className="absolute left-[5px] top-0 bottom-0 w-[2px] border-l-2 border-dashed border-[var(--app-border-soft)]" />
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-disabled)] italic pl-4">
        {t('timeline.gap_days', { count: days })}
      </div>
    </div>
  );
}

function Timeline() {
  const navigate = useNavigate();
  const { symptoms = [] } = useContext(AppContext);
  const { t, i18n } = useTranslation();



    
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

  const timelineGroups = useMemo(() => {
    if (!filteredSymptoms.length) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    filteredSymptoms.forEach(s => {
      const d = new Date(s.date);
      const dCopy = new Date(d);
      dCopy.setHours(0, 0, 0, 0);
      
      if (dCopy.getTime() === today.getTime()) groups.today.push(s);
      else if (dCopy.getTime() === yesterday.getTime()) groups.yesterday.push(s);
      else if (dCopy.getTime() >= weekAgo.getTime()) groups.thisWeek.push(s);
      else groups.older.push(s);
    });

    const result = [];
    if (groups.today.length) result.push({ type: 'header', label: t('timeline.today', 'Today'), entries: groups.today });
    if (groups.yesterday.length) result.push({ type: 'header', label: t('timeline.yesterday', 'Yesterday'), entries: groups.yesterday });
    if (groups.thisWeek.length) result.push({ type: 'header', label: t('timeline.this_week', 'This Week'), entries: groups.thisWeek });
    if (groups.older.length) result.push({ type: 'header', label: t('timeline.older', 'Older'), entries: groups.older });

    // Inject patterns and gaps between groups if needed (simplified)
    const finalData = [];
    result.forEach((group, gIdx) => {
      finalData.push({ type: 'sticky-date', label: group.label });
      group.entries.forEach((entry, eIdx) => {
        finalData.push({ type: 'entry', data: entry });
        
        // Simple Pattern Detection (optional logic per item)
        if (eIdx === group.entries.length - 1 && gIdx < result.length - 1) {
          // Gap check between groups
          const nextGroupFirst = result[gIdx+1].entries[0];
          const gap = Math.floor((new Date(entry.date) - new Date(nextGroupFirst.date)) / (1000 * 60 * 60 * 24));
          if (gap >= 3) {
            finalData.push({ type: 'gap', days: gap });
          }
        }
      });
    });

    return finalData;
  }, [filteredSymptoms, t]);

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
      className="pb-28"
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
                ? 'bg-[var(--app-accent)] text-[var(--brand-accent-on)] shadow-[0_12px_32px_var(--app-accent-shadow)]'
                : 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-disabled)] hover:text-[var(--app-text-muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {symptoms.length === 0 ? (
        <div className="text-center py-20 bg-[var(--app-surface)] rounded-[32px] border border-[var(--app-border)]">
          <div className="w-16 h-16 bg-[var(--app-accent-glow)] rounded-full flex items-center justify-center mx-auto mb-6">
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
          {timelineGroups.map((item, idx) => {
            if (item.type === 'gap') return <GapIndicator key={`gap-${idx}`} days={item.days} t={t} />;
            if (item.type === 'pattern') return <PatternCard key={`pattern-${idx}`} pattern={item} />;
            if (item.type === 'sticky-date') return (
              <div key={`date-${idx}`} className="sticky top-14 z-20 bg-[var(--app-bg)]/90 backdrop-blur-md py-3 px-1 mb-4">
                <span className="text-[10px] font-bold text-[var(--app-text-disabled)] uppercase tracking-[0.3em]">{item.label}</span>
              </div>
            );
            
            return (
              <TimelineEntry 
                key={item.data.id} 
                item={item.data} 
                t={t} 
                i18n={i18n}
                isLast={idx === timelineGroups.length - 1} 
              />
            );
          })}
        </div>
      )}

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <Button 
          intent="cta" 
          onClick={() => navigate('/analysis')}
          className="shadow-[0_28px_80px_var(--app-accent-shadow)]"
        >
          {t('timeline.get_analysis', 'Analyze patterns')}
        </Button>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </PageFrame>
  );
}

export default Timeline;
