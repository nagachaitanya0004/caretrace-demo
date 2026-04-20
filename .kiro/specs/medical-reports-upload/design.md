# Design Document — Medical Reports Upload

## Overview

The Medical Reports Upload system enables CareTrace AI users to securely upload, store, and manage their medical documents (PDFs and images) using MongoDB GridFS. This feature integrates seamlessly with the existing health profile system, providing users with a centralized location to maintain their medical records.

The feature is entirely additive:

- A new MongoDB collection (`medical_reports`) stores file metadata (file_name, gridfs_file_id, file_type, uploaded_at).
- MongoDB GridFS (fs.files and fs.chunks collections) stores the actual file binaries with user_id in metadata for access control.
- Three new FastAPI routes handle upload, retrieval, and deletion operations.
- A new `MedicalReportsSection` component is added to the Health Profile page.
- No existing collections, routes, schemas, or UI components are modified.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                              │
│                                                                      │
│  HealthProfile.jsx                                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ MedicalReportsSection (new component)                          │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐   │  │
│  │  │ FileUploadButton │  │ ReportsList                      │   │  │
│  │  │ - File selection │  │ - Display uploaded files         │   │  │
│  │  │ - Validation     │  │ - View/Download buttons          │   │  │
│  │  │ - Progress UI    │  │ - Delete functionality           │   │  │
│  │  └────────┬─────────┘  └──────────┬───────────────────────┘   │  │
│  │           │ POST /api/medical-reports/upload                  │  │
│  │           │ GET /api/medical-reports                          │  │
│  │           │ GET /api/medical-reports/{id}/download            │  │
│  │           │ DELETE /api/medical-reports/{id}                  │  │
│  └───────────┼───────────────────────┼───────────────────────────┘  │
└──────────────┼───────────────────────┼──────────────────────────────┘
               │                       │
┌──────────────▼───────────────────────▼──────────────────────────────┐
│  FastAPI (Python)                                                   │
│                                                                     │
│  routes.py (new endpoints)                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  POST   /api/medical-reports/upload                          │   │
│  │  GET    /api/medical-reports                                 │   │
│  │  GET    /api/medical-reports/{report_id}/download            │   │
│  │  DELETE /api/medical-reports/{report_id}                     │   │
│  └──────────┬────────────────────────┬──────────────────────────┘   │
│             │                        │                              │
│             │ GridFS (Motor)         │ Motor async driver           │
└─────────────┼────────────────────────┼──────────────────────────────┘
              │                        │
┌─────────────▼────────────────────────▼──────────────────────────────┐
│  MongoDB                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐    │
│  │ GridFS Collections   │  │  Collection: medical_reports     │    │
│  │ - fs.files           │  │  Index: (user_id ASC,            │    │
│  │ - fs.chunks          │  │          uploaded_at DESC)       │    │
│  │ - user_id in metadata│  └──────────────────────────────────┘    │
│  │ - 10MB file limit    │                                           │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **MongoDB GridFS for files**: Stores binary files directly in MongoDB using GridFS, eliminating the need for external storage services.
- **Metadata in medical_reports collection**: File metadata (name, GridFS file ID, type, timestamp) is stored in a separate collection for fast querying.
- **User_id in GridFS metadata**: Each GridFS file stores user_id in its metadata for access control verification.
- **Streaming file access**: Files are streamed from GridFS through API endpoints with authentication and authorization checks.
- **Transactional cleanup**: If database insert fails after file upload, the uploaded file is deleted from GridFS to maintain consistency.
- **Frontend isolation**: The new component is self-contained and appended to the Health Profile page without modifying existing sections.
- **File type validation**: Both client-side and server-side validation ensure only PDF, JPG, and PNG files under 10MB are accepted.

---

## Components and Interfaces

### Backend

#### GridFS Client Configuration

**Update file**: `backend/app/db/db.py`

```python
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

# Add to existing db.py
_gridfs_bucket: AsyncIOMotorGridFSBucket | None = None

def get_gridfs_bucket() -> AsyncIOMotorGridFSBucket:
    """Get GridFS bucket for file storage."""
    global _gridfs_bucket
    if _gridfs_bucket is None:
        db = get_database()
        _gridfs_bucket = AsyncIOMotorGridFSBucket(db)
    return _gridfs_bucket
```

#### `POST /api/medical-reports/upload`

- **Auth**: Bearer token required (`get_current_user` dependency).
- **Request**: `multipart/form-data` with a `file` field.
- **File validation**:
  - File type: PDF, JPG, PNG (check MIME type and extension)
  - File size: ≤ 10MB
  - File not empty or corrupted
- **Behaviour**:
  1. Validate file type and size → 400 if invalid
  2. Read file content into memory
  3. Upload file to GridFS with metadata: `{"user_id": user_id, "filename": original_filename, "content_type": mime_type}`
  4. If upload fails → 500 with error message
  5. Retrieve GridFS file_id from upload result
  6. Insert metadata into `medical_reports` collection:
     - `user_id`: current user's ObjectId
     - `file_name`: original filename
     - `gridfs_file_id`: ObjectId from GridFS
     - `file_type`: detected MIME type
     - `uploaded_at`: current UTC timestamp
  7. If database insert fails → delete uploaded file from GridFS, return 500
  8. Return 201 with created document (serialized)
