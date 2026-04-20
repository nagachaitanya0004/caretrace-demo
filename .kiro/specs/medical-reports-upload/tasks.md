# Tasks — Medical Reports Upload

## Overview

This implementation plan breaks down the Medical Reports Upload feature into discrete, actionable tasks. The feature enables users to securely upload, store, and manage medical documents (PDFs and images) using MongoDB GridFS, with metadata stored in a separate MongoDB collection.

## Implementation Approach

1. **Backend Foundation**: Set up GridFS client, database schema, and core API endpoints
2. **Backend Testing**: Implement comprehensive unit and property-based tests
3. **Frontend Components**: Build upload UI and reports list display
4. **Frontend Testing**: Implement component tests with property-based validation
5. **Integration**: Wire components into Health Profile page and verify end-to-end flow

## Task List

- [ ] 1. Backend — GridFS client configuration
  - [x] 1.1 Update `backend/app/db/db.py` with GridFS bucket initialization
    - Add `_gridfs_bucket` global variable
    - Create `get_gridfs_bucket()` function returning `AsyncIOMotorGridFSBucket`
    - Initialize bucket using existing database connection
    - _Requirements: 2.1, 2.2_

- [ ] 2. Backend — Database schema for medical reports
  - [x] 2.1 Add `medical_reports` collection configuration to `backend/app/models/models.py`
    - Define `MEDICAL_REPORTS_COLLECTION = 'medical_reports'`
    - Create `MEDICAL_REPORTS_VALIDATOR` with JSON schema (user_id, file_name, gridfs_file_id, file_type, uploaded_at)
    - Enforce required fields and file_type enum (application/pdf, image/jpeg, image/png)
    - Set `additionalProperties: False`
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 Register collection and index in `backend/app/models/setup.py`
    - Add medical_reports to `get_collection_configuration()` return dict
    - Create compound index: `(user_id ASC, uploaded_at DESC)`
    - _Requirements: 1.2, 1.5_
  
  - [x] 2.3 Add `MedicalReportResponse` Pydantic schema to `backend/app/schemas/schemas.py`
    - Fields: id (str), user_id (str), file_name (str), gridfs_file_id (str), file_type (str), uploaded_at (datetime)
    - _Requirements: 4.3_

- [ ] 3. Backend — File upload endpoint (POST /api/medical-reports/upload)
  - [x] 3.1 Implement file validation helper functions
    - `validate_file_type(file)`: Check MIME type and extension (PDF, JPG, PNG only)
    - `validate_file_size(file)`: Check size > 0 and <= 10MB
    - Return validation errors with descriptive messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.3_
  
  - [x] 3.2 Implement file upload endpoint in `backend/app/api/routes.py`
    - Route: `POST /api/medical-reports/upload`
    - Accept `multipart/form-data` with `file` field
    - Require authentication (`get_current_user` dependency)
    - Validate file type and size (call validation helpers)
    - Read file content into memory
    - Upload to GridFS with metadata: `{"user_id": user_id, "filename": original_filename, "content_type": mime_type}`
    - Retrieve GridFS file_id from upload result
    - Insert metadata into `medical_reports` collection
    - If DB insert fails, delete uploaded file from GridFS (transactional cleanup)
    - Return 201 with serialized document on success
    - Return appropriate error codes (400 for validation, 500 for server errors)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 8.4, 8.6, 14.1, 14.2, 14.5_
  
  - [ ]* 3.3 Write unit tests in `backend/tests/test_medical_reports.py`
    - `test_upload_no_file`: POST without file → 400
    - `test_upload_invalid_type`: POST with .txt file → 400
    - `test_upload_too_large`: POST with 11MB file → 400
    - `test_upload_empty_file`: POST with 0-byte file → 400
    - `test_upload_success`: POST with valid PDF → 201, metadata saved, GridFS file created
    - `test_upload_db_failure_cleanup`: Mock DB failure → file deleted from GridFS
    - `test_upload_no_auth`: POST without token → 401
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4, 4.5, 8.2, 8.4, 8.5_

