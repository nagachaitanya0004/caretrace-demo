import { useState, useEffect, useRef } from 'react';
import { api, unwrapApiPayload, API_BASE_URL } from '../services/api';
import Card from './Card';
import Button from './Button';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../NotificationContext';

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
    <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${isPdf ? 'bg-[var(--app-danger-bg)] text-[var(--app-danger)]' : 'bg-[var(--app-surface-soft)] text-[var(--brand-accent)]'}`}>
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function ReportCard({ report, onView, onDownload, onDelete }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-4 py-3 border border-[var(--app-border-soft)] rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-soft)] hover:border-[var(--app-border)] transition-all duration-150 group">
      <div className="flex items-center gap-3 min-w-0">
        <FileTypeIcon fileType={report.file_type} />
        <div className="min-w-0">
          <p className="font-medium text-[var(--app-text)] text-sm truncate">{report.file_name}</p>
          <p className="text-[10px] font-medium text-[var(--app-text-disabled)] uppercase tracking-wide">{formatDate(report.uploaded_at)}</p>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0 ml-3 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
        <Button intent="ghost" size="sm" onClick={onView} className="!px-2.5">{t('reports.view', 'View')}</Button>
        <Button intent="ghost" size="sm" onClick={onDownload} className="!px-2.5">{t('reports.download', 'Download')}</Button>
        <Button intent="ghost" size="sm" onClick={onDelete} className="!px-2.5 text-[var(--app-danger)] hover:!bg-[var(--app-danger-bg)]">{t('reports.delete', 'Delete')}</Button>
      </div>
    </div>
  );
}

export default function MedicalReportsSection() {
  const { t } = useTranslation();
  const { addNotification: notify } = useNotification();
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
      notify(t('reports.error.invalid_type', 'Only PDF, JPG, and PNG files are allowed'), 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      notify(t('reports.error.too_large', 'File size must be under 10 MB'), 'error');
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
      notify(t('reports.upload_success', 'Medical report uploaded successfully'), 'success');
      setSelectedFile(null);
      await fetchReports();
    } catch (err) {
      notify(err.message || t('reports.upload_error', 'Failed to upload file'), 'error');
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
      notify(t('reports.delete_success', 'Medical report deleted'), 'success');
    } catch (err) {
      notify(err.message || t('reports.delete_error', 'Failed to delete report'), 'error');
    }
  }

  return (
    <Card elevation={1}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--app-surface-soft)] text-[var(--brand-accent)] transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--app-text)] tracking-[-0.01em]">
            {t('reports.title', 'Medical Reports')}
          </h2>
        </div>
      </div>

      {/* Upload area */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={handleFileSelect}
          aria-label={t('reports.select_file', 'Upload Report')}
        />
        {!selectedFile ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--app-border)] rounded-xl text-[var(--app-text-muted)] hover:border-[var(--brand-accent)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm font-medium">Click to upload a medical report</span>
            <span className="text-[10px] text-[var(--app-text-disabled)]">PDF, JPG, PNG • Max 10 MB</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 border border-[var(--app-border)] rounded-xl bg-[var(--app-surface-soft)] animate-[fadeIn_0.15s_ease-out]">
            <svg className="w-5 h-5 shrink-0 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            <span className="text-sm text-[var(--app-text)] font-medium truncate flex-1">{selectedFile.name}</span>
            <Button intent="primary" size="sm" onClick={handleUpload} loading={uploading}>
              {uploading ? t('reports.uploading', 'Uploading\u2026') : t('reports.upload', 'Upload')}
            </Button>
            <Button intent="ghost" size="sm" onClick={() => setSelectedFile(null)} disabled={uploading}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center py-10" role="status" aria-label="Loading reports">
          <div className="w-8 h-8 border-[3px] border-[var(--app-border)] border-t-[var(--brand-accent)] rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-soft)] flex items-center justify-center text-[var(--app-text-disabled)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--app-text-disabled)] text-center">{t('reports.empty', 'No medical reports uploaded yet')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
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

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-bg)]/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4 animate-[fadeIn_0.15s_ease-out]">
            <h3 id="delete-dialog-title" className="text-base font-semibold text-[var(--app-text)] mb-2">
              {t('reports.delete_dialog.title', 'Delete Report')}
            </h3>
            <p className="text-sm text-[var(--app-text-muted)] mb-5">
              {t('reports.delete_dialog.body', 'Are you sure you want to delete')} {' '}
              <span className="font-medium text-[var(--app-text)]">{confirmDelete.file_name}</span>?
              {' '}
              {t('reports.delete_dialog.warning', 'This cannot be undone.')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button intent="ghost" size="sm" onClick={() => setConfirmDelete(null)}>{t('common.cancel', 'Cancel')}</Button>
              <Button intent="danger" size="sm" onClick={handleDeleteConfirm}>{t('reports.delete', 'Delete')}</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