- **Response**: `success_response(serialize_document(report), message='Medical report uploaded successfully')`

**Error responses**:

| Scenario | Status | Response |
|----------|--------|----------|
| No file provided | 400 | `{ success: false, message: "No file provided" }` |
| Invalid file type | 400 | `{ success: false, message: "Invalid file type. Only PDF, JPG, and PNG are allowed" }` |
| File too large | 400 | `{ success: false, message: "File size exceeds 10MB limit" }` |
| GridFS upload fails | 500 | `{ success: false, message: "Failed to upload file to storage" }` |
| Database insert fails | 500 | `{ success: false, message: "Failed to save file metadata" }` |
| Missing auth token | 401 | Standard auth error |

#### `GET /api/medical-reports`

- **Auth**: Bearer token required.
- **Query parameters**: None
- **Behaviour**:
  1. Query `medical_reports` collection: `{ user_id: current_user._id }`
  2. Sort by `uploaded_at DESC` (newest first)
  3. Serialize all documents
  4. Return array of reports
- **Response**: `success_response(reports, message='Medical reports retrieved successfully')`
- **Empty result**: Returns `success_response([], message='Medical reports retrieved successfully')` with 200

#### `GET /api/medical-reports/{report_id}/download`

- **Auth**: Bearer token required.
- **Path parameter**: `report_id` (string, converted to ObjectId)
- **Query parameters**: 
  - `inline` (optional, boolean): If true, set Content-Disposition to inline for viewing; otherwise attachment for download
- **Behaviour**:
  1. Convert `report_id` to ObjectId → 400 if invalid
  2. Find report: `{ _id: report_id, user_id: current_user._id }`
  3. If not found → 404
  4. If found but `user_id` doesn't match → 403
  5. Retrieve GridFS file using `gridfs_file_id`
  6. If file not found in GridFS → 404
  7. Stream file content with appropriate headers:
     - `Content-Type`: file_type from metadata
     - `Content-Disposition`: `inline; filename="{file_name}"` or `attachment; filename="{file_name}"`
  8. Return StreamingResponse with file content
- **Response**: Binary file stream with appropriate headers

**Error responses**:

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid report_id format | 400 | `{ success: false, message: "Invalid report ID" }` |
| Report not found | 404 | `{ success: false, message: "Report not found" }` |
| User doesn't own report | 403 | `{ success: false, message: "Access denied" }` |
| File not found in GridFS | 404 | `{ success: false, message: "File not found in storage" }` |
| Missing auth token | 401 | Standard auth error |

#### `DELETE /api/medical-reports/{report_id}`

- **Auth**: Bearer token required.
- **Path parameter**: `report_id` (string, converted to ObjectId)
- **Behaviour**:
  1. Convert `report_id` to ObjectId → 400 if invalid
  2. Find report: `{ _id: report_id, user_id: current_user._id }`
  3. If not found → 404
  4. If found but `user_id` doesn't match → 403
  5. Delete file from GridFS using `gridfs_file_id`
  6. If GridFS delete fails → log warning but continue
  7. Delete document from `medical_reports` collection
  8. Return 200 with success message
- **Response**: `success_response(None, message='Medical report deleted successfully')`

**Error responses**:

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid report_id format | 400 | `{ success: false, message: "Invalid report ID" }` |
| Report not found | 404 | `{ success: false, message: "Report not found" }` |
| User doesn't own report | 403 | `{ success: false, message: "Access denied" }` |
| Missing auth token | 401 | Standard auth error |

---

### Frontend

#### `MedicalReportsSection` component (new file: `frontend/src/components/MedicalReportsSection.jsx`)

Props:

| Prop | Type | Description |
|------|------|-------------|
| `addNotification` | `fn` | From `useNotification()` — passed from parent |

Internal state:

| State | Type | Description |
|-------|------|-------------|
| `reports` | `array` | List of uploaded reports from GET response |
| `loading` | `bool` | True while initial fetch is in-flight |
| `uploading` | `bool` | True while file upload is in-flight |
| `uploadProgress` | `number` | Upload progress percentage (0-100) |
| `selectedFile` | `File \| null` | Currently selected file for upload |

Behaviour:

- On mount: `GET /api/medical-reports`, populate `reports`
- File selection:
  - Hidden `<input type="file" accept=".pdf,.jpg,.jpeg,.png" />` triggered by button click
  - On file select: validate type and size client-side
  - If invalid: show error notification, clear selection
  - If valid: set `selectedFile`, show file name
- Upload button click:
  1. Create `FormData` with selected file
  2. POST to `/api/medical-reports/upload` with `multipart/form-data`
  3. Show progress indicator during upload
  4. On success: re-fetch reports, clear selection, show success notification
  5. On failure: show error notification, keep selection
- View button click:
  - Open `/api/medical-reports/{report.id}/download?inline=true` in new tab
- Download button click:
  - Create temporary `<a>` element with `href=/api/medical-reports/{report.id}/download` and `download=file_name`
  - Trigger click programmatically
- Delete button click:
  1. Show confirmation dialog
  2. If confirmed: DELETE `/api/medical-reports/{report.id}`
  3. On success: remove from `reports` array, show success notification
  4. On failure: show error notification

**UI Structure**:

```jsx
<Card className="border-slate-200/80">
  <SectionHeader title="Medical Reports" icon={...} />
  
  {/* Upload Section */}
  <div className="mb-6">
    <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
    <Button onClick={() => fileInputRef.current.click()} disabled={uploading}>
      Upload Medical Report
    </Button>
    {selectedFile && <span>{selectedFile.name}</span>}
    {uploading && <ProgressBar progress={uploadProgress} />}
  </div>

  {/* Reports List */}
  {loading ? (
    <LoadingSpinner />
  ) : reports.length === 0 ? (
    <p className="text-gray-400 italic">No medical reports uploaded yet</p>
  ) : (
    <div className="space-y-3">
      {reports.map(report => (
        <ReportCard
          key={report.id}
          report={report}
          onView={() => handleView(report)}
          onDownload={() => handleDownload(report)}
          onDelete={() => handleDelete(report)}
        />
      ))}
    </div>
  )}
</Card>
```

**ReportCard sub-component**:

```jsx
<div className="flex items-center justify-between p-3 border rounded-md">
  <div className="flex items-center gap-3">
    <FileIcon type={report.file_type} />
    <div>
      <p className="font-medium text-gray-800">{report.file_name}</p>
      <p className="text-xs text-gray-400">
        {formatDate(report.uploaded_at)}
      </p>
    </div>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={onView}>View</Button>
    <Button variant="outline" size="sm" onClick={onDownload}>Download</Button>
    <Button variant="outline" size="sm" onClick={onDelete}>Delete</Button>
  </div>
</div>
```

#### Changes to `HealthProfile.jsx`

- Import `MedicalReportsSection`
- Append `<MedicalReportsSection addNotification={addNotification} />` after the `HealthMetricsSection` component
- No other changes

#### API Service Updates (`frontend/src/services/api.js`)

Add support for `multipart/form-data` uploads:

```javascript
export const api = {
  // ... existing methods ...
  
  uploadFile: (endpoint, formData) => {
    const token = localStorage.getItem('caretrace_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type - browser will set it with boundary
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse);
  },
};
```

---

## Data Models

### `medical_reports` Collection Document

```json
{
  "_id":            ObjectId,
  "user_id":        ObjectId,       // required, reference to users collection
  "file_name":      string,         // required, original filename
  "gridfs_file_id": ObjectId,       // required, reference to GridFS file
  "file_type":      string,         // required, MIME type (application/pdf, image/jpeg, image/png)
  "uploaded_at":    ISODate         // required, upload timestamp
}
```

**MongoDB Validator** (add to `backend/app/models/models.py`):

```python
MEDICAL_REPORTS_COLLECTION = 'medical_reports'

MEDICAL_REPORTS_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'file_name', 'gridfs_file_id', 'file_type', 'uploaded_at'],
        'properties': {
            '_id':            {'bsonType': 'objectId'},
            'user_id':        {'bsonType': 'objectId'},
            'file_name':      {'bsonType': 'string', 'description': 'Original filename'},
            'gridfs_file_id': {'bsonType': 'objectId', 'description': 'GridFS file ID'},
            'file_type':      {'bsonType': 'string', 'enum': ['application/pdf', 'image/jpeg', 'image/png']},
            'uploaded_at':    {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}
```

**Index** (add to `backend/app/models/setup.py`):

```python
await db.medical_reports.create_index([('user_id', 1), ('uploaded_at', -1)])
```

### GridFS File Metadata

GridFS automatically creates two collections: `fs.files` and `fs.chunks`.

**fs.files document** (created by GridFS):

```json
{
  "_id":         ObjectId,          // GridFS file ID
  "length":      number,            // File size in bytes
  "chunkSize":   number,            // Chunk size (default 255KB)
  "uploadDate":  ISODate,           // Upload timestamp
  "filename":    string,            // Original filename
  "metadata": {
    "user_id":      ObjectId,       // User who uploaded the file
    "content_type": string          // MIME type
  }
}
```

### Pydantic Schema — `MedicalReportResponse`

Add to `backend/app/schemas/schemas.py`:

```python
class MedicalReportResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    gridfs_file_id: str
    file_type: str
    uploaded_at: datetime
```

---

## File Upload Flow

### Step-by-Step Process

1. **User selects file**:
   - User clicks "Upload Medical Report" button
   - File input dialog opens
   - User selects a file (PDF, JPG, or PNG)

2. **Client-side validation**:
   - Check file type: must be PDF, JPG, or PNG
   - Check file size: must be ≤ 10MB
   - If invalid: show error notification, abort
   - If valid: enable upload button, show file name

3. **File upload initiation**:
   - User clicks upload button
   - Create `FormData` object with file
   - Set `uploading` state to true
   - Show progress indicator

4. **Backend receives request**:
   - Verify authentication token
   - Extract file from multipart request
   - Validate file type and size server-side
   - If invalid: return 400 error

5. **File storage**:
   - Read file content into memory
   - Upload to GridFS with metadata: `{"user_id": user_id, "filename": filename, "content_type": mime_type}`
   - If upload fails: return 500 error
   - Retrieve GridFS file_id from upload result

6. **Metadata persistence**:
   - Create document with file metadata
   - Insert into `medical_reports` collection
   - If insert fails: delete uploaded file from GridFS, return 500 error

7. **Success response**:
   - Return 201 with created document
   - Frontend receives response
   - Re-fetch reports list
   - Show success notification
   - Clear file selection
   - Reset upload state

8. **Error handling**:
   - If any step fails: show error notification
   - Keep file selection for retry
   - Log detailed error server-side

---

## Error Handling

### Backend Error Scenarios

| Scenario | Detection | Response | Cleanup |
|----------|-----------|----------|---------|
| No file in request | Check `file` field in form data | 400: "No file provided" | None |
| Invalid file type | Check MIME type and extension | 400: "Invalid file type..." | None |
| File too large | Check `file.size` | 400: "File size exceeds 10MB limit" | None |
| Empty/corrupted file | Check `file.size > 0` | 400: "File is empty or corrupted" | None |
| GridFS unavailable | Catch connection error | 500: "Storage service unavailable" | None |
| Upload to GridFS fails | Catch upload exception | 500: "Failed to upload file to storage" | None |
| Database insert fails | Catch insert exception | 500: "Failed to save file metadata" | Delete uploaded file from GridFS |
| Invalid report_id | Try ObjectId conversion | 400: "Invalid report ID" | None |
| Report not found | Query returns None | 404: "Report not found" | None |
| User doesn't own report | Check `user_id` match | 403: "Access denied" | None |
| GridFS file not found | GridFS query returns None | 404: "File not found in storage" | None |
| GridFS delete fails | Catch delete exception | Log warning, continue | None (metadata still deleted) |

### Frontend Error Scenarios

| Scenario | Detection | User Feedback | Recovery |
|----------|-----------|---------------|----------|
| Invalid file type selected | Check file extension | Error notification: "Only PDF, JPG, and PNG files are allowed" | Clear selection |
| File too large | Check `file.size` | Error notification: "File size must be under 10MB" | Clear selection |
| Network error during upload | Catch fetch error | Error notification: "Network error. Please check your connection" | Keep selection for retry |
| Server error (400/500) | Check response status | Error notification with server message | Keep selection for retry |
| Upload timeout | Fetch timeout | Error notification: "Upload timed out. Please try again" | Keep selection for retry |
| View/Download fails | Fetch error | Error notification: "File no longer available" | Refresh reports list |
| Delete confirmation cancelled | User clicks "Cancel" | No action | None |
| Delete fails | Catch API error | Error notification with error message | Keep report in list |

### Logging Strategy

**Backend** (using existing `app.core.logger`):

```python
logger.info(f"File upload initiated by user {user_id}: {filename}")
logger.info(f"File uploaded to GridFS: {gridfs_file_id}")
logger.info(f"Metadata saved for report {report_id}")
logger.warning(f"Failed to delete file from GridFS: {gridfs_file_id}")
logger.error(f"Upload failed for user {user_id}: {error_message}")
```

**Frontend** (console logging for debugging):

```javascript
console.log('File selected:', file.name, file.size, file.type);
console.log('Upload started:', formData);
console.log('Upload successful:', response);
console.error('Upload failed:', error);
```

---

## Security Considerations

### Authentication and Authorization

1. **All endpoints require authentication**:
   - Bearer token must be present in `Authorization` header
   - Token validated using existing `get_current_user` dependency
   - Unauthenticated requests return 401

2. **User-scoped access**:
   - Users can only upload files to their own account
   - Users can only view/download their own files
   - Users can only delete their own files
   - Enforced by filtering queries with `user_id: current_user._id`

3. **Cross-user access prevention**:
   - Download endpoint checks `user_id` match before streaming file
   - DELETE endpoint checks `user_id` match before deletion
   - Returns 403 if user attempts to access another user's report
   - GridFS metadata includes user_id for additional verification

### File Security

1. **File type validation**:
   - Client-side: Check file extension before upload
   - Server-side: Validate MIME type and extension
   - Only allow: `application/pdf`, `image/jpeg`, `image/png`
   - Reject all other types with 400 error

2. **File size limits**:
   - Client-side: Check `file.size <= 10MB` before upload
   - Server-side: Validate file size in request
   - Reject oversized files with 400 error

3. **File name sanitization**:
   - Preserve original filename in metadata for display
   - GridFS handles file storage internally
   - No path traversal concerns (GridFS uses ObjectId)

4. **Private storage**:
   - Files stored in GridFS with user_id in metadata
   - No direct access to GridFS files
   - All access through authenticated API endpoints