- [ ] 4. Backend — Retrieve reports endpoint (GET /api/medical-reports)
  - [x] 4.1 Implement GET endpoint in `backend/app/api/routes.py`
    - Route: `GET /api/medical-reports`
    - Require authentication (`get_current_user` dependency)
    - Query `medical_reports` collection: `{user_id: current_user._id}`
    - Sort by `uploaded_at DESC`
    - Serialize all documents
    - Return 200 with array (empty array if no reports)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 4.2 Write unit tests in `backend/tests/test_medical_reports.py`
    - `test_get_empty`: GET for user with no reports → `[]` with 200
    - `test_get_no_auth`: GET without token → 401
    - `test_get_sorted`: Upload 3 reports, verify GET returns sorted by uploaded_at DESC
    - `test_get_user_scoped`: Two users upload reports, each GET returns only own reports
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 5. Backend — Download file endpoint (GET /api/medical-reports/{report_id}/download)
  - [x] 5.1 Implement download endpoint in `backend/app/api/routes.py`
    - Route: `GET /api/medical-reports/{report_id}/download`
    - Query parameter: `inline` (optional, boolean) for Content-Disposition
    - Require authentication (`get_current_user` dependency)
    - Convert `report_id` to ObjectId (return 400 if invalid)
    - Find report: `{_id: report_id, user_id: current_user._id}`
    - Return 404 if not found
    - Return 403 if user_id doesn't match (user doesn't own report)
    - Retrieve GridFS file using `gridfs_file_id`
    - Return 404 if file not found in GridFS
    - Stream file content with headers:
      - `Content-Type`: file_type from metadata
      - `Content-Disposition`: inline or attachment with filename
    - Return StreamingResponse with file content
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 5.2 Write unit tests in `backend/tests/test_medical_reports.py`
    - `test_download_not_found`: GET download for non-existent report → 404
    - `test_download_wrong_user`: GET download for another user's report → 403
    - `test_download_success`: GET download for own report → file stream with correct headers
    - `test_download_inline`: GET with inline=true → Content-Disposition: inline
    - `test_download_attachment`: GET without inline → Content-Disposition: attachment
    - `test_download_gridfs_not_found`: Report exists but GridFS file missing → 404
    - _Requirements: 7.2, 7.4, 7.5, 7.6_

- [ ] 6. Backend — Delete report endpoint (DELETE /api/medical-reports/{report_id})
  - [x] 6.1 Implement DELETE endpoint in `backend/app/api/routes.py`
    - Route: `DELETE /api/medical-reports/{report_id}`
    - Require authentication (`get_current_user` dependency)
    - Convert `report_id` to ObjectId (return 400 if invalid)
    - Find report: `{_id: report_id, user_id: current_user._id}`
    - Return 404 if not found
    - Return 403 if user_id doesn't match (user doesn't own report)
    - Delete file from GridFS using `gridfs_file_id` (log warning if fails, continue)
    - Delete document from `medical_reports` collection
    - Return 200 with success message
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ]* 6.2 Write unit tests in `backend/tests/test_medical_reports.py`
    - `test_delete_not_found`: DELETE non-existent report → 404
    - `test_delete_wrong_user`: DELETE another user's report → 403
    - `test_delete_success`: DELETE own report → 200, file and metadata deleted
    - `test_delete_invalid_id`: DELETE with invalid ObjectId format → 400
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7. Checkpoint — Ensure backend tests pass
  - Run `pytest backend/tests/test_medical_reports.py -v`
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 8. Backend — Property-based tests for file validation
  - [ ]* 8.1 Write property test for file type validation in `backend/tests/test_medical_reports_properties.py`
    - **Property 1: File type validation accepts only PDF, JPG, PNG**
    - **Validates: Requirements 3.1, 3.2, 8.4**
    - Use Hypothesis `@given(st.sampled_from([...]))` with valid and invalid MIME types
    - Generate mock files with different MIME types
    - Assert: accepted if valid type, rejected with 400 if invalid
    - Run 100+ iterations
  
  - [ ]* 8.2 Write property test for file size validation
    - **Property 2: File size validation enforces 10MB limit**
    - **Validates: Requirements 3.3, 3.4, 3.5, 8.4**
    - Use Hypothesis `@given(st.integers(min_value=0, max_value=20*1024*1024))`
    - Generate mock files with different sizes
    - Assert: accepted if 0 < size <= 10MB, rejected with 400 otherwise
    - Run 100+ iterations
  
  - [ ]* 8.3 Write property test for metadata completeness
    - **Property 3: Uploaded file metadata contains all required fields**
    - **Validates: Requirements 4.3, 4.6**
    - Use Hypothesis with custom strategy for valid file upload data
    - Upload file and verify returned metadata
    - Assert: all fields present (user_id, file_name, gridfs_file_id, file_type, uploaded_at)
    - Assert: no field is None or empty
    - Run 100+ iterations
  
  - [ ]* 8.4 Write property test for user association
    - **Property 4: Uploaded file is always associated with authenticated user**
    - **Validates: Requirements 1.2, 4.7, 2.3**
    - Use Hypothesis with user_id generation
    - Mock authenticated user with various user_ids
    - Upload file and verify metadata.user_id matches authenticated user
    - Verify GridFS file metadata contains same user_id
    - Run 100+ iterations

- [ ]* 9. Backend — Property-based tests for API responses
  - [ ]* 9.1 Write property test for successful upload response
    - **Property 7: Successful upload returns 201 with metadata**
    - **Validates: Requirements 8.3**
    - Use Hypothesis with valid file upload data
    - Upload valid file
    - Assert: status == 201
    - Assert: response contains all metadata fields
    - Run 100+ iterations
  
  - [ ]* 9.2 Write property test for user-scoped retrieval
    - **Property 8: GET returns only user's own reports**
    - **Validates: Requirements 9.2**
    - Use Hypothesis `@given(st.lists(...), st.lists(...))`
    - Create two users A and B
    - Upload different files for each user
    - GET as user A
    - Assert: response contains only user A's files, not user B's
    - Run 100+ iterations
  
  - [ ]* 9.3 Write property test for sorted retrieval
    - **Property 9: GET returns reports sorted by upload date descending**
    - **Validates: Requirements 6.5, 9.5**
    - Use Hypothesis `@given(st.lists(..., min_size=2))`
    - Upload multiple files with different timestamps
    - GET reports
    - Assert: reports[i].uploaded_at >= reports[i+1].uploaded_at for all i
    - Run 100+ iterations
  
  - [ ]* 9.4 Write property test for delete authorization
    - **Property 10: Users can only delete their own reports**
    - **Validates: Requirements 10.2, 10.6**
    - Use Hypothesis with user_id generation
    - Upload file as user A
    - Attempt DELETE as user B
    - Assert: status == 403
    - Assert: file still exists
    - Run 100+ iterations
  
  - [ ]* 9.5 Write property test for delete completeness
    - **Property 11: Successful delete removes both file and metadata**
    - **Validates: Requirements 10.3, 10.4, 10.5**
    - Use Hypothesis with valid file upload data
    - Upload file
    - DELETE as same user
    - Assert: status == 200 or 204
    - Assert: metadata document deleted from database
    - Assert: GridFS file deleted
    - Run 100+ iterations

- [ ]* 10. Backend — Property-based tests for file type detection and GridFS metadata
  - [ ]* 10.1 Write property test for file type detection
    - **Property 12: File type is correctly detected and normalized**
    - **Validates: Requirements 14.1, 14.2**
    - Use Hypothesis `@given(st.sampled_from([...]))`
    - Test various filename/MIME type combinations (test.pdf, test.PDF, test.jpg, etc.)
    - Upload file with given filename
    - Assert: stored file_type is normalized (lowercase, correct MIME type)
    - Run 100+ iterations
  
  - [ ]* 10.2 Write property test for filename preservation
    - **Property 13: Original filename is preserved in metadata**
    - **Validates: Requirements 14.4**
    - Use Hypothesis `@given(st.text(...))`
    - Generate various filenames (with spaces, special characters, etc.)
    - Upload file with given filename
    - Assert: metadata.file_name == filename (exact match)
    - Run 100+ iterations
  
  - [ ]* 10.3 Write property test for download headers
    - **Property 14: Download endpoint streams file with correct headers**
    - **Validates: Requirements 7.2, 7.4**
    - Use Hypothesis with valid file upload data
    - Upload file
    - GET /api/medical-reports/{id}/download
    - Assert: Content-Type header matches file_type
    - Assert: Content-Disposition header contains original filename
    - Run 100+ iterations
  
  - [ ]* 10.4 Write property test for GridFS metadata
    - **Property 15: GridFS file metadata contains user_id**
    - **Validates: Requirements 2.3, 2.4**
    - Use Hypothesis with user_id generation
    - Mock authenticated user with user_id
    - Upload file
    - Retrieve GridFS file metadata
    - Assert: metadata['user_id'] == user_id
    - Run 100+ iterations

- [ ] 11. Checkpoint — Ensure all backend property tests pass
  - Run `pytest backend/tests/test_medical_reports_properties.py -v`
  - Ensure all property tests pass with 100+ iterations each
  - Ask the user if questions arise

- [ ] 12. Frontend — API service updates for file uploads
  - [x] 12.1 Add `uploadFile` method to `frontend/src/services/api.js`
    - Accept endpoint and FormData parameters
    - Include Authorization header with token
    - Don't set Content-Type (browser sets with boundary)
    - POST FormData to endpoint
    - Return parsed response via `handleResponse`
    - _Requirements: 8.6_

- [ ] 13. Frontend — MedicalReportsSection component (core structure)
  - [x] 13.1 Create `frontend/src/components/MedicalReportsSection.jsx` with component skeleton
    - Props: `addNotification` (function from useNotification)
    - State: `reports` (array), `loading` (bool), `uploading` (bool), `selectedFile` (File|null)
    - Use `Card`, `Button`, `SectionHeader` components matching existing Health Profile sections
    - Use Tailwind classes consistent with existing sections
    - _Requirements: 5.7, 12.3_
  
  - [x] 13.2 Implement reports fetching and display logic
    - On mount: `GET /api/medical-reports`, populate `reports` state
    - Display loading spinner while fetching
    - If empty: show "No medical reports uploaded yet" message
    - If populated: render list of reports with file_name, uploaded_at, file_type icon
    - Sort reports by uploaded_at descending (client-side verification)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 13.3 Implement file selection and validation
    - Hidden `<input type="file" accept=".pdf,.jpg,.jpeg,.png" />` triggered by button
    - On file select: validate type (PDF, JPG, PNG) and size (<= 10MB) client-side
    - If invalid: show error notification, clear selection
    - If valid: set `selectedFile` state, show file name
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2_
  
  - [x] 13.4 Implement file upload logic
    - Create FormData with selected file
    - POST to `/api/medical-reports/upload` using `api.uploadFile`
    - Set `uploading` state during upload
    - Disable upload button during upload
    - On success: re-fetch reports, clear selection, show success notification
    - On failure: show error notification, keep selection for retry
    - _Requirements: 4.1, 5.3, 5.4, 5.5, 5.6_

