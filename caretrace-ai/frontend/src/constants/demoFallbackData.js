/**
 * Client-side demo dataset when API/DB is unavailable or returns empty for the demo user.
 * Mirrors backend/seed.py so the product always showcases features.
 */
const DEMO_USER_ID = '60d5ecb8b392d7001f3e3a41';

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

export const DEMO_FALLBACK_PROFILE = {
  id: DEMO_USER_ID,
  name: 'Rahul Sharma',
  email: 'rahul@demo.com',
  age: 45,
  gender: 'Male',
  lifestyle: 'Smoker',
  is_active: true,
};

export const DEMO_FALLBACK_SYMPTOMS = [
  { id: '60d5ecb8b392d7001f3e3a42', user_id: DEMO_USER_ID, symptom: 'cough', severity: 4, duration: 4, date: daysAgo(15), timestamp: daysAgo(15) },
  { id: '60d5ecb8b392d7001f3e3a43', user_id: DEMO_USER_ID, symptom: 'fever', severity: 5, duration: 2, date: daysAgo(13), timestamp: daysAgo(13) },
  { id: '60d5ecb8b392d7001f3e3a44', user_id: DEMO_USER_ID, symptom: 'fatigue', severity: 6, duration: 3, date: daysAgo(10), timestamp: daysAgo(10) },
  { id: '60d5ecb8b392d7001f3e3a45', user_id: DEMO_USER_ID, symptom: 'cough', severity: 7, duration: 10, date: daysAgo(6), timestamp: daysAgo(6) },
  { id: '60d5ecb8b392d7001f3e3a46', user_id: DEMO_USER_ID, symptom: 'chest pain', severity: 6, duration: 3, date: daysAgo(1), timestamp: daysAgo(1) },
];

export const DEMO_FALLBACK_ALERTS = [
  {
    id: '60d5ecb8b392d7001f3e3a48',
    user_id: DEMO_USER_ID,
    message: 'Symptoms have persisted for a long time. Screening is recommended.',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: '60d5ecb8b392d7001f3e3a49',
    user_id: DEMO_USER_ID,
    message: 'Multiple secondary symptoms detected. Further clinical evaluation needed immediately.',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    is_read: false,
  },
];

export const DEMO_FALLBACK_ANALYSIS = {
  id: '60d5ecb8b392d7001f3e3a47',
  user_id: DEMO_USER_ID,
  risk: 'High',
  risk_level: 'High',
  reason:
    'Persistent cough for more than 14 days along with multiple symptoms. The repeated severity escalation and appearance of chest pain coupled with a smoker lifestyle places you in a high-risk trajectory.',
  recommendation:
    'Consult a doctor immediately. Recommended clinical screening required regarding persistent pulmonary stress variants.',
  timestamp: new Date().toISOString(),
};
