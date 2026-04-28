import React from 'react';

export const FieldWrapper = ({ id, label, hint, error, children }) => (
  <div className="mb-5">
    {label && <label htmlFor={id} className="block text-sm font-medium text-[var(--app-text)] mb-1.5">{label}</label>}
    {children}
    {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-[var(--app-text-muted)] leading-relaxed">{hint}</p>}
    {error && <p className="mt-1.5 text-xs text-rose-500 font-medium fade-in" role="alert">{error}</p>}
  </div>
);