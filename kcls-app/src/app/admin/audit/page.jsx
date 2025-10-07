import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, Stack, Button, Divider, Tooltip, CircularProgress,
  Collapse, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_BASE;

const LIMIT_FETCH = 500; // pull once then client-filter/paginate

const AuditLogsPage = () => {
  const apiBase = useMemo(() => API_BASE, []);
  const [rows, setRows] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [targetTypes, setTargetTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [actionCode, setActionCode] = useState('');
  const [targetType, setTargetType] = useState('');
  const [userId, setUserId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(7,'day').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [detailsQuery, setDetailsQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRpp] = useState(25);

  // Cache user names (optional resolution)
  const [userNameMap, setUserNameMap] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  const fetchMeta = useCallback(async () => {
    try {
      const [acts, tts] = await Promise.all([
        axios.get(`${apiBase}/audit/action-types`).catch(()=>({data:[]})),
        axios.get(`${apiBase}/audit/target-types`).catch(()=>({data:[]})),
      ]);
      setActionTypes(acts.data || []);
      setTargetTypes(tts.data || []);
    } catch (error) {
      console.error('Failed to fetch audit metadata', error);
    }
  }, [apiBase]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const trimmedQuery = detailsQuery.trim();
      const params = {
        limit: LIMIT_FETCH,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        action: actionCode || undefined,
        targetType: targetType || undefined,
        userId: userId || undefined,
        targetId: targetId || undefined,
        q: trimmedQuery || undefined
      };
      const res = await axios.get(`${apiBase}/audit`, { params });
      setRows(res.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      setRows([]);
    } finally {
      setLoading(false);
      setPage(0);
    }
  }, [actionCode, apiBase, dateFrom, dateTo, detailsQuery, targetId, targetType, userId]);

  // Resolve missing user names (batch)
  useEffect(() => {
    const ids = [...new Set(rows.map(r => r.UserID).filter(Boolean))]
      .filter(id => !userNameMap[id]);
    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      for (const id of ids) {
        try {
          const res = await axios.get(`${apiBase}/users/${id}`).catch(() => null);
          let u = res?.data;
          if (Array.isArray(u)) u = u[0];
          if (u) {
            const name = [u.Firstname||u.FirstName, u.Middlename||u.MiddleName, u.Lastname||u.LastName]
              .filter(Boolean).join(' ').trim() || u.Username || `User #${id}`;
            if (!cancelled)
              setUserNameMap(prev => ({ ...prev, [id]: name }));
          } else if (!cancelled) {
            setUserNameMap(prev => ({ ...prev, [id]: `User #${id}` }));
          }
        } catch {
          if (!cancelled)
            setUserNameMap(prev => ({ ...prev, [id]: `User #${id}` }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [apiBase, rows, userNameMap]); // API base constant; no /users/borrower usage now

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [fetchLogs]);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const handleSearch = () => {
    fetchLogs();
  };

  const handleClear = () => {
    setActionCode('');
    setTargetType('');
    setUserId('');
    setTargetId('');
    setDetailsQuery('');
    setDateFrom(dayjs().subtract(7,'day').format('YYYY-MM-DD'));
    setDateTo(dayjs().format('YYYY-MM-DD'));
  };

  const filtered = rows; // backend filters by q now
  // Format Details nicely: parse JSON if possible and render a compact string
  const formatDetails = (raw) => {
    if (!raw) return '';
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (obj && typeof obj === 'object') {
        // Turn object into key: value pairs sorted by key
        const entries = Object.entries(obj).sort(([a],[b])=>a.localeCompare(b));
        return entries.map(([k,v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Audit detail parse skipped', error);
      }
    }
    // Fallback: strip braces-like characters for aesthetics
      return String(raw)
        .replace(/[{}"]/g, '')
        .replace(/\[/g, '')
        .replace(/\]/g, '')
        .replace(/\\/g, '')
        .replace(/:{2,}/g, ': ');
  };

  const createPdfDocument = () => {
    const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
    const generatedOn = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const summaryLines = [
      `Generated: ${generatedOn}`,
      `Filters • Action: ${actionCode || 'Any'} • Target: ${targetType || 'Any'} • User: ${userId || 'Any'} • Target ID: ${targetId || 'Any'}`,
      `Date Range: ${dateFrom || '—'} to ${dateTo || '—'}`,
      `Results: ${filtered.length} logs`
    ];

    doc.setFontSize(16);
    doc.text('Audit Logs', 32, 32);
    doc.setFontSize(10);
    summaryLines.forEach((line, index) => {
      doc.text(line, 32, 52 + index * 14);
    });

    const rowsData = filtered.map(r => [
      r.AuditID,
      dayjs(r.CreatedAt).format('YYYY-MM-DD HH:mm:ss'),
      `${r.ActionCode || ''}${actionLabel(r.ActionCode) !== r.ActionCode ? ` — ${actionLabel(r.ActionCode)}` : ''}`,
      `${r.TargetTypeCode || ''}${r.TargetTypeCode ? ` — ${targetLabel(r.TargetTypeCode)}` : ''}`,
      r.UserID || '',
      formatDetails(r.Details),
      r.IPAddress || r.IP || ''
    ]);

    autoTable(doc, {
      head: [['ID','Time (UTC)','Action','Target','User','Details','IP']],
      body: rowsData,
      styles: { fontSize: 8, cellWidth: 'wrap' },
      headStyles: { fillColor: [25,118,210] },
      startY: 52 + summaryLines.length * 14 + 10,
      margin: { left: 32, right: 32 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: () => {
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.getWidth();
        const pageHeight = pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(`Generated: ${generatedOn}`, 32, pageHeight - 18);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 90, pageHeight - 18);
      }
    });

    return doc;
  };

  // CSV export
  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['ID','Time (UTC)','Action','Target','User','Details','IP'];
    const lines = [headers.join(',')];
    filtered.forEach(r => {
      const row = [
        r.AuditID,
        dayjs(r.CreatedAt).format('YYYY-MM-DD HH:mm:ss'),
        r.ActionCode,
        r.TargetTypeCode || '',
        r.UserID || '',
        formatDetails(r.Details),
        r.IPAddress || r.IP || ''
      ].map(c => `"${String(c).replace(/"/g,'""')}"`).join(',');
      lines.push(row);
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_logs_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePreviewPdf = () => {
    if (!filtered.length) return;
    try {
      const doc = createPdfDocument();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      const fileName = `audit_logs_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
      setPreviewFileName(fileName);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Failed to generate audit PDF preview', error);
      alert('Unable to generate PDF preview. Please try again.');
    }
  };

  const exportPDF = () => {
    if (!filtered.length) return;
    try {
      const doc = createPdfDocument();
      doc.save(`audit_logs_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    } catch (error) {
      console.error('Failed to export audit PDF', error);
      alert('Unable to export PDF. Please try again.');
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const downloadPreviewPdf = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = previewFileName || 'audit_logs.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const actionLabel = useCallback(code =>
    actionTypes.find(a => a.ActionCode === code)?.Description || code, [actionTypes]);

  const targetLabel = useCallback(code =>
    targetTypes.find(t => t.TargetTypeCode === code)?.Description || code, [targetTypes]);

  return (
    <Box p={3}>
      <Typography fontWeight={800} fontSize={20} mb={2}>Audit Logs</Typography>
      <Paper sx={{ p:2, mb:2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'flex-end' }}
          >
            <TextField
              label="Action"
              size="small"
              select
              value={actionCode}
              onChange={e => setActionCode(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">(Any)</MenuItem>
              {actionTypes.map(a => (
                <MenuItem key={a.ActionCode} value={a.ActionCode}>
                  {a.ActionCode}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flex={1}>
              <TextField
                label="From"
                type="date"
                size="small"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Details contains"
              size="small"
              value={detailsQuery}
              onChange={e => setDetailsQuery(e.target.value)}
              fullWidth
              placeholder="Who, what or where"
            />
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >Search</Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                disabled={loading}
              >Clear</Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              variant="text"
              startIcon={<TuneIcon />}
              onClick={() => setShowAdvanced(prev => !prev)}
            >
              {showAdvanced ? 'Hide advanced filters' : 'Show advanced filters'}
            </Button>
            <Stack direction="row" spacing={1} ml="auto" flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                onClick={exportCSV}
                disabled={loading || !filtered.length}
              >Export CSV</Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon fontSize="small" />}
                onClick={handlePreviewPdf}
                disabled={loading || !filtered.length}
              >Preview PDF</Button>
              <Button
                variant="outlined"
                size="small"
                onClick={exportPDF}
                disabled={loading || !filtered.length}
              >Download PDF</Button>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={fetchLogs} disabled={loading} size="small">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <Collapse in={showAdvanced} timeout="auto" unmountOnExit>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mt={1.5} flexWrap="wrap">
              <TextField
                label="Target Type"
                size="small"
                select
                value={targetType}
                onChange={e => setTargetType(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">(Any)</MenuItem>
                {targetTypes.map(t => (
                  <MenuItem key={t.TargetTypeCode} value={t.TargetTypeCode}>
                    {t.TargetTypeCode}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="User ID"
                size="small"
                value={userId}
                onChange={e => setUserId(e.target.value.replace(/\D/g, ''))}
                sx={{ width: 160 }}
              />
              <TextField
                label="Target ID"
                size="small"
                value={targetId}
                onChange={e => setTargetId(e.target.value.replace(/\D/g, ''))}
                sx={{ width: 160 }}
              />
            </Stack>
          </Collapse>
        </Stack>
      </Paper>

      <Paper sx={{ p:0, overflow:'hidden' }}>
        <Box px={2} py={1} display="flex" alignItems="center">
          <Typography fontWeight={700} fontSize={14}>
            Results ({filtered.length}{filtered.length !== rows.length ? ` / ${rows.length}` : ''})
          </Typography>
          <Box flexGrow={1} />
          {loading && <CircularProgress size={18} />}
        </Box>
        <Divider />
        <TableContainer sx={{ maxHeight: '65vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight:700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight:700 }}>Time (UTC)</TableCell>
                <TableCell sx={{ fontWeight:700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight:700 }}>Target</TableCell>
                <TableCell sx={{ fontWeight:700 }}>User</TableCell>
                <TableCell sx={{ fontWeight:700, minWidth:260 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map(r => {
                const formattedDetails = formatDetails(r.Details);
                const detailsShort = formattedDetails.length > 120
                  ? `${formattedDetails.slice(0, 117)}...`
                  : formattedDetails;
                return (
                  <TableRow key={r.AuditID} hover>
                    <TableCell>{r.AuditID}</TableCell>
                    <TableCell>
                      {dayjs(r.CreatedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={actionLabel(r.ActionCode)}>
                        <span>{r.ActionCode}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {r.TargetTypeCode ? (
                        <Tooltip title={targetLabel(r.TargetTypeCode)}>
                          <span>{r.TargetTypeCode}</span>
                        </Tooltip>
                      ) : ''}
                    </TableCell>
                    <TableCell>
                      {r.UserID
                        ? (userNameMap[r.UserID] || `User #${r.UserID}`)
                        : '(system)'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formattedDetails}>
                        <span style={{ whiteSpace:'nowrap' }}>{detailsShort}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !paged.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py:4, color:'text.secondary' }}>
                    No logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
            rowsPerPageOptions={[10,25,50,100]}
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRpp(parseInt(e.target.value,10)); setPage(0); }}
        />
      </Paper>

      <Dialog
        open={previewOpen}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          PDF Preview — Audit Logs
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {previewUrl ? (
            <iframe
              title="Audit Logs PDF Preview"
              src={previewUrl}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          ) : (
            <Box p={2}>
              <Typography variant="body2">Generating preview…</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreview}>Close</Button>
          <Button variant="contained" onClick={downloadPreviewPdf} disabled={!previewUrl}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogsPage;