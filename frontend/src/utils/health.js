export const getSeverityLabel = (severity, t) => {
  const value = Number(severity);
  if (!t) {
    if (value <= 3) return 'Low';
    if (value <= 7) return 'Medium';
    return 'High';
  }
  
  if (value <= 3) return t('common.severity.low');
  if (value <= 7) return t('common.severity.medium');
  return t('common.severity.high');
};

export const getRiskColor = (risk) => {
  switch (risk?.toLowerCase()) {
    case 'low':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'red';
    default:
      return 'blue';
  }
};

export const formattedDate = (dateString, lng = 'en-US') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(lng, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
