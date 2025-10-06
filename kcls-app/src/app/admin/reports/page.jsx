import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDate } from '../../../utils/date';
import {
  Box, Paper, Typography, Tabs, Tab, Divider, Stack, IconButton, Tooltip,
  Button, TextField, MenuItem, Chip, Skeleton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Pagination, FormControl, Select, InputLabel
} from '@mui/material';
import { Download, RefreshCw, FileText, Printer, Filter, Eye } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);
import { nowDateTime } from '../../../utils/date';

const REPORT_TYPES = [
  { key:'borrow_activity', label:'Borrow Activity & Fines' },
  { key:'top_borrowed_books', label:'Top Borrowed Books' },
  { key:'top_borrowed_documents', label:'Top Borrowed Documents' },
  { key:'general_storage', label:'General Storage' },
  { key:'storage_capacity', label:'Storage Capacity' },
  { key:'books_with_copies', label:'List of Books & Copies' },
  { key:'documents_with_copies', label:'List of Documents & Copies' },
  { key:'borrowings_full', label:'Borrowing Transactions' }
];

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
  const [returnsTx, setReturnsTx] = useState([]); // ReturnTransactions with items
  const [storages, setStorages] = useState([]); // Storage locations with Capacity

  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});
  // NEW: maps for accurate lookups
  const [copyToBookMap, setCopyToBookMap] = useState({});
  const [borrowerNameMap, setBorrowerNameMap] = useState({});
  const [storageToDocumentMap, setStorageToDocumentMap] = useState({});

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].key);
  const [limit, setLimit] = useState(10);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Export scope (all rows or current page)
  const exportScope = 'all'; // 'all' | 'page'

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
      const [bRes, dRes, brRes, uRes, rtRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`),
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/return`),
        axios.get(`${API_BASE}/storages`)
      ]);
      const bks = bRes.data || [];
      const docs = dRes.data || [];
      const brs = brRes.data || [];
  const users = uRes.data || [];
  const rts = rtRes.data || [];
  const sts = sRes.data || [];

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
      const storageMap = {};
      await Promise.all(
        docs.map(async d => {
          try {
            const inv = (await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`)).data || [];
            docInventories[d.Document_ID] = inv;
            inv.forEach(row => {
              const storageId = row.Storage_ID ?? row.StorageID ?? row.storage_id ?? row.storageId;
              if (storageId != null) storageMap[String(storageId)] = d.Document_ID;
            });
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
      setReturnsTx(rts);
  setStorages(sts);
      setBookInvMap(bookInventories);
      setDocInvMap(docInventories);
      setDueMap(dueTemp);
      setCopyToBookMap(copyMap);
      setBorrowerNameMap(borrowerNames);
      setStorageToDocumentMap(storageMap);
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
  const d = b.BorrowDate ? formatDate(b.BorrowDate) : '';
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [borrows, fromDate, toDate]);

  // Derived data per report
  // Helper: get returned items within date range, with parent ReturnDate
  const returnedItemsFiltered = useMemo(() => {
    const within = (d) => {
      const s = fromDate || '0000-01-01';
      const e = toDate || '9999-12-31';
      return (!d || (d >= s && d <= e));
    };
    const items = [];
    (returnsTx || []).forEach(rt => {
  const rd = rt.ReturnDate ? formatDate(rt.ReturnDate) : '';
      if (!within(rd)) return;
      (rt.items || []).forEach(it => items.push({ ...it, ReturnDate: rd }));
    });
    return items;
  }, [returnsTx, fromDate, toDate]);

  const dataBuilders = {
    borrow_activity: () => {
      const now = new Date();
      let pending=0, awaiting=0, active=0, returned=0, rejected=0, overdue=0;
      filteredBorrows.forEach(tx => {
        let status='';
        if (tx.ReturnStatus === 'Returned'){ returned++; status='Returned'; }
        else if (tx.ApprovalStatus === 'Rejected'){ rejected++; status='Rejected'; }
        else if (tx.ApprovalStatus === 'Pending'){ pending++; status='Pending'; }
        else if (tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved'){ awaiting++; status='Awaiting Pickup'; }
        else if (tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned'){ active++; status='Borrowed'; }
        const due = dueMap[tx.BorrowID] ? new Date(dueMap[tx.BorrowID]) : null;
        if (due && status !== 'Returned' && due < now) overdue++;
      });

      // Fines and lost stats from returned items within date
      const lostItems = returnedItemsFiltered.filter(it => (it.ReturnCondition||'') === 'Lost');
      const lostPaid = lostItems.filter(it => (it.FinePaid||'No') === 'Yes');
      const lostUnpaid = lostItems.filter(it => (it.FinePaid||'No') !== 'Yes');
      const toNum = (v) => {
        const n = parseFloat(v); return isNaN(n) ? 0 : n;
      };
      const totalFineCollected = returnedItemsFiltered.reduce((s,it)=> s + ((it.FinePaid==='Yes') ? toNum(it.Fine) : 0), 0);
      const totalFineOutstanding = returnedItemsFiltered.reduce((s,it)=> s + ((it.FinePaid!=='Yes') ? toNum(it.Fine) : 0), 0);

      return {
        title:'Borrow Activity & Fines',
        headers:['Metric','Value'],
        rows:[
          ['Pending', pending],
          ['Awaiting Pickup', awaiting],
          ['Active (Borrowed)', active],
          ['Overdue', overdue],
          ['Returned', returned],
          ['Rejected', rejected],
          ['Total Transactions', filteredBorrows.length],
          ['Lost Items (paid)', lostPaid.length],
          ['Lost Items (unpaid)', lostUnpaid.length],
          ['Total Fine Collected (₱)', totalFineCollected.toFixed(2)],
          ['Outstanding Fine (₱)', totalFineOutstanding.toFixed(2)]
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
    top_borrowed_documents: () => {
      const counts = {};
      filteredBorrows.forEach(tx => (tx.items||[]).forEach(it => {
        if (it.ItemType === 'Document' && it.DocumentStorageID != null) {
          const key = String(it.DocumentStorageID);
          counts[key] = (counts[key] || 0) + 1;
        }
      }));
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, limit);
      const rows = sorted.map(([storageId, c]) => {
        const docId = storageToDocumentMap[String(storageId)]
          || (() => {
            const docEntry = Object.entries(docInvMap).find(([,inv]) =>
              inv.some(i => String(i.Storage_ID ?? i.StorageID ?? i.storage_id ?? i.storageId) === String(storageId))
            );
            return docEntry ? Number(docEntry[0]) : null;
          })();
        const title = documents.find(d => d.Document_ID === docId)?.Title || 'Unknown';
        return [storageId, title, c];
      });
      return {
        title:`Top Borrowed Documents (limit ${limit})`,
        headers:['Storage ID','Document Title','Borrow Count'],
        rows
      };
    },
    general_storage: () => {
      // Aggregate availability across both books and documents
      const summarize = (invMap) => {
        const lists = Object.values(invMap);
        const total = lists.reduce((a,v)=>a+v.length,0);
        const by = (s) => lists.reduce((a,v)=>a+v.filter(i => (i.availability||i.Availability)===s).length,0);
        return { total, available: by('Available'), borrowed: by('Borrowed'), reserved: by('Reserved'), lost: by('Lost') };
      };
      const bk = summarize(bookInvMap);
      const dc = summarize(docInvMap);
      const rows = [
        ['Books', bk.total, bk.available, bk.borrowed, bk.reserved, bk.lost],
        ['Documents', dc.total, dc.available, dc.borrowed, dc.reserved, dc.lost],
        ['Grand Total', bk.total+dc.total, bk.available+dc.available, bk.borrowed+dc.borrowed, bk.reserved+dc.reserved, bk.lost+dc.lost]
      ];
      return {
        title:'General Storage Availability (Books + Documents)',
        headers:['Group','Total','Available','Borrowed','Reserved','Lost'],
        rows
      };
    },

    storage_capacity: () => {
      // Combine book and document inventory usage per storage ID and compare against Storages.Capacity
      const usageByStorage = {};
      const addUsage = (locId) => {
        if (!locId && locId !== 0) return;
        const key = String(locId);
        usageByStorage[key] = (usageByStorage[key] || 0) + 1;
      };

      Object.values(bookInvMap).forEach(list => (list||[]).forEach(i => {
        const avail = i.availability || i.Availability;
        if (avail === 'Lost') return; // exclude lost from occupying storage
        addUsage(i.location || i.StorageLocation);
      }));
      Object.values(docInvMap).forEach(list => (list||[]).forEach(i => {
        const avail = i.availability || i.Availability;
        if (avail === 'Lost') return;
        addUsage(i.StorageLocation || i.location);
      }));

      const rows = (storages || []).map(s => {
        const id = s.ID ?? s.Id ?? s.id;
        const name = s.Name || s.name || `Storage #${id}`;
        const cap = Number(s.Capacity ?? s.capacity ?? 0) || 0;
        const used = usageByStorage[String(id)] || 0;
        const free = Math.max(0, cap - used);
        const pct = cap > 0 ? ((used / cap) * 100).toFixed(1) + '%' : '—';
        return [name, cap, used, free, pct];
      }).sort((a,b)=> (b[2]/(b[1]||1)) - (a[2]/(a[1]||1))); // sort by utilization desc

      return {
        title:'Storage Capacity & Utilization',
        headers:['Storage','Capacity','Used (copies)','Free','Utilization'],
        rows
      };
    },
    books_with_copies: () => {
      const sortedBooks = [...books].sort((a, b) => (a.Title || '').localeCompare(b.Title || ''));
      const rows = sortedBooks.map(book => {
        const copies = bookInvMap[book.Book_ID] || [];
        const copyDetails = copies.length
          ? copies.map(copy => {
              const copyId = copy.Copy_ID ?? copy.CopyID ?? copy.copy_id ?? copy.copyId ?? '—';
              const availability = copy.availability || copy.Availability || 'Unknown';
              const condition = copy.condition || copy.BookCondition || 'Unknown';
              const location = copy.location || copy.StorageLocation || copy.Location || '—';
              return `• Copy #${copyId} • ${availability}${condition ? ` • ${condition}` : ''}${location ? ` • ${location}` : ''}`;
            }).join('\n')
          : 'No copies recorded';
        return [
          book.Title || 'Untitled',
          book.Author || book.Author_Name || '—',
          book.Subject || book.Genre || '—',
          copies.length,
          copyDetails
        ];
      });
      return {
        title:'Books & Copy Details',
        headers:['Title','Author','Subject','Total Copies','Copy Details'],
        rows
      };
    },
    documents_with_copies: () => {
      const sortedDocs = [...documents].sort((a, b) => (a.Title || '').localeCompare(b.Title || ''));
      const rows = sortedDocs.map(doc => {
        const copies = docInvMap[doc.Document_ID] || [];
        const copyDetails = copies.length
          ? copies.map(copy => {
              const storageId = copy.Storage_ID ?? copy.StorageID ?? copy.storage_id ?? copy.storageId ?? '—';
              const availability = copy.availability || copy.Availability || 'Unknown';
              const condition = copy.Condition || copy.condition || 'Unknown';
              const location = copy.StorageLocation || copy.location || '—';
              return `• Storage #${storageId} • ${availability}${condition ? ` • ${condition}` : ''}${location ? ` • ${location}` : ''}`;
            }).join('\n')
          : 'No copies recorded';
        return [
          doc.Title || 'Untitled',
          doc.Classification || '—',
          doc.Category || doc.CategoryName || '—',
          copies.length,
          copyDetails
        ];
      });
      return {
        title:'Documents & Copy Details',
        headers:['Title','Type','Category','Total Copies','Copy Details'],
        rows
      };
    },
    borrowings_full: () => {
      const sortedBorrows = [...filteredBorrows].sort((a, b) => {
        const aDate = a.BorrowDate ? new Date(a.BorrowDate) : new Date(0);
        const bDate = b.BorrowDate ? new Date(b.BorrowDate) : new Date(0);
        return bDate - aDate;
      });
      const rows = sortedBorrows.map(tx => {
        const borrowerId = tx.BorrowerID ?? tx.UserID;
        const borrower = borrowerNameMap[Number(borrowerId)] || tx.BorrowerName || `Borrower #${borrowerId || '—'}`;
        const borrowDate = tx.BorrowDate ? formatDate(tx.BorrowDate) : '—';
        const dueDate = dueMap[tx.BorrowID] ? formatDate(dueMap[tx.BorrowID]) : '—';
        const returnDate = tx.ReturnDate ? formatDate(tx.ReturnDate) : '—';
        const statuses = [
          `Approval: ${tx.ApprovalStatus || '—'}`,
          `Retrieval: ${tx.RetrievalStatus || '—'}`,
          `Return: ${tx.ReturnStatus || '—'}`
        ];
        if (tx.FineStatus) statuses.push(`Fine: ${tx.FineStatus}`);
        const items = (tx.items || []).map(item => {
          if (item.ItemType === 'Book') {
            const copyId = item.BookCopyID ?? item.CopyID;
            const bookId = copyToBookMap[String(copyId)] || null;
            const bookTitle = books.find(b => b.Book_ID === Number(bookId))?.Title || 'Unknown Book';
            const invList = bookId ? (bookInvMap[bookId] || []) : [];
            const copyRow = invList.find(row => String(row.Copy_ID ?? row.CopyID ?? row.copy_id ?? row.copyId) === String(copyId));
            const availability = copyRow ? (copyRow.availability || copyRow.Availability || 'Unknown') : null;
            const condition = copyRow ? (copyRow.condition || copyRow.BookCondition || 'Unknown') : item.ReturnCondition || null;
            const fineValue = parseFloat(item.Fine ?? 0);
            const fineText = !isNaN(fineValue) && fineValue > 0
              ? ` • Fine: ₱${fineValue.toFixed(2)} (${item.FinePaid === 'Yes' ? 'Paid' : 'Unpaid'})`
              : '';
            const conditionText = condition ? ` • Condition: ${condition}` : '';
            const availabilityText = availability ? ` • Status: ${availability}` : '';
            return `• Book: ${bookTitle} (Copy #${copyId || '—'})${availabilityText}${conditionText}${fineText}`;
          }
          if (item.ItemType === 'Document') {
            const storageId = item.DocumentStorageID ?? item.StorageID;
            const docId = storageToDocumentMap[String(storageId)] || null;
            const docTitle = documents.find(d => d.Document_ID === Number(docId))?.Title || 'Unknown Document';
            const fineValue = parseFloat(item.Fine ?? 0);
            const fineText = !isNaN(fineValue) && fineValue > 0
              ? ` • Fine: ₱${fineValue.toFixed(2)} (${item.FinePaid === 'Yes' ? 'Paid' : 'Unpaid'})`
              : '';
            const conditionText = item.ReturnCondition ? ` • Condition: ${item.ReturnCondition}` : '';
            return `• Document: ${docTitle} (Storage #${storageId || '—'})${conditionText}${fineText}`;
          }
          return `• Item: ${item.ItemType || 'Unknown'} (ID ${item.BorrowedItemID || '—'})`;
        }).join('\n') || '• No items recorded';

        return [
          `#${tx.BorrowID}`,
          borrower,
          borrowDate,
          dueDate,
          returnDate,
          statuses.join('\n'),
          items
        ];
      });
      return {
        title:'Borrowing Transactions (Full Details)',
        headers:['Borrow ID','Borrower','Borrow Date','Due Date','Return Date','Statuses','Items & Notes'],
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
    if (reportType !== 'borrow_activity') return null;
    return {
      type:'bar',
      data:{
        labels: currentReport.rows
          .filter(r=>!String(r[0]).toLowerCase().includes('fine') && !String(r[0]).toLowerCase().includes('total'))
          .map(r=>r[0]),
        datasets:[{
          label:'Count',
          data: currentReport.rows
            .filter(r=>!String(r[0]).toLowerCase().includes('fine') && !String(r[0]).toLowerCase().includes('total'))
            .map(r=>r[1]),
          backgroundColor:['#ffb300','#0288d1','#7b1fa2','#d32f2f','#2e7d32','#757575'],
          borderRadius:6,
          maxBarThickness:40
        }]
      }
    };
  }, [reportType, currentReport]);

  const exportCSV = () => {
    const rows = exportScope === 'page' ? pagedRows : currentReport.rows;
    const lines = [
      `"${currentReport.title}"`,
  `"Generated: ${nowDateTime()} by ${adminName}"`,
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
  doc.text(`Generated: ${nowDateTime()}  •  By: ${adminName}`, marginX, cursorY);
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
          didDrawPage: () => {
            const pageSize = doc.internal.pageSize;
            const pageWidth = pageSize.getWidth();
            const pageHeight = pageSize.getHeight();
            doc.setFontSize(8);
            doc.text(
              `Generated: ${nowDateTime()} • ${adminName}`,
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
          {REPORT_TYPES.map(r=>(
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
  {(reportType==='top_borrowed_books' || reportType==='top_borrowed_documents') && (
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
                                padding:'6px 8px',
                                borderBottom:'1px solid #eee',
                                fontWeight: i===0 ? 600 : 500,
                                whiteSpace:'pre-wrap',
                                lineHeight:1.35
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

      {/* Footer removed to keep page focused on requested reports only */}

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