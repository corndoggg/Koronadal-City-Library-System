// Enhanced dashboard with charts (requires: npm i chart.js react-chartjs-2)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Divider, IconButton, Tooltip, Chip,
  Stack, Skeleton, Button
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  RefreshCw
} from 'lucide-react';
import {
  Bar, Doughnut, Line
} from 'react-chartjs-2';
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
      // due dates from /borrow payload
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
    const now = new Date();
    borrows.forEach(tx => {
      let status;
      if (tx.ReturnStatus === 'Returned') { status = 'Returned'; returned++; }
      else if (tx.ApprovalStatus === 'Rejected') { status = 'Rejected'; rejected++; }
      else if (tx.ApprovalStatus === 'Pending') { status = 'Pending'; pending++; }
      else if (tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved') { status = 'Awaiting'; awaiting++; }
      else if (tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned') { status = 'Borrowed'; active++; }
      const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;
      if (due && status !== 'Returned' && due < now) overdue++;
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
  }, [books, documents, borrows, bookInvMap, docInvMap, dueMap]);

  // Chart Data
  // 1. Availability Distribution (Books + Documents)
  const availabilityDoughnut = useMemo(() => ({
    labels: ['Book Available', 'Book Unavailable', 'Doc Phys Available', 'Doc Phys Unavailable', 'Digital Docs'],
    datasets: [{
      data: [
        metrics.bookAvailable,
        metrics.bookCopies - metrics.bookAvailable,
        metrics.docPhysAvailable,
        metrics.docPhysCopies - metrics.docPhysAvailable,
        metrics.digitalDocs
      ],
      backgroundColor: ['#2e7d32', '#81c784', '#1976d2', '#90caf9', '#9c27b0'],
      borderWidth: 1
    }]
  }), [metrics]);

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

  // 3. Monthly Borrow Trend (group by month of BorrowDate) last 12 months
  const borrowTrend = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
      map[key] = 0;
    }
    borrows.forEach(tx => {
      if (!tx.BorrowDate) return;
      const d = tx.BorrowDate.slice(0,7);
      if (d in map) map[d] += 1;
    });
    const labels = Object.keys(map);
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
  }, [borrows]);

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
    plugins: { legend: { position: 'bottom' } }
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
        <Box ml="auto" display="flex" gap={1} alignItems="center">
          {lastUpdated && (
            <Chip
              size="small"
              label={`Updated ${lastUpdated.toLocaleTimeString()}`}
              sx={{ fontWeight:600 }}
            />
          )}
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={fetchAll}
              disabled={loading}
              sx={{
                border: theme=>`1.5px solid ${theme.palette.divider}`, borderRadius:1
              }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
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
            ) : (
              <Box flexGrow={1}>
                <Doughnut data={availabilityDoughnut} options={chartOptions} />
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
            <Typography fontWeight={800} fontSize={14}>Borrow Status</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : (
              <Box flexGrow={1}>
                <Bar data={borrowStatusBar} options={{
                  ...chartOptions,
                  plugins:{ legend:{ display:false } },
                  scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } }
                }} />
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
                  ...chartOptions,
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
            <Typography fontWeight={800} fontSize={14}>Monthly Borrow Trend (12 mo)</Typography>
            <Divider sx={{ my:1 }} />
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : (
              <Box flexGrow={1}>
                <Line data={borrowTrend} options={lineOptions} />
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
        </Stack>
      </Paper>
    </Box>
  );
};

export default DashboardPage;