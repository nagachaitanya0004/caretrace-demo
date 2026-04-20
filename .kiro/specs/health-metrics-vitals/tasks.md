# Tasks — Health Metrics (Vitals)

## Task List

- [x] 1. Register `health_metrics` collection in DB setup
  - [x] 1.1 Verify `HEALTH_METRICS_COLLECTION`, `HEALTH_METRICS_VALIDATOR`, and the compound index `(user_id ASC, recorded_at DESC)` are present in `backend/app/models/setup.py` → `get_collection_configuration()`
  - [x] 1.2 Confirm `init_db()` in `backend/app/db/db.py` will create the collection and index on startup (no code change needed if already wired)

- [x] 2. Backend API routes (verify existing implementation is complete)
  - [x] 2.1 Confirm `POST /api/health-metrics` in `routes.py` rejects all-null payloads with 400, sets `user_id` / `recorded_at` / `created_at`, and inserts a new document
  - [x] 2.2 Confirm `GET /api/health-metrics` in `routes.py` queries by `user_id` and sorts by `recorded_at` descending

- [x] 3. Backend tests
  - [x] 3.1 Write example-based unit tests in `backend/tests/test_health_metrics.py`:
    - POST with empty body → 400
    - POST with valid single-field payload → 201, `recorded_at` and `created_at` set
    - GET for user with no records → `[]` with 200
    - Two users each get only their own records
  - [x] 3.2 Write Hypothesis property tests in `backend/tests/test_health_metrics_properties.py`:
    - **Property 1** — any non-empty subset of valid fields is accepted by `HealthMetricsCreate` (Feature: health-metrics-vitals, Property 1)
    - **Property 2** — N sequential POSTs produce exactly N records for the user (Feature: health-metrics-vitals, Property 2)
    - **Property 3** — inserted document's `user_id` equals the authenticated user's `_id` (Feature: health-metrics-vitals, Property 3)
    - **Property 4** — out-of-range values raise `ValidationError` / return 422 (Feature: health-metrics-vitals, Property 4)
    - **Property 5** — GET returns records sorted by `recorded_at` descending, scoped to the requesting user (Feature: health-metrics-vitals, Property 5)

- [x] 4. Frontend — `VitalsStep` component
  - [x] 4.1 Create `frontend/src/components/VitalsStep.jsx` with:
    - Five `type="number"` inputs (Systolic BP, Diastolic BP, Blood Sugar, Heart Rate, Oxygen Saturation)
    - All fields optional; per-field client-side range validation
    - "Next" button: if all empty → call `onNext()` without API; if any filled and valid → POST then call `onNext()` regardless of outcome; if any filled but invalid → show inline errors, block
    - "Skip" button: call `onNext()` without API
    - Disable all inputs and buttons while `isSubmitting` is true
    - Use CSS custom-property inline styles matching existing onboarding steps (`S.*` pattern)
  - [x] 4.2 Write unit tests in `frontend/src/components/VitalsStep.test.jsx`:
    - Renders five labeled inputs
    - Skip advances without API call
    - All-empty Next advances without API call
    - POST failure still advances (non-blocking)
    - Inputs and buttons disabled while submitting
  - [x] 4.3 Write fast-check property tests in `frontend/src/components/VitalsStep.properties.test.jsx`:
    - **Property 6** — out-of-range value blocks submission and shows error (Feature: health-metrics-vitals, Property 6)
    - **Property 7** — any non-empty valid subset triggers POST then onNext (Feature: health-metrics-vitals, Property 7)

- [x] 5. Frontend — update `Onboarding.jsx`
  - [x] 5.1 Change `TOTAL_STEPS` from `4` to `5`
  - [x] 5.2 Append `'Health Metrics (Optional)'` to `STEP_TITLES`
  - [x] 5.3 Change `handleStep4Next` to call `setStep(5)` instead of `finishOnboarding()`
  - [x] 5.4 Add `handleStep5Next` that calls `finishOnboarding()`
  - [x] 5.5 Import `VitalsStep` and render `{step === 5 && <VitalsStep onNext={handleStep5Next} disabled={isSubmitting} />}` after the step 4 block

- [x] 6. Frontend — `HealthMetricsSection` component
  - [x] 6.1 Create `frontend/src/components/HealthMetricsSection.jsx` with:
    - On mount: `GET /api/health-metrics`, store `records[0]` as `latest` (or `null`)
    - Display five `DisplayRow` entries; show "Not provided" when `latest` is null or field is absent
    - "Add Entry" button toggles inline form
    - Inline form: five `type="number"` inputs with per-field range validation
    - Submit: if all empty → show validation message, no API call; if any filled and valid → POST, re-fetch GET, close form, success notification; if POST fails → error notification, no display update
    - Use `Card`, `Button`, `SectionHeader`, `DisplayRow` components and Tailwind classes matching existing sections
  - [x] 6.2 Write unit tests in `frontend/src/components/HealthMetricsSection.test.jsx`:
    - Shows "Not provided" for all fields when GET returns `[]`
    - "Add Entry" opens inline form
    - All-empty submit shows validation message and makes no API call
    - POST failure shows error notification and does not update displayed values
  - [x] 6.3 Write fast-check property tests in `frontend/src/components/HealthMetricsSection.properties.test.jsx`:
    - **Property 6** — out-of-range value blocks submission and shows error (Feature: health-metrics-vitals, Property 6)
    - **Property 8** — any non-empty valid subset triggers POST, re-fetches GET, calls addNotification with success (Feature: health-metrics-vitals, Property 8)

- [x] 7. Frontend — update `HealthProfile.jsx`
  - [x] 7.1 Import `HealthMetricsSection` from `../components/HealthMetricsSection`
  - [x] 7.2 Append `<HealthMetricsSection addNotification={addNotification} />` after the Lifestyle & Habits `<Card>` block
  - [x] 7.3 Verify no existing state variables, fetch calls, or JSX are modified

- [x] 8. Integration smoke test
  - [x] 8.1 Manually verify end-to-end: complete onboarding through step 5, confirm record appears in `health_metrics` collection
  - [x] 8.2 Manually verify Health Profile page loads the new section and "Add Entry" flow works
