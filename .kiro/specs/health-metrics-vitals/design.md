# Design Document — Health Metrics (Vitals)

## Overview

The Health Metrics (Vitals) module adds structured capture and display of five physiological measurements — systolic BP, diastolic BP, blood sugar, heart rate, and oxygen saturation — to the CareTrace AI platform.

The feature is entirely additive:

- A new MongoDB collection (`health_metrics`) stores time-series vitals records.
- Two new FastAPI routes (`POST /api/health-metrics`, `GET /api/health-metrics`) handle persistence and retrieval.
- A new optional step (Step 5) is appended to the existing onboarding wizard.
- A new `HealthMetricsSection` card is appended to the existing `HealthProfile.jsx` page.

No existing collections, routes, schemas, or UI components are modified.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                         │
│                                                                 │
│  Onboarding.jsx                  HealthProfile.jsx              │
│  ┌──────────────────────┐        ┌──────────────────────────┐   │
│  │ Step 5: VitalsStep   │        │ HealthMetricsSection     │   │
│  │ (new component)      │        │ (new component)          │   │
│  └──────────┬───────────┘        └────────────┬─────────────┘   │
│             │  POST /api/health-metrics        │ GET + POST      │
└─────────────┼──────────────────────────────────┼────────────────┘
              │                                  │
┌─────────────▼──────────────────────────────────▼────────────────┐
│  FastAPI (Python)                                               │
│                                                                 │
│  routes.py                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/health-metrics  (create_health_metrics)       │   │
│  │  GET  /api/health-metrics  (list_health_metrics)         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │  Motor async driver               │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  MongoDB                                                        │
│  Collection: health_metrics                                     │
│  Index: (user_id ASC, recorded_at DESC)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Append-only records**: Each POST creates a new document. There is no update/delete endpoint. This preserves the full time-series history and keeps the API surface minimal.
- **Nullable vitals**: All five metric fields are optional at the document level. A record is only rejected when *all* fields are omitted (400) or a provided value is out of range (422).
- **Frontend isolation**: The new onboarding step and health profile section are self-contained components. They do not touch existing state variables, fetch calls, or JSX in their parent files beyond being inserted/appended.
- **Error-tolerant onboarding**: A failed API call during the vitals step advances the wizard anyway, matching the resilience pattern used by all existing onboarding steps.

---

## Components and Interfaces

### Backend

#### `POST /api/health-metrics`

- **Auth**: Bearer token required (`get_current_user` dependency).
- **Request body**: `HealthMetricsCreate` Pydantic schema (already defined in `schemas.py`).
- **Behaviour**:
  1. Strip `None` fields from the payload dict.
  2. If the resulting dict is empty → raise `HTTPException(400, "At least one metric value is required")`.
  3. Inject `user_id`, `recorded_at = datetime.utcnow()`, `created_at = datetime.utcnow()`.
  4. Insert into `health_metrics` collection.
  5. Return `success_response(serialize_document(saved))`.
- **Validation errors**: Pydantic enforces range constraints; FastAPI returns 422 automatically.

> This route is already implemented in `routes.py`. No changes needed.

#### `GET /api/health-metrics`

- **Auth**: Bearer token required.
- **Behaviour**: Query `{ user_id: current_user._id }`, sort `recorded_at DESC`, return all records.
- **Empty result**: Returns `success_response([])` with 200.

> This route is already implemented in `routes.py`. No changes needed.

---

### Frontend

#### `VitalsStep` component (new file: `frontend/src/components/VitalsStep.jsx`)

Props:

| Prop | Type | Description |
|------|------|-------------|
| `onNext` | `() => void` | Advance wizard to next step |
| `disabled` | `bool` | Externally controlled disable (e.g. parent submitting) |

Internal state:

| State | Type | Description |
|-------|------|-------------|
| `form` | `object` | `{ systolic_bp, diastolic_bp, blood_sugar_mg_dl, heart_rate_bpm, oxygen_saturation }` — all `''` initially |
| `errors` | `object` | Per-field validation error strings |
| `isSubmitting` | `bool` | True while POST is in-flight |

