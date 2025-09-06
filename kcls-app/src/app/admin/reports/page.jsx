import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Tabs, Tab, Divider, Stack, IconButton, Tooltip,
  Button, TextField, MenuItem, Chip, Skeleton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Pagination, FormControl, Select, InputLabel
} from '@mui/material';
import { Download, RefreshCw, FileText, Printer, Filter, Eye } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip as ChartTooltip, Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

const REPORT_TYPES = [
  { key:'inventory_summary', label:'Inventory Summary' },
  { key:'borrow_status', label:'Borrow Status & Overdue' },
  { key:'top_borrowed_books', label:'Top Borrowed Books' },
  { key:'borrower_activity', label:'Borrower Activity' },
  { key:'documents_mix', label:'Documents Digital vs Physical' },
  { key:'books_no_available', label:'Books Without Available Copies' }
];

const dateISO = d => d ? new Date(d).toISOString().slice(0,10) : '';

const fullName = (u) => {
  const f = (u.Firstname || '').trim();
  const m = (u.Middlename || '').trim();
  const l = (u.Lastname || '').trim();
  const mi = m ? ` ${m[0]}.` : '';
  return `${f}${mi} ${l}`.trim() || u.Username || `User #${u.UserID}`;
};

const ReportsPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [borrows, setBorrows] = useState([]);

  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});
  // NEW: maps for accurate lookups
  const [copyToBookMap, setCopyToBookMap] = useState({});
  const [borrowerNameMap, setBorrowerNameMap] = useState({});

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].key);
  const [limit, setLimit] = useState(10);

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const rowsPerPageOptions = [10, 25, 50, 100];

  // Export scope (all rows or current page)
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'page'

  // PDF preview
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');

  // Admin name for PDF footer
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const adminName = useMemo(() => {
    const f = (user.Firstname || '').trim();
    const m = (user.Middlename || '').trim();
    const l = (user.Lastname || '').trim();
    const mi = m ? ` ${m[0]}.` : '';
    return `${f}${mi} ${l}`.trim() || user.Username || `User #${user.UserID || ''}`.trim();
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // Fetch users too (for borrower names)
      const [bRes, dRes, brRes, uRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`),
        axios.get(`${API_BASE}/users`)
      ]);
      const bks = bRes.data || [];
      const docs = dRes.data || [];
      const brs = brRes.data || [];
      const users = uRes.data || [];

      // Build borrower name map: BorrowerID -> Full Name
      const borrowerNames = {};
      users
        .filter(u => u.Role === 'Borrower' && u.borrower?.BorrowerID)
        .forEach(u => { borrowerNames[u.borrower.BorrowerID] = fullName(u); });

      // Build inventories and CopyID -> Book_ID map
      const bookInventories = {};
      const copyMap = {};
      await Promise.all(
        bks.map(async b => {
          try {
            const inv = (await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`)).data || [];
            bookInventories[b.Book_ID] = inv;
            inv.forEach(row => {
              const copyId = row.Copy_ID ?? row.CopyID ?? row.copy_id ?? row.copyId;
              if (copyId != null) copyMap[String(copyId)] = b.Book_ID;
            });
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

      // Build due map directly from /borrow payload
      const dueTemp = {};
      for (const tx of brs) {
        dueTemp[tx.BorrowID] = tx.ReturnDate || null;
      }

      setBooks(bks);
      setDocuments(docs);
      setBorrows(brs);
      setBookInvMap(bookInventories);
      setDocInvMap(docInventories);
      setDueMap(dueTemp);
      setCopyToBookMap(copyMap);
      setBorrowerNameMap(borrowerNames);
    } catch (e) {
      setErr(e.message || 'Failed loading');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const filteredBorrows = useMemo(() => {
    if (!fromDate && !toDate) return borrows;
    return borrows.filter(b => {
      const d = b.BorrowDate ? b.BorrowDate.slice(0,10) : '';
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [borrows, fromDate, toDate]);

  // Derived data per report
  const dataBuilders = {
    inventory_summary: () => {
      const bookCopies = Object.values(bookInvMap).reduce((a,v)=>a+v.length,0);
      const bookAvail = Object.values(bookInvMap).reduce((a,v)=>a+v.filter(i=>(i.availability||i.Availability)==='Available').length,0);
      const docCopies = Object.values(docInvMap).reduce((a,v)=>a+v.length,0);
      const docAvail = Object.values(docInvMap).reduce((a,v)=>a+v.filter(i=>(i.availability||i.Availability)==='Available').length,0);
      const digital = documents.filter(d=>d.File_Path||d.file_path).length;
      return {
        title:'Inventory Summary',
        headers:['Metric','Value'],
        rows:[
          ['Book Titles', books.length],
            ['Book Copies', bookCopies],
            ['Book Copies Available', bookAvail],
            ['Document Titles', documents.length],
            ['Document Physical Copies', docCopies],
            ['Document Physical Available', docAvail],
            ['Digital Documents', digital],
            ['Total Storage Items', bookCopies + docCopies]
        ]
      };
    },
    borrow_status: () => {
      const now = new Date();
      let pending=0, awaiting=0, active=0, returned=0, rejected=0, overdue=0;
      filteredBorrows.forEach(tx => {
        let status;
        if (tx.ReturnStatus === 'Returned'){ returned++; status='Returned'; }
        else if (tx.ApprovalStatus === 'Rejected'){ rejected++; status='Rejected'; }
        else if (tx.ApprovalStatus === 'Pending'){ pending++; status='Pending'; }
        else if (tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved'){ awaiting++; status='Awaiting Pickup'; }
        else if (tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned'){ active++; status='Borrowed'; }
        const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;
        if (due && status !== 'Returned' && due < now) overdue++;
      });
      return {
        title:'Borrow Status & Overdue',
        headers:['Status','Count'],
        rows:[
          ['Pending', pending],
          ['Awaiting Pickup', awaiting],
          ['Active (Borrowed)', active],
          ['Overdue', overdue],
          ['Returned', returned],
          ['Rejected', rejected],
          ['Total', filteredBorrows.length]
        ]
      };
    },
    top_borrowed_books: () => {
      // Count by BookCopyID
      const counts = {};
      filteredBorrows.forEach(tx => (tx.items||[]).forEach(it => {
        if (it.ItemType === 'Book' && it.BookCopyID != null) {
          const key = String(it.BookCopyID);
          counts[key] = (counts[key] || 0) + 1;
        }
      }));
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, limit);
      const rows = sorted.map(([copyId, c]) => {
        // Use copyToBookMap for accurate title lookup
        const bookId = copyToBookMap[copyId];
        const title = books.find(b => b.Book_ID === Number(bookId))?.Title
          || (() => {
               // Fallback: search by inventory if map missing
               const found = Object.entries(bookInvMap).find(([,inv]) =>
                 inv.some(i => String(i.Copy_ID ?? i.CopyID) === String(copyId)));
               return found ? (books.find(b => b.Book_ID === Number(found[0]))?.Title) : null;
             })()
          || 'Unknown';
        return [copyId, title, c];
      });
      return {
        title:`Top Borrowed Books (limit ${limit})`,
        headers:['Book Copy ID','Book Title','Borrow Count'],
        rows
      };
    },
    borrower_activity: () => {
      const byBorrower = {};
      filteredBorrows.forEach(tx => {
        const borrowerId = tx.BorrowerID || tx.UserID || 'Unknown';
        if (!byBorrower[borrowerId]) byBorrower[borrowerId] = { total:0, returned:0, overdue:0 };
        byBorrower[borrowerId].total++;
        if (tx.ReturnStatus === 'Returned') byBorrower[borrowerId].returned++;
        const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;
        if (due && tx.ReturnStatus !== 'Returned' && due < new Date()) byBorrower[borrowerId].overdue++;
      });
      const rows = Object.entries(byBorrower)
        .map(([borrowerId, v])=>[
          borrowerNameMap[Number(borrowerId)] || `Borrower #${borrowerId}`,
          v.total, v.returned, v.overdue
        ])
        .sort((a,b)=>b[1]-a[1])
        .slice(0, limit);
      return {
        title:`Borrower Activity (top ${limit})`,
        headers:['Borrower','Total','Returned','Overdue'],
        rows
      };
    },
    documents_mix: () => {
      const physCopies = Object.values(docInvMap).reduce((a,v)=>a+v.length,0);
      const digital = documents.filter(d=>d.File_Path||d.file_path).length;
      return {
        title:'Documents Digital vs Physical',
        headers:['Type','Count'],
        rows:[
          ['Digital Documents', digital],
          ['Physical Document Copies', physCopies]
        ]
      };
    },
    books_no_available: () => {
      const rows = books.filter(b => {
        const inv = bookInvMap[b.Book_ID] || [];
        return inv.length>0 && inv.every(i => (i.availability||i.Availability)!=='Available');
      }).map(b => [b.Book_ID, b.Title, (bookInvMap[b.Book_ID]||[]).length]);
      return {
        title:'Books Without Any Available Copies',
        headers:['Book ID','Title','Total Copies'],
        rows
      };
    }
  };

  const currentReport = dataBuilders[reportType]();

  // Reset page on data change
  useEffect(() => {
    setPage(1);
  }, [reportType, fromDate, toDate, limit, currentReport.title]);

  // Paginate rows
  const totalRows = currentReport.rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const endIdx = Math.min(totalRows, startIdx + rowsPerPage);
  const pagedRows = currentReport.rows.slice(startIdx, endIdx);

  // Chart (for selected report types)
  const chartData = useMemo(() => {
    switch(reportType){
      case 'borrow_status':
        return {
          type:'bar',
          data:{
            labels: currentReport.rows.filter(r=>r[0]!=='Total').map(r=>r[0]),
            datasets:[{
              label:'Count',
              data: currentReport.rows.filter(r=>r[0]!=='Total').map(r=>r[1]),
              backgroundColor:['#ffb300','#0288d1','#7b1fa2','#d32f2f','#2e7d32','#757575'],
              borderRadius:6,
              maxBarThickness:40
            }]
          }
        };
      case 'documents_mix':
        return {
          type:'doughnut',
          data:{
            labels: currentReport.rows.map(r=>r[0]),
            datasets:[{
              data: currentReport.rows.map(r=>r[1]),
              backgroundColor:['#9c27b0','#1976d2']
            }]
          }
        };
      default:
        return null;
    }
  }, [reportType, currentReport]);

  const exportCSV = () => {
    const rows = exportScope === 'page' ? pagedRows : currentReport.rows;
    const lines = [
      `"${currentReport.title}"`,
      `"Generated: ${new Date().toLocaleString()} by ${adminName}"`,
      currentReport.headers.map(h=>`"${h}"`).join(',')
    ];
    rows.forEach(r=>{
      lines.push(r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\r\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.title.replace(/\s+/g,'_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Build PDF blob and open preview
  const previewPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const marginX = 40;
      let cursorY = 46;

      // Header
      doc.setFontSize(16);
      doc.text(currentReport.title, marginX, cursorY);
      cursorY += 18;

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}  •  By: ${adminName}`, marginX, cursorY);
      cursorY += 14;

      if (fromDate || toDate) {
        doc.text(`Date Range: ${fromDate || '—'} to ${toDate || '—'}`, marginX, cursorY);
        cursorY += 14;
      }

      // Table
      const rows = exportScope === 'page' ? pagedRows : currentReport.rows;
      if (autoTable) {
        autoTable(doc, {
          startY: cursorY,
          head: [currentReport.headers],
          body: rows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [25,118,210] },
          alternateRowStyles: { fillColor: [245,245,245] },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            const pageSize = doc.internal.pageSize;
            const pageWidth = pageSize.getWidth();
            const pageHeight = pageSize.getHeight();
            doc.setFontSize(8);
            doc.text(
              `Generated: ${new Date().toLocaleString()} • ${adminName}`,
              marginX,
              pageHeight - 18
            );
            doc.text(
              `Page ${doc.internal.getNumberOfPages()}`,
              pageWidth - marginX - 50,
              pageHeight - 18
            );
          }
        });
      } else {
        doc.setFontSize(10);
        cursorY += 6;
        rows.forEach(r => {
          if (cursorY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            cursorY = 40;
          }
          doc.text(r.join(' | '), marginX, cursorY);
          cursorY += 12;
        });
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFileName(`${currentReport.title.replace(/\s+/g,'_')}.pdf`);
      setPdfOpen(true);
    } catch (e) {
      console.error(e);
      alert('PDF generation failed: ' + e.message);
    }
  };

  const downloadPDFFromPreview = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = pdfFileName || 'report.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Box p={3} sx={{ bgcolor:'background.default', minHeight:'100vh' }}>
      <Paper
        sx={{
          p:2, mb:3, display:'flex', flexWrap:'wrap', gap:2, alignItems:'center',
          border: theme=>`2px solid ${theme.palette.divider}`, borderRadius:1
        }}
      >
        <Box>
          <Typography fontWeight={800} fontSize={18}>Reports & Exports</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Generate, visualize & export library data
          </Typography>
        </Box>
        <Box ml="auto" display="flex" gap={1}>
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={fetchAll} disabled={loading}
              sx={{ border: t=>`1.5px solid ${t.palette.divider}`, borderRadius:1 }}>
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Paper
        sx={{
          p:1.5, mb:2, border: t=>`2px solid ${t.palette.divider}`, borderRadius:1
        }}
      >
        <Tabs
          value={tab}
          onChange={(_,v)=>setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-indicator':{ display:'none' },
            '& .MuiTab-root':{
              textTransform:'none',
              fontWeight:600,
              mr:1,
              border: t=>`1px solid ${t.palette.divider}`,
              borderRadius:.75,
              minHeight:40
            },
            '& .Mui-selected':{
              bgcolor:'primary.main !important',
              color:'primary.contrastText !important'
            }
          }}
        >
          {REPORT_TYPES.map((r,i)=>(
            <Tab key={r.key} label={r.label} onClick={()=>setReportType(r.key)} />
          ))}
        </Tabs>
      </Paper>

      <Paper
        sx={{
          p:2, mb:2, display:'flex', flexWrap:'wrap', gap:1.5,
          alignItems:'center', border: t=>`2px solid ${t.palette.divider}`, borderRadius:1
        }}
      >
        <FileText size={18} />
        <TextField
          label="Report"
          size="small"
          value={reportType}
          onChange={e=>setReportType(e.target.value)}
          select
          sx={{ minWidth:200 }}
        >
          {REPORT_TYPES.map(r=>(
            <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="From"
            type="date"
            size="small"
            value={fromDate}
            onChange={e=>setFromDate(e.target.value)}
            InputLabelProps={{ shrink:true }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={toDate}
          onChange={e=>setToDate(e.target.value)}
          InputLabelProps={{ shrink:true }}
        />
        {(reportType==='top_borrowed_books' || reportType==='borrower_activity') && (
          <TextField
            label="Limit"
            size="small"
            type="number"
            value={limit}
            onChange={e=>setLimit(Math.max(1, parseInt(e.target.value)||5))}
            sx={{ width:100 }}
            InputLabelProps={{ shrink:true }}
          />
        )}
        <Chip
          icon={<Filter size={14} />}
          label="Apply"
          size="small"
          sx={{ fontWeight:600 }}
          color="primary"
        />
        <Box ml="auto" display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download size={14} />}
            onClick={exportCSV}
            disabled={loading}
            sx={{ fontWeight:600 }}
          >
            CSV
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Eye size={14} />}
            onClick={previewPDF}   // changed from exportPDF
            disabled={loading}
            sx={{ fontWeight:700 }}
          >
            Preview PDF
          </Button>
        </Box>
      </Paper>

      {err && (
        <Paper
          sx={{
            p:2, mb:2, border: t=>`2px solid ${t.palette.error.main}`, borderRadius:1,
            bgcolor: t=> t.palette.error.light+'22'
          }}
        >
          <Typography variant="body2" fontWeight={600} color="error.main">{err}</Typography>
        </Paper>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={chartData ? 7 : 12}>
          <Paper
            sx={{
              p:2, border: t=>`2px solid ${t.palette.divider}`, borderRadius:1,
              display:'flex', flexDirection:'column', gap:1
            }}
          >
            <Typography fontWeight={800} fontSize={15}>
              {currentReport.title}
            </Typography>
            <Divider />
            {loading ? (
              <Stack spacing={1}>
                {Array.from({ length:6 }).map((_,i)=>(
                  <Skeleton key={i} variant="rounded" height={34} />
                ))}
              </Stack>
            ) : (
              <>
                <Box
                  sx={{
                    overflow:'auto',
                    border: t=>`1px solid ${t.palette.divider}`,
                    borderRadius:1
                  }}
                >
                  <table
                    style={{
                      borderCollapse:'collapse', width:'100%', fontSize:13
                    }}
                  >
                    <thead style={{ background:'#f5f5f5' }}>
                      <tr>
                        {currentReport.headers.map(h=>(
                          <th
                            key={h}
                            style={{
                              textAlign:'left', padding:'6px 8px',
                              borderBottom:'1px solid #ddd', fontWeight:700,
                              position:'sticky', top:0, background:'#f5f5f5', zIndex:1
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((r,idx)=>(
                        <tr key={idx} style={{ background: ((startIdx+idx)%2)? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                          {r.map((c,i)=>(
                            <td
                              key={i}
                              style={{
                                padding:'6px 8px', borderBottom:'1px solid #eee',
                                fontWeight: i===0 ? 600 : 500
                              }}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {!pagedRows.length && (
                        <tr>
                          <td colSpan={currentReport.headers.length} style={{ padding:10, textAlign:'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              No data for current filters.
                            </Typography>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>

                {/* Pagination bar */}
                <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Showing {totalRows ? startIdx + 1 : 0} - {endIdx} of {totalRows}
                  </Typography>
                  <Box ml="auto" />
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_,v)=>setPage(v)}
                    size="small"
                    siblingCount={0}
                    boundaryCount={1}
                  />
                </Stack>
              </>
            )}
            {(!loading && (fromDate || toDate)) && (
              <Typography variant="caption" color="text.secondary" mt={1}>
                Date range applied: {fromDate || '—'} to {toDate || '—'}
              </Typography>
            )}
          </Paper>
        </Grid>

        {chartData && (
          <Grid item xs={12} md={5}>
            <Paper
              sx={{
                p:2, border: t=>`2px solid ${t.palette.divider}`, borderRadius:1,
                display:'flex', flexDirection:'column', height:'100%'
              }}
            >
              <Typography fontWeight={800} fontSize={15}>Visualization</Typography>
              <Divider sx={{ my:1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={320} />
              ) : (
                <Box sx={{ flexGrow:1, minHeight:320 }}>
                  {chartData.type === 'bar' && (
                    <Bar
                      data={chartData.data}
                      options={{
                        responsive:true,
                        maintainAspectRatio:false,
                        plugins:{ legend:{ display:false } },
                        scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } }
                      }}
                    />
                  )}
                  {chartData.type === 'doughnut' && (
                    <Doughnut
                      data={chartData.data}
                      options={{
                        responsive:true,
                        maintainAspectRatio:false,
                        plugins:{ legend:{ position:'bottom' } }
                      }}
                    />
                  )}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" mt={1}>
                Auto‑generated chart for faster insight.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Paper
        sx={{
          mt:3, p:2, border: t=>`2px solid ${t.palette.divider}`, borderRadius:1
        }}
      >
        <Typography fontWeight={700} fontSize={13} mb={1}>Report Scenarios Covered</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip size="small" label="Inventory capacity" />
          <Chip size="small" label="Borrow workload" />
          <Chip size="small" label="Overdue risk" />
          <Chip size="small" label="Borrower ranking" />
          <Chip size="small" label="Resource availability" />
          <Chip size="small" label="Digital adoption" />
          <Chip size="small" label="Collection gaps" />
        </Stack>
      </Paper>

      {/* PDF Preview Dialog */}
      <Dialog
        open={pdfOpen}
        onClose={() => {
          setPdfOpen(false);
          if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(''); }
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          PDF Preview — {currentReport.title}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {pdfUrl ? (
            <iframe
              title="Report PDF Preview"
              src={pdfUrl}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          ) : (
            <Box p={2}><Typography variant="body2">Generating preview…</Typography></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPdfOpen(false);
            if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(''); }
          }}>Close</Button>
          <Button variant="contained" onClick={downloadPDFFromPreview} startIcon={<Printer size={14} />}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsPage;