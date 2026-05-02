/** Shared Recharts styling — simple, readable, on-brand. */
export const chartColors = {
  primary: 'var(--app-chart-primary, #E2FF32)',
  primaryMuted: 'var(--app-chart-primary-muted, rgba(226, 255, 50, 0.20))',
  secondary: 'var(--app-chart-secondary, #0f172a)',
  grid: 'var(--app-chart-grid, rgba(80,110,160,0.12))',
  axis: 'var(--app-chart-axis, #7a96b8)',
  tooltipBg: 'var(--app-chart-tooltip-bg, #080f1c)',
  tooltipBorder: 'var(--app-chart-tooltip-border, rgba(255,255,255,0.08))',
  dot: 'var(--app-chart-dot, #0c1525)',
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
