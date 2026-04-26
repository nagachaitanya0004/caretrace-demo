/** Shared Recharts styling — simple, readable, on-brand. */
export const chartColors = {
  primary: 'var(--app-chart-primary, #0d9488)',
  primaryMuted: 'var(--app-chart-primary-muted, rgba(13, 148, 136, 0.12))',
  secondary: 'var(--app-chart-secondary, #0369a1)',
  grid: 'var(--app-chart-grid, #e2e8f0)',
  axis: 'var(--app-chart-axis, #64748b)',
  tooltipBg: 'var(--app-chart-tooltip-bg, #ffffff)',
  tooltipBorder: 'var(--app-chart-tooltip-border, #e2e8f0)',
  dot: 'var(--app-chart-dot, #ffffff)',
};

export const axisProps = {
  tick: { fill: chartColors.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: chartColors.grid },
};

export const cartesianGridProps = {
  strokeDasharray: '4 4',
  stroke: chartColors.grid,
  vertical: false,
};

export const tooltipContentStyle = {
  backgroundColor: chartColors.tooltipBg,
  borderRadius: 12,
  border: `1px solid ${chartColors.tooltipBorder}`,
  boxShadow: 'var(--shadow-l2)',
  fontSize: 13,
};
