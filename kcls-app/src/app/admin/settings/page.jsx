import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, TextField, Button, Divider,
  Alert, Snackbar, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Save as SaveIcon, Restore as ResetIcon, Backup as BackupIcon, Refresh as RefreshIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext.jsx';
import { formatDateTime } from '../../../utils/date';

const SettingsPage = () => {
  const { settings: ctxSettings, loading: ctxLoading, save: saveCtx, refresh } = useSystemSettings();

  // local input state with safe defaults
  const [fineInput, setFineInput] = useState(() => Number(ctxSettings?.fine ?? 5));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ open: false, text: '', severity: 'success' });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    // keep input in sync when context loads/changes
    if (ctxSettings && typeof ctxSettings.fine !== 'undefined') {
      setFineInput(Number(ctxSettings.fine));
    }
  }, [ctxSettings]);

  const originalFine = useMemo(() => Number(ctxSettings?.fine ?? 5), [ctxSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveCtx({ fine: Number(fineInput) });
      setFineInput(Number(saved.fine ?? 5));
      setMsg({ open: true, text: 'Settings saved.', severity: 'success' });
    } catch (e) {
      setMsg({ open: true, text: e?.message || 'Failed to save.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAttemptSave = () => {
    if (fineInput === '' || Number.isNaN(Number(fineInput))) return; // invalid input guard
    // Always require explicit confirmation (even if unchanged) for clarity
    setConfirmOpen(true);
  };

  const handleReset = async () => {
    await refresh();
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

  const loadBackups = async () => {
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
  };

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
  }, []);

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
              value={Number.isFinite(Number(fineInput)) ? fineInput : ''} // safe
              onChange={(e) => setFineInput(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              inputProps={{ min: 0, step: 1 }}
              helperText={`Current global fine: ${Number(ctxSettings?.fine ?? 5)}`}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleAttemptSave}
                disabled={ctxLoading || saving || fineInput === '' || Number.isNaN(Number(fineInput))}
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
        <DialogTitle sx={{ fontWeight:800, pb:1 }}>Confirm Fine Update</DialogTitle>
        <DialogContent sx={{ pt:0 }}>
          <Typography variant="body2" sx={{ mb:1 }}>
            Set the global fine per day to <b>{fineInput}</b>? This applies to future penalty calculations.
          </Typography>
          <Stack direction="row" spacing={3} sx={{ fontSize:13, mb:1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Current</Typography><br />
              <Typography fontWeight={700}>{originalFine}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>New</Typography><br />
              <Typography fontWeight={700} color={Number(fineInput) === originalFine ? 'text.secondary' : 'primary.main'}>
                {fineInput}
              </Typography>
            </Box>
          </Stack>
          {Number(fineInput) === originalFine ? (
            <Alert severity="info" sx={{ mt:1 }} variant="outlined">
              The value is unchanged. You can still confirm to re-save.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt:1 }} variant="outlined">
              Existing computed fines will not be retroactively recalculated.
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