import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, TextField, Button, Divider,
  Alert, Snackbar, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormGroup, FormControlLabel, Checkbox, FormHelperText, Tooltip
} from '@mui/material';
import { Save as SaveIcon, Restore as ResetIcon, Backup as BackupIcon, Refresh as RefreshIcon, Download as DownloadIcon } from '@mui/icons-material';
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={800} fontSize={18}>System Settings</Typography>
            <Chip size="small" label={`Source: ${ctxSettings?._source || '—'}`} />
            <Box sx={{ ml: 'auto' }} />
            {ctxLoading && <CircularProgress size={18} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Change system-wide options. Fine is used when computing penalties.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
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
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleAttemptSave}
                disabled={ctxLoading || saving || !isFineValid || !isBorrowValid}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={ctxLoading || saving}
              >
                Reset to server/public
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Database Backups */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={800} fontSize={18}>Database Backups</Typography>
            <Box sx={{ ml: 'auto' }} />
            {(backupsLoading || backupRunning) && <CircularProgress size={18} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Create on-demand backups and download existing snapshots.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
              Refresh
            </Button>
            {backups?.[0]?.file && (
              <Button
                variant="text"
                startIcon={<DownloadIcon />}
                onClick={() => downloadBackup(backups[0].file)}
              >
                Download Latest
              </Button>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />
          {missingDump && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              mysqldump is not available. Install MySQL client tools and add the bin folder to PATH,
              or set the MYSQLDUMP_PATH environment variable to mysqldump.exe, then restart the server.
              Examples on Windows:
              • MySQL Server: C:\Program Files\MySQL\MySQL Server 8.0\bin
              • MariaDB: C:\Program Files\MariaDB\bin
              • XAMPP: C:\xampp\mysql\bin
            </Alert>
          )}
          {backupsError && <Alert severity="error" sx={{ mb: 2 }}>{backupsError}</Alert>}

          {!backupsLoading && (!backups || backups.length === 0) && (
            <Typography variant="caption" color="text.secondary">No backups yet.</Typography>
          )}

          <Stack spacing={1}>
            {backups.map((b) => (
              <Paper key={b.file} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 700 }} noWrap title={b.file}>{b.file}</Typography>
                  <Chip size="small" label={humanSize(b.size)} />
                  <Chip size="small" label={fmtTime(b.mtime)} />
                  <Box sx={{ ml: 'auto' }} />
                  <Button size="small" startIcon={<DownloadIcon />} onClick={() => downloadBackup(b.file)}>
                    Download
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography fontWeight={800} fontSize={16}>Auto Backups</Typography>
            {scheduleLoading && <CircularProgress size={18} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
            Configure automatic daily backups. The server will create a backup on selected days at the scheduled time.
          </Typography>

          <Stack spacing={2}>
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
                sx={{ maxWidth: { xs: '100%', sm: 180 } }}
              />

              <Box>
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

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleScheduleSave}
                disabled={scheduleLoading || scheduleSaving || !isScheduleValid || !scheduleDirty}
              >
                {scheduleSaving ? 'Saving…' : 'Save Schedule'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleScheduleReset}
                disabled={scheduleLoading || scheduleSaving}
              >
                Reset
              </Button>
              <Tooltip title="Automatic backups run in server time.">
                <Chip size="small" label={schedule.enabled ? `${schedule.time} · ${schedule.days.join(', ')}` : 'Disabled'} />
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
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