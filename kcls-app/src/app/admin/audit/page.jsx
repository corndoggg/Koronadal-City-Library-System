import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, Stack, Button, Divider, Tooltip, CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import dayjs from 'dayjs';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_BASE;

const LIMIT_FETCH = 500; // pull once then client-filter/paginate

const AuditLogsPage = () => {
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

  const fetchMeta = useCallback(async () => {
    try {
      const [acts, tts] = await Promise.all([
        axios.get(`${API_BASE}/audit/action-types`).catch(()=>({data:[]})),
        axios.get(`${API_BASE}/audit/target-types`).catch(()=>({data:[]})),
      ]);
      setActionTypes(acts.data || []);
      setTargetTypes(tts.data || []);
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: LIMIT_FETCH,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        action: actionCode || undefined,
        targetType: targetType || undefined,
        userId: userId || undefined,
        targetId: targetId || undefined,
        q: detailsQuery || undefined
      };
      const res = await axios.get(`${API_BASE}/audit`, { params });
      setRows(res.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setPage(0);
    }
  }, [API_BASE, dateFrom, dateTo, actionCode, targetType, userId, targetId]);

  // Resolve missing user names (batch)
  useEffect(() => {
    const ids = [...new Set(rows.map(r => r.UserID).filter(Boolean))]
      .filter(id => !userNameMap[id]);
    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      for (const id of ids) {
        try {
          const res = await axios.get(`${API_BASE}/users/${id}`).catch(() => null);
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
  }, [rows, userNameMap]); // API_BASE constant; no /users/borrower usage now

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchLogs();
  }, []); // initial (user will press search to refine later)

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
    fetchLogs();
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
    } catch {}
    // Fallback: strip braces-like characters for aesthetics
    return String(raw).replace(/[{}\[\]"]/g,'').replace(/[:]{2,}/g,': ');
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['ID','Time (UTC)','Action','Target','User','Details','IP'];
    const lines = [headers.join(',')];
    filtered.forEach(r => {
      const row = [
        r.AuditID,
        dayjs(r.CreatedAt).format('YYYY-MM-DD HH:mm:ss'),
        r.ActionCode,
        r.TargetTypeCode || '',
        r.UserID || '',
        formatDetails(r.Details)
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

  // PDF export via preview-less direct download
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
    const rowsData = filtered.map(r => [
      r.AuditID,
      dayjs(r.CreatedAt).format('YYYY-MM-DD HH:mm:ss'),
      r.ActionCode,
      r.TargetTypeCode || '',
      r.UserID || '',
      formatDetails(r.Details)
    ]);
    autoTable(doc, {
      head: [['ID','Time (UTC)','Action','Target','User','Details','IP']],
      body: rowsData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25,118,210] },
      startY: 40,
      margin: { left: 32, right: 32 }
    });
    doc.text('Audit Logs', 32, 26);
    doc.save(`audit_logs_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
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
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Action"
            size="small"
            select
            value={actionCode}
            onChange={e => setActionCode(e.target.value)}
            sx={{ minWidth:170 }}
          >
            <MenuItem value="">(Any)</MenuItem>
            {actionTypes.map(a => (
              <MenuItem key={a.ActionCode} value={a.ActionCode}>{a.ActionCode}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Target Type"
            size="small"
            select
            value={targetType}
            onChange={e => setTargetType(e.target.value)}
            sx={{ minWidth:170 }}
          >
            <MenuItem value="">(Any)</MenuItem>
            {targetTypes.map(t => (
              <MenuItem key={t.TargetTypeCode} value={t.TargetTypeCode}>{t.TargetTypeCode}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="User ID"
            size="small"
            value={userId}
            onChange={e => setUserId(e.target.value.replace(/\D/g,''))}
            sx={{ width:110 }}
          />
            <TextField
              label="Target ID"
              size="small"
              value={targetId}
              onChange={e => setTargetId(e.target.value.replace(/\D/g,''))}
              sx={{ width:110 }}
            />
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink:true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink:true }}
          />
          <TextField
            label="Details contains"
            size="small"
            value={detailsQuery}
            onChange={e => setDetailsQuery(e.target.value)}
            sx={{ minWidth:200 }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
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
            <Button
              variant="outlined"
              size="small"
              onClick={exportCSV}
              disabled={loading}
            >Export CSV</Button>
            <Button
              variant="outlined"
              size="small"
              onClick={exportPDF}
              disabled={loading}
            >Export PDF</Button>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchLogs} disabled={loading} size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
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
                let detailsShort = r.Details || '';
                if (detailsShort && detailsShort.length > 120)
                  detailsShort = detailsShort.slice(0, 117) + '...';
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
                      {r.TargetTypeCode
                        ? `${r.TargetTypeCode}`
                        : ''}
                    </TableCell>
                    <TableCell>
                      {r.UserID
                        ? (userNameMap[r.UserID] || `User #${r.UserID}`)
                        : '(system)'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatDetails(r.Details)}>
                        <span style={{ whiteSpace:'nowrap' }}>{formatDetails(detailsShort)}</span>
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
    </Box>
  );
};

export default AuditLogsPage;