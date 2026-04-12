function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border border-amber-200",
    high: "bg-rose-50 text-rose-700 border border-rose-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    pending: "bg-slate-50 text-slate-600 border border-slate-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;