Behaviour:

- All fields are `type="number"` inputs.
- On "Next" click:
  1. Run client-side validation (numeric, in-range). Populate `errors` and abort if any field has a value that fails.
  2. If all fields are empty → call `onNext()` directly (no API call).
  3. If at least one field is filled and valid → POST `/api/health-metrics`, then call `onNext()` regardless of success/failure.
- On "Skip" click → call `onNext()` directly.
- While `isSubmitting` is true → all inputs and buttons are `disabled`.
- Uses the same `S.*` inline style objects as the existing onboarding steps (CSS custom properties).

#### Changes to `Onboarding.jsx`

- `TOTAL_STEPS` constant: `4 → 5`.
- `STEP_TITLES` array: append `'Health Metrics (Optional)'`.
- Step 4 handler (`handleStep4Next`): currently calls `finishOnboarding()` after saving lifestyle. Change it to call `setStep(5)` instead.
- New step 5 handler (`handleStep5Next`): calls `finishOnboarding()`.
- Render: add `{step === 5 && <VitalsStep onNext={handleStep5Next} disabled={isSubmitting} />}` after the step 4 block.
- Progress bar: driven by `TOTAL_STEPS`, so it updates automatically.

#### `HealthMetricsSection` component (new file: `frontend/src/components/HealthMetricsSection.jsx`)

Props:

| Prop | Type | Description |
|------|------|-------------|
| `addNotification` | `fn` | From `useNotification()` — passed in from parent |

Internal state:

| State | Type | Description |
|-------|------|-------------|
| `latest` | `object \| null` | Most recent record from GET response |
| `loading` | `bool` | True while initial fetch is in-flight |
| `showForm` | `bool` | Controls inline entry form visibility |
| `form` | `object` | Same five fields as VitalsStep |
| `errors` | `object` | Per-field validation error strings |
| `saving` | `bool` | True while POST is in-flight |

Behaviour:

- On mount: `GET /api/health-metrics`, take `records[0]` as `latest` (or `null` if empty).
- Display: five `DisplayRow` entries using the same helper as `HealthProfile.jsx`. Shows "Not provided" when `latest` is null or the field is absent.
- "Add Entry" button: sets `showForm = true`.
- Inline form submit:
  1. Validate all filled fields are in range. Show per-field errors and abort if invalid.
  2. If all fields empty → show validation message, do not call API.
  3. POST `/api/health-metrics` → on success: re-fetch, close form, `addNotification('Vitals recorded', 'success')`.
  4. On failure: `addNotification(err.message, 'error')`, do not update displayed values.
- Uses `Card`, `Button`, `SectionHeader`, `DisplayRow` — same components and Tailwind classes as existing sections.

#### Changes to `HealthProfile.jsx`

- Import `HealthMetricsSection`.
- Append `<HealthMetricsSection addNotification={addNotification} />` after the Lifestyle & Habits `<Card>`.
- No other changes.

---

## Data Models

### `health_metrics` Collection Document

```json
{
  "_id":                ObjectId,
  "user_id":            ObjectId,       // required
  "systolic_bp":        int,            // optional, 50–300
  "diastolic_bp":       int,            // optional, 30–200
  "blood_sugar_mg_dl":  double,         // optional, ≥ 0
  "heart_rate_bpm":     int,            // optional, 20–300
  "oxygen_saturation":  int,            // optional, 50–100
  "recorded_at":        ISODate,        // required, set by server
  "created_at":         ISODate         // required, set by server
}
```

The MongoDB validator (`HEALTH_METRICS_VALIDATOR`) and the compound index `(user_id ASC, recorded_at DESC)` are already defined in `models.py` and `setup.py` respectively.

### Pydantic Schema — `HealthMetricsCreate`

Already defined in `schemas.py`:

```python
class HealthMetricsCreate(BaseModel):
    systolic_bp:       Optional[int]   = Field(default=None, ge=50,  le=300)
    diastolic_bp:      Optional[int]   = Field(default=None, ge=30,  le=200)
    blood_sugar_mg_dl: Optional[float] = Field(default=None, ge=0)
    heart_rate_bpm:    Optional[int]   = Field(default=None, ge=20,  le=300)
    oxygen_saturation: Optional[int]   = Field(default=None, ge=50,  le=100)
```

