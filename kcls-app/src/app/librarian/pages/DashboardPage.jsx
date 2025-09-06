// Enhanced dashboard with charts (requires: npm i chart.js react-chartjs-2)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Divider, IconButton, Tooltip, Chip,
  Stack, Skeleton, Button, FormControl, Select, MenuItem, InputLabel
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

const SummaryCard = ({ icon: Icon, title, value, sub, color, loading }) => {
  const col = color;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: theme => `2px solid ${alpha(col || theme.palette.primary.main, .3)}`,
        borderRadius: 1,
        display: 'flex',
        gap: 1.25,
        alignItems: 'center',
        bgcolor: theme => alpha(col || theme.palette.primary.main, .07)
      }}
    >
      <Box sx={{
        width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 1, bgcolor: theme => alpha(col || theme.palette.primary.main, .18),
        border: theme => `1px solid ${alpha(col || theme.palette.primary.main, .5)}`
      }}>
        <Icon size={24} color={col} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }} noWrap>
          {title}
        </Typography>
        {loading
          ? <Skeleton variant="text" width={70} />
          : <Typography sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: 20 }} noWrap>{value}</Typography>}
        {!!sub && !loading && (
          <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', display: 'block' }} noWrap>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

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

  // Pre‑computed
  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});

  // UI controls
  const [rangeMonths, setRangeMonths] = useState(12);
  const [autoMs, setAutoMs] = useState(0); // 0=manual, 30000=30s, 60000=60s
  const [statusFilter, setStatusFilter] = useState(''); // 'Pending' | 'Awaiting Pickup' | 'Active' | 'Overdue' | 'Returned' | 'Rejected'

  const statusBarRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [bRes, dRes, brRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`)
      ]);
      const bks = bRes.data || [];
      const docs = dRes.data || [];
      const brs = brRes.data || [];

      // inventories
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
      // due dates from /borrow payload (fallback)
      const dueMapTemp = {};
      for (const tx of brs) {
        dueMapTemp[tx.BorrowID] = tx.ReturnDate || null;
      }

      setBooks(bks);
      setDocuments(docs);
      setBorrows(brs);
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto refresh
  useEffect(() => {
    if (!autoMs) return;
    const id = setInterval(fetchAll, autoMs);
    return () => clearInterval(id);
  }, [autoMs, fetchAll]);

  // Derive borrow status (labels aligned with charts)
  const deriveStatusLabel = useCallback((tx) => {
    const now = new Date();
    const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;
    if (tx.ReturnStatus === 'Returned') return 'Returned';
    if (tx.ApprovalStatus === 'Rejected') return 'Rejected';
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
      .reduce((a, v) => a + v.filter(i => (i.availability || i.Availability) === 'Available').length, 0);
    const docPhysCopies = Object.values(docInvMap).reduce((a, v) => a + v.length, 0);
    const docPhysAvailable = Object.values(docInvMap)
      .reduce((a, v) => a + v.filter(i => (i.availability || i.Availability) === 'Available').length, 0);
    const digitalDocs = documents.filter(d => d.File_Path || d.file_path).length;

    // Borrow statuses
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

  // Filtered borrows for trend (by status + time range)
  const filteredTrendBorrows = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - (rangeMonths - 1));
    return (borrows || []).filter(tx => {
      if (!tx.BorrowDate) return false;
      const d = new Date(tx.BorrowDate);
      if (d < cutoff) return false;
      if (statusFilter && deriveStatusLabel(tx) !== statusFilter) return false;
      return true;
    });
  }, [borrows, rangeMonths, statusFilter, deriveStatusLabel]);

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

  // 3. Monthly Borrow Trend over selected range
  const borrowTrend = useMemo(() => {
    const map = {};
    const now = new Date();
    const labels = [];
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
      labels.push(key);
      map[key] = 0;
    }
    filteredTrendBorrows.forEach(tx => {
      const k = tx.BorrowDate.slice(0,7);
      if (k in map) map[k] += 1;
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
  }, [filteredTrendBorrows, rangeMonths, alpha]);

  // 4. Top 5 Book Categories (by count of titles)
  const topCategories = useMemo(() => {
    const cnt = {};
    books.forEach(b => {
      const c = b.Category || 'Uncategorized';
      cnt[c] = (cnt[c] || 0) + 1;
    });
    const sorted = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return {
      labels: sorted.map(s=>s[0]),
      datasets: [{
        label: 'Titles',
        data: sorted.map(s=>s[1]),
        backgroundColor: ['#5e35b1','#00897b','#c62828','#1565c0','#f9a825'],
        borderRadius: 6,
        maxBarThickness: 38
      }]
    };
  }, [books]);

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
      sub: `${number(metrics.docPhysCopies)} phys • ${number(metrics.digitalDocs)} digital`,
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

      <Grid container spacing={2.25}>
        {summaryCards.map(c => (
          <Grid item xs={12} sm={6} md={3} key={c.title}>
            <SummaryCard {...c} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.25} mt={0.5}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p:2, height:360, display:'flex', flexDirection:'column',
              border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
            }}
          >
            <Typography fontWeight={800} fontSize={14}>Availability Distribution</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : availTotals ? (
              <Box flexGrow={1}>
                <Doughnut data={availabilityDoughnut} options={chartOptions} />
              </Box>
            ) : (
              <Box sx={{ flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Typography variant="caption" color="text.secondary">No availability data.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p:2, height:360, display:'flex', flexDirection:'column',
              border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
            }}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={800} fontSize={14}>Borrow Status</Typography>
              {!!statusFilter && (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={()=>setStatusFilter('')}
                  deleteIcon={<X size={14} />}
                  label={`Filter: ${statusFilter}`}
                  sx={{ ml: 'auto', fontWeight:700 }}
                />
              )}
            </Stack>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : borrowTotals ? (
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

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p:2, height:360, display:'flex', flexDirection:'column',
              border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
            }}
          >
            <Typography fontWeight={800} fontSize={14}>Top Book Categories</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : (
              <Box flexGrow={1}>
                <Bar data={topCategories} options={{
                  ...barOptions,
                  plugins:{ legend:{ display:false } },
                  indexAxis:'y',
                  scales:{ x:{ beginAtZero:true, ticks:{ precision:0 } } }
                }} />
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p:2, height:360, display:'flex', flexDirection:'column',
              border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
            }}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontWeight={800} fontSize={14}>Monthly Borrow Trend ({rangeMonths} mo)</Typography>
              {!!statusFilter && <Chip size="small" label={`Filtered: ${statusFilter}`} sx={{ fontWeight:700 }} />}
            </Stack>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : trendTotals ? (
              <Box flexGrow={1}>
                <Line data={borrowTrend} options={lineOptions} />
              </Box>
            ) : (
              <Box sx={{ flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Typography variant="caption" color="text.secondary">No trend data in selected range.</Typography>
              </Box>
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

export default DashboardPage;