import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Divider, Button, useTheme,
  IconButton, Tooltip, Chip, Stack, Skeleton
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  RefreshCw, BookOpen, FileText, Handshake, Package,
  AlertTriangle, Clock, CheckCircle2, Layers, Activity
} from 'lucide-react';
import axios from 'axios';

// --- Chart.js (replacing Recharts) ---
import {
  Chart,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Register core components
Chart.register(
  ArcElement,
  ChartTooltip,
  ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

// Center text plugin for Doughnut (total)
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart, args, opts) {
    const text = opts?.text;
    if (!text) return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;
    const { x, y } = meta.data[0];
    ctx.save();
    ctx.font = '600 13px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
};
Chart.register(centerTextPlugin);

// ---------- Small helpers ----------
const number = v => Intl.NumberFormat().format(v || 0);
const pct = (part,total)=> total? ((part/total)*100).toFixed(1):'0.0';
const STATUS_ORDER = [
  { key:'returned', label:'Returned', color:'#2e7d32' },
  { key:'active', label:'Active', color:'#7b1fa2' },
  { key:'approvedAwaitingPickup', label:'Await Pickup', color:'#0288d1' },
  { key:'pending', label:'Pending', color:'#ffb300' },
  { key:'overdue', label:'Overdue', color:'#d32f2f' },
  { key:'rejected', label:'Rejected', color:'#757575' }
];

const PieLegend = ({ payload, total }) => (
  <Stack spacing={0.4} sx={{ maxHeight:120, overflowY:'auto', pt:0.5 }}>
    {payload.map(p=>(
      <Box key={p.value} display="flex" alignItems="center" gap={1}>
        <Box sx={{ width:10,height:10,bgcolor:p.color,borderRadius:'2px' }}/>
        <Typography variant="caption" fontWeight={600}>
          {p.value}: {p.payload.value} ({pct(p.payload.value,total)}%)
        </Typography>
      </Box>
    ))}
  </Stack>
);

// ADD THIS BEFORE: "const DashboardPage = () => {"
const SummaryCard = ({ icon: Icon, title, value, sub, color, loading, error }) => {
  const theme = useTheme();
  const base = color || theme.palette.primary.main;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `2px solid ${alpha(base, .35)}`,
        borderRadius: 1,
        display: 'flex',
        gap: 1.5,
        bgcolor: alpha(base, .05),
        height: '100%'
      }}
    >
      <Box sx={{
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        bgcolor: alpha(base, .18),
        border: `1.5px solid ${alpha(base, .5)}`
      }}>
        <Icon size={26} color={base} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: .5, color: 'text.secondary' }} noWrap>
            {title}
        </Typography>
        {loading
          ? <Skeleton variant="text" width={64} height={28} />
          : (
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, lineHeight: 1.1, mt: .25 }}
              color={error ? 'error.main' : 'text.primary'}
              noWrap
            >
              {error ? '—' : value}
            </Typography>
          )}
        {!!sub && !loading && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 500, color: 'text.secondary', display: 'block', mt: .25 }}
            noWrap
          >
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// ---------- Component ----------
const DashboardPage = () => {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [loading, setLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [bookStats, setBookStats] = useState({ titles:0, copies:0, availableCopies:0 });
  const [docStats, setDocStats] = useState({ titles:0, physCopies:0, digitalDocs:0, availablePhys:0 });
  const [borrowStats, setBorrowStats] = useState({
    total:0, pending:0, approvedAwaitingPickup:0, active:0, overdue:0, returned:0, rejected:0
  });
  const [storageStats, setStorageStats] = useState({ totalStorageItems:0 });

  const [recentActivity, setRecentActivity] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [pendingList, setPendingList] = useState([]);

  const safeGet = (obj, key) => (Array.isArray(obj) ? obj[0]?.[key] : obj?.[key]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true); setMetricsError(null);
    try {
      const [booksRes, docsRes, borrowsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`)
      ]);
      const books = booksRes.data || [];
      const documents = docsRes.data || [];
      const borrows = borrowsRes.data || [];

      // Books inventory
      let bookCopies=0, bookAvailable=0;
      await Promise.all(books.map(async b=>{
        try {
          const { data: inv=[] } = await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`);
          bookCopies += inv.length;
          bookAvailable += inv.filter(x => (x.availability||x.Availability)==='Available').length;
        } catch {}
      }));

      // Document inventory
      let physCopies=0, physAvailable=0, digitalDocs=0;
      await Promise.all(documents.map(async d=>{
        try {
          if (d.File_Path || d.file_path) digitalDocs++;
            const { data: inv=[] } = await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`);
            physCopies += inv.length;
            physAvailable += inv.filter(x => (x.availability||x.Availability)==='Available').length;
        } catch {}
      }));

      // Borrow due dates
      const dueMap = {};
      await Promise.all(borrows.map(async tx=>{
        try {
          const r = await axios.get(`${API_BASE}/borrow/${tx.BorrowID}/due-date`);
          dueMap[tx.BorrowID] = safeGet(r.data,'DueDate') || r.data?.DueDate || null;
        } catch { dueMap[tx.BorrowID] = tx.ReturnDate || null; }
      }));

      const now = new Date();
      let pending=0, awaiting=0, active=0, overdue=0, returned=0, rejected=0;
      const recent=[], overTemp=[], pendTemp=[];
      borrows.forEach(tx=>{
        const dueRaw = dueMap[tx.BorrowID];
        const due = dueRaw ? new Date(dueRaw) : null;
        let status;
        if (tx.ReturnStatus==='Returned'){ status='Returned'; returned++; }
        else if (tx.ApprovalStatus==='Rejected'){ status='Rejected'; rejected++; }
        else if (tx.ApprovalStatus==='Pending'){ status='Pending'; pending++; pendTemp.push(tx); }
        else if (tx.ApprovalStatus==='Approved' && tx.RetrievalStatus!=='Retrieved'){ status='Awaiting Pickup'; awaiting++; }
        else if (tx.RetrievalStatus==='Retrieved' && tx.ReturnStatus!=='Returned'){ status='Borrowed'; active++; }
        else status = tx.ApprovalStatus || 'Unknown';
        if (due && status!=='Returned' && due < now){ overdue++; overTemp.push({ tx, due:dueRaw }); }
        recent.push({ text:`Borrow #${tx.BorrowID} ${status}`, date:tx.BorrowDate||'—', status });
      });

      overTemp.sort((a,b)=>new Date(a.due)-new Date(b.due));
      pendTemp.sort((a,b)=>(a.BorrowDate||'').localeCompare(b.BorrowDate||''));

      setBookStats({ titles:books.length, copies:bookCopies, availableCopies:bookAvailable });
      setDocStats({ titles:documents.length, physCopies, digitalDocs, availablePhys:physAvailable });
      setBorrowStats({ total:borrows.length, pending, approvedAwaitingPickup:awaiting, active, overdue, returned, rejected });
      setStorageStats({ totalStorageItems: bookCopies + physCopies });
      setRecentActivity(recent.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6));
      setOverdueList(overTemp.slice(0,5));
      setPendingList(pendTemp.slice(0,5));
      setLastUpdated(new Date());
    } catch(e){
      setMetricsError(e?.message || 'Failed to load metrics');
    } finally { setLoading(false); }
  }, [API_BASE]);

  useEffect(()=>{ fetchMetrics(); }, [fetchMetrics]);

  const summaryCards = useMemo(()=>[
    { icon:BookOpen, title:'Books', value:number(bookStats.titles),
      sub:`${number(bookStats.copies)} copies • ${number(bookStats.availableCopies)} available`, color:'#1976d2'},
    { icon:FileText, title:'Documents', value:number(docStats.titles),
      sub:`${number(docStats.physCopies)} physical • ${number(docStats.digitalDocs)} digital`, color:'#9c27b0'},
    { icon:Handshake, title:'Borrow Activity', value:number(borrowStats.total),
      sub:`${number(borrowStats.active)} active • ${number(borrowStats.pending)} pending`, color:'#2e7d32'},
    { icon:Package, title:'Storage Items', value:number(storageStats.totalStorageItems),
      sub:`${number(bookStats.copies)} book • ${number(docStats.physCopies)} doc`, color:'#f57c00'}
  ], [bookStats, docStats, borrowStats, storageStats]);

  // Data for statuses
  const borrowStatusData = useMemo(()=> STATUS_ORDER.map(s=>({
    name:s.label, key:s.key, color:s.color, value: borrowStats[s.key] ?? 0
  })), [borrowStats]);

  const BAR_COLOR = '#1976d2';
  const LINE_COLOR = '#2e7d32';

  const inventoryBarData = useMemo(()=>[
    { name:'Book Copies', value:bookStats.copies },
    { name:'Book Available', value:bookStats.availableCopies },
    { name:'Doc Physical', value:docStats.physCopies },
    { name:'Doc Phys Avail', value:docStats.availablePhys },
    { name:'Digital Docs', value:docStats.digitalDocs }
  ], [bookStats, docStats]);

  const borrowTrendData = useMemo(()=>{
    const map={};
    recentActivity.forEach(r=>{
      const d=(r.date||'').slice(0,10); if(!d) return;
      map[d]=(map[d]||0)+1;
    });
    return Object.entries(map).map(([date,count])=>({date,count}))
      .sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);
  },[recentActivity]);

  // --- Chart.js datasets & options ---
  const totalBorrowStatuses = borrowStatusData.reduce((a,b)=>a+b.value,0);

  const borrowStatusChartData = useMemo(()=>({
    labels: borrowStatusData.map(d=>d.name),
    datasets: [{
      data: borrowStatusData.map(d=>d.value),
      backgroundColor: borrowStatusData.map(d=>d.color),
      borderWidth: 1,
      borderColor: '#fff',
      hoverOffset: 6
    }]
  }), [borrowStatusData]);

  const borrowStatusOptions = useMemo(()=>({
    cutout: '55%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display:false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const label = ctx.label || '';
            const pctVal = totalBorrowStatuses ? ((val/totalBorrowStatuses)*100).toFixed(1) : '0.0';
            return `${label}: ${val} (${pctVal}%)`;
          }
        }
      },
      centerText: {
        text: `Total ${totalBorrowStatuses}`
      }
    }
  }), [totalBorrowStatuses]);

  const inventoryBarChartData = useMemo(()=>({
    labels: inventoryBarData.map(d=>d.name),
    datasets: [{
      label: 'Count',
      data: inventoryBarData.map(d=>d.value),
      backgroundColor: BAR_COLOR,
      borderRadius: 4,
      maxBarThickness: 40
    }]
  }), [inventoryBarData]);

  const inventoryBarOptions = useMemo(()=>({
    responsive:true,
    maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{
      x:{ ticks:{ font:{ size:11 }, callback:(v)=>inventoryBarData[v]?.name?.split(' ').slice(0,3).join(' ') } },
      y:{ beginAtZero:true, ticks:{ precision:0, font:{ size:11 } }, grid:{ color: alpha('#000',0.08) } }
    }
  }), [inventoryBarData]);

  const borrowTrendChartData = useMemo(()=>({
    labels: borrowTrendData.map(d=>d.date),
    datasets:[{
      label:'Borrows',
      data: borrowTrendData.map(d=>d.count),
      borderColor: LINE_COLOR,
      backgroundColor: alpha(LINE_COLOR,0.15),
      pointBackgroundColor: LINE_COLOR,
      fill:true,
      tension:0.35,
      pointRadius:3,
      pointHoverRadius:5
    }]
  }), [borrowTrendData]);

  const borrowTrendOptions = useMemo(()=>({
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{ display:false },
      tooltip:{ mode:'index', intersect:false }
    },
    scales:{
      x:{
        ticks:{
          font:{ size:11 },
          callback:(val)=> {
            const label = borrowTrendData[val]?.date || '';
            return label.slice(5); // MM-DD
          }
        },
        grid:{ color: alpha('#000',0.06) }
      },
      y:{
        beginAtZero:true,
        ticks:{ precision:0, font:{ size:11 } },
        grid:{ color: alpha('#000',0.08) }
      }
    }
  }), [borrowTrendData]);

  // ---------- UI ----------
  return (
    <Box p={3} sx={{ bgcolor:'background.default', minHeight:'100vh' }}>

      {/* Header */}
      <Paper elevation={0} sx={{
        mb:3,p:2,display:'flex',flexWrap:'wrap',gap:2,alignItems:'center',
        border:`2px solid ${theme.palette.divider}`, borderRadius:1
      }}>
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={.5} lineHeight={1.15}>
            Dashboard Overview
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Real‑time snapshot of library operations
          </Typography>
        </Box>
        <Box sx={{ ml:'auto', display:'flex', gap:1, alignItems:'center' }}>
          {lastUpdated &&
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Updated {lastUpdated.toLocaleTimeString()}
            </Typography>}
          <Tooltip title="Refresh metrics">
            <IconButton size="small" onClick={fetchMetrics} disabled={loading}
              sx={{ border:`1.5px solid ${theme.palette.divider}`, borderRadius:1 }}>
              <RefreshCw size={16}/>
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error */}
      {metricsError && (
        <Paper elevation={0} sx={{
          p:2, mb:2, border:`2px solid ${alpha(theme.palette.error.main,.4)}`,
          borderRadius:1, bgcolor:alpha(theme.palette.error.main,.08),
          display:'flex', alignItems:'center', gap:1
        }}>
          <AlertTriangle size={18} color={theme.palette.error.main}/>
          <Typography variant="body2" fontWeight={600} sx={{ flexGrow:1 }}>{metricsError}</Typography>
          <Button size="small" variant="contained" onClick={fetchMetrics}
            sx={{ textTransform:'none', borderRadius:1, fontWeight:600 }}>Retry</Button>
        </Paper>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mt={metricsError?1:0}>
        {summaryCards.map(c=>(
          <Grid key={c.title} item xs={12} sm={6} md={3}>
            <SummaryCard {...c} loading={loading} error={!!metricsError}/>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} mt={0.5}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Borrow Status Distribution
            </Typography>
            <Divider sx={{ mb:1 }}/>
            <Box sx={{ flexGrow:1, minHeight:250, position:'relative' }}>
              {loading ? <Skeleton variant="rounded" height={240}/> : (
                <Box sx={{ height: '100%', display:'flex', flexDirection:'column' }}>
                  <Box sx={{ position:'relative', flexGrow:1, minHeight:0 }}>
                    <Doughnut
                      data={borrowStatusChartData}
                      options={borrowStatusOptions}
                      plugins={[centerTextPlugin]}
                    />
                  </Box>
                  <Box sx={{ mt:1 }}>
                    <PieLegend
                      payload={borrowStatusData.map(d=>({
                        value:d.name,
                        color:d.color,
                        payload:{ value:d.value }
                      }))}
                      total={totalBorrowStatuses}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Inventory Summary
            </Typography>
            <Divider sx={{ mb:1 }}/>
            <Box sx={{ flexGrow:1, minHeight:250 }}>
              {loading ? <Skeleton variant="rounded" height={240}/> : (
                <Box sx={{ height:'100%' }}>
                  <Bar data={inventoryBarChartData} options={inventoryBarOptions}/>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Borrow Activity Trend (14d)
            </Typography>
            <Divider sx={{ mb:1 }}/>
            <Box sx={{ flexGrow:1, minHeight:250 }}>
              {loading ? <Skeleton variant="rounded" height={240}/> :
                borrowTrendData.length===0 ? (
                  <Box sx={{
                    p:3, textAlign:'center', border:`1px dashed ${theme.palette.divider}`,
                    borderRadius:1, height:'100%', display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      No recent trend data.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ height:'100%' }}>
                    <Line data={borrowTrendChartData} options={borrowTrendOptions}/>
                  </Box>
                )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* LIST PANELS */}
      <Grid container spacing={2} mt={0.5}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',gap:1,height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>Borrow Status Breakdown</Typography>
            <Divider/>
            {loading ? (
              <Stack spacing={1}>{Array.from({length:6}).map((_,i)=><Skeleton key={i} variant="rounded" height={32}/>)}</Stack>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Chip icon={<Clock size={14}/>} label={`Pending: ${borrowStats.pending}`} size="small" color="warning" sx={{ fontWeight:600 }}/>
                <Chip icon={<Layers size={14}/>} label={`Awaiting Pickup: ${borrowStats.approvedAwaitingPickup}`} size="small" color="info" sx={{ fontWeight:600 }}/>
                <Chip icon={<Activity size={14}/>} label={`Active: ${borrowStats.active}`} size="small" color="secondary" sx={{ fontWeight:600 }}/>
                <Chip icon={<AlertTriangle size={14}/>} label={`Overdue: ${borrowStats.overdue}`} size="small" color="error" sx={{ fontWeight:600 }}/>
                <Chip icon={<CheckCircle2 size={14}/>} label={`Returned: ${borrowStats.returned}`} size="small" color="success" sx={{ fontWeight:600 }}/>
                <Chip label={`Rejected: ${borrowStats.rejected}`} size="small" variant="outlined" sx={{ fontWeight:600 }}/>
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" fontWeight={500} mt={.5}>
              Overdue counts unreturned items past due date.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',gap:1,height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>Pending Approvals</Typography>
            <Divider/>
            {loading ? (
              <Stack spacing={1}>{Array.from({length:4}).map((_,i)=><Skeleton key={i} variant="rounded" height={52}/>)}</Stack>
            ) : pendingList.length===0 ? (
              <Box sx={{ p:3, textAlign:'center', border:`1px dashed ${theme.palette.divider}`, borderRadius:1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>No pending approvals.</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {pendingList.map(tx=>(
                  <Paper key={tx.BorrowID} variant="outlined" sx={{
                    p:1,borderRadius:1,display:'flex',flexDirection:'column',gap:.25
                  }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Chip label={`#${tx.BorrowID}`} size="small" color="warning" sx={{ fontWeight:600 }}/>
                      <Typography fontSize={12} fontWeight={600}>Borrow Date: {tx.BorrowDate?.slice(0,10)||'—'}</Typography>
                      <Box ml="auto"/>
                      <Chip label="Pending" size="small" variant="outlined" sx={{ fontWeight:600 }}/>
                    </Stack>
                    {tx.Purpose && <Typography variant="caption" color="text.secondary" noWrap>Purpose: {tx.Purpose}</Typography>}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',gap:1,height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>Overdue Borrows</Typography>
            <Divider/>
            {loading ? (
              <Stack spacing={1}>{Array.from({length:4}).map((_,i)=><Skeleton key={i} variant="rounded" height={52}/>)}</Stack>
            ) : overdueList.length===0 ? (
              <Box sx={{ p:3, textAlign:'center', border:`1px dashed ${theme.palette.divider}`, borderRadius:1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>No overdue borrows.</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {overdueList.map(o=>(
                  <Paper key={o.tx.BorrowID} variant="outlined" sx={{
                    p:1,borderRadius:1,display:'flex',flexDirection:'column',gap:.25,
                    borderColor:alpha(theme.palette.error.main,.5), bgcolor:alpha(theme.palette.error.main,.05)
                  }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Chip label={`#${o.tx.BorrowID}`} size="small" color="error" sx={{ fontWeight:600 }}/>
                      <Typography fontSize={12} fontWeight={600}>Due: {o.due?.slice(0,10)||'—'}</Typography>
                      <Box ml="auto"/>
                      <Chip
                        label={o.tx.RetrievalStatus==='Retrieved'?'Borrowed':'Awaiting Pickup'}
                        size="small" variant="outlined" color="error" sx={{ fontWeight:600 }}
                      />
                    </Stack>
                    {o.tx.Purpose && <Typography variant="caption" color="text.secondary" noWrap>Purpose: {o.tx.Purpose}</Typography>}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1,
            display:'flex',flexDirection:'column',gap:1,height:'100%'
          }}>
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>Recent Activity</Typography>
            <Divider/>
            {loading ? (
              <Stack spacing={1}>{Array.from({length:6}).map((_,i)=><Skeleton key={i} variant="rounded" height={46}/>)}</Stack>
            ) : recentActivity.length===0 ? (
              <Box sx={{ p:3, textAlign:'center', border:`1px dashed ${theme.palette.divider}`, borderRadius:1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>No recent activity.</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {recentActivity.map((r,i)=>(
                  <Paper key={i} variant="outlined" sx={{
                    p:1,borderRadius:1,display:'flex',alignItems:'center',gap:1
                  }}>
                    <Chip
                      size="small" label={r.status}
                      color={
                        r.status.startsWith('Overdue') ? 'error'
                          : r.status.startsWith('Pending') ? 'warning'
                          : r.status.startsWith('Awaiting') ? 'info'
                          : r.status.startsWith('Borrowed') ? 'secondary'
                          : r.status.startsWith('Returned') ? 'success'
                          : 'default'
                      }
                      sx={{ fontWeight:600 }}
                    />
                    <Typography flexGrow={1} fontSize={12} fontWeight={600} noWrap>{r.text}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {r.date?.slice(0,10) || '—'}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Scenarios */}
      <Paper elevation={0} sx={{
        mt:3,p:2,border:`2px solid ${theme.palette.divider}`,borderRadius:1
      }}>
        <Typography fontWeight={700} fontSize={13} mb={1}>Operational Scenarios Monitored</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {['Pending approvals','Awaiting pickup','Active borrows','Overdue tracking',
            'Returned / closed','Rejected requests','Copy availability','Digital vs physical documents']
            .map(t=><Chip key={t} size="small" label={t} />)}
        </Stack>
      </Paper>
    </Box>
  );
};

export default DashboardPage;