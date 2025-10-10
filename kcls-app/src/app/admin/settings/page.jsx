import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Paper, Typography, Stack, TextField, Button, Divider,
  Alert, Snackbar, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormGroup, FormControlLabel, Checkbox, FormHelperText, Tooltip,
  Grid, Card, CardHeader, CardContent, CardActions, Avatar, Pagination
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as ResetIcon,
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  PictureAsPdf as PictureAsPdfIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext.jsx';
import { formatDateTime } from '../../../utils/date';
import { loadBackupSchedule, saveBackupSchedule } from '../../../config/systemSettings';

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const sortDays = (days) => [...days].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b));
const UPLOADS_PER_PAGE = 10;

const SettingsPage = () => {
  const { settings: ctxSettings, loading: ctxLoading, save: saveCtx, refresh } = useSystemSettings();

  // local input state with safe defaults
  const [fineInput, setFineInput] = useState(() => Number(ctxSettings?.fine ?? 5));
  const [borrowInput, setBorrowInput] = useState(() => Number(ctxSettings?.borrow_limit ?? 3));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ open: false, text: '', severity: 'success' });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    // keep input in sync when context loads/changes
    if (ctxSettings && typeof ctxSettings.fine !== 'undefined') {
      setFineInput(Number(ctxSettings.fine));
    }
    if (ctxSettings && typeof ctxSettings.borrow_limit !== 'undefined') {
      setBorrowInput(Number(ctxSettings.borrow_limit));
    }
  }, [ctxSettings]);

  const originalFine = useMemo(() => Number(ctxSettings?.fine ?? 5), [ctxSettings]);
  const originalBorrow = useMemo(() => Number(ctxSettings?.borrow_limit ?? 3), [ctxSettings]);

  const fineValue = Number(fineInput);
  const borrowValue = Number(borrowInput);
  const isFineValid = fineInput !== '' && Number.isFinite(fineValue) && fineValue >= 0;
  const isBorrowValid = borrowInput !== '' && Number.isFinite(borrowValue) && borrowValue > 0;
  const unchanged = isFineValid && isBorrowValid && fineValue === originalFine && borrowValue === originalBorrow;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fine: Math.max(0, Math.trunc(fineValue)),
        borrow_limit: Math.max(1, Math.trunc(borrowValue)),
      };
      const saved = await saveCtx(payload);
      setFineInput(Number(saved.fine ?? 5));
      setBorrowInput(Number(saved.borrow_limit ?? 3));
      setMsg({ open: true, text: 'Settings saved.', severity: 'success' });
    } catch (e) {
      setMsg({ open: true, text: e?.message || 'Failed to save.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAttemptSave = () => {
    if (!isFineValid || !isBorrowValid) return; // invalid input guard
    // Always require explicit confirmation (even if unchanged) for clarity
    setConfirmOpen(true);
  };

  const handleReset = async () => {
    await refresh();
    await loadSchedule();
    setUploadsPage(1);
    await loadUploads(1);
    setMsg({ open: true, text: 'Settings reloaded from server.', severity: 'info' });
  };

  // API base for backups
  const API_BASE = String(import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

  // Database Backup UI
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupsError, setBackupsError] = useState('');
  const [missingDump, setMissingDump] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState('');
  const [uploadsPage, setUploadsPage] = useState(1);
  const [uploadsTotal, setUploadsTotal] = useState(0);
  const [uploadsTotalPages, setUploadsTotalPages] = useState(0);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef(null);

  const humanSize = (n) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let x = Number(n || 0);
    while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(x < 10 ? 2 : 1)} ${units[i]}`;
  };
  const fmtTime = (t) => {
    const v = formatDateTime((t || 0) * 1000);
    return v || '—';
  };

  const loadBackups = useCallback(async () => {
    setBackupsLoading(true);
    setBackupsError('');
    try {
      const res = await fetch(`${API_BASE}/system/backups`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (e) {
      setBackupsError(e?.message || 'Failed to load backups');
    } finally {
      setBackupsLoading(false);
    }
  }, [API_BASE]);

  const triggerBackup = async () => {
    setBackupRunning(true);
    try {
      const res = await fetch(`${API_BASE}/system/backup`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Backup failed');
      setMissingDump(false);
      setMsg({ open: true, text: `Backup created: ${data.file}`, severity: 'success' });
      await loadBackups();
    } catch (e) {
      const txt = e?.message || 'Backup failed';
      setMissingDump(/mysqldump/i.test(txt) || /MISSING_MYSQLDUMP/i.test(txt));
      setMsg({ open: true, text: txt, severity: 'error' });
    } finally {
      setBackupRunning(false);
    }
  };

  const downloadBackup = (file) => {
    if (!file) return;
    const url = `${API_BASE}/system/backup/${encodeURIComponent(file)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const resolveUploadUrl = useCallback((path) => {
    if (!path || typeof path !== 'string') return '';
    if (/^https?:/i.test(path)) return path;
    const base = String(API_BASE || '').replace(/\/+$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!base) return normalized;
    return `${base}${normalized}`;
  }, [API_BASE]);

  const loadUploads = useCallback(async (page = 1) => {
    setUploadsLoading(true);
    setUploadsError('');
    try {
      const res = await fetch(`${API_BASE}/documents/uploads?page=${page}&per_page=${UPLOADS_PER_PAGE}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const files = Array.isArray(data?.files) ? data.files : Array.isArray(data) ? data : [];
      const total = Number(data?.total ?? files.length);
      const reportedPer = Number(data?.per_page ?? UPLOADS_PER_PAGE) || UPLOADS_PER_PAGE;
      const totalPages = reportedPer > 0 ? Math.ceil(total / reportedPer) : 0;
      const nextPage = Number(data?.page ?? page) || page;
      setUploads(files);
      setUploadsTotal(total);
      setUploadsTotalPages(totalPages);
      setUploadsPage(nextPage);
    } catch (e) {
      setUploadsError(e?.message || 'Failed to load uploaded files');
    } finally {
      setUploadsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadUploads(1);
  }, [loadUploads]);

  const openUploadedFile = useCallback((path) => {
    const url = resolveUploadUrl(path);
    if (!url) {
      setMsg({ open: true, text: 'Unable to resolve file path.', severity: 'error' });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }, [resolveUploadUrl]);

  const currentUploadsPage = useMemo(
    () => (uploadsTotalPages > 0 ? Math.min(uploadsPage, uploadsTotalPages) : 1),
    [uploadsPage, uploadsTotalPages]
  );

  const handleUploadsPageChange = useCallback((_, value) => {
    setUploadsPage(value);
    loadUploads(value);
  }, [loadUploads]);

  const uploadFileToServer = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/documents/uploads`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Upload failed.');
      setMsg({ open: true, text: data?.message || 'File uploaded.', severity: 'success' });
      setUploadsPage(1);
      await loadUploads(1);
    } catch (e) {
      setMsg({ open: true, text: e?.message || 'Upload failed.', severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [API_BASE, loadUploads]);

  const handleUploadChange = useCallback((event) => {
    const file = event.target?.files?.[0];
    if (file) {
      uploadFileToServer(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  }, [uploadFileToServer]);

  const handleUploadClick = useCallback(() => {
    uploadInputRef.current?.click();
  }, [uploadInputRef]);

  // Auto backup schedule state
  const [schedule, setSchedule] = useState({ enabled: false, time: '02:00', days: [...DAY_OPTIONS] });
  const [scheduleInitial, setScheduleInitial] = useState({ enabled: false, time: '02:00', days: [...DAY_OPTIONS] });
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const data = await loadBackupSchedule();
      const normalized = { ...data, days: sortDays(data.days || DAY_OPTIONS) };
      setSchedule(normalized);
      setScheduleInitial(normalized);
    } catch (e) {
      setMsg({ open: true, text: e?.message || 'Failed to load backup schedule.', severity: 'error' });
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const isValidTime = useMemo(() => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(schedule.time || '')), [schedule.time]);
  const hasDaysSelected = schedule.days.length > 0;
  const isScheduleValid = (!schedule.enabled || (isValidTime && hasDaysSelected)) && isValidTime;

  const scheduleDirty = useMemo(() => {
    if (schedule.enabled !== scheduleInitial.enabled) return true;
    if (schedule.time !== scheduleInitial.time) return true;
    if (schedule.days.length !== scheduleInitial.days.length) return true;
    for (let i = 0; i < schedule.days.length; i += 1) {
      if (schedule.days[i] !== scheduleInitial.days[i]) return true;
    }
    return false;
  }, [schedule, scheduleInitial]);

  const toggleDay = (day) => {
    setSchedule((prev) => {
      const has = prev.days.includes(day);
      const nextDays = has ? prev.days.filter((d) => d !== day) : [...prev.days, day];
      return { ...prev, days: sortDays(nextDays) };
    });
  };

  const handleScheduleSave = async () => {
    setScheduleSaving(true);
    try {
      const payload = {
        auto_backup_enabled: schedule.enabled,
        auto_backup_time: schedule.time,
        auto_backup_days: schedule.days,
      };
      const saved = await saveBackupSchedule(payload);
      const normalized = { ...saved, days: sortDays(saved.days || DAY_OPTIONS) };
      setSchedule(normalized);
      setScheduleInitial(normalized);
      await refresh();
      setMsg({ open: true, text: 'Auto backup schedule saved.', severity: 'success' });
    } catch (e) {
      setMsg({ open: true, text: e?.message || 'Failed to save schedule.', severity: 'error' });
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleScheduleReset = async () => {
    if (scheduleDirty) {
      setSchedule(scheduleInitial);
    } else {
      await loadSchedule();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            mb: 4,
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 60%)`,
            color: 'primary.contrastText'
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 56, height: 56 }}>
              <SettingsIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: 0.3 }}>System Administration</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Tune lending policies, automate backups, and safeguard collections from a single control pane.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { sm: 'auto' } }}>
              <Chip size="small" label={`Source: ${ctxSettings?._source || '—'}`} sx={{ bgcolor: 'primary.light', color: 'primary.dark' }} />
              {ctxLoading && <CircularProgress size={18} color="inherit" />}
            </Stack>
          </Stack>
        </Box>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
              <CardHeader
                avatar={(<Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}><SettingsIcon fontSize="small" /></Avatar>)}
                titleTypographyProps={{ fontWeight: 800, fontSize: 16 }}
                subheaderTypographyProps={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}
                title="Borrowing & Penalty Policy"
                subheader="Adjust global penalties and lending thresholds."
              />
              <Divider />
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Fine per day"
                    type="number"
                    size="small"
                    value={fineInput === '' ? '' : fineValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFineInput(v === '' ? '' : Math.max(0, Math.trunc(Number(v))));
                    }}
                    inputProps={{ min: 0, step: 1 }}
                    helperText={isFineValid ? `Current global fine: ${Number(ctxSettings?.fine ?? 5)}` : 'Enter a non-negative integer'}
                    error={!isFineValid}
                    fullWidth
                  />

                  <TextField
                    label="Borrow limit"
                    type="number"
                    size="small"
                    value={borrowInput === '' ? '' : borrowValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBorrowInput(v === '' ? '' : Math.max(1, Math.trunc(Number(v))));
                    }}
                    inputProps={{ min: 1, step: 1 }}
                    helperText={isBorrowValid ? `Current borrow limit: ${Number(ctxSettings?.borrow_limit ?? 3)}` : 'Enter a positive integer'}
                    error={!isBorrowValid}
                    fullWidth
                  />
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon fontSize="small" />}
                    onClick={handleAttemptSave}
                    disabled={ctxLoading || saving || !isFineValid || !isBorrowValid}
                    fullWidth
                  >
                    {saving ? 'Saving…' : 'Save updates'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ResetIcon fontSize="small" />}
                    onClick={handleReset}
                    disabled={ctxLoading || saving}
                    fullWidth
                  >
                    Reload settings
                  </Button>
                </Stack>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardHeader
                avatar={(<Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}><StorageIcon fontSize="small" /></Avatar>)}
                titleTypographyProps={{ fontWeight: 800, fontSize: 16 }}
                subheaderTypographyProps={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}
                title="Database Backups"
                subheader="Orchestrate on-demand and automated snapshots."
                action={(backupsLoading || backupRunning) ? <CircularProgress size={18} sx={{ mt: 1, mr: 1 }} /> : null}
              />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Create and download MySQL backup archives. Latest snapshots appear first.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<BackupIcon />}
                        onClick={triggerBackup}
                        disabled={backupRunning}
                      >
                        {backupRunning ? 'Creating…' : 'Create Backup'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadBackups}
                        disabled={backupsLoading}
                      >
                        Refresh list
                      </Button>
                      {backups?.[0]?.file && (
                        <Button
                          variant="text"
                          startIcon={<DownloadIcon />}
                          onClick={() => downloadBackup(backups[0].file)}
                        >
                          Download latest
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  {missingDump && (
                    <Alert severity="warning">
                      mysqldump is not available. Install MySQL client tools and add the bin folder to PATH,
                      or set the MYSQLDUMP_PATH environment variable to mysqldump.exe, then restart the server.
                      Examples on Windows:
                      • MySQL Server: C:\Program Files\MySQL\MySQL Server 8.0\bin
                      • MariaDB: C:\Program Files\MariaDB\bin
                      • XAMPP: C:\xampp\mysql\bin
                    </Alert>
                  )}
                  {backupsError && <Alert severity="error">{backupsError}</Alert>}

                  <Stack spacing={1.5}>
                    {!backupsLoading && (!backups || backups.length === 0) && (
                      <Typography variant="caption" color="text.secondary">No backups yet.</Typography>
                    )}
                    {backups.map((b) => (
                      <Paper key={b.file} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                          <Typography sx={{ fontWeight: 700 }} noWrap title={b.file}>{b.file}</Typography>
                          <Chip size="small" label={humanSize(b.size)} />
                          <Chip size="small" label={fmtTime(b.mtime)} />
                          <Box sx={{ flexGrow: 1 }} />
                          <Button size="small" startIcon={<DownloadIcon />} onClick={() => downloadBackup(b.file)}>
                            Download
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', width: 36, height: 36 }}>
                        <ScheduleIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography fontWeight={800} fontSize={15}>Auto Backup Planner</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Schedule recurring dumps by weekday and 24-hour time.
                        </Typography>
                      </Box>
                      {scheduleLoading && <CircularProgress size={18} sx={{ ml: 'auto' }} />}
                    </Stack>

                    <FormControlLabel
                      control={(
                        <Switch
                          checked={schedule.enabled}
                          onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
                          disabled={scheduleLoading || scheduleSaving}
                        />
                      )}
                      label={schedule.enabled ? 'Automatic backups enabled' : 'Automatic backups disabled'}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <TextField
                        label="Backup time"
                        type="time"
                        size="small"
                        value={schedule.time}
                        onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 60 }}
                        disabled={scheduleLoading || scheduleSaving}
                        error={!isValidTime}
                        helperText={isValidTime ? '24-hour format (HH:MM)' : 'Enter a time between 00:00 and 23:59'}
                        sx={{ maxWidth: { xs: '100%', sm: 200 } }}
                      />

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">Run on</Typography>
                        <FormGroup row sx={{ mt: 0.5 }}>
                          {DAY_OPTIONS.map((day) => (
                            <FormControlLabel
                              key={day}
                              control={(
                                <Checkbox
                                  checked={schedule.days.includes(day)}
                                  onChange={() => toggleDay(day)}
                                  disabled={scheduleLoading || scheduleSaving}
                                />
                              )}
                              label={DAY_LABELS[day]}
                            />
                          ))}
                        </FormGroup>
                        {!hasDaysSelected && (
                          <FormHelperText error>Select at least one day.</FormHelperText>
                        )}
                      </Box>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon fontSize="small" />}
                        onClick={handleScheduleSave}
                        disabled={scheduleLoading || scheduleSaving || !isScheduleValid || !scheduleDirty}
                      >
                        {scheduleSaving ? 'Saving…' : 'Save schedule'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ResetIcon fontSize="small" />}
                        onClick={handleScheduleReset}
                        disabled={scheduleLoading || scheduleSaving}
                      >
                        Reset planner
                      </Button>
                      <Tooltip title="Automatic backups run in server time.">
                        <Chip
                          size="small"
                          label={schedule.enabled ? `${schedule.time} · ${schedule.days.join(', ')}` : 'Automation disabled'}
                        />
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardHeader
                avatar={(<Avatar sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}><PictureAsPdfIcon fontSize="small" /></Avatar>)}
                titleTypographyProps={{ fontWeight: 800, fontSize: 16 }}
                subheaderTypographyProps={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}
                title="Uploaded Document Files"
                subheader="Browse the physical uploads directory and launch stored PDFs."
                action={uploadsLoading ? <CircularProgress size={18} sx={{ mt: 1, mr: 1 }} /> : null}
              />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      This list reflects the files currently stored on disk. Use the controls to refresh or open a document.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={handleUploadClick}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading…' : 'Upload PDF'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => loadUploads(currentUploadsPage)}
                        disabled={uploadsLoading || uploading}
                      >
                        Refresh uploads
                      </Button>
                      {uploads?.[0]?.url && (
                        <Button
                          variant="text"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => openUploadedFile(uploads[0].url)}
                          disabled={uploading}
                        >
                          Open latest
                        </Button>
                      )}
                      <Chip size="small" label={`Total: ${uploadsTotal}`} />
                    </Stack>
                    <input
                      type="file"
                      accept="application/pdf"
                      hidden
                      ref={uploadInputRef}
                      onChange={handleUploadChange}
                    />
                  </Stack>

                  {uploadsError && <Alert severity="error">{uploadsError}</Alert>}

                  <Stack spacing={1.5}>
                    {!uploadsLoading && (!uploads || uploads.length === 0) && (
                      <Typography variant="caption" color="text.secondary">No files detected in uploads directory.</Typography>
                    )}
                    {uploads.map((file) => (
                      <Paper key={file.file || file.url} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                          <Typography sx={{ fontWeight: 700 }} noWrap title={file.file}>{file.file}</Typography>
                          <Chip size="small" label={humanSize(file.size)} />
                          <Chip size="small" label={fmtTime(file.mtime)} />
                          <Box sx={{ flexGrow: 1 }} />
                          <Button size="small" startIcon={<PictureAsPdfIcon fontSize="inherit" />} onClick={() => openUploadedFile(file.url)}>
                            Open
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                    {uploadsTotalPages > 1 && (
                      <Pagination
                        count={uploadsTotalPages}
                        page={currentUploadsPage}
                        onChange={handleUploadsPageChange}
                        color="primary"
                        size="small"
                      />
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={msg.open}
        autoHideDuration={3000}
        onClose={() => setMsg({ ...msg, open: false })}
        message={msg.text}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx:{ borderRadius:1 } }}
      >
        <DialogTitle sx={{ fontWeight:800, pb:1 }}>Confirm Settings Update</DialogTitle>
        <DialogContent sx={{ pt:0 }}>
          <Typography variant="body2" sx={{ mb:1 }}>
            Apply the following updates?
          </Typography>
          <Stack spacing={1.5} sx={{ fontSize:13, mb:1 }}>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Current fine / day</Typography><br />
                <Typography fontWeight={700}>{originalFine}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>New fine / day</Typography><br />
                <Typography fontWeight={700} color={fineValue === originalFine ? 'text.secondary' : 'primary.main'}>
                  {fineValue}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Current borrow limit</Typography><br />
                <Typography fontWeight={700}>{originalBorrow}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>New borrow limit</Typography><br />
                <Typography fontWeight={700} color={borrowValue === originalBorrow ? 'text.secondary' : 'primary.main'}>
                  {borrowValue}
                </Typography>
              </Box>
            </Stack>
          </Stack>
          {unchanged ? (
            <Alert severity="info" sx={{ mt:1 }} variant="outlined">
              The values are unchanged. You can still confirm to re-save.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt:1 }} variant="outlined">
              Updates affect future fines and borrowing limits only; existing records remain unchanged.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px:2, pb:1.5 }}>
          <Button size="small" onClick={() => !saving && setConfirmOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => { setConfirmOpen(false); handleSave(); }}
            disabled={saving}
            color="primary"
            sx={{ fontWeight:700 }}
          >
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;