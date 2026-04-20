# Requirements Document

## Introduction

The Health Metrics (Vitals) module adds structured capture of basic physiological measurements — blood pressure, blood sugar, heart rate, and oxygen saturation — to the CareTrace AI platform. The feature is introduced as an optional new step in the existing onboarding flow and as a dedicated section on the Health Profile page. All additions are isolated: no existing tables, routes, or UI components are modified. The module supports time-series tracking so that multiple readings per user can be stored and compared over time, improving AI-driven health analysis.

## Glossary

- **Health_Metrics_Module**: The isolated feature set described in this document, covering database, API, onboarding step, and Health Profile section.
- **Health_Metrics_Record**: A single document in the `health_metrics` MongoDB collection representing one set of vitals captured at a point in time.
- **Vitals_Form**: The React component rendered as the new onboarding step that collects health metric inputs.
- **Health_Profile_Page**: The existing `HealthProfile.jsx` page at `/health-profile`.
- **Health_Metrics_Section**: The new card added to the Health Profile Page that displays and allows entry of health metrics.
- **API**: The FastAPI backend service.
- **Onboarding_Flow**: The existing multi-step wizard in `Onboarding.jsx`.
- **User**: An authenticated CareTrace AI account holder.

---

## Requirements

### Requirement 1: Isolated Database Collection

**User Story:** As a developer, I want health metrics stored in a dedicated, non-breaking collection, so that existing data models and queries are unaffected.

#### Acceptance Criteria

1. THE Health_Metrics_Module SHALL store vitals in a MongoDB collection named `health_metrics` that is separate from `users`, `medical_history`, `family_history`, and `lifestyle_data`.
2. THE Health_Metrics_Module SHALL allow each `health_metrics` document to contain the fields: `user_id`, `systolic_bp`, `diastolic_bp`, `blood_sugar_mg_dl`, `heart_rate_bpm`, `oxygen_saturation`, `recorded_at`, and `created_at`.
3. THE Health_Metrics_Module SHALL keep all vital fields (`systolic_bp`, `diastolic_bp`, `blood_sugar_mg_dl`, `heart_rate_bpm`, `oxygen_saturation`) nullable so that a record can be saved with any subset of values.
4. THE Health_Metrics_Module SHALL allow multiple `health_metrics` records per user to support time-series tracking.
5. THE Health_Metrics_Module SHALL NOT modify the schema or indexes of any existing collection.

---

### Requirement 2: Backend API — Record Creation

**User Story:** As a User, I want my vitals saved when I submit the onboarding step or add a new entry, so that my data is persisted securely.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/health-metrics` with a valid authentication token, THE API SHALL insert a new `health_metrics` document linked to the authenticated user's `user_id`.
2. WHEN a POST request is sent to `/api/health-metrics`, THE API SHALL set `recorded_at` and `created_at` to the current UTC timestamp automatically.
3. WHEN a POST request is sent to `/api/health-metrics` with all vital fields omitted or null, THE API SHALL return a 400 error response with a descriptive message.
4. WHEN a POST request is sent to `/api/health-metrics` with a vital value outside its valid range (e.g. `systolic_bp` < 50 or > 300), THE API SHALL return a 422 validation error.
5. THE API SHALL NOT overwrite or modify any existing `health_metrics` record; each POST SHALL create a new record.

---

### Requirement 3: Backend API — Record Retrieval

**User Story:** As a User, I want to retrieve my recorded vitals, so that the Health Profile page can display them.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/health-metrics` with a valid authentication token, THE API SHALL return all `health_metrics` records belonging to the authenticated user, sorted by `recorded_at` descending.
2. WHEN a GET request is sent to `/api/health-metrics` and the user has no records, THE API SHALL return an empty list with a 200 status.
3. THE API SHALL NOT return `health_metrics` records belonging to any other user.

---

### Requirement 4: Onboarding Step — Vitals Form

