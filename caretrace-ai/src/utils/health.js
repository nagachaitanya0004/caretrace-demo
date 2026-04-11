export const getSeverityLabel = (severity) => {
  const value = Number(severity);
  if (value <= 3) return 'Low';
  if (value <= 7) return 'Medium';
  return 'High';
};

export const getRiskColor = (risk) => {
  switch (risk) {
    case 'Low':
      return 'green';
    case 'Medium':
      return 'yellow';
    case 'High':
      return 'red';
    default:
      return 'blue';
  }
};

export const formattedDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