### Client-Side Validation Ranges

| Field | Min | Max | Type |
|-------|-----|-----|------|
| `systolic_bp` | 50 | 300 | integer |
| `diastolic_bp` | 30 | 200 | integer |
| `blood_sugar_mg_dl` | 0 | — | float |
| `heart_rate_bpm` | 20 | 300 | integer |
| `oxygen_saturation` | 50 | 100 | integer |

These mirror the Pydantic constraints exactly, providing a consistent dual-layer validation.

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Any non-empty subset of vital fields is accepted

*For any* non-empty subset of the five vital fields (`systolic_bp`, `diastolic_bp`, `blood_sugar_mg_dl`, `heart_rate_bpm`, `oxygen_saturation`) where each provided value is within its valid range, the `HealthMetricsCreate` Pydantic schema SHALL accept the payload without raising a validation error.

**Validates: Requirements 1.3, 6.3**

---

### Property 2: Each POST creates a new, independent record (append-only)

*For any* N ≥ 1 sequential valid POST requests to `/api/health-metrics` by the same authenticated user, the `health_metrics` collection SHALL contain exactly N documents for that user after all requests complete — no existing document is overwritten or modified.

**Validates: Requirements 1.4, 2.5**

---

### Property 3: Inserted record is always linked to the authenticated user

*For any* valid `HealthMetricsCreate` payload submitted by an authenticated user, the resulting `health_metrics` document's `user_id` field SHALL equal that user's `_id`.

**Validates: Requirements 2.1**

---

### Property 4: Out-of-range vital values are rejected by schema validation

*For any* vital field and *for any* value that falls outside that field's defined valid range (e.g. `systolic_bp` < 50 or > 300), the `HealthMetricsCreate` Pydantic schema SHALL raise a `ValidationError`, and the API endpoint SHALL return a 422 response.

**Validates: Requirements 2.4, 6.3, 6.4**

---

### Property 5: GET returns only the requesting user's records, sorted descending

*For any* two distinct users each having their own set of `health_metrics` records, a GET request by user A SHALL return exactly the records belonging to user A — no records from user B — and the records SHALL be ordered by `recorded_at` descending (most recent first).

**Validates: Requirements 3.1, 3.3**

---

### Property 6: Client-side validation blocks submission for out-of-range values

*For any* vital field and *for any* value that falls outside that field's valid range, clicking "Next" or "Submit" on either the `VitalsStep` or `HealthMetricsSection` form SHALL not invoke the POST API and SHALL display an inline error message for the offending field.

**Validates: Requirements 6.2**

---

### Property 7: Onboarding vitals form calls POST for any non-empty valid submission

*For any* non-empty subset of valid vital field values entered in the `VitalsStep` form, clicking "Next" SHALL invoke `POST /api/health-metrics` with those values before advancing the wizard.

**Validates: Requirements 4.4**

---

### Property 8: Health profile vitals form calls POST and refreshes for any non-empty valid submission

*For any* non-empty subset of valid vital field values entered in the `HealthMetricsSection` inline form, submitting SHALL invoke `POST /api/health-metrics`, then re-fetch `GET /api/health-metrics` to refresh the displayed values, and SHALL call `addNotification` with a success message.

**Validates: Requirements 5.6**

---

## Error Handling

### Backend

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| All vital fields omitted / null | 400 | `{ success: false, message: "At least one metric value is required" }` |
| A field value is out of range | 422 | FastAPI validation error with field-level detail |
| Missing or invalid auth token | 401 | Standard auth error from `get_current_user` |
| Database insert failure | 500 | Unhandled exception → FastAPI default 500 |

### Frontend — VitalsStep (Onboarding)

