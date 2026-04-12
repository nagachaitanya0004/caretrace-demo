/** Shared Recharts styling — simple, readable, on-brand. */
export const chartColors = {
  primary: '#0d9488',
  primaryMuted: 'rgba(13, 148, 136, 0.12)',
  secondary: '#0369a1',
  grid: '#e2e8f0',
  axis: '#64748b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
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
  backgroundColor: '#ffffff',
  borderRadius: 12,
  border: `1px solid ${chartColors.tooltipBorder}`,
  boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.15)',
  fontSize: 13,
};
