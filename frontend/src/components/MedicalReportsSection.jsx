import { useState, useEffect, useRef } from 'react';
import { api, unwrapApiPayload, API_BASE_URL } from '../services/api';
import Card from './Card';
import Button from './Button';

const ALLOWED_TYPES      = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_SIZE           = 10 * 1024 * 1024; // 10 MB

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return iso; }
}

function FileTypeIcon({ fileType }) {
  const isPdf = fileType === 'application/pdf';
  return (
    <svg
      className={`w-8 h-8 flex-shrink-0 ${isPdf ? 'text-rose-500' : 'text-[var(--app-accent)]'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function ReportCard({ report, onView, onDownload, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 border border-[var(--app-border)] rounded-[var(--radius-lg)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-soft)] transition-colors duration-150">
      <div className="flex items-center gap-3 min-w-0">
        <FileTypeIcon fileType={report.file_type} />
        <div className="min-w-0">
          <p className="font-medium text-[var(--app-text)] text-sm truncate">{report.file_name}</p>
          <p className="text-xs text-[var(--app-text-disabled)]">{formatDate(report.uploaded_at)}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-3">
        <Button intent="ghost" size="sm" onClick={onView}>View</Button>
        <Button intent="ghost" size="sm" onClick={onDownload}>Download</Button>
        <Button intent="danger" size="sm" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

export default function MedicalReportsSection({ addNotification }) {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res  = await api.get('/api/medical-reports');
      const data = unwrapApiPayload(res) || [];
      setReports([...data].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)));
    } catch { setReports([]); }
    finally { setLoading(false); }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      addNotification('Only PDF, JPG, and PNG files are allowed', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      addNotification('File size must be under 10MB', 'error');
      return;
    }
    setSelectedFile(file);
  }

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
    } finally { setUploading(false); }
  }

  function handleView(report) {
    window.open(`${API_BASE_URL}/api/medical-reports/${report.id}/download?inline=true`, '_blank', 'noopener,noreferrer');
  }

  function handleDownload(report) {
    const a = document.createElement('a');
    a.href = `${API_BASE_URL}/api/medical-reports/${report.id}/download`;
    a.download = report.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  return (
    <Card elevation={1}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-[var(--app-text)] flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          className="sr-only"
          onChange={handleFileSelect}
          aria-label="Select medical report file"
        />
        <Button intent="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Report
        </Button>

        {selectedFile && (
          <>
            <span className="text-sm text-[var(--app-text-muted)] truncate max-w-xs">{selectedFile.name}</span>
            <Button intent="primary" size="sm" onClick={handleUpload} loading={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <Button intent="ghost" size="sm" onClick={() => setSelectedFile(null)} disabled={uploading}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center py-8" role="status" aria-label="Loading reports">
          <span className="w-8 h-8 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-text)] animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-[var(--app-text-disabled)] italic text-sm">No medical reports uploaded yet</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={() => handleView(report)}
              onDownload={() => handleDownload(report)}
              onDelete={() => setConfirmDelete(report)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog — accessible modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-bg)]/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4">
            <h3 id="delete-dialog-title" className="text-base font-semibold text-[var(--app-text)] mb-2">
              Delete Report
            </h3>
            <p className="text-sm text-[var(--app-text-muted)] mb-5">
              Are you sure you want to delete{' '}
              <span className="font-medium text-[var(--app-text)]">{confirmDelete.file_name}</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button intent="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button intent="danger" size="sm" onClick={handleDeleteConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