| Scenario | Behaviour |
|----------|-----------|
| All fields empty on "Next" | Advance wizard, no API call |
| A field has an out-of-range value | Show inline error, block submission |
| POST succeeds | Advance wizard |
| POST fails (network / server error) | Advance wizard anyway (non-blocking) |
| "Skip" clicked | Advance wizard, no API call |

### Frontend — HealthMetricsSection (Health Profile)

| Scenario | Behaviour |
|----------|-----------|
| All fields empty on submit | Show validation message, no API call |
| A field has an out-of-range value | Show inline error, block submission |
| POST succeeds | Re-fetch GET, update display, success notification |
| POST fails | Error notification, displayed values unchanged |
| GET fails on mount | `latest` remains null, all fields show "Not provided" |

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used. Unit tests cover specific scenarios, edge cases, and integration points. Property tests verify universal correctness across a wide input space.

### Property-Based Testing Library

**Backend (Python)**: [Hypothesis](https://hypothesis.readthedocs.io/) — the standard PBT library for Python.  
**Frontend (JavaScript)**: [fast-check](https://fast-check.dev/) — the standard PBT library for JavaScript/TypeScript.

Each property test runs a minimum of **100 iterations**.

### Backend Unit Tests (`backend/tests/`)

- `test_health_metrics_create_empty` — POST with empty body → 400
- `test_health_metrics_create_timestamps` — POST with valid payload → `recorded_at` and `created_at` are set and close to now
- `test_health_metrics_get_empty` — GET for user with no records → `[]` with 200
- `test_health_metrics_get_no_cross_user` — two users, each gets only their own records (example with 2 users)
- `test_health_metrics_skip_in_onboarding` — all fields empty → no insert, wizard advances

### Backend Property Tests (`backend/tests/`)

**Feature: health-metrics-vitals, Property 1: Any non-empty subset of vital fields is accepted**
```python
@given(st.fixed_dictionaries({...}).filter(lambda d: any(v is not None for v in d.values())))
def test_any_valid_subset_accepted(payload): ...
```

**Feature: health-metrics-vitals, Property 2: Each POST creates a new record**
```python
@given(st.integers(min_value=1, max_value=10))
def test_append_only_n_posts(n): ...
```

**Feature: health-metrics-vitals, Property 3: Inserted record linked to authenticated user**
```python
@given(valid_health_metrics_payload())
def test_inserted_record_has_correct_user_id(payload): ...
```

**Feature: health-metrics-vitals, Property 4: Out-of-range values rejected**
```python
@given(out_of_range_health_metrics_payload())
def test_out_of_range_rejected(payload): ...
```

**Feature: health-metrics-vitals, Property 5: GET returns user's records sorted descending**
```python
@given(st.lists(valid_health_metrics_payload(), min_size=1, max_size=20))
def test_get_sorted_descending_scoped_to_user(records): ...
```

### Frontend Unit Tests (`frontend/src/`)

- `VitalsStep.test.jsx` — renders five inputs; Skip advances without API call; all-empty Next advances without API call; POST failure still advances; inputs disabled while submitting
- `HealthMetricsSection.test.jsx` — shows "Not provided" when no records; "Add Entry" opens form; all-empty submit shows validation message; POST failure shows error notification and does not update display

### Frontend Property Tests (`frontend/src/`)

**Feature: health-metrics-vitals, Property 6: Client-side validation blocks out-of-range**
```js
fc.assert(fc.property(outOfRangeVitalsArb(), ({ field, value }) => {
  // render form, set field to value, click submit
  // assert: no API call, error message shown for field
}))
```

**Feature: health-metrics-vitals, Property 7: Onboarding form calls POST for any non-empty valid submission**
```js
fc.assert(fc.property(nonEmptyValidVitalsSubsetArb(), (subset) => {
  // render VitalsStep, fill subset, click Next
  // assert: POST called with subset values, onNext called
}))
```

**Feature: health-metrics-vitals, Property 8: Health profile form calls POST and refreshes**
```js
fc.assert(fc.property(nonEmptyValidVitalsSubsetArb(), (subset) => {
  // render HealthMetricsSection, open form, fill subset, submit
  // assert: POST called, GET re-fetched, addNotification called with 'success'
}))
```
