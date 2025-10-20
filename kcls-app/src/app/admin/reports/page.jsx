import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Download, Eye, FileText, Printer, RefreshCw } from 'lucide-react';
import axios from 'axios';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { formatDate, nowDateTime } from '../../../utils/date';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const surfacePaper = (extra = {}) => (theme) => ({
  borderRadius: 1.75,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  background: theme.palette.background.paper,
  ...extra
});

const REPORT_TYPES = [
  { key: 'borrowing_trends', label: 'Daily / Weekly / Monthly Borrowing' },
  { key: 'returns', label: 'Return Report' },
  { key: 'overdue', label: 'Overdue Report' },
  { key: 'loss_or_damage', label: 'Lost or Damaged Items' },
  { key: 'inventory_books', label: 'Book Inventory Report' },
  { key: 'inventory_documents', label: 'Document Inventory Report' }
];

const GRANULARITY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const toIsoDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value) => {
  const iso = toIsoDate(value);
  return iso ? formatDate(iso) : '—';
};

const safeJoin = (parts) => parts.filter((part) => typeof part === 'string' && part.trim()).join('\n');

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return `₱${num.toFixed(2)}`;
};

const determineBorrowerType = (tx, meta = {}) => {
  const candidates = [
    tx?.BorrowerType,
    tx?.BorrowerCategory,
    tx?.BorrowerRole,
    tx?.UserType,
    tx?.Borrower?.Type,
    meta.borrowerType
  ];
  return candidates.find((val) => typeof val === 'string' && val.trim()) || '—';
};

const ReportsPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [returnsTx, setReturnsTx] = useState([]);

  const [bookInvMap, setBookInvMap] = useState({});
  const [docInvMap, setDocInvMap] = useState({});
  const [dueMap, setDueMap] = useState({});
  const [copyToBookMap, setCopyToBookMap] = useState({});
  const [borrowerNameMap, setBorrowerNameMap] = useState({});
  const [borrowerMetaMap, setBorrowerMetaMap] = useState({});
  const [userMetaMap, setUserMetaMap] = useState({});
  const [storageToDocumentMap, setStorageToDocumentMap] = useState({});

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].key);
  const [granularity, setGranularity] = useState('daily');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const exportScope = 'all';

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const adminName = useMemo(() => {
    const f = (user.Firstname || '').trim();
    const m = (user.Middlename || '').trim();
    const l = (user.Lastname || '').trim();
    const mi = m ? ` ${m[0]}.` : '';
    return `${f}${mi} ${l}`.trim() || user.Username || `User #${user.UserID || ''}`.trim();
  }, [user]);

  const fullName = useCallback((u) => {
    const f = (u.Firstname || '').trim();
    const m = (u.Middlename || '').trim();
    const l = (u.Lastname || '').trim();
    const mi = m ? ` ${m[0]}.` : '';
    return `${f}${mi} ${l}`.trim() || u.Username || `User #${u.UserID}`;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
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

      const borrowerNames = {};
      const borrowerMeta = {};
      const accountMeta = {};

      users.forEach((u) => {
        const userId = Number(u.UserID);
        const name = fullName(u);
        const departmentCandidate = u.Department || u.department || u.Course || u.Program || u.borrower?.Course || u.borrower?.Department || u.staff?.Position;
        const department = departmentCandidate && String(departmentCandidate).trim() ? String(departmentCandidate).trim() : 'Unspecified';
        const borrowerType = u.borrower?.Type || u.borrower?.BorrowerType || u.BorrowerType || u.Role;
        const meta = {
          name,
          department,
          email: u.Email || u.email || '',
          contact: u.ContactNumber || u.Contact || u.Phone || '',
          borrowerType: borrowerType && String(borrowerType).trim() ? String(borrowerType).trim() : undefined
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

      const bookInventories = {};
      const copyMap = {};
      await Promise.all(
        bks.map(async (b) => {
          try {
            const inv = (await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`)).data || [];
            bookInventories[b.Book_ID] = inv;
            inv.forEach((row) => {
              const copyId = row.Copy_ID ?? row.CopyID ?? row.copy_id ?? row.copyId;
              if (copyId != null) copyMap[String(copyId)] = b.Book_ID;
            });
          } catch (inventoryErr) {
            console.warn('Failed to load book inventory', inventoryErr);
            bookInventories[b.Book_ID] = [];
          }
        })
      );

      const docInventories = {};
      const storageMap = {};
      await Promise.all(
        docs.map(async (d) => {
          try {
            const inv = (await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`)).data || [];
            docInventories[d.Document_ID] = inv;
            inv.forEach((row) => {
              const storageId = row.Storage_ID ?? row.StorageID ?? row.storage_id ?? row.storageId;
              if (storageId != null) storageMap[String(storageId)] = d.Document_ID;
            });
          } catch (inventoryErr) {
            console.warn('Failed to load document inventory', inventoryErr);
            docInventories[d.Document_ID] = [];
          }
        })
      );

      const dueTemp = {};
      brs.forEach((tx) => {
        dueTemp[tx.BorrowID] = tx.ReturnDate || tx.ExpectedReturnDate || null;
      });

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
      setErr(e.message || 'Failed loading data');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, fullName]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
    ].filter((val) => typeof val === 'string' && val.trim());

    let name = nameCandidates.length ? nameCandidates[0].trim() : null;
    if (!name) {
      const fallbackId = borrowerId ?? userId;
      name = fallbackId != null ? `Borrower #${fallbackId}` : 'Unidentified Borrower';
    }

    const meta = resolveBorrowerMeta(borrowerId, userId);
    const deptCandidates = [
      meta.department,
      extras.BorrowerDepartment,
      extras.Department,
      extras.department,
      extras.Program,
      extras.Course
    ].filter((val) => typeof val === 'string' && val.trim() && val.trim() !== 'Unspecified');
    const dept = deptCandidates.length ? deptCandidates[0].trim() : null;

    return dept ? `${name}\n${dept}` : name;
  }, [resolveBorrowerMeta, resolveBorrowerName]);

  const filteredBorrows = useMemo(() => {
    if (!fromDate && !toDate) return borrows;
    return borrows.filter((b) => {
      const d = b.BorrowDate ? formatDate(toIsoDate(b.BorrowDate) || b.BorrowDate) : '';
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [borrows, fromDate, toDate]);

  const bookMap = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      if (book?.Book_ID != null) {
        map[Number(book.Book_ID)] = book;
      }
    });
    return map;
  }, [books]);

  const documentMap = useMemo(() => {
    const map = {};
    documents.forEach((doc) => {
      if (doc?.Document_ID != null) {
        map[Number(doc.Document_ID)] = doc;
      }
    });
    return map;
  }, [documents]);

  const borrowMap = useMemo(() => {
    const map = {};
    borrows.forEach((tx) => {
      if (tx?.BorrowID != null) {
        map[Number(tx.BorrowID)] = tx;
      }
    });
    return map;
  }, [borrows]);

  const returnedItemsDetailed = useMemo(() => {
    const items = [];
    const within = (d) => {
      const iso = toIsoDate(d);
      const formatted = iso ? formatDate(iso) : '';
      const start = fromDate || '0000-01-01';
      const end = toDate || '9999-12-31';
      return !formatted || (formatted >= start && formatted <= end);
    };

    (returnsTx || []).forEach((rt) => {
      if (!within(rt.ReturnDate)) return;
      const returnDateIso = toIsoDate(rt.ReturnDate);
      const returnDate = returnDateIso ? formatDate(returnDateIso) : '—';
      (rt.items || []).forEach((item) => {
        const borrowId = Number(item.BorrowID ?? rt.BorrowID ?? item.ReturnBorrowID);
        items.push({
          item,
          parent: rt,
          borrowId,
          returnDate,
          returnDateRaw: toIsoDate(rt.ReturnDate)
        });
      });
    });
    return items;
  }, [returnsTx, fromDate, toDate]);

  const describeBorrowItem = useCallback((item, tx) => {
    const type = String(item.ItemType || '').toLowerCase();
    const borrowId = tx?.BorrowID;
    const dueIso = toIsoDate(item.DueDate || dueMap[borrowId] || tx?.ReturnDate || tx?.ExpectedReturnDate);
    const dueDate = dueIso ? formatDate(dueIso) : '—';
    const purpose = item.Purpose || tx?.Purpose || tx?.PurposeOfBorrowing || item.Description || tx?.Reason || '—';
    const remarks = item.Remarks || item.Notes || tx?.Remarks || tx?.Notes || '—';

    if (type === 'book') {
      const copyId = item.BookCopyID ?? item.CopyID ?? item.Copy_Id;
      const bookIdCandidate = copyId != null ? copyToBookMap[String(copyId)] : (item.BookID ?? item.Book_ID);
      const bookId = bookIdCandidate != null ? Number(bookIdCandidate) : null;
      const book = bookId != null ? bookMap[bookId] : undefined;
      const inventoryList = bookId != null ? (bookInvMap[bookId] || []) : [];
      const copyMeta = inventoryList.find((row) => {
        const cid = row.Copy_ID ?? row.CopyID ?? row.copy_id ?? row.copyId;
        return String(cid) === String(copyId);
      });

      const title = book?.Title || item.BookTitle || (bookId != null ? `Book #${bookId}` : 'Book Item');
      const author = book?.Author || item.Author || item.Writer;
      const edition = book?.Edition || item.Edition || item.Volume;
      const isbn = book?.ISBN || copyMeta?.ISBN || item.ISBN;
      const accession = copyMeta?.AccessionNumber || copyMeta?.Accession_Number || copyMeta?.accNo || item.AccessionNumber;
      const storage = copyMeta?.StorageLocation || copyMeta?.ShelfLocation || copyMeta?.Location || copyMeta?.Storage_Name || item.StorageLocation || book?.StorageLocation;

      const summary = safeJoin([
        title,
        author ? `Author: ${author}` : null,
        edition ? `Edition: ${edition}` : null,
        isbn ? `ISBN: ${isbn}` : null,
        accession ? `Accession: ${accession}` : null,
        storage ? `Storage: ${storage}` : null
      ]);

      return {
        kind: 'Book',
        title,
        author,
        edition,
        isbn,
        accession,
        storage,
        dueDate,
        purpose,
        remarks,
        category: null,
        classification: null,
        sensitivity: null,
        identifierKey: bookId != null ? `book-${bookId}-${copyId || '0'}` : `book-${copyId || 'item'}`,
        summary
      };
    }

    const storageId = item.DocumentStorageID ?? item.StorageID ?? item.StorageLocationID;
    const docIdCandidate = storageId != null ? storageToDocumentMap[String(storageId)] : (item.DocumentID ?? item.Document_ID);
    const docId = docIdCandidate != null ? Number(docIdCandidate) : null;
    const doc = docId != null ? documentMap[docId] : undefined;
    const inventoryList = docId != null ? (docInvMap[docId] || []) : [];
    const storageEntry = inventoryList.find((row) => {
      const sid = row.Storage_ID ?? row.StorageID ?? row.storage_id ?? row.storageId;
      return String(sid) === String(storageId);
    });

    const title = doc?.Title || item.DocumentTitle || (docId != null ? `Document #${docId}` : 'Document');
    const author = doc?.Author || item.Author || item.Writer;
    const category = doc?.Category || doc?.DocumentType || item.Category || item.DocumentType;
    const classification = doc?.Classification || item.Classification;
    const sensitivity = doc?.Sensitivity || doc?.SensitivityLevel || item.SensitivityLevel || item.Sensitivity;
    const storage = storageEntry?.StorageLocation || storageEntry?.Location || storageEntry?.Storage_Name || item.StorageLocation || doc?.StorageLocation;

    const summary = safeJoin([
      title,
      author ? `Author: ${author}` : null,
      category ? `Category: ${category}` : null,
      classification ? `Classification: ${classification}` : null,
      sensitivity ? `Sensitivity: ${sensitivity}` : null,
      storage ? `Storage: ${storage}` : null
    ]);

    return {
      kind: 'Document',
      title,
      author,
      edition: null,
      isbn: null,
      accession: null,
      storage,
      category,
      classification,
      sensitivity,
      dueDate,
      purpose,
      remarks,
      identifierKey: `${docId || 'doc'}-${storageId || 'storage'}`,
      summary
    };
  }, [bookInvMap, bookMap, copyToBookMap, docInvMap, documentMap, dueMap, storageToDocumentMap]);

  const dataBuilders = {
    borrowing_trends: () => {
      const periodCounts = {};
      const rows = [];

      filteredBorrows.forEach((tx) => {
        const borrowDateIso = toIsoDate(tx.BorrowDate);
        const borrowDateDisplay = borrowDateIso ? formatDate(borrowDateIso) : '—';
        const borrowerLabel = buildBorrowerDisplay(tx.BorrowerID, tx.UserID, {
          BorrowerName: tx.BorrowerName,
          Department: tx.Department,
          Program: tx.Program,
          Course: tx.Course
        });
        const borrowerMeta = resolveBorrowerMeta(tx.BorrowerID, tx.UserID);
        const borrowerType = determineBorrowerType(tx, borrowerMeta);
        const approval = tx.ApprovalStatus || '—';
        const retrieval = tx.RetrievalStatus || '—';

        const iso = borrowDateIso ? new Date(borrowDateIso) : (tx.BorrowDate ? new Date(tx.BorrowDate) : null);
        let periodLabel = 'Unspecified';
        if (iso && !Number.isNaN(iso.getTime())) {
          if (granularity === 'weekly') {
            const start = new Date(iso);
            const day = start.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            start.setDate(start.getDate() + diff);
            const weekStartIso = toIsoDate(start);
            periodLabel = weekStartIso ? `Week of ${formatDate(weekStartIso)}` : 'Week';
          } else if (granularity === 'monthly') {
            periodLabel = `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}`;
          } else {
            periodLabel = borrowDateIso ? formatDate(borrowDateIso) : 'Unspecified';
          }
        }

        (tx.items || []).forEach((item) => {
          const detail = describeBorrowItem(item, tx);
          periodCounts[periodLabel] = (periodCounts[periodLabel] || 0) + 1;

          rows.push([
            periodLabel,
            tx.BorrowID ? `#${tx.BorrowID}` : '—',
            borrowDateDisplay,
            `Approval: ${approval}\nRetrieval: ${retrieval}`,
            borrowerLabel,
            borrowerType,
            detail.kind,
            detail.summary,
            detail.dueDate,
            detail.purpose,
            detail.remarks
          ]);
        });
      });

      const labels = Object.keys(periodCounts);
      const chart = labels.length ? {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Borrowed Items',
            data: labels.map((label) => periodCounts[label]),
            backgroundColor: '#0288d1',
            borderRadius: 6,
            maxBarThickness: 48
          }]
        }
      } : null;

      const rowsWithFallback = rows.length ? rows : [[
        'No activity', '—', '—', '—', '—', '—', '—', 'No borrowing activity', '—', '—', '—'
      ]];

      return {
        title: 'Borrowing Activity by Period',
        headers: [
          'Period',
          'Borrow ID',
          'Borrow Date',
          'Statuses',
          'Borrower',
          'Borrower Type',
          'Item Type',
          'Item Details',
          'Due Date',
          'Purpose of Borrowing',
          'Remarks'
        ],
        rows: rowsWithFallback,
        chart,
        meta: { granularity }
  }
    },

    returns: () => {
      const rows = [];
      const conditionCounts = {};

      returnedItemsDetailed.forEach(({ item, parent, borrowId, returnDate }) => {
        const borrow = borrowId ? borrowMap[borrowId] : undefined;
        const borrowerLabel = buildBorrowerDisplay(
          borrow?.BorrowerID ?? item.BorrowerID,
          borrow?.UserID ?? item.UserID,
          {
            BorrowerName: item.BorrowerName,
            BorrowerFullName: item.BorrowerFullName,
            Department: borrow?.Department || item.Department,
            Program: item.Program,
            Course: item.Course
          }
        );
        const detail = describeBorrowItem(item, borrow);
        const conditionRaw = item.ReturnCondition || item.Condition || '—';
        const condition = conditionRaw || '—';
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;

        const fine = item.Fine ?? borrow?.FineAmount;
        const finePaid = String(item.FinePaid || borrow?.FineStatus || '').toLowerCase();
        const paymentStatus = fine
          ? (finePaid.includes('yes') || finePaid.includes('paid') ? 'Fine Paid' : 'Fine Outstanding')
          : 'No Fine';

        const staffId = parent.ProcessedBy ?? parent.ReceivedBy ?? parent.StaffID ?? parent.StaffUserID;
        const staffMeta = Number.isFinite(Number(staffId)) ? userMetaMap[Number(staffId)] : null;
        const staffName = parent.ProcessedByName || parent.ReceivedByName || parent.StaffName || staffMeta?.name || '—';

        const remarks = item.ReturnRemarks || parent.Remarks || parent.Notes || detail.remarks;

        rows.push([
          parent.ReturnID ? `#${parent.ReturnID}` : '—',
          returnDate,
          borrowId ? `#${borrowId}` : '—',
          borrowerLabel,
          detail.summary,
          condition,
          formatCurrency(fine),
          paymentStatus,
          staffName,
          remarks || '—'
        ]);
      });

      const labels = Object.keys(conditionCounts);
      const chart = labels.length ? {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            label: 'Returned Items',
            data: labels.map((label) => conditionCounts[label]),
            backgroundColor: ['#2e7d32', '#ffa000', '#d32f2f', '#7b1fa2', '#0288d1']
          }]
        }
      } : null;

      const rowsWithFallback = rows.length ? rows : [[
        '—', '—', '—', '—', 'No returned items recorded', '—', '—', '—', '—', '—'
      ]];

      return {
        title: 'Return Report',
        headers: [
          'Return ID',
          'Return Date',
          'Borrow ID',
          'Borrower',
          'Returned Item Details',
          'Condition',
          'Fine',
          'Payment Status',
          'Receiving Staff',
          'Remarks'
        ],
        rows: rowsWithFallback,
        chart
      };
    },

    overdue: () => {
      const now = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const rows = [];
      const bucket = { pending: 0, overdue: 0 };

      filteredBorrows.forEach((tx) => {
        if (String(tx.ReturnStatus || '').toLowerCase() === 'returned') return;
        const dueRaw = dueMap[tx.BorrowID] || tx.ReturnDate || tx.ExpectedReturnDate;
        if (!dueRaw) return;
        const dueDateObj = new Date(dueRaw);
        if (Number.isNaN(dueDateObj.getTime())) return;
        const isOverdue = dueDateObj < now;
        if (!isOverdue) {
          bucket.pending += 1;
          return;
        }

        const borrowerLabel = buildBorrowerDisplay(tx.BorrowerID, tx.UserID, {
          BorrowerName: tx.BorrowerName,
          Department: tx.Department,
          Program: tx.Program,
          Course: tx.Course
        });
        const borrowerMeta = resolveBorrowerMeta(tx.BorrowerID, tx.UserID);
        const borrowerType = determineBorrowerType(tx, borrowerMeta);
        const daysOverdue = Math.max(1, Math.floor((now - dueDateObj) / msPerDay));
        bucket.overdue += 1;

        const fineAmount = Number(tx.FineAmount)
          || (tx.items || []).reduce((sum, item) => sum + (Number(item.Fine) || 0), 0);
        const notificationStatus = tx.NotificationStatus
          || (Array.isArray(tx.notifications) && tx.notifications.length ? 'Reminder sent' : 'No reminder recorded');

        const itemsSummary = (tx.items || []).map((item) => describeBorrowItem(item, tx).summary).filter(Boolean).join('\n\n') || 'No item details available';
        const remarks = tx.Remarks || tx.Notes || '—';

        rows.push([
          tx.BorrowID ? `#${tx.BorrowID}` : '—',
          formatDisplayDate(tx.BorrowDate),
          borrowerLabel,
          borrowerType,
          formatDisplayDate(dueRaw),
          daysOverdue,
          formatCurrency(fineAmount),
          notificationStatus,
          itemsSummary,
          remarks
        ]);
      });

      const chart = rows.length ? {
        type: 'bar',
        data: {
          labels: ['Overdue Loans'],
          datasets: [{
            label: 'Count',
            data: [rows.length],
            backgroundColor: '#d32f2f',
            borderRadius: 6,
            maxBarThickness: 48
          }]
        }
      } : null;

      const rowsWithFallback = rows.length ? rows : [[
        '—', '—', '—', '—', '—', '—', '—', '—', 'No overdue items found', '—'
      ]];

      return {
        title: 'Overdue Borrowed Items',
        headers: [
          'Borrow ID',
          'Borrow Date',
          'Borrower',
          'Borrower Type',
          'Expected Return Date',
          'Days Overdue',
          'Fine Amount',
          'Notification Status',
          'Item Details',
          'Remarks'
        ],
        rows: rowsWithFallback,
        chart
      };
    },

    loss_or_damage: () => {
      const rows = [];
      const conditionCounts = {};

      returnedItemsDetailed.forEach(({ item, parent, borrowId }) => {
        const conditionRaw = String(item.ReturnCondition || item.Condition || '').toLowerCase();
        if (!conditionRaw) return;
        const isLost = conditionRaw.includes('lost') || conditionRaw.includes('missing');
        const isDamaged = conditionRaw.includes('damaged') || conditionRaw.includes('damage') || conditionRaw.includes('broken');
        if (!isLost && !isDamaged) return;

        const borrow = borrowId ? borrowMap[borrowId] : undefined;
        const borrowerLabel = buildBorrowerDisplay(
          borrow?.BorrowerID ?? item.BorrowerID,
          borrow?.UserID ?? item.UserID,
          {
            BorrowerName: item.BorrowerName,
            BorrowerFullName: item.BorrowerFullName,
            Department: borrow?.Department || item.Department
          }
        );
        const detail = describeBorrowItem(item, borrow);
        const conditionLabel = isLost ? 'Lost' : 'Damaged';
        conditionCounts[conditionLabel] = (conditionCounts[conditionLabel] || 0) + 1;

        const fine = item.Fine ?? borrow?.FineAmount;
        const finePaid = String(item.FinePaid || borrow?.FineStatus || '').toLowerCase();
        const paymentStatus = fine
          ? (finePaid.includes('yes') || finePaid.includes('paid') ? 'Fine Settled' : 'Fine Pending')
          : 'No Fine';

  const staffId = parent.ProcessedBy ?? parent.ReceivedBy ?? parent.StaffID;
  const staffMeta = Number.isFinite(Number(staffId)) ? userMetaMap[Number(staffId)] : null;
        const staffName = parent.ProcessedByName || parent.ReceivedByName || parent.StaffName || staffMeta?.name || '—';

        const remarks = item.ReturnRemarks || parent.Remarks || detail.remarks;

        rows.push([
          borrowId ? `#${borrowId}` : '—',
          borrowerLabel,
          detail.title,
          detail.kind,
          conditionLabel,
          formatCurrency(fine),
          paymentStatus,
          staffName,
          remarks || '—'
        ]);
      });

      const labels = Object.keys(conditionCounts);
      const chart = labels.length ? {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            label: 'Cases',
            data: labels.map((label) => conditionCounts[label]),
            backgroundColor: ['#ffa000', '#d32f2f']
          }]
        }
      } : null;

      const rowsWithFallback = rows.length ? rows : [[
        '—', '—', '—', '—', '—', '—', '—', '—', 'No lost or damaged items recorded'
      ]];

      return {
        title: 'Lost or Damaged Books and Documents',
        headers: [
          'Borrow ID',
          'Borrower',
          'Item Title',
          'Item Type',
          'Reported Condition',
          'Fine Assessed',
          'Payment Status',
          'Handled By',
          'Remarks'
        ],
        rows: rowsWithFallback,
        chart
      };
    }
    ,
    inventory_books: () => {
      const rows = [];
      (books || []).forEach((book) => {
        const bookId = book?.Book_ID;
        const inv = (bookId != null && bookInvMap[bookId]) ? (bookInvMap[bookId] || []) : [];
        const title = book?.Title || `Book #${bookId}`;
        const meta = safeJoin([book?.Author ? `Author: ${book.Author}` : null, book?.Edition ? `Edition: ${book.Edition}` : null, book?.Publisher ? `Publisher: ${book.Publisher}` : null]);
        const identifier = book?.ISBN || `BookID: ${bookId}`;

        rows.push(['Book', title, meta || '—', identifier || '—', 'Copy Accession', 'Availability / Condition', 'Location', 'Updated', 'Lost On']);
        if ((inv || []).length === 0) rows.push(['', '', '', '', '—', '—', '—', '—', '—']);
        else {
          inv.forEach((copy) => {
            const accession = copy.accessionNumber || copy.AccessionNumber || copy.Accession_No || copy.Accession || copy.Copy_Number || copy.CopyNo || copy.Copy_ID || '';
            const availability = copy.availability || copy.Availability || '';
            const condition = copy.condition || copy.Condition || '';
            const location = copy.StorageLocation || copy.location || copy.StorageLocationID || copy.location_id || copy.Location || '';
            const updated = copy.UpdatedOn || copy.updatedOn || copy.updated_on || copy.Updated || null;
            const lostOn = copy.LostOn || copy.lostOn || copy.lost_on || null;
            rows.push(['', '', '', '', accession || '—', `${availability}${condition ? ' • ' + condition : ''}`, String(location || '—'), formatDisplayDate(updated), formatDisplayDate(lostOn)]);
          });
        }
      });
      const headers = ['Type', 'Title', 'Meta', 'Identifier', 'Copy Accession', 'Availability / Condition', 'Location', 'Updated', 'Lost On'];
      return { title: 'Book Inventory Report', headers, rows: rows.length ? rows : [['—', 'No inventory data available', '', '', '', '', '', '', '']], chart: null };
    },
    inventory_documents: () => {
      const rows = [];
      (documents || []).forEach((doc) => {
        const docId = doc?.Document_ID;
        const inv = (docId != null && docInvMap[docId]) ? (docInvMap[docId] || []) : [];
        const title = doc?.Title || `Document #${docId}`;
        const meta = safeJoin([doc?.Author ? `Author: ${doc.Author}` : null, doc?.Category ? `Category: ${doc.Category}` : null, doc?.Classification ? `Class: ${doc.Classification}` : null]);
        const identifier = `DocumentID: ${docId}`;

        rows.push(['Document', title, meta || '—', identifier || '—', 'Copy Accession', 'Availability / Condition', 'Location', 'Updated', 'Lost On']);
        if ((inv || []).length === 0) rows.push(['', '', '', '', '—', '—', '—', '—', '—']);
        else {
          inv.forEach((copy) => {
            const accession = copy.accessionNumber || copy.AccessionNumber || copy.Accession_No || copy.Accession || copy.Copy_Number || copy.CopyNo || copy.Storage_ID || '';
            const availability = copy.availability || copy.Availability || '';
            const condition = copy.condition || copy.Condition || '';
            const location = copy.StorageLocation || copy.location || copy.StorageLocationID || copy.location_id || copy.Location || '';
            const updated = copy.UpdatedOn || copy.updatedOn || copy.updated_on || copy.Updated || null;
            const lostOn = copy.LostOn || copy.lostOn || copy.lost_on || null;
            rows.push(['', '', '', '', accession || '—', `${availability}${condition ? ' • ' + condition : ''}`, String(location || '—'), formatDisplayDate(updated), formatDisplayDate(lostOn)]);
          });
        }
      });
      const headers = ['Type', 'Title', 'Meta', 'Identifier', 'Copy Accession', 'Availability / Condition', 'Location', 'Updated', 'Lost On'];
      return { title: 'Document Inventory Report', headers, rows: rows.length ? rows : [['—', 'No inventory data available', '', '', '', '', '', '', '']], chart: null };
    }
  };

  const currentReport = dataBuilders[reportType]();

  useEffect(() => {
    setPage(1);
  }, [reportType, fromDate, toDate, granularity, currentReport.title]);

  const totalRows = currentReport.rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const endIdx = Math.min(totalRows, startIdx + rowsPerPage);
  const pagedRows = currentReport.rows.slice(startIdx, endIdx);
  const chartData = currentReport.chart || null;

  const exportCSV = () => {
    const rows = exportScope === 'page' ? pagedRows : currentReport.rows;
    const lines = [
      `"${currentReport.title}"`,
      `"Generated: ${nowDateTime()} by ${adminName}"`,
      currentReport.headers.map((h) => `"${h}"`).join(',')
    ];
    rows.forEach((r) => {
      lines.push(r.map((cell) => (typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : `"${cell}"`)).join(','));
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentReport.title.replace(/\s+/g, '_').toLowerCase()}_${formatDate(toIsoDate(new Date()))}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const previewPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(currentReport.title, 40, 40);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Generated: ${nowDateTime()} by ${adminName}`, 40, 60);
      doc.text(`Filters: ${fromDate || 'Start'} → ${toDate || 'End'}`, 40, 76);

      autoTable(doc, {
        startY: 96,
        head: [currentReport.headers],
        body: currentReport.rows,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [2, 136, 209], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 80 }
        }
      });

      if (currentReport.meta) {
        doc.setFontSize(8);
        doc.text(`Notes: ${JSON.stringify(currentReport.meta)}`, 40, doc.lastAutoTable.finalY + 24);
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFileName(`${currentReport.title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
      setPdfOpen(true);
    } catch (pdfError) {
      setErr(pdfError.message || 'Failed to generate PDF');
    }
  };

  const downloadPDFFromPreview = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName || 'report.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3.5 },
        py: { xs: 2.5, md: 4 },
        minHeight: '100vh',
        background: (theme) => theme.palette.background.default
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
            <Typography fontWeight={800} fontSize={18}>Reports &amp; Analytics</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Detailed operational reports for borrowing and document control
            </Typography>
          </Stack>
          <Chip
            label={REPORT_TYPES.find((r) => r.key === reportType)?.label || '—'}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, ml: { xs: 0, md: 'auto' } }}
          />
          {reportType === 'borrowing_trends' && (
            <Chip
              label={`Grouping: ${GRANULARITY_OPTIONS.find((opt) => opt.value === granularity)?.label || 'Daily'}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
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
            {REPORT_TYPES.map((r, index) => (
              <Tab
                key={r.key}
                label={r.label}
                onClick={() => {
                  setReportType(r.key);
                  setTab(index);
                }}
              />
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
            sx={{ minWidth: 220 }}
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
          {reportType === 'borrowing_trends' && (
            <TextField
              label="Grouping"
              size="small"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              select
              sx={{ width: 160 }}
            >
              {GRANULARITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
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
              onClick={previewPDF}
              disabled={loading}
              sx={{ fontWeight: 700 }}
            >
              Preview PDF
            </Button>
          </Stack>
        </Paper>

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
                              background: idx % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(25,118,210,0.04)'
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
                  Auto-generated chart for quick insight.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Stack>

      <Dialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
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
          <Button onClick={() => setPdfOpen(false)}>Close</Button>
          <Button variant="contained" onClick={downloadPDFFromPreview} startIcon={<Printer size={14} />}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsPage;