**User Story:** As a User completing onboarding, I want an optional step to enter my current vitals, so that CareTrace AI can use them for initial health analysis.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL include a new step titled "Health Metrics (Optional)" inserted after the existing final step (Lifestyle & Habits).
2. THE Vitals_Form SHALL display input fields for: Systolic BP, Diastolic BP, Blood Sugar (mg/dL), Heart Rate (bpm), and Oxygen Saturation (%).
3. THE Vitals_Form SHALL mark all fields as optional and SHALL NOT block progression when all fields are left empty.
4. WHEN the User clicks "Next" on the Vitals_Form with at least one field filled, THE Vitals_Form SHALL call POST `/api/health-metrics` and advance to the next step on success.
5. WHEN the User clicks "Next" on the Vitals_Form with all fields empty, THE Vitals_Form SHALL advance to the next step without making an API call.
6. WHEN the User clicks "Skip" on the Vitals_Form, THE Vitals_Form SHALL advance to the next step without making an API call.
7. WHILE a submission is in progress, THE Vitals_Form SHALL disable all inputs and buttons to prevent duplicate submissions.
8. IF the POST `/api/health-metrics` call fails, THE Vitals_Form SHALL advance to the next step anyway so that a network error does not block onboarding completion.
9. THE Vitals_Form SHALL use the same CSS custom-property-based inline styles as the existing onboarding steps and SHALL NOT introduce new global CSS classes or modify existing ones.
10. THE Onboarding_Flow SHALL update its total step count and progress indicator to reflect the new step.

---

### Requirement 5: Health Profile — Health Metrics Section

**User Story:** As a User, I want to view my latest vitals and add new readings on my Health Profile page, so that I can track changes over time.

#### Acceptance Criteria

1. THE Health_Profile_Page SHALL include a new Health_Metrics_Section card rendered below the existing Lifestyle & Habits card.
2. WHEN the Health_Profile_Page loads, THE Health_Metrics_Section SHALL fetch and display the most recently recorded `health_metrics` values for the authenticated user.
3. WHEN no `health_metrics` records exist for the user, THE Health_Metrics_Section SHALL display a "Not provided" placeholder for each metric.
4. THE Health_Metrics_Section SHALL display the following labelled values: Systolic BP, Diastolic BP, Blood Sugar, Heart Rate, and Oxygen Saturation.
5. THE Health_Metrics_Section SHALL include an "Add Entry" button that opens an inline form for entering new vitals.
6. WHEN the User submits the inline form with at least one value, THE Health_Metrics_Section SHALL call POST `/api/health-metrics`, refresh the displayed values, and show a success notification.
7. WHEN the User submits the inline form with all fields empty, THE Health_Metrics_Section SHALL display a validation message and SHALL NOT call the API.
8. IF the POST `/api/health-metrics` call fails, THE Health_Metrics_Section SHALL display an error notification and SHALL NOT update the displayed values.
9. THE Health_Metrics_Section SHALL use the same Tailwind CSS utility classes and component patterns (`Card`, `Button`, `SectionHeader`, `DisplayRow`) as the existing sections on the Health_Profile_Page.
10. THE Health_Metrics_Section SHALL NOT modify any existing section, state variable, or fetch call on the Health_Profile_Page.

---

### Requirement 6: Input Validation and Data Safety

**User Story:** As a developer, I want all health metric inputs validated on both client and server, so that invalid data never reaches the database.

#### Acceptance Criteria

1. THE Vitals_Form SHALL accept only numeric input for all vital fields.
2. WHEN a vital field contains a non-numeric or out-of-range value, THE Vitals_Form SHALL prevent form submission and display an inline error message.
3. THE API SHALL enforce the following ranges via Pydantic schema validation: `systolic_bp` 50–300, `diastolic_bp` 30–200, `heart_rate_bpm` 20–300, `oxygen_saturation` 50–100, `blood_sugar_mg_dl` ≥ 0.
4. IF a submitted value fails range validation, THE API SHALL return a 422 response with a field-level error message.
5. THE Health_Metrics_Module SHALL handle null and empty string inputs safely on both client and server without throwing unhandled exceptions.
