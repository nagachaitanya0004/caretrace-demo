/** Matches `backend/seed.py` — symptom timeline, analysis, alerts, reports */
export const DEMO_EMAIL = 'rahul@demo.com';
export const DEMO_PASSWORD = 'demo1234';

/** Shown for the seeded demo user (no medications API yet) */
export const DEMO_MEDICATIONS = [
  { name: 'Salbutamol inhaler', dose: '100 mcg', schedule: 'As needed', notes: 'For breathlessness' },
  { name: 'Paracetamol', dose: '500 mg', schedule: 'Twice daily with food', notes: 'As directed for fever' },
  { name: 'Vitamin D3', dose: '1000 IU', schedule: 'Once daily', notes: 'Morning' },
];

export function isDemoEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase();
}
