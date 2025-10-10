import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDate } from '../../../utils/date';
import {
  Box, Paper, Typography, Tabs, Tab, Divider, Stack, IconButton, Tooltip,
  Button, TextField, MenuItem, Chip, Skeleton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Pagination
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Download, RefreshCw, FileText, Printer, Eye } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);
import { nowDateTime } from '../../../utils/date';

const surfacePaper = (extra = {}) => (theme) => ({
  borderRadius: 1.75,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)}, ${alpha(theme.palette.primary.light, 0.12)})`,
  boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.05)}`,
  backdropFilter: 'blur(4px)',
  ...extra
});

const REPORT_TYPES = [
  { key: 'book_borrowing', label: 'Book Borrowing Report' },
  { key: 'document_retrieval', label: 'Document Retrieval Report' },
  { key: 'preservation', label: 'Preservation Report' },
  { key: 'book_inventory', label: 'Book Inventory Report' },
  { key: 'pending_overdue', label: 'Pending Return & Overdue Summary' },
  { key: 'loss_damage', label: 'Loss & Damage Accountability' },
  { key: 'request_backlog', label: 'Number of Request Report' }
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

  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});
  // NEW: maps for accurate lookups
  const [copyToBookMap, setCopyToBookMap] = useState({});
  const [borrowerNameMap, setBorrowerNameMap] = useState({});
  const [borrowerMetaMap, setBorrowerMetaMap] = useState({});
  const [userMetaMap, setUserMetaMap] = useState({});
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
      const [bRes, dRes, brRes, uRes, rtRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`),
        axios.get(`${API_BASE}/borrow`),
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/return`)
      ]);
      const bks = bRes.data || [];
      const docs = dRes.data || [];
      const brs = brRes.data || [];
  const users = uRes.data || [];
  const rts = rtRes.data || [];

      // Build borrower name map: BorrowerID -> Full Name and metadata for reporting
      const borrowerNames = {};
      const borrowerMeta = {};
      const accountMeta = {};

      users.forEach(u => {
        const userId = Number(u.UserID);
        const name = fullName(u);
        const departmentCandidate = u.Department || u.department || u.Course || u.Program || u.borrower?.Course || u.borrower?.Department || u.staff?.Position;
        const department = departmentCandidate && String(departmentCandidate).trim() ? String(departmentCandidate).trim() : 'Unspecified';
        const meta = {
          name,
          department,
          email: u.Email || u.email || '',
          contact: u.ContactNumber || u.Contact || u.Phone || ''
        };
        if (Number.isFinite(userId)) {
          accountMeta[userId] = meta;
          borrowerNames[userId] = name;
        }

        if (u.Role === 'Borrower' && u.borrower?.BorrowerID) {
          const borrowerId = Number(u.borrower.BorrowerID);
          if (Number.isFinite(borrowerId)) {
            borrowerNames[borrowerId] = name;
            borrowerMeta[borrowerId] = meta;
          }
        }
      });

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
      setBookInvMap(bookInventories);
      setDocInvMap(docInventories);
      setDueMap(dueTemp);
      setCopyToBookMap(copyMap);
  setBorrowerNameMap(borrowerNames);
  setBorrowerMetaMap(borrowerMeta);
  setUserMetaMap(accountMeta);
      setStorageToDocumentMap(storageMap);
    } catch (e) {
      setErr(e.message || 'Failed loading');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const resolveBorrowerMeta = useCallback((borrowerId, userId) => {
    const borrowerIdNum = Number(borrowerId);
    const userIdNum = Number(userId);
    const candidates = [
      Number.isFinite(borrowerIdNum) ? borrowerMetaMap[borrowerIdNum] : null,
      Number.isFinite(userIdNum) ? borrowerMetaMap[userIdNum] : null,
      Number.isFinite(userIdNum) ? userMetaMap[userIdNum] : null,
      Number.isFinite(borrowerIdNum) ? userMetaMap[borrowerIdNum] : null
    ];
    return candidates.find(Boolean) || {};
  }, [borrowerMetaMap, userMetaMap]);

  const resolveBorrowerName = useCallback((borrowerId, userId) => {
    const borrowerIdNum = Number(borrowerId);
    const userIdNum = Number(userId);
    return (
      (Number.isFinite(borrowerIdNum) && borrowerNameMap[borrowerIdNum])
      || (Number.isFinite(userIdNum) && borrowerNameMap[userIdNum])
      || (Number.isFinite(userIdNum) && userMetaMap[userIdNum]?.name)
      || null
    );
  }, [borrowerNameMap, userMetaMap]);

  const buildBorrowerDisplay = useCallback((borrowerId, userId, extras = {}) => {
    const nameCandidates = [
      resolveBorrowerName(borrowerId, userId),
      extras.BorrowerName,
      extras.BorrowerFullName,
      extras.FullName,
      extras.UserName,
      extras.Username,
      extras.Name
    ].filter(val => typeof val === 'string' && val.trim());

    let name = nameCandidates.length ? nameCandidates[0].trim() : null;
    if (!name) {
      if (borrowerId != null && borrowerId !== '') {
        name = `Borrower #${borrowerId}`;
      } else if (userId != null && userId !== '') {
        name = `User #${userId}`;
      } else {
        name = 'Unknown borrower';
      }
    }

    const meta = resolveBorrowerMeta(borrowerId, userId);
    const deptCandidates = [
      meta.department,
      extras.BorrowerDepartment,
      extras.Department,
      extras.department,
      extras.Program,
      extras.Course
    ].filter(val => typeof val === 'string' && val.trim() && val.trim() !== 'Unspecified');
    const dept = deptCandidates.length ? deptCandidates[0].trim() : null;

    return dept ? `${name}\n${dept}` : name;
  }, [resolveBorrowerMeta, resolveBorrowerName]);

  const filteredBorrows = useMemo(() => {
    if (!fromDate && !toDate) return borrows;
    return borrows.filter(b => {
  const d = b.BorrowDate ? formatDate(b.BorrowDate) : '';
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [borrows, fromDate, toDate]);

  const bookMap = useMemo(() => {
    const map = {};
    books.forEach(book => {
      if (book?.Book_ID != null) {
        map[Number(book.Book_ID)] = book;
      }
    });
    return map;
  }, [books]);

  const documentMap = useMemo(() => {
    const map = {};
    documents.forEach(doc => {
      if (doc?.Document_ID != null) {
        map[Number(doc.Document_ID)] = doc;
      }
    });
    return map;
  }, [documents]);

  const borrowMap = useMemo(() => {
    const map = {};
    borrows.forEach(tx => {
      if (tx?.BorrowID != null) {
        map[Number(tx.BorrowID)] = tx;
      }
    });
    return map;
  }, [borrows]);

  const documentBorrowItems = useMemo(() => {
    const items = [];
    filteredBorrows.forEach(tx => {
      (tx.items || []).forEach(item => {
        if ((item.ItemType || '').toLowerCase() === 'document') {
          items.push({ tx, item });
        }
      });
    });
    return items;
  }, [filteredBorrows]);

  const documentDepartmentStats = useMemo(() => {
    const now = new Date();
    const departments = {};
    const overallTypeCounts = {};

    documentBorrowItems.forEach(({ tx, item }) => {
      const meta = resolveBorrowerMeta(tx.BorrowerID ?? item.BorrowerID, tx.UserID ?? item.UserID);
      const deptRaw = meta.department;
      const dept = deptRaw && String(deptRaw).trim() ? String(deptRaw).trim() : 'Unspecified';

      if (!departments[dept]) {
        departments[dept] = { total: 0, retrieved: 0, pending: 0, delayed: 0, typeCounts: {} };
      }

      const info = departments[dept];
      info.total += 1;

      const retrievalStatus = String(tx.RetrievalStatus || '').toLowerCase();
      if (retrievalStatus === 'retrieved') {
        info.retrieved += 1;
      } else {
        info.pending += 1;
        const borrowDate = tx.BorrowDate ? new Date(tx.BorrowDate) : null;
        if (borrowDate && ((now - borrowDate) / (1000 * 60 * 60 * 24)) > 3) {
          info.delayed += 1;
        }
      }

      const storageId = item.DocumentStorageID ?? item.StorageID ?? item.StorageLocationID;
      const docId = storageId != null ? storageToDocumentMap[String(storageId)] : (item.DocumentID ?? item.Document_ID);
      const doc = docId != null ? documentMap[Number(docId)] : undefined;
      const typeRaw = doc?.Classification || doc?.Category || doc?.Type || item.DocumentType;
      const type = typeRaw ? String(typeRaw).trim() : 'Unclassified';
      info.typeCounts[type] = (info.typeCounts[type] || 0) + 1;
      overallTypeCounts[type] = (overallTypeCounts[type] || 0) + 1;
    });

    return { departments, overallTypeCounts };
  }, [documentBorrowItems, resolveBorrowerMeta, storageToDocumentMap, documentMap]);

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
  (rt.items || []).forEach(it => items.push({ ...it, ReturnDate: rd, ReturnDateRaw: rt.ReturnDate }));
    });
    return items;
  }, [returnsTx, fromDate, toDate]);

  const dataBuilders = {
    book_borrowing: () => {
      const now = new Date();
      let total = 0;
      let pendingApproval = 0;
      let active = 0;
      let returnedCount = 0;
      let overdue = 0;
      const borrowerIds = new Set();
      const bookCounts = {};

      filteredBorrows.forEach(tx => {
        total += 1;
        const borrowerId = tx.BorrowerID ?? tx.UserID;
        if (borrowerId != null) {
          borrowerIds.add(Number(borrowerId));
        }

        const approvalStatus = String(tx.ApprovalStatus || '').toLowerCase();
        const retrievalStatus = String(tx.RetrievalStatus || '').toLowerCase();
        const returnStatus = String(tx.ReturnStatus || '').toLowerCase();

        if (returnStatus === 'returned') {
          returnedCount += 1;
        } else if (approvalStatus === 'pending') {
          pendingApproval += 1;
        } else if (approvalStatus === 'approved' && retrievalStatus === 'retrieved') {
          active += 1;
        }

        const dueRaw = dueMap[tx.BorrowID];
        if (dueRaw) {
          const dueDate = new Date(dueRaw);
          if (returnStatus !== 'returned' && dueDate < now) {
            overdue += 1;
          }
        }

        (tx.items || []).forEach(item => {
          if (String(item.ItemType || '').toLowerCase() === 'book') {
            const copyId = item.BookCopyID ?? item.CopyID ?? item.Copy_Id;
            if (copyId != null) {
              const bookId = copyToBookMap[String(copyId)];
              if (bookId != null) {
                bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
              }
            }
          }
        });
      });

      const topBooks = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(1, limit))
        .map(([bookId, count]) => {
          const title = bookMap[Number(bookId)]?.Title || `Book #${bookId}`;
          return `${title} (${count})`;
        });

      const rows = [
        ['Reporting Period', (fromDate || toDate) ? `${fromDate || '—'} to ${toDate || '—'}` : 'All activity'],
        ['Total Borrowings', total],
        ['Returned', returnedCount],
        ['Active (On Loan)', active],
        ['Pending Approval', pendingApproval],
        ['Overdue', overdue],
        ['Overdue Rate', total ? `${((overdue / total) * 100).toFixed(1)}%` : '0%'],
        ['Unique Borrowers', borrowerIds.size],
        ['Popular Books', topBooks.length ? topBooks.join('\n') : 'No borrowing activity']
      ];

      return {
        title: 'Book Borrowing Report',
        headers: ['Metric', 'Value'],
        rows,
        chart: total ? {
          type: 'bar',
          data: {
            labels: ['Returned', 'Active', 'Pending Approval', 'Overdue'],
            datasets: [{
              label: 'Borrowings',
              data: [returnedCount, active, pendingApproval, overdue],
              backgroundColor: ['#2e7d32', '#0288d1', '#ffa000', '#d32f2f'],
              borderRadius: 6,
              maxBarThickness: 40
            }]
          }
        } : null,
        meta: { total, returnedCount, active, pendingApproval, overdue }
      };
    },
    document_retrieval: () => {
      const entries = Object.entries(documentDepartmentStats.departments || {})
        .map(([dept, stats]) => {
          const typeEntries = Object.entries(stats.typeCounts || {});
          const topType = typeEntries.sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
          return {
            dept,
            total: stats.total || 0,
            retrieved: stats.retrieved || 0,
            pending: stats.pending || 0,
            delayed: stats.delayed || 0,
            topType
          };
        })
        .sort((a, b) => b.total - a.total || a.dept.localeCompare(b.dept));

      let rows;
      let chart = null;

      if (!entries.length) {
        rows = [['No departmental activity', '—', '—', '—', '—', '—']];
      } else {
        rows = entries.map(entry => [
          entry.dept,
          entry.total,
          entry.retrieved,
          entry.pending,
          entry.delayed,
          entry.topType
        ]);

        const totalRequests = entries.reduce((sum, entry) => sum + entry.total, 0);
        const totalRetrieved = entries.reduce((sum, entry) => sum + entry.retrieved, 0);
        const totalPending = entries.reduce((sum, entry) => sum + entry.pending, 0);
        const totalDelayed = entries.reduce((sum, entry) => sum + entry.delayed, 0);
        const topDemand = Object.entries(documentDepartmentStats.overallTypeCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => `${type} (${count})`)
          .join(', ') || '—';

        rows.push(['All Departments', totalRequests, totalRetrieved, totalPending, totalDelayed, topDemand]);

        chart = {
          type: 'bar',
          data: {
            labels: entries.map(entry => entry.dept),
            datasets: [
              {
                label: 'Pending',
                data: entries.map(entry => entry.pending),
                backgroundColor: '#0288d1',
                borderRadius: 6,
                maxBarThickness: 32
              },
              {
                label: 'Delayed',
                data: entries.map(entry => entry.delayed),
                backgroundColor: '#d32f2f',
                borderRadius: 6,
                maxBarThickness: 32
              }
            ]
          }
        };
      }

      return {
        title: 'Document Retrieval Report',
        headers: ['Department', 'Requests', 'Retrieved', 'Pending', 'Delayed >3d', 'Top Document Type'],
        rows,
        chart,
        meta: { entries }
      };
    },
    preservation: () => {
      const flattenCopies = (invMap) => Object.values(invMap || {}).reduce((acc, list) => {
        if (Array.isArray(list)) {
          acc.push(...list);
        }
        return acc;
      }, []);

      const CONDITION_BUCKETS = ['Good', 'Fair', 'Average', 'Poor', 'Bad', 'Lost'];

      const mapConditionBucket = (raw) => {
        const str = String(raw ?? '').trim();
        if (!str) return 'Unknown';
        const lower = str.toLowerCase();
        const directMatch = CONDITION_BUCKETS.find((bucket) => bucket.toLowerCase() === lower);
        if (directMatch) return directMatch;
        if (lower.includes('good') || lower.includes('excellent') || lower.includes('new')) return 'Good';
        if (lower.includes('fair') || lower.includes('usable')) return 'Fair';
        if (lower.includes('average')) return 'Average';
        if (lower.includes('poor') || lower.includes('fragile')) return 'Poor';
        if (lower.includes('bad') || lower.includes('damage') || lower.includes('broken')) return 'Bad';
        if (lower.includes('lost') || lower.includes('missing')) return 'Lost';
        return 'Unknown';
      };

      const mapDigitizationBucket = (raw) => {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === 'boolean') return raw ? 'digitized' : 'notDigitized';
        if (typeof raw === 'number') {
          if (raw === 1) return 'digitized';
          if (raw === 0) return 'notDigitized';
        }
        const str = String(raw).trim().toLowerCase();
        if (!str) return null;
        if (str.includes('progress') || str.includes('pending') || str.includes('sched') || str.includes('processing') || str.includes('ongoing')) {
          return 'inProgress';
        }
        if (str.includes('digitized') || str.includes('digitised') || str.includes('complete') || str === 'yes' || str === 'true' || str === '1' || str.includes('done')) {
          return 'digitized';
        }
        if (str.includes('not') || str === 'no' || str === 'false' || str === '0') {
          return 'notDigitized';
        }
        return 'unknown';
      };

      const summarizeCopies = (copies) => {
        const conditionCounts = CONDITION_BUCKETS.reduce((acc, bucket) => ({ ...acc, [bucket]: 0 }), {});
        let unknownConditions = 0;

        let digitized = 0;
        let inProgress = 0;
        let notDigitized = 0;
        let unknownDigitization = 0;
        let trackedDigitization = 0;

        copies.forEach(copy => {
          const conditionBucket = mapConditionBucket(copy.condition || copy.BookCondition || copy.Condition || copy.PreservationStatus || copy.ConditionStatus);
          if (CONDITION_BUCKETS.includes(conditionBucket)) {
            conditionCounts[conditionBucket] += 1;
          } else {
            unknownConditions += 1;
          }

          const digitizationBucket = mapDigitizationBucket(
            copy.DigitizationStatus ?? copy.Digitized ?? copy.isDigitized ?? copy.Digitization ?? copy.digitized ?? copy.DigitizedStatus
          );
          if (digitizationBucket === null) {
            return; // not tracked on this record
          }
          if (digitizationBucket === 'digitized') {
            digitized += 1;
            trackedDigitization += 1;
          } else if (digitizationBucket === 'inProgress') {
            inProgress += 1;
            trackedDigitization += 1;
          } else if (digitizationBucket === 'notDigitized') {
            notDigitized += 1;
            trackedDigitization += 1;
          } else {
            unknownDigitization += 1;
            trackedDigitization += 1;
          }
        });

        const conditionSummaryParts = CONDITION_BUCKETS
          .map(bucket => (conditionCounts[bucket] ? `${bucket}: ${conditionCounts[bucket]}` : null))
          .filter(Boolean);
        if (unknownConditions) {
          conditionSummaryParts.push(`Unknown: ${unknownConditions}`);
        }

        const digitizationParts = [];
        if (trackedDigitization) {
          if (digitized) digitizationParts.push(`${digitized} digitized`);
          if (inProgress) digitizationParts.push(`${inProgress} in progress`);
          if (notDigitized) digitizationParts.push(`${notDigitized} pending`);
          if (unknownDigitization) digitizationParts.push(`${unknownDigitization} unknown`);
        }

        const needsAttention = (conditionCounts.Poor || 0) + (conditionCounts.Bad || 0) + (conditionCounts.Lost || 0);

        return {
          total: copies.length,
          summary: conditionSummaryParts.length ? conditionSummaryParts.join(' • ') : 'No records available',
          digitizationText: digitizationParts.length ? digitizationParts.join(' • ') : 'Not tracked',
          needsAttention
        };
      };

      const bookCopies = flattenCopies(bookInvMap);
      const documentCopies = flattenCopies(docInvMap);
      const bookSummary = summarizeCopies(bookCopies);
      const documentSummary = summarizeCopies(documentCopies);

      const rows = [
        [
          'Books',
          `${bookSummary.total} copies`,
          bookSummary.summary,
          bookSummary.digitizationText,
          bookSummary.needsAttention ? `${bookSummary.needsAttention} items flagged for preservation` : 'Stable'
        ],
        [
          'Archival Documents',
          `${documentSummary.total} records`,
          documentSummary.summary,
          documentSummary.digitizationText,
          documentSummary.needsAttention ? `${documentSummary.needsAttention} items require intervention` : 'Stable'
        ]
      ];

      return {
        title: 'Preservation Report',
        headers: ['Collection', 'Items', 'Condition Overview', 'Digitization', 'Alerts'],
        rows
      };
    },
    book_inventory: () => {
      const rows = books.map(book => {
        const copies = bookInvMap[book.Book_ID] || [];
        let available = 0;
        let loaned = 0;
        let reserved = 0;
        let lost = 0;
        let damaged = 0;
        let missing = 0;

        copies.forEach(copy => {
          const availability = String(copy.availability || copy.Availability || '').toLowerCase();
          if (availability === 'available') available += 1;
          else if (availability === 'borrowed' || availability === 'on loan') loaned += 1;
          else if (availability === 'reserved' || availability === 'on hold') reserved += 1;
          else if (availability === 'lost') lost += 1;
          else if (availability === 'missing') missing += 1;
          else if (availability.includes('damage') || availability === 'damaged') damaged += 1;
        });

        const total = copies.length;
        const lossDamage = lost + damaged;
        const lossText = (lossDamage || missing)
          ? `${lossDamage} loss/damage${missing ? ` | Missing: ${missing}` : ''}`
          : '0';

        return [
          book.Title || 'Untitled',
          total,
          available,
          loaned,
          reserved,
          lossText
        ];
      }).sort((a, b) => {
        const byLoan = Number(b[3] || 0) - Number(a[3] || 0);
        if (byLoan !== 0) return byLoan;
        return String(a[0] || '').localeCompare(String(b[0] || ''));
      });

      if (!rows.length) {
        rows.push(['No books available', '—', '—', '—', '—', '—']);
      }

      return {
        title: 'Book Inventory Report',
        headers: ['Title', 'Copies', 'Available', 'On Loan', 'Reserved', 'Loss/Damage'],
        rows
      };
    },
    pending_overdue: () => {
      const now = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const detailRows = [];

      filteredBorrows.forEach(tx => {
        const returnStatus = String(tx.ReturnStatus || '').toLowerCase();
        if (returnStatus === 'returned') return;

        const borrowerMeta = resolveBorrowerMeta(tx.BorrowerID, tx.UserID);
        const borrowerLabel = buildBorrowerDisplay(
          tx.BorrowerID,
          tx.UserID,
          {
            BorrowerName: tx.BorrowerName,
            Department: borrowerMeta.department,
            Program: tx.Program,
            Course: tx.Course
          }
        );
        const dueRaw = dueMap[tx.BorrowID];
        const dueDisplay = dueRaw ? formatDate(dueRaw) : '—';
        const dueObj = dueRaw ? new Date(dueRaw) : null;
        const isOverdue = dueObj ? now > dueObj : false;
        const daysOverdue = isOverdue ? Math.max(1, Math.floor((now - dueObj) / msPerDay)) : 0;

        const fineStatus = tx.FineStatus
          || ((tx.items || []).some(item => parseFloat(item.Fine || 0) > 0)
            ? ((tx.items || []).some(item => String(item.FinePaid || '').toLowerCase() === 'yes') ? 'Fine settled' : 'Outstanding fine')
            : 'No fine');

        const itemsSummary = (tx.items || []).map(item => {
          const itemType = String(item.ItemType || '').toLowerCase();
          if (itemType === 'book') {
            const copyId = item.BookCopyID ?? item.CopyID;
            const bookId = copyId != null ? copyToBookMap[String(copyId)] : null;
            const title = bookId != null ? (bookMap[Number(bookId)]?.Title || `Book #${bookId}`) : 'Book';
            return `Book: ${title}${copyId != null ? ` (Copy #${copyId})` : ''}`;
          }
          if (itemType === 'document') {
            const storageId = item.DocumentStorageID ?? item.StorageID;
            const docId = storageId != null ? storageToDocumentMap[String(storageId)] : (item.DocumentID ?? item.Document_ID);
            const title = docId != null ? (documentMap[Number(docId)]?.Title || `Document #${docId}`) : 'Document';
            return `Document: ${title}`;
          }
          return item.ItemType || 'Item';
        }).join('\n') || 'No items recorded';

        detailRows.push({
          sortKey: daysOverdue,
          values: [
            `#${tx.BorrowID}`,
            borrowerLabel,
            dueDisplay,
            daysOverdue,
            fineStatus,
            itemsSummary
          ]
        });
      });

      detailRows.sort((a, b) => b.sortKey - a.sortKey);

      const rows = detailRows.length ? detailRows.map(entry => entry.values) : [['No pending returns', '—', '—', '—', '—', '—']];

      const overdueCount = detailRows.filter(entry => entry.sortKey > 0).length;
      const totalPending = detailRows.length;

      return {
        title: 'Pending Return & Overdue Summary',
        headers: ['Borrow ID', 'Borrower', 'Due Date', 'Days Overdue', 'Fine Status', 'Items'],
        rows,
        chart: detailRows.length ? {
          type: 'bar',
          data: {
            labels: ['Pending Returns', 'Overdue'],
            datasets: [{
              label: 'Loans',
              data: [totalPending - overdueCount, overdueCount],
              backgroundColor: ['#ffa000', '#d32f2f'],
              borderRadius: 6,
              maxBarThickness: 48
            }]
          }
        } : null,
        meta: { overdueCount, totalPending }
      };
    },
    loss_damage: () => {
      const detailRows = [];

      returnedItemsFiltered.forEach(item => {
        const conditionRaw = String(item.ReturnCondition || item.Condition || '').toLowerCase();
        if (!conditionRaw) return;
        const isLost = conditionRaw.includes('lost') || conditionRaw.includes('missing');
        const isDamaged = conditionRaw.includes('damaged') || conditionRaw.includes('damage') || conditionRaw.includes('broken');
        if (!isLost && !isDamaged) return;

        const borrowId = Number(item.BorrowID ?? item.borrow_id ?? item.Borrow_Id ?? item.ReturnBorrowID);
        const borrow = borrowId ? borrowMap[borrowId] : undefined;
        const borrowerMeta = resolveBorrowerMeta(
          borrow?.BorrowerID ?? item.BorrowerID,
          borrow?.UserID ?? item.UserID
        );
        const borrowerLabel = buildBorrowerDisplay(
          borrow?.BorrowerID ?? item.BorrowerID,
          borrow?.UserID ?? item.UserID,
          {
            BorrowerName: item.BorrowerName,
            BorrowerFullName: item.BorrowerFullName,
            Department: borrowerMeta.department,
            Program: item.Program,
            Course: item.Course
          }
        );

        const itemType = String(item.ItemType || '').toLowerCase();
        let itemLabel = item.ItemType || 'Item';
        if (itemType === 'book') {
          const copyId = item.BookCopyID ?? item.CopyID;
          const bookId = copyId != null ? copyToBookMap[String(copyId)] : null;
          const title = bookId != null ? (bookMap[Number(bookId)]?.Title || `Book #${bookId}`) : 'Book';
          itemLabel = `${title}${copyId != null ? ` (Copy #${copyId})` : ''}`;
        } else if (itemType === 'document') {
          const storageId = item.DocumentStorageID ?? item.StorageID;
          const docId = storageId != null ? storageToDocumentMap[String(storageId)] : (item.DocumentID ?? item.Document_ID);
          const title = docId != null ? (documentMap[Number(docId)]?.Title || `Document #${docId}`) : 'Document';
          itemLabel = `${title}${storageId != null ? ` (Storage #${storageId})` : ''}`;
        }

        const rawFine = parseFloat(item.Fine ?? borrow?.FineAmount ?? 0) || 0;
        const finePaid = String(item.FinePaid || borrow?.FineStatus || '').toLowerCase();
        const resolution = rawFine
          ? (finePaid.includes('yes') || finePaid.includes('paid') ? 'Fine settled' : 'Fine pending')
          : 'Assess preservation action';

  const returnDateDisplay = item.ReturnDate ? item.ReturnDate : (borrow?.ReturnDate ? formatDate(borrow.ReturnDate) : '—');
  const sortKey = item.ReturnDateRaw ? new Date(item.ReturnDateRaw).getTime() : (borrow?.ReturnDate ? new Date(borrow.ReturnDate).getTime() : 0);

        detailRows.push({
          sortKey,
          values: [
            returnDateDisplay,
            borrowerLabel,
            itemLabel,
            isLost ? 'Lost' : 'Damaged',
            rawFine ? `₱${rawFine.toFixed(2)}` : 'No fine',
            resolution
          ]
        });
      });

      detailRows.sort((a, b) => b.sortKey - a.sortKey);

      const rows = detailRows.length ? detailRows.map(entry => entry.values) : [['No loss/damage recorded', '—', '—', '—', '—', '—']];

      return {
        title: 'Loss and Damage Accountability Report',
        headers: ['Return Date', 'Borrower', 'Item', 'Issue', 'Fine', 'Resolution Status'],
        rows
      };
    },
    request_backlog: () => {
      const now = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const activeTransactions = filteredBorrows.filter(tx => String(tx.ReturnStatus || '').toLowerCase() !== 'returned');
      const approvalPending = filteredBorrows.filter(tx => String(tx.ApprovalStatus || '').toLowerCase() === 'pending');
      const retrievalPending = filteredBorrows.filter(tx => {
        const approvalStatus = String(tx.ApprovalStatus || '').toLowerCase();
        const retrievalStatus = String(tx.RetrievalStatus || '').toLowerCase();
        return approvalStatus === 'approved' && retrievalStatus !== 'retrieved' && String(tx.ReturnStatus || '').toLowerCase() !== 'returned';
      });
      const overdueReturns = activeTransactions.filter(tx => {
        const dueRaw = dueMap[tx.BorrowID];
        if (!dueRaw) return false;
        const dueDate = new Date(dueRaw);
        return dueDate < now;
      });

      const agingDays = activeTransactions.map(tx => {
        if (!tx.BorrowDate) return 0;
        const borrowDate = new Date(tx.BorrowDate);
        return Math.max(0, (now - borrowDate) / msPerDay);
      }).filter(value => Number.isFinite(value) && value > 0);

      const avgAge = agingDays.length ? (agingDays.reduce((sum, value) => sum + value, 0) / agingDays.length) : 0;

      const backlogThreshold = 3;
      const approvalBacklog = approvalPending.filter(tx => {
        if (!tx.BorrowDate) return false;
        const borrowDate = new Date(tx.BorrowDate);
        return ((now - borrowDate) / msPerDay) > backlogThreshold;
      });
      const retrievalBacklog = retrievalPending.filter(tx => {
        if (!tx.BorrowDate) return false;
        const borrowDate = new Date(tx.BorrowDate);
        return ((now - borrowDate) / msPerDay) > backlogThreshold;
      });

      const delayedDocuments = Object.values(documentDepartmentStats.departments || {}).reduce((sum, stats) => sum + (stats.delayed || 0), 0);
      const topDelayedDepartments = Object.entries(documentDepartmentStats.departments || {})
        .map(([dept, stats]) => ({ dept, delayed: stats.delayed || 0 }))
        .filter(entry => entry.delayed > 0)
        .sort((a, b) => b.delayed - a.delayed || a.dept.localeCompare(b.dept))
        .slice(0, 3)
        .map(entry => `${entry.dept} (${entry.delayed})`)
        .join(', ') || '—';

      const rows = [
        ['Reporting Period', (fromDate || toDate) ? `${fromDate || '—'} to ${toDate || '—'}` : 'All activity'],
        ['Active Requests', activeTransactions.length],
        ['Pending Approval', `${approvalPending.length} (Backlog: ${approvalBacklog.length})`],
        ['Awaiting Retrieval', `${retrievalPending.length} (Backlog: ${retrievalBacklog.length})`],
        ['Overdue Returns', overdueReturns.length],
        ['Average Request Age (days)', avgAge.toFixed(1)],
        ['Document Requests Delayed >3d', delayedDocuments],
        ['Top Backlogged Departments', topDelayedDepartments]
      ];

      return {
        title: 'Number of Request Report',
        headers: ['Metric', 'Value'],
        rows,
        chart: {
          type: 'bar',
          data: {
            labels: ['Active', 'Pending Approval', 'Awaiting Retrieval', 'Overdue Returns'],
            datasets: [{
              label: 'Requests',
              data: [
                activeTransactions.length,
                approvalPending.length,
                retrievalPending.length,
                overdueReturns.length
              ],
              backgroundColor: ['#0288d1', '#ffa000', '#7b1fa2', '#d32f2f'],
              borderRadius: 6,
              maxBarThickness: 48
            }]
          }
        },
        meta: {
          active: activeTransactions.length,
          pending: approvalPending.length,
          retrieval: retrievalPending.length,
          overdue: overdueReturns.length,
          averageAge: avgAge,
          approvalBacklog: approvalBacklog.length,
          retrievalBacklog: retrievalBacklog.length
        }
      };
    }
  };

  const currentReport = dataBuilders[reportType]();

  const summaryMetrics = useMemo(() => {
    const meta = currentReport.meta || {};
    const baseRange = (fromDate || toDate) ? `${fromDate || '—'} to ${toDate || '—'}` : 'All activity';
    const rowsCount = currentReport.rows.length;

    if (reportType === 'book_borrowing') {
      const {
        total = 0,
        returnedCount = 0,
        active = 0,
        pendingApproval = 0,
        overdue = 0
      } = meta;
      return [
        { label: 'Total Borrowings', value: total },
        { label: 'Active Loans', value: active, subtitle: `${returnedCount} returned` },
        { label: 'Pending Approval', value: pendingApproval },
        { label: 'Overdue Loans', value: overdue, subtitle: baseRange }
      ];
    }

    if (reportType === 'document_retrieval') {
      const entries = meta.entries || [];
      const totalRequests = entries.reduce((sum, item) => sum + (item.total || 0), 0);
      const delayed = entries.reduce((sum, item) => sum + (item.delayed || 0), 0);
      return [
        { label: 'Total Requests', value: totalRequests },
        { label: 'Departments', value: entries.length },
        { label: 'Delayed >3 days', value: delayed },
        { label: 'Coverage', value: baseRange }
      ];
    }

    if (reportType === 'pending_overdue') {
      const { totalPending = 0, overdueCount = 0 } = meta;
      return [
        { label: 'Pending Returns', value: totalPending },
        { label: 'Overdue Items', value: overdueCount },
        { label: 'Rows Rendered', value: rowsCount },
        { label: 'Coverage', value: baseRange }
      ];
    }

    if (reportType === 'request_backlog') {
      const {
        active = 0,
        pending = 0,
        retrieval = 0,
        overdue = 0,
        averageAge = 0,
        approvalBacklog = 0,
        retrievalBacklog = 0
      } = meta;
      return [
        { label: 'Active Requests', value: active },
        { label: 'Pending Approval', value: `${pending} (Backlog ${approvalBacklog})` },
        { label: 'Awaiting Retrieval', value: `${retrieval} (Backlog ${retrievalBacklog})` },
        { label: 'Overdue Returns', value: overdue, subtitle: `Avg age ${averageAge.toFixed(1)}d` }
      ];
    }

    return [
      { label: 'Rows Rendered', value: rowsCount },
      { label: 'Coverage', value: baseRange }
    ];
  }, [currentReport, fromDate, reportType, toDate]);

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
  const chartData = currentReport.chart || null;

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
    <Box
      sx={{
        px: { xs: 2, md: 3.5 },
        py: { xs: 2.5, md: 4 },
        minHeight: '100vh',
        background: (theme) => `linear-gradient(160deg, ${alpha(theme.palette.background.default, 0.96)}, ${alpha(theme.palette.primary.light, 0.08)})`
      }}
    >
      <Stack spacing={3.5}>
        <Paper
          sx={surfacePaper({
            p: { xs: 2.5, md: 3 },
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 1.5, md: 2.5 }
          })}
        >
          <Stack spacing={0.5}>
            <Typography fontWeight={800} fontSize={18}>Reports &amp; Exports</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Generate, visualize &amp; export library data
            </Typography>
          </Stack>
          <Chip
            label={REPORT_TYPES.find(r => r.key === reportType)?.label || '—'}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, ml: { xs: 0, md: 'auto' } }}
          />
          <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, md: 'auto' } }}>
            <Tooltip title="Refresh data">
              <IconButton
                size="small"
                onClick={fetchAll}
                disabled={loading}
                sx={{
                  border: (theme) => `1.5px solid ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 1,
                  backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.6)
                }}
              >
                <RefreshCw size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
        <Paper
          sx={surfacePaper({
            p: { xs: 1.5, md: 2 },
            overflow: 'hidden'
          })}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                mr: 1,
                borderRadius: 0.75,
                minHeight: 40,
                transition: 'all .15s ease',
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05)
              },
              '& .MuiTab-root:hover': {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12)
              },
              '& .Mui-selected': {
                backgroundColor: 'primary.main !important',
                color: 'primary.contrastText !important',
                boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.2)}`
              }
            }}
          >
            {REPORT_TYPES.map((r) => (
              <Tab key={r.key} label={r.label} onClick={() => setReportType(r.key)} />
            ))}
          </Tabs>
        </Paper>

        <Paper
          sx={surfacePaper({
            p: { xs: 2, md: 2.5 },
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center'
          })}
        >
          <Box
            sx={{
              height: 38,
              width: 38,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              background: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main'
            }}
          >
            <FileText size={18} />
          </Box>
          <TextField
            label="Report"
            size="small"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            select
            sx={{ minWidth: 200 }}
          >
            {REPORT_TYPES.map((r) => (
              <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {reportType === 'book_borrowing' && (
            <TextField
              label="Top Books Limit"
              size="small"
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value, 10) || 5))}
              sx={{ width: 120 }}
              InputLabelProps={{ shrink: true }}
            />
          )}
          <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, md: 'auto' } }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download size={14} />}
              onClick={exportCSV}
              disabled={loading}
              sx={{ fontWeight: 600 }}
            >
              CSV
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Eye size={14} />}
              onClick={previewPDF} // changed from exportPDF
              disabled={loading}
              sx={{ fontWeight: 700 }}
            >
              Preview PDF
            </Button>
          </Stack>
        </Paper>

        {summaryMetrics.length > 0 && (
          <Grid container spacing={2}>
            {summaryMetrics.map((metric) => (
              <Grid item xs={12} sm={6} md={3} key={metric.label}>
                <Paper
                  sx={surfacePaper({
                    p: { xs: 1.75, md: 2 },
                    height: '100%'
                  })}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {metric.label}
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {metric.value}
                    </Typography>
                    {metric.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {metric.subtitle}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {err && (
          <Paper
            sx={surfacePaper({
              p: { xs: 2, md: 2.25 },
              border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
              background: (theme) => alpha(theme.palette.error.light, 0.18),
              color: 'error.main'
            })}
          >
            <Typography variant="body2" fontWeight={600}>{err}</Typography>
          </Paper>
        )}

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={chartData ? 7 : 12}>
            <Paper
              sx={surfacePaper({
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25
              })}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontWeight={800} fontSize={15}>
                  {currentReport.title}
                </Typography>
                <Chip
                  label={`${pagedRows.length} of ${totalRows}`}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 'auto', fontWeight: 600 }}
                />
              </Stack>
              <Divider sx={{ borderColor: (theme) => alpha(theme.palette.divider, 0.6) }} />
              {loading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={34} />
                  ))}
                </Stack>
              ) : (
                <>
                  <Box
                    sx={{
                      overflow: 'auto',
                      borderRadius: 1,
                      border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                      background: (theme) => alpha(theme.palette.background.paper, 0.6)
                    }}
                  >
                    <table
                      style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        fontSize: 13
                      }}
                    >
                      <thead style={{ background: 'rgba(25, 118, 210, 0.1)' }}>
                        <tr>
                          {currentReport.headers.map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderBottom: '1px solid rgba(0,0,0,0.08)',
                                fontWeight: 700,
                                position: 'sticky',
                                top: 0,
                                backdropFilter: 'blur(4px)',
                                background: 'rgba(25, 118, 210, 0.12)',
                                zIndex: 1
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((r, idx) => (
                          <tr
                            key={idx}
                            style={{
                              background: (idx % 2 === 0) ? 'rgba(255,255,255,0.6)' : 'rgba(25,118,210,0.04)'
                            }}
                          >
                            {r.map((c, i) => (
                              <td
                                key={i}
                                style={{
                                  padding: '10px 12px',
                                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                                  fontWeight: i === 0 ? 600 : 500,
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.4
                                }}
                              >
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {!pagedRows.length && (
                          <tr>
                            <td colSpan={currentReport.headers.length} style={{ padding: 14, textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                No data for current filters.
                              </Typography>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Showing {totalRows ? startIdx + 1 : 0} - {endIdx} of {totalRows}
                    </Typography>
                    <Box ml="auto" />
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, v) => setPage(v)}
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
                sx={surfacePaper({
                  p: { xs: 2, md: 2.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                })}
              >
                <Typography fontWeight={800} fontSize={15}>Visualization</Typography>
                <Divider sx={{ my: 1 }} />
                {loading ? (
                  <Skeleton variant="rounded" height={320} />
                ) : (
                  <Box sx={{ flexGrow: 1, minHeight: 320 }}>
                    {chartData.type === 'bar' && (
                      <Bar
                        data={chartData.data}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                        }}
                      />
                    )}
                    {chartData.type === 'doughnut' && (
                      <Doughnut
                        data={chartData.data}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } }
                        }}
                      />
                    )}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" mt={1}>
                  Auto-generated chart for faster insight.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Stack>

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