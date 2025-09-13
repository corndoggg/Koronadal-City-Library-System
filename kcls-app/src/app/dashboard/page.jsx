// Enhanced dashboard with charts (requires: npm i chart.js react-chartjs-2)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Divider, IconButton, Tooltip, Chip,
  Stack, Skeleton, Button, FormControl, Select, MenuItem, InputLabel,
  List, ListItem, ListItemText, ListItemAvatar, Avatar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { RefreshCw, X } from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip as ChartTooltip, Legend, TimeScale
} from 'chart.js';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, ChartTooltip, Legend, TimeScale);

const number = v => Intl.NumberFormat().format(v || 0);

// Dummy minimal lucide icons fallback (if not imported) — replace or ensure imports exist
const IconBook = props => <span {...props}>📘</span>;
const IconDoc = props => <span {...props}>📄</span>;
const IconBorrow = props => <span {...props}>🔄</span>;
const IconStore = props => <span {...props}>📦</span>;

const DashboardPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [borrows, setBorrows] = useState([]);

  // NEW: users for borrower names
  const [users, setUsers] = useState([]); 
  // NEW: override map populated from /users/borrower/:id (same as librarian page)
  const [borrowerNameOverride, setBorrowerNameOverride] = useState({});

  // Pre‑computed
  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});

  // UI controls
  const [rangeMonths, setRangeMonths] = useState(12);
  const [autoMs, setAutoMs] = useState(0); // 0=manual, 30000=30s, 60000=60s
  const [statusFilter, setStatusFilter] = useState(''); // 'Pending' | 'Awaiting Pickup' | 'Active' | 'Overdue' | 'Returned' | 'Rejected'

  const statusBarRef = useRef(null);

  // Utility: availability value with casing fallback
  const availVal = (row) => (row?.Availability ?? row?.availability ?? 'Available');

  // A transaction is digital-only if it has only Document items and none with DocumentStorageID
  const isDigitalOnlyTx = (tx) => {
    const items = tx?.items || [];
    if (!items.length) return false;
    const allDocs = items.every(i => i.ItemType === 'Document');
    const anyPhysicalDoc = items.some(i => i.ItemType === 'Document' && !!i.DocumentStorageID);
    return allDocs && !anyPhysicalDoc;
  };

  // Helper: format a user's display name safely (kept)
  const formatUserName = useCallback((u) => {
    if (!u) return "";
    const full =
      [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(" ").trim()
      || u.FullName || u.Name || u.Username || u.Email;
    return full || `User #${u.User_ID || u.id || ""}`.trim();
  }, []);

  // Map of borrowerId -> name from /users (kept)
  const borrowerNameById = useMemo(() => {
    const map = {};
    (users || []).forEach(u => {
      const key = u.User_ID ?? u.id;
      if (!key) return;
      map[key] = formatUserName(u);
    });
    return map;
  }, [users, formatUserName]);

  // UPDATED: prefer names fetched via /users/borrower/:id, then fall back to /users
  const getBorrowerName = useCallback(
    (id) => borrowerNameOverride[id] || borrowerNameById[id] || (id ? `Borrower #${id}` : ""),
    [borrowerNameOverride, borrowerNameById]
  );

  // Try load all core data (books, docs, borrows, users if available)
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [bRes, dRes, brRes, uRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`),
        axios.get(`${API_BASE}/users`).catch(() => ({ data: [] }))
      ]);
      const bks = bRes.data || [];
      const docs = dRes.data || [];
      const brs = brRes.data || [];
      const us  = Array.isArray(uRes.data) ? uRes.data : [];

      // inventories (per-title)
      const bookInventories = {};
      await Promise.all(
        bks.map(async b => {
          try {
            const inv = (await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`)).data || [];
            bookInventories[b.Book_ID] = inv;
          } catch { bookInventories[b.Book_ID] = []; }
        })
      );
      const docInventories = {};
      await Promise.all(
        docs.map(async d => {
          try {
            const inv = (await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`)).data || [];
            docInventories[d.Document_ID] = inv;
          } catch { docInventories[d.Document_ID] = []; }
        })
      );

      // Due/expiration date from API response
      const dueMapTemp = {};
      for (const tx of brs) {
        dueMapTemp[tx.BorrowID] = tx.ReturnDate || null; // backend gives MAX(ReturnDate)
      }

      setBooks(bks);
      setDocuments(docs);
      setBorrows(brs);
      setUsers(us);
      setBookInvMap(bookInventories);
      setDocInvMap(docInventories);
      setDueMap(dueMapTemp);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e.message || 'Failed loading data');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

    // NEW: resolve borrower names using /users/borrower/:id (like the Librarian borrow page)
  useEffect(() => {
    const ids = [...new Set((borrows || []).map(tx => tx.BorrowerID).filter(Boolean))];
    const missing = ids.filter(id => !borrowerNameOverride[id] && !borrowerNameById[id]);
    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      const updates = {};
      for (const id of missing) {
        try {
          const res = await axios.get(`${API_BASE}/users/borrower/${id}`);
          const u = res.data || {};
          const f = (u.Firstname || u.FirstName || '').trim();
          const m = (u.Middlename || u.MiddleName || '').trim();
          const l = (u.Lastname || u.LastName || '').trim();
          const mi = m ? ` ${m[0]}.` : '';
          const name = `${f}${mi} ${l}`.trim() || u.Username || '';
          if (name) { updates[id] = name; continue; }
        } catch {}

        try {
          const r2 = await axios.get(`${API_BASE}/users/${id}`);
          const u2 = Array.isArray(r2.data) ? r2.data[0] : r2.data;
          if (u2) updates[id] = formatUserName(u2);
        } catch {
          updates[id] = `Borrower #${id}`;
        }
      }
      if (!cancelled && Object.keys(updates).length) {
        setBorrowerNameOverride(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => { cancelled = true; };
  }, [borrows, borrowerNameOverride, borrowerNameById, API_BASE, formatUserName]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto refresh
  useEffect(() => {
    if (!autoMs) return;
    const id = setInterval(fetchAll, autoMs);
    return () => clearInterval(id);
  }, [autoMs, fetchAll]);

  // Derive borrow status label for charts/cards
  const deriveStatusLabel = useCallback((tx) => {
    const now = new Date();
    const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;

    // Rejections/Returns first
    if (tx.ApprovalStatus === 'Rejected') return 'Rejected';

    // Digital-only flow (Active vs Expired; Returned => Expired)
    if (isDigitalOnlyTx(tx)) {
      if (tx.ReturnStatus === 'Returned') return 'Overdue'; // treat Expired as Overdue in charts
      if (tx.ApprovalStatus === 'Pending') return 'Pending';
      if (tx.ApprovalStatus === 'Approved') {
        if (due && due < now) return 'Overdue'; // Expired
        return 'Active'; // Active (Digital)
      }
      return 'Pending';
    }

    // Physical/mixed flow
    if (tx.ReturnStatus === 'Returned') return 'Returned';
    if (tx.ApprovalStatus === 'Pending') return 'Pending';
    if (tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved') {
      if (due && due < now) return 'Overdue'; // overdue even if awaiting pickup
      return 'Awaiting Pickup';
    }
    if (tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned') {
      if (due && due < now) return 'Overdue';
      return 'Active';
    }
    return 'Pending';
  }, [dueMap]);

  // Metrics
  const metrics = useMemo(() => {
    const bookCopies = Object.values(bookInvMap).reduce((a, v) => a + v.length, 0);
    const bookAvailable = Object.values(bookInvMap)
      .reduce((a, v) => a + v.filter(i => availVal(i) === 'Available').length, 0);

    // Document physical copies are inventory rows; availability from each row
    const docPhysCopies = Object.values(docInvMap).reduce((a, v) => a + v.length, 0);
    const docPhysAvailable = Object.values(docInvMap)
      .reduce((a, v) => a + v.filter(i => availVal(i) === 'Available').length, 0);

    // Digital documents are titles with an attached file path
    const digitalDocs = (documents || []).filter(d => d.File_Path || d.file_path).length;

    // Borrow statuses (map digital "Expired" under Overdue)
    let pending = 0, awaiting = 0, active = 0, returned = 0, rejected = 0, overdue = 0;
    borrows.forEach(tx => {
      const s = deriveStatusLabel(tx);
      if (s === 'Pending') pending++;
      else if (s === 'Awaiting Pickup') awaiting++;
      else if (s === 'Active') active++;
      else if (s === 'Returned') returned++;
      else if (s === 'Rejected') rejected++;
      else if (s === 'Overdue') overdue++;
    });

    return {
      bookTitles: books.length,
      bookCopies,
      bookAvailable,
      docTitles: documents.length,
      docPhysCopies,
      docPhysAvailable,
      digitalDocs,
      borrowTotal: borrows.length,
      pending, awaiting, active, returned, rejected, overdue
    };
  }, [books, documents, borrows, bookInvMap, docInvMap, deriveStatusLabel]);

  // FIX: trend filter and month mapping to ensure data shows
  const parseBorrowDate = (tx) => {
    const raw = tx.BorrowDate || tx.borrowDate;
    if (!raw) return null;
    // Accept both ISO string and Date
    return raw instanceof Date ? raw : new Date(raw);
  };

  // Filtered borrows for trend (by status + time range)
  const filteredTrendBorrows = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - (rangeMonths - 1));
    return (borrows || []).filter(tx => {
      const d = parseBorrowDate(tx);
      if (!d || isNaN(d.getTime())) return false;
      if (d < cutoff) return false;
      if (statusFilter) return deriveStatusLabel(tx) === statusFilter;
      return true;
    });
  }, [borrows, rangeMonths, statusFilter, deriveStatusLabel]);

  // Monthly Borrow Trend dataset
  const borrowTrend = useMemo(() => {
    const now = new Date();
    const labels = [];
    const keyFor = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
    const map = {};
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = keyFor(d.getFullYear(), d.getMonth());
      labels.push(k);
      map[k] = 0;
    }
    filteredTrendBorrows.forEach(tx => {
      const d = parseBorrowDate(tx);
      if (!d) return;
      const k = keyFor(d.getFullYear(), d.getMonth());
      if (k in map) map[k] += 1; // count
    });
    return {
      labels,
      datasets: [{
        label: 'Borrows',
        data: labels.map(l => map[l]),
        borderColor: '#1976d2',
        backgroundColor: alpha('#1976d2', .22),
        tension: .25,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }, [filteredTrendBorrows, rangeMonths]);

  // NEW: Borrow Mix (Books vs Docs Physical vs Docs Digital)
  const borrowMixDoughnut = useMemo(() => {
    let booksCnt = 0, physCnt = 0, digiCnt = 0;
    (borrows || []).forEach(tx => {
      (tx.items || []).forEach(it => {
        if (it.ItemType === 'Book') booksCnt++;
        else if (it.ItemType === 'Document' && it.DocumentStorageID) physCnt++;
        else if (it.ItemType === 'Document' && !it.DocumentStorageID) digiCnt++;
      });
    });
    return {
      labels: ['Books', 'Docs Physical', 'Docs Digital'],
      datasets: [{
        data: [booksCnt, physCnt, digiCnt],
        backgroundColor: ['#1976d2', '#7b1fa2', '#9c27b0'],
        borderWidth: 1
      }]
    };
  }, [borrows]);

  // ADD: helpers to resolve item titles for activity lists
  const getDocumentId = (obj) => obj?.Document_ID ?? obj?.DocumentID ?? obj?.documentId ?? obj?.DocumentId;

  const bookById = useMemo(() => {
    const m = {};
    (books || []).forEach(b => { m[b.Book_ID] = b; });
    return m;
  }, [books]);

  const docById = useMemo(() => {
    const m = {};
    (documents || []).forEach(d => { m[d.Document_ID] = d; });
    return m;
  }, [documents]);

  // Copy_ID -> book meta (includes Title)
  const bookCopyToMeta = useMemo(() => {
    const m = {};
    Object.entries(bookInvMap || {}).forEach(([bookId, rows]) => {
      const base = bookById[Number(bookId)];
      (rows || []).forEach(r => {
        if (!r) return;
        m[r.Copy_ID] = { ...(base || {}), ...(r || {}) };
      });
    });
    return m;
  }, [bookInvMap, bookById]);

  // Storage_ID -> document meta (includes Title)
  const docStorageToMeta = useMemo(() => {
    const m = {};
    Object.entries(docInvMap || {}).forEach(([docId, rows]) => {
      const base = docById[Number(docId)];
      (rows || []).forEach(r => {
        if (!r) return;
        m[r.Storage_ID] = { ...(base || {}), ...(r || {}) };
      });
    });
    return m;
  }, [docInvMap, docById]);

  const itemTitle = useCallback((it) => {
    if (!it) return '';
    if (it.ItemType === 'Book') {
      const meta = bookCopyToMeta[it.BookCopyID];
      return meta?.Title || `Book Copy #${it.BookCopyID}`;
    }
    if (it.DocumentStorageID) {
      const meta = docStorageToMeta[it.DocumentStorageID];
      return meta?.Title || `Doc Storage #${it.DocumentStorageID}`;
    }
    const did = getDocumentId(it);
    const meta = did && docById[did];
    return meta?.Title || `Doc #${did || '—'}`;
  }, [bookCopyToMeta, docStorageToMeta, docById]);

  // NEW: Top Borrowers (by total transactions and active count)
  const topBorrowers = useMemo(() => {
    const counts = new Map();
    for (const tx of borrows || []) {
      const id = tx.BorrowerID;
      if (!id) continue;
      const s = deriveStatusLabel(tx);
      const row = counts.get(id) || { id, total: 0, active: 0 };
      row.total += 1;
      if (s === "Active" || s === "Awaiting Pickup") row.active += 1;
      counts.set(id, row);
    }
    // Attach names using the latest resolver (uses override -> users map)
    return Array.from(counts.values())
      .map(r => ({ ...r, name: getBorrowerName(r.id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [borrows, deriveStatusLabel, getBorrowerName]);

  // NEW: Recent Borrow Activity (latest 10) with borrower name and item titles
  const recentActivity = useMemo(() => {
    return [...(borrows || [])]
      .sort((a,b) => {
        const da = (a.BorrowDate ? new Date(a.BorrowDate) : 0)?.getTime?.() || 0;
        const db = (b.BorrowDate ? new Date(b.BorrowDate) : 0)?.getTime?.() || 0;
        return db - da;
      })
      .slice(0, 10)
      .map(tx => {
        const items = tx.items || [];
        const titles = items.map(itemTitle).filter(Boolean);
        const shown = titles.slice(0, 2);
        const more = titles.length > 2 ? ` +${titles.length - 2} more` : '';
        return {
          id: tx.BorrowID,
          date: tx.BorrowDate?.slice(0, 10) || '',
          who: getBorrowerName(tx.BorrowerID),
          status: deriveStatusLabel(tx),
          itemsSummary: shown.join(' • ') + more
        };
      });
  }, [borrows, getBorrowerName, deriveStatusLabel, itemTitle]);

  // Chart Data
  // 1. Availability Distribution (Books + Documents)
  const availabilityDoughnut = useMemo(() => {
    const vals = [
      metrics.bookAvailable,
      Math.max(0, metrics.bookCopies - metrics.bookAvailable),
      metrics.docPhysAvailable,
      Math.max(0, metrics.docPhysCopies - metrics.docPhysAvailable),
      metrics.digitalDocs
    ];
    return {
      labels: ['Book Available', 'Book Unavailable', 'Doc Phys Available', 'Doc Phys Unavailable', 'Digital Docs'],
      datasets: [{
        data: vals,
        backgroundColor: ['#2e7d32', '#81c784', '#1976d2', '#90caf9', '#9c27b0'],
        borderWidth: 1
      }]
    };
  }, [metrics]);

  // 2. Borrow Status Bar
  const borrowStatusBar = useMemo(() => ({
    labels: ['Pending', 'Awaiting Pickup', 'Active', 'Overdue', 'Returned', 'Rejected'],
    datasets: [{
      label: 'Borrows',
      backgroundColor: ['#ffb300','#0288d1','#7b1fa2','#d32f2f','#2e7d32','#757575'],
      data: [
        metrics.pending,
        metrics.awaiting,
        metrics.active,
        metrics.overdue,
        metrics.returned,
        metrics.rejected
      ],
      borderRadius: 6,
      maxBarThickness: 42
    }]
  }), [metrics]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const raw = ctx.parsed;
            const total = ctx.dataset.data.reduce((a,b)=>a+(+b||0),0);
            const pct = total ? ((raw/total)*100).toFixed(1) : 0;
            return `${ctx.label}: ${number(raw)} (${pct}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${number(ctx.parsed.y ?? ctx.parsed)}`,
        }
      }
    },
    scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } }
    }
  };

  const summaryCards = [
    {
      icon: IconBook,
      title: 'Books',
      value: number(metrics.bookTitles),
      sub: `${number(metrics.bookCopies)} copies • ${number(metrics.bookAvailable)} avail`,
      color: '#1976d2'
    },
    {
      icon: IconDoc,
      title: 'Documents',
      value: number(metrics.docTitles),
      sub: `${number(metrics.docPhysCopies)} phys • ${number(metrics.docPhysAvailable)} avail`,
      color: '#9c27b0'
    },
    {
      icon: IconBorrow,
      title: 'Borrow Activity',
      value: number(metrics.borrowTotal),
      sub: `${number(metrics.active)} active • ${number(metrics.overdue)} overdue`,
      color: '#2e7d32'
    },
    {
      icon: IconStore,
      title: 'Storages',
      value: number(metrics.bookCopies + metrics.docPhysCopies),
      sub: `${number(metrics.docPhysAvailable + metrics.bookAvailable)} total avail`,
      color: '#ff9800'
    }
  ];

  const borrowTotals = borrowStatusBar.datasets[0].data.reduce((a,b)=>a+(b||0),0);
  const availTotals = availabilityDoughnut.datasets[0].data.reduce((a,b)=>a+(b||0),0);
  const trendTotals = borrowTrend.datasets[0].data.reduce((a,b)=>a+(b||0),0);

  return (
    <Box p={3} sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper
        sx={{
          p:2, mb:3, display:'flex', flexWrap:'wrap', gap:2,
          alignItems:'center', border: theme => `2px solid ${theme.palette.divider}`, borderRadius:1
        }}
      >
        <Box>
          <Typography fontWeight={800} fontSize={18}>Dashboard Overview</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Visual metrics & trends</Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Trend Range</InputLabel>
            <Select label="Trend Range" value={rangeMonths} onChange={e => setRangeMonths(Number(e.target.value))}>
              <MenuItem value={3}>Last 3 months</MenuItem>
              <MenuItem value={6}>Last 6 months</MenuItem>
              <MenuItem value={12}>Last 12 months</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Auto Refresh</InputLabel>
            <Select label="Auto Refresh" value={autoMs} onChange={e => setAutoMs(Number(e.target.value))}>
              <MenuItem value={0}>Manual</MenuItem>
              <MenuItem value={30000}>Every 30s</MenuItem>
              <MenuItem value={60000}>Every 1m</MenuItem>
            </Select>
          </FormControl>

          {lastUpdated && (
            <Chip size="small" label={`Updated ${lastUpdated.toLocaleTimeString()}`} sx={{ fontWeight:600 }} />
          )}
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={fetchAll}
              disabled={loading}
              sx={{ border: theme=>`1.5px solid ${theme.palette.divider}`, borderRadius:1 }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {err && (
        <Paper
          sx={{
            p:2, mb:2, border: theme => `2px solid ${alpha(theme.palette.error.main,.4)}`, borderRadius:1,
            bgcolor: theme => alpha(theme.palette.error.main,.08)
          }}
        >
          <Typography variant="body2" fontWeight={600} color="error.main">{err}</Typography>
          <Button
            size="small"
            onClick={fetchAll}
            sx={{ mt:1, fontWeight:600, borderRadius:1 }}
            variant="contained"
          >
            Retry
          </Button>
        </Paper>
      )}

      {/* Summary cards */}
      <Grid container spacing={2.25}>
        {summaryCards.map(c => (
          <Grid item xs={12} sm={6} md={3} key={c.title}>
            <SummaryCard {...c} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.25} mt={0.5}>
        {/* Availability */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p:2, height:360, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Typography fontWeight={800} fontSize={14}>Availability Distribution</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? <Skeleton variant="rounded" height={240} /> : availTotals ? (
              <Box flexGrow={1}><Doughnut data={availabilityDoughnut} options={chartOptions} /></Box>
            ) : (
              <Box sx={{ flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Typography variant="caption" color="text.secondary">No availability data.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Borrow Status */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p:2, height:360, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={800} fontSize={14}>Borrow Status</Typography>
              {!!statusFilter && (
                <Chip size="small" color="primary" variant="outlined" onDelete={()=>setStatusFilter('')} deleteIcon={<X size={14} />} label={`Filter: ${statusFilter}`} sx={{ ml: 'auto', fontWeight:700 }} />
              )}
            </Stack>
            <Divider sx={{ my:1 }} />
            {loading ? <Skeleton variant="rounded" height={240} /> : borrowTotals ? (
              <Box flexGrow={1}>
                <Bar
                  ref={statusBarRef}
                  data={borrowStatusBar}
                  options={barOptions}
                  onClick={(evt) => {
                    const chart = statusBarRef.current;
                    if (!chart) return;
                    const points = chart.getElementsAtEventForMode(evt.native || evt, 'nearest', { intersect: true }, false);
                    if (points.length) {
                      const idx = points[0].index;
                      const label = borrowStatusBar.labels[idx];
                      setStatusFilter(label === statusFilter ? '' : label);
                    }
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Typography variant="caption" color="text.secondary">No borrow data.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* REPLACED: Borrow Mix instead of Top Book Categories */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p:2, height:360, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Typography fontWeight={800} fontSize={14}>Borrow Mix</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? <Skeleton variant="rounded" height={240} /> : (
              <Box flexGrow={1}><Doughnut data={borrowMixDoughnut} options={chartOptions} /></Box>
            )}
          </Paper>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p:2, height:360, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={800} fontSize={14}>Monthly Borrow Trend ({rangeMonths} mo)</Typography>
              {!!statusFilter && <Chip size="small" label={`Filtered: ${statusFilter}`} sx={{ fontWeight:700 }} />}
            </Stack>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : trendTotals ? (
              <Box flexGrow={1}><Line data={borrowTrend} options={lineOptions} /></Box>
            ) : (
              <Box sx={{ flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Typography variant="caption" color="text.secondary">No trend data in selected range.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* NEW: Top Borrowers */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2, minHeight:320, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Typography fontWeight={800} fontSize={14}>Top Borrowers</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? <Skeleton variant="rounded" height={220} /> : (
              <List dense>
                {topBorrowers.length ? topBorrowers.map(b => (
                  <ListItem key={b.id} divider>
                    <ListItemAvatar>
                      <Avatar>{String(b.name || '').slice(0,1).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                      primary={b.name}
                      secondary={`Total: ${number(b.total)} • Active: ${number(b.active)}`}
                    />
                    <Chip size="small" label={`#${b.id}`} />
                  </ListItem>
                )) : (
                  <Typography variant="caption" color="text.secondary">No borrower data.</Typography>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        {/* NEW: Recent Borrow Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2, minHeight:320, display:'flex', flexDirection:'column', border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1 }}>
            <Typography fontWeight={800} fontSize={14}>Recent Borrow Activity</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? <Skeleton variant="rounded" height={220} /> : (
              <List dense>
                {recentActivity.length ? recentActivity.map(it => (
                  <ListItem key={it.id} divider secondaryAction={<Chip size="small" label={it.status} />}>
                    <ListItemAvatar><Avatar>🔄</Avatar></ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                      primary={it.who}
                      secondary={`${it.itemsSummary}${it.date ? ` • ${it.date}` : ''}`}
                    />
                  </ListItem>
                )) : (
                  <Typography variant="caption" color="text.secondary">No recent activity.</Typography>
                )}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper
        sx={{
          mt:3, p:2, border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
        }}
      >
        <Typography fontWeight={700} fontSize={13} mb={1}>Scenarios Highlighted</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip size="small" label="Availability mix" />
          <Chip size="small" label="Borrow load" />
          <Chip size="small" label="Category concentration" />
          <Chip size="small" label="Seasonality" />
          <Chip size="small" label="Overdue impact" />
          {!!statusFilter && <Chip size="small" color="primary" label={`Status filter: ${statusFilter}`} />}
        </Stack>
      </Paper>
    </Box>
  );
};

// Add: SummaryCard component used by the summary grid
const SummaryCard = ({ icon: Icon, title, value, sub, color = '#1976d2', loading }) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      border: theme => `2px solid ${theme.palette.divider}`,
      borderRadius: 1
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 1,
        bgcolor: alpha(color, 0.12),
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {Icon ? <Icon /> : <span>•</span>}
    </Box>
    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
      {loading ? (
        <>
          <Skeleton width={80} height={18} />
          <Skeleton width={160} height={12} sx={{ mt: 0.5 }} />
        </>
      ) : (
        <>
          <Typography fontWeight={800} fontSize={18} noWrap>{value}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>{title}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>{sub}</Typography>
        </>
      )}
    </Box>
  </Paper>
);

export default DashboardPage;