- [ ] 14. Frontend — MedicalReportsSection component (view, download, delete)
  - [x] 14.1 Implement view functionality
    - Add "View" button for each report
    - On click: open `/api/medical-reports/{report.id}/download?inline=true` in new tab
    - _Requirements: 7.1, 7.2_
  
  - [x] 14.2 Implement download functionality
    - Add "Download" button for each report
    - On click: create temporary `<a>` element with `href=/api/medical-reports/{report.id}/download` and `download=file_name`
    - Trigger click programmatically to initiate download
    - _Requirements: 7.3, 7.4_
  
  - [x] 14.3 Implement delete functionality
    - Add "Delete" button for each report
    - On click: show confirmation dialog
    - If confirmed: DELETE `/api/medical-reports/{report.id}`
    - On success: remove from `reports` array, show success notification
    - On failure: show error notification
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [ ]* 14.4 Write unit tests in `frontend/src/components/MedicalReportsSection.test.jsx`
    - `test_renders_upload_button`: Component renders with "Upload Medical Report" button
    - `test_file_selection_opens_dialog`: Clicking upload button triggers file input
    - `test_invalid_file_type_rejected`: Selecting .txt file shows error notification
    - `test_oversized_file_rejected`: Selecting 11MB file shows error notification
    - `test_upload_success_refreshes_list`: Successful upload shows success and refreshes
    - `test_upload_failure_shows_error`: Failed upload shows error notification
    - `test_empty_state_message`: No reports shows "No medical reports uploaded yet"
    - `test_view_button_opens_new_tab`: Clicking View opens download URL with inline=true
    - `test_download_button_triggers_download`: Clicking Download initiates download
    - `test_delete_confirmation_dialog`: Clicking Delete shows confirmation
    - `test_delete_success_removes_from_list`: Successful delete removes report from list
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 6.4, 7.2, 7.4, 10.5_

- [x] 15. Checkpoint — Ensure frontend component tests pass
  - Run `npm test -- MedicalReportsSection.test.jsx`
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 16. Frontend — Property-based tests for MedicalReportsSection
  - [ ]* 16.1 Write property test for client-side file type validation
    - **Property: File type validation on client**
    - Use fast-check `fc.oneof(fc.constant(...))` with valid and invalid MIME types
    - Create mock files with different MIME types
    - Trigger file selection
    - Assert: valid types proceed, invalid types show error notification
    - Run 100+ iterations
  
  - [ ]* 16.2 Write property test for reports display
    - **Property: Reports display with required fields**
    - Use fast-check `fc.array(fc.record({...}))`
    - Generate various report arrays
    - Render component with reports
    - Assert: each report displays file_name and uploaded_at
    - Assert: correct icon for file_type
    - Run 100+ iterations
  
  - [ ]* 16.3 Write property test for client-side sorting
    - **Property: Reports sorted by date descending**
    - Use fast-check `fc.array(fc.record({...}), {minLength: 2})`
    - Generate unsorted report arrays
    - Render component with reports
    - Assert: displayed reports are sorted by uploaded_at DESC
    - Run 100+ iterations

- [ ] 17. Frontend — Integration with Health Profile page
  - [x] 17.1 Update `frontend/src/pages/HealthProfile.jsx`
    - Import `MedicalReportsSection` from `../components/MedicalReportsSection`
    - Append `<MedicalReportsSection addNotification={addNotification} />` after the Health Metrics section
    - Verify no existing state, handlers, or JSX are modified
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

- [ ] 18. Final integration and smoke testing
  - [x] 18.1 Manually verify GridFS setup
    - Verify MongoDB connection is working
    - Verify GridFS collections (fs.files, fs.chunks) are created automatically on first upload
    - Verify backend initializes GridFS bucket successfully
  
  - [x] 18.2 Manually verify end-to-end upload flow
    - Navigate to Health Profile page
    - Verify Medical Reports section appears
    - Select and upload a valid PDF file
    - Verify file appears in GridFS (fs.files collection)
    - Verify metadata appears in `medical_reports` collection
    - Verify uploaded report appears in UI list
  
  - [x] 18.3 Manually verify view, download, and delete operations
    - Click "View" button → file opens in new tab (streamed from GridFS)
    - Click "Download" button → file downloads with correct name
    - Click "Delete" button → confirmation dialog appears
    - Confirm delete → file removed from UI, GridFS, and database
  
  - [x] 18.4 Manually verify error handling
    - Attempt to upload invalid file type → error notification shown
    - Attempt to upload oversized file → error notification shown
    - Disconnect network and attempt upload → error notification shown
    - Verify existing Health Profile sections still work correctly

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties with 100+ iterations each
- Unit tests validate specific examples, edge cases, and integration points
- All new code follows existing patterns and styling conventions in the codebase
- The feature is entirely additive with no modifications to existing functionality
- No external storage service required - all files stored in MongoDB using GridFS
