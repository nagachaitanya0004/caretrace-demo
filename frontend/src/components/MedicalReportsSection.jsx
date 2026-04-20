import { useState, useEffect, useRef } from 'react';
import { api, unwrapApiPayload } from '../services/api';
import Card from './Card';
import Button from './Button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function FileTypeIcon({ fileType }) {
  if (fileType === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <text x="8" y="17" fontSize="5" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ReportCard sub-component
// ---------------------------------------------------------------------------
function ReportCard({ report, onView, onDownload, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileTypeIcon fileType={report.file_type} />
        <div className="min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{report.file_name}</p>
          <p className="text-xs text-gray-400">{formatDate(report.uploaded_at)}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-3">
        <Button variant="outline" onClick={onView}
          className="text-xs px-2 py-1">View</Button>
        <Button variant="outline" onClick={onDownload}
          className="text-xs px-2 py-1">Download</Button>
        <Button variant="outline" onClick={onDelete}
          className="text-xs px-2 py-1 text-rose-600 border-rose-200 hover:bg-rose-50">Delete</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function MedicalReportsSection({ addNotification }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // report to delete
  const fileInputRef = useRef(null);

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await api.get('/api/medical-reports');
      const data = unwrapApiPayload(res) || [];
      // Sort by uploaded_at descending (client-side verification)
      const sorted = [...data].sort(
        (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
      );
      setReports(sorted);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  // File selection & client-side validation
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset input so same file can be re-selected after error
    e.target.value = '';

    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      addNotification('Only PDF, JPG, and PNG files are allowed', 'error');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_SIZE) {
      addNotification('File size must be under 10MB', 'error');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  // Upload
  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await api.uploadFile('/api/medical-reports/upload', formData);
      addNotification('Medical report uploaded successfully', 'success');
      setSelectedFile(null);
      await fetchReports();
    } catch (err) {
      addNotification(err.message || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  }

  // View — open inline in new tab
  function handleView(report) {
    const token = localStorage.getItem('caretrace_token');
    const base = import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? '' : 'https://caretrace-backend.onrender.com');
    window.open(
      `${base}/api/medical-reports/${report.id}/download?inline=true`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  // Download — trigger browser download
  function handleDownload(report) {
    const token = localStorage.getItem('caretrace_token');
    const base = import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? '' : 'https://caretrace-backend.onrender.com');
    const a = document.createElement('a');
    a.href = `${base}/api/medical-reports/${report.id}/download`;
    a.download = report.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Delete — show confirmation first
  function handleDeleteClick(report) {
    setConfirmDelete(report);
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    const report = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/api/medical-reports/${report.id}`);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      addNotification('Medical report deleted', 'success');
    } catch (err) {
      addNotification(err.message || 'Failed to delete report', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Card className="border-slate-200/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Medical Reports
        </h2>
      </div>

      {/* Upload section */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Medical Report
        </Button>

        {selectedFile && (
          <>
            <span className="text-sm text-gray-600 truncate max-w-xs">{selectedFile.name}</span>
            <Button variant="primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : 'Upload'}
            </Button>
            <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={uploading}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-gray-400 italic text-sm">No medical reports uploaded yet</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={() => handleView(report)}
              onDownload={() => handleDownload(report)}
              onDelete={() => handleDeleteClick(report)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Delete Report</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete <span className="font-medium">{confirmDelete.file_name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