### Data Integrity

1. **Transactional cleanup**:
   - If database insert fails after file upload, delete the uploaded file
   - Prevents orphaned files in GridFS
   - Maintains consistency between storage and database

2. **Cascade deletion**:
   - When user is deleted, all associated reports should be deleted
   - Implement in user deletion endpoint (future enhancement)
   - Delete both metadata (medical_reports) and files (GridFS)

3. **File ID validation**:
   - Store GridFS file_id as ObjectId in database
   - Validate ObjectId format before queries
   - Check file exists in GridFS before streaming

### Input Validation

1. **File validation**:
   - Check file is not empty (`size > 0`)
   - Verify file is readable
   - Validate MIME type matches extension

2. **Parameter validation**:
   - `report_id` must be valid ObjectId format
   - Convert and validate before database query
   - Return 400 for invalid format

3. **Error message sanitization**:
   - Don't expose internal paths or system details
   - Use generic error messages for users
   - Log detailed errors server-side only

---

## Integration with Health Profile Page

### Placement

The `MedicalReportsSection` component is appended to the Health Profile page after the existing sections:

1. Basic Information
2. Medical History
3. Family Health History
4. Lifestyle & Habits
5. Health Metrics (Vitals)
6. **Medical Reports** ← New section

### Styling Consistency

- Uses same `Card` component with `border-slate-200/80` class
- Uses same `SectionHeader` component with icon and title
- Uses same `Button` variants (`primary`, `secondary`, `outline`)
- Uses same `DisplayRow` pattern for data display
- Uses same color scheme and spacing as existing sections
- Uses same responsive grid layout patterns

### Navigation

**Option 1: Add to existing Health Profile page** (Recommended)
- No new route needed
- Seamless integration with existing health data
- Users access via existing "Health Profile" navigation link

**Option 2: Create separate route** (Alternative)
- New route: `/reports`
- Add navigation link in sidebar
- Standalone page for medical documents
- Better for future expansion (e.g., lab results, prescriptions)

**Recommendation**: Start with Option 1 (append to Health Profile) for simplicity and cohesion. Can be moved to separate route later if needed.

### Non-Breaking Integration

1. **No modifications to existing components**:
   - `HealthProfile.jsx`: Only add import and append component
   - No changes to existing state, handlers, or JSX
   - No changes to other sections' functionality

2. **No global CSS changes**:
   - All styles scoped to new component
   - Uses existing Tailwind classes
   - No new global styles or theme modifications

3. **No API conflicts**:
   - New endpoints don't overlap with existing routes
   - Uses separate MongoDB collection
   - No changes to existing API behavior

4. **Graceful degradation**:
   - If GridFS is unavailable, feature returns appropriate errors
   - Error logged but application continues working
   - Other Health Profile sections unaffected

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used. Unit tests cover specific scenarios, edge cases, and integration points. Property tests verify universal correctness across a wide input space.

### Property-Based Testing Applicability

**PBT IS appropriate** for this feature because:
- File upload/download operations have clear input/output behavior
- Validation logic should work across all valid/invalid file types and sizes
- Metadata persistence and retrieval have universal properties
- User-scoped access control should hold for all users and reports

**PBT IS NOT appropriate** for:
- GridFS integration (internal MongoDB feature, use integration tests)
- UI rendering and layout (use snapshot tests)
- Network error handling (use mock-based tests)

### Property-Based Testing Library

**Backend (Python)**: [Hypothesis](https://hypothesis.readthedocs.io/)  
**Frontend (JavaScript)**: [fast-check](https://fast-check.dev/)

Each property test runs a minimum of **100 iterations**.

### Backend Unit Tests (`backend/tests/test_medical_reports.py`)

- `test_upload_no_file` — POST without file → 400
- `test_upload_invalid_type` — POST with .txt file → 400
- `test_upload_too_large` — POST with 11MB file → 400
- `test_upload_empty_file` — POST with 0-byte file → 400
- `test_upload_success` — POST with valid PDF → 201, metadata saved
- `test_upload_db_failure_cleanup` — Database insert fails → file deleted from GridFS
- `test_get_empty` — GET for user with no reports → `[]` with 200
- `test_get_no_auth` — GET without token → 401
- `test_download_not_found` — GET download for non-existent report → 404
- `test_download_wrong_user` — GET download for another user's report → 403
- `test_download_success` — GET download for own report → file stream with correct headers
- `test_delete_not_found` — DELETE non-existent report → 404
- `test_delete_wrong_user` — DELETE another user's report → 403
- `test_delete_success` — DELETE own report → 200, file and metadata deleted

### Backend Property Tests (`backend/tests/test_medical_reports_properties.py`)

Before writing properties, let me analyze the acceptance criteria using the prework tool:



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and eliminated redundancies:

**Redundancies eliminated**:
- Properties 3.2 and 3.4 are subsumed by 3.1 and 3.3 (specific error cases covered by general validation)
- Property 10.6 is redundant with 10.2 (both test cross-user delete authorization)
- Property 9.5 is redundant with 6.5 (both test sorting, but 9.5 is at API level which is more fundamental)
- Properties about UI rendering, CSS isolation, and architectural constraints are not suitable for property-based testing

**Properties retained**: 15 unique, testable properties covering validation, authorization, data integrity, and business logic.

---

### Property 1: File type validation accepts only PDF, JPG, PNG

*For any* file submitted for upload, the File_Validator SHALL accept the file if and only if its MIME type is `application/pdf`, `image/jpeg`, or `image/png`, and SHALL reject all other file types with a 400 error.

**Validates: Requirements 3.1, 3.2, 8.4**

---

### Property 2: File size validation enforces 10MB limit

*For any* file submitted for upload, the File_Validator SHALL accept the file if and only if its size is greater than 0 bytes and less than or equal to 10MB (10,485,760 bytes), and SHALL reject files outside this range with a 400 error.

**Validates: Requirements 3.3, 3.4, 3.5, 8.4**

---

### Property 3: Uploaded file metadata contains all required fields

*For any* successful file upload, the created document in the `medical_reports` collection SHALL contain all required fields: `_id`, `user_id`, `file_name`, `gridfs_file_id`, `file_type`, and `uploaded_at`, with no field being None or empty.

**Validates: Requirements 4.3, 4.6**

---

### Property 4: Uploaded file is always associated with authenticated user

*For any* file upload by an authenticated user, the resulting `medical_reports` document's `user_id` field SHALL equal the authenticated user's `_id`, and the GridFS file metadata SHALL contain the same `user_id`.

**Validates: Requirements 1.2, 4.7, 2.3**

---

### Property 5: Database failure triggers file cleanup

*For any* file upload where the GridFS upload succeeds but the database insert fails, the system SHALL attempt to delete the uploaded file from GridFS before returning an error response.

**Validates: Requirements 4.5**

---

### Property 6: Unauthenticated requests are rejected

*For any* request to any medical reports endpoint (`/api/medical-reports/upload`, `/api/medical-reports`, `/api/medical-reports/{id}/download`, `/api/medical-reports/{id}`) without a valid authentication token, the system SHALL return a 401 status code.

**Validates: Requirements 8.2**

---

### Property 7: Successful upload returns 201 with metadata

*For any* valid file upload by an authenticated user, the API SHALL return a 201 status code with a response body containing the created file metadata including `id`, `user_id`, `file_name`, `gridfs_file_id`, `file_type`, and `uploaded_at`.

**Validates: Requirements 8.3**

---

### Property 8: GET returns only user's own reports

*For any* two distinct authenticated users A and B, each having their own set of medical reports, a GET request by user A SHALL return exactly the reports belonging to user A and SHALL NOT return any reports belonging to user B.

**Validates: Requirements 9.2**

---

### Property 9: GET returns reports sorted by upload date descending

*For any* authenticated user with N medical reports (N ≥ 2), a GET request SHALL return the reports sorted by `uploaded_at` in descending order, with the most recently uploaded report first.

**Validates: Requirements 6.5, 9.5**

---

### Property 10: Users can only delete their own reports

*For any* authenticated user attempting to DELETE a medical report that belongs to a different user, the system SHALL return a 403 status code and SHALL NOT delete the report.

**Validates: Requirements 10.2, 10.6**

---

### Property 11: Successful delete removes both file and metadata

*For any* authenticated user deleting their own medical report, the system SHALL delete both the file from GridFS and the corresponding document from the `medical_reports` collection, and SHALL return a 200 or 204 status code.

**Validates: Requirements 10.3, 10.4, 10.5**

---

### Property 12: File type is correctly detected and normalized

*For any* uploaded file with a valid type (PDF, JPG, PNG), the system SHALL detect the MIME type correctly and SHALL store it in the database as one of `application/pdf`, `image/jpeg`, or `image/png` (normalized, lowercase).

**Validates: Requirements 14.1, 14.2**

---

### Property 13: Original filename is preserved in metadata

*For any* uploaded file with filename F, the system SHALL store F exactly as provided (preserving case, spaces, and special characters) in the `file_name` field of the metadata document.

**Validates: Requirements 14.4**

---

### Property 14: Download endpoint streams file with correct headers

*For any* authenticated user downloading their own medical report, the system SHALL stream the file from GridFS with correct `Content-Type` header matching the file_type and `Content-Disposition` header containing the original filename.

**Validates: Requirements 7.2, 7.4**

---

### Property 15: GridFS file metadata contains user_id

*For any* file uploaded to GridFS, the file's metadata SHALL contain the `user_id` field with the value matching the authenticated user who uploaded the file.

**Validates: Requirements 2.3, 2.4**

---

## Backend Property Tests Implementation

**Feature: medical-reports-upload, Property 1: File type validation accepts only PDF, JPG, PNG**
```python
@given(st.sampled_from(['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/zip', 'image/gif']))
def test_file_type_validation(mime_type):
    # Generate mock file with given MIME type
    # Attempt upload
    # Assert: accepted if valid type, rejected with 400 if invalid
```

**Feature: medical-reports-upload, Property 2: File size validation enforces 10MB limit**
```python
@given(st.integers(min_value=0, max_value=20*1024*1024))
def test_file_size_validation(file_size):
    # Generate mock file with given size
    # Attempt upload
    # Assert: accepted if 0 < size <= 10MB, rejected with 400 otherwise
```

**Feature: medical-reports-upload, Property 3: Uploaded file metadata contains all required fields**
```python
@given(valid_file_upload_data())
def test_metadata_completeness(file_data):
    # Upload file
    # Assert: returned metadata has user_id, file_name, gridfs_file_id, file_type, uploaded_at
    # Assert: no field is None or empty
```

**Feature: medical-reports-upload, Property 4: Uploaded file is always associated with authenticated user**
```python
@given(valid_file_upload_data(), st.text(min_size=24, max_size=24))
def test_user_association(file_data, user_id):
    # Mock authenticated user with user_id
    # Upload file
    # Assert: metadata.user_id == user_id
    # Assert: GridFS file metadata contains user_id
```

**Feature: medical-reports-upload, Property 7: Successful upload returns 201 with metadata**
```python
@given(valid_file_upload_data())
def test_upload_success_response(file_data):
    # Upload valid file
    # Assert: status == 201
    # Assert: response contains all metadata fields
```

**Feature: medical-reports-upload, Property 8: GET returns only user's own reports**
```python
@given(st.lists(valid_file_upload_data(), min_size=1, max_size=5), 
       st.lists(valid_file_upload_data(), min_size=1, max_size=5))
def test_user_scoped_retrieval(user_a_files, user_b_files):
    # Create two users A and B
    # Upload user_a_files for user A
    # Upload user_b_files for user B
    # GET as user A
    # Assert: response contains only user_a_files, not user_b_files
```

**Feature: medical-reports-upload, Property 9: GET returns reports sorted by upload date descending**
```python
@given(st.lists(valid_file_upload_data(), min_size=2, max_size=10))
def test_reports_sorted_descending(files):
    # Upload all files with different timestamps
    # GET reports
    # Assert: reports[i].uploaded_at >= reports[i+1].uploaded_at for all i
```

**Feature: medical-reports-upload, Property 10: Users can only delete their own reports**
```python
@given(valid_file_upload_data(), st.text(min_size=24, max_size=24))
def test_delete_authorization(file_data, other_user_id):
    # Upload file as user A
    # Attempt DELETE as user B (other_user_id)
    # Assert: status == 403
    # Assert: file still exists
```

**Feature: medical-reports-upload, Property 11: Successful delete removes both file and metadata**
```python
@given(valid_file_upload_data())
def test_delete_completeness(file_data):
    # Upload file
    # DELETE as same user
    # Assert: status == 200 or 204
    # Assert: metadata document deleted from database
    # Assert: GridFS file deleted
```

**Feature: medical-reports-upload, Property 12: File type is correctly detected and normalized**
```python
@given(st.sampled_from([
    ('test.pdf', 'application/pdf'),
    ('test.PDF', 'application/pdf'),
    ('test.jpg', 'image/jpeg'),
    ('test.JPG', 'image/jpeg'),
    ('test.png', 'image/png'),
    ('test.PNG', 'image/png'),
]))
def test_file_type_detection(filename, expected_mime):
    # Upload file with given filename
    # Assert: stored file_type == expected_mime (normalized)
```

**Feature: medical-reports-upload, Property 13: Original filename is preserved in metadata**
```python
@given(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',))))
def test_filename_preservation(filename):
    # Upload file with given filename
    # Assert: metadata.file_name == filename (exact match)
```

**Feature: medical-reports-upload, Property 14: Download endpoint streams file with correct headers**
```python
@given(valid_file_upload_data())
def test_download_headers(file_data):
    # Upload file
    # GET /api/medical-reports/{id}/download
    # Assert: Content-Type header matches file_type
    # Assert: Content-Disposition header contains original filename
```

**Feature: medical-reports-upload, Property 15: GridFS file metadata contains user_id**
```python
@given(valid_file_upload_data(), st.text(min_size=24, max_size=24))
def test_gridfs_metadata_user_id(file_data, user_id):
    # Mock authenticated user with user_id
    # Upload file
    # Retrieve GridFS file metadata
    # Assert: metadata['user_id'] == user_id
```

### Frontend Unit Tests (`frontend/src/components/MedicalReportsSection.test.jsx`)

- `test_renders_upload_button` — Component renders with "Upload Medical Report" button
- `test_file_selection_opens_dialog` — Clicking upload button triggers file input
- `test_invalid_file_type_rejected` — Selecting .txt file shows error notification
- `test_oversized_file_rejected` — Selecting 11MB file shows error notification
- `test_upload_success_refreshes_list` — Successful upload shows success message and refreshes
- `test_upload_failure_shows_error` — Failed upload shows error notification
- `test_empty_state_message` — No reports shows "No medical reports uploaded yet"
- `test_view_button_opens_new_tab` — Clicking View opens download URL with inline=true in new tab
- `test_download_button_triggers_download` — Clicking Download initiates file download
- `test_delete_confirmation_dialog` — Clicking Delete shows confirmation dialog
- `test_delete_success_removes_from_list` — Successful delete removes report from list

### Frontend Property Tests (`frontend/src/components/MedicalReportsSection.properties.test.jsx`)

**Feature: medical-reports-upload, Property: File type validation on client**
```javascript
fc.assert(fc.property(
  fc.oneof(
    fc.constant('application/pdf'),
    fc.constant('image/jpeg'),
    fc.constant('image/png'),
    fc.constant('text/plain'),
    fc.constant('application/zip')
  ),
  (mimeType) => {
    // Create mock file with mimeType
    // Trigger file selection
    // Assert: valid types proceed, invalid types show error
  }
))
```

**Feature: medical-reports-upload, Property: Reports display with required fields**
```javascript
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    file_name: fc.string({ minLength: 1, maxLength: 100 }),
    file_type: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
    uploaded_at: fc.date(),
  }), { minLength: 1, maxLength: 10 }),
  (reports) => {
    // Render component with reports
    // Assert: each report displays file_name and uploaded_at
    // Assert: correct icon for file_type
  }
))
```

**Feature: medical-reports-upload, Property: Reports sorted by date descending**
```javascript
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    file_name: fc.string({ minLength: 1, maxLength: 100 }),
    uploaded_at: fc.date(),
  }), { minLength: 2, maxLength: 10 }),
  (reports) => {
    // Render component with unsorted reports
    // Assert: displayed reports are sorted by uploaded_at DESC
  }
))
```

### Integration Tests

- `test_gridfs_upload_integration` — Real upload to GridFS
- `test_gridfs_download_integration` — Real download from GridFS
- `test_gridfs_delete_integration` — Real delete from GridFS
- `test_end_to_end_upload_flow` — Full flow: upload → verify in DB → verify in GridFS → GET → download → DELETE

---

## Dependencies

### Backend

No new dependencies required. The existing `motor` package (already used for MongoDB) includes GridFS support.

Verify in `backend/requirements.txt`:

```
motor>=3.0.0
```

### Frontend

No new dependencies required for basic functionality.

---

## Deployment Checklist

1. **Database**:
   - [ ] Run database migration to create `medical_reports` collection
   - [ ] Apply schema validator
   - [ ] Create index on `(user_id, uploaded_at)`
   - [ ] Verify GridFS collections (fs.files, fs.chunks) are created automatically

2. **Backend**:
   - [ ] Deploy new API endpoints
   - [ ] Verify GridFS bucket initialization
   - [ ] Test file upload/download/delete operations
   - [ ] Verify authentication and authorization

3. **Frontend**:
   - [ ] Deploy new `MedicalReportsSection` component
   - [ ] Update `HealthProfile.jsx` to include new section
   - [ ] Test file selection, upload, view, download, delete
   - [ ] Verify error handling and notifications

4. **Testing**:
   - [ ] Run all unit tests
   - [ ] Run all property tests (100+ iterations each)
   - [ ] Run integration tests with GridFS
   - [ ] Perform manual end-to-end testing
   - [ ] Test with various file types and sizes
   - [ ] Test error scenarios (network failures, invalid files, etc.)

5. **Documentation**:
   - [ ] Update API documentation with new endpoints
   - [ ] Document GridFS usage
   - [ ] Add user guide for medical reports feature
   - [ ] Update README if needed

---

## Future Enhancements

1. **File Preview**:
   - Inline PDF viewer for viewing reports without opening new tab
   - Image thumbnails in reports list

2. **File Categories**:
   - Tag reports with categories (lab results, prescriptions, imaging, etc.)
   - Filter reports by category

3. **OCR and Text Extraction**:
   - Extract text from PDF and image files
   - Make reports searchable by content

4. **Sharing**:
   - Share reports with healthcare providers
   - Generate temporary access links

5. **Bulk Operations**:
   - Upload multiple files at once
   - Bulk delete selected reports

6. **File Versioning**:
   - Upload new versions of existing reports
   - Track version history

7. **Storage Optimization**:
   - Compress images before upload
   - Convert images to WebP format
   - Implement file deduplication

8. **Advanced Security**:
   - Encrypt files at rest in GridFS
   - Virus scanning for uploaded files
   - Audit log for file access

---

## Conclusion

The Medical Reports Upload feature provides a secure, user-friendly way for CareTrace AI users to manage their medical documents. By leveraging MongoDB GridFS for file storage, the system eliminates the need for external storage services while maintaining data integrity and security.

The design follows the established patterns in the CareTrace AI codebase, ensuring consistency and maintainability. The feature is entirely additive, with no modifications to existing functionality, making it safe to deploy without risk of breaking changes.

Comprehensive testing, including property-based tests with 100+ iterations per property, ensures correctness across a wide range of inputs and scenarios. The dual testing approach (unit + property tests) provides both specific scenario coverage and universal correctness guarantees.
