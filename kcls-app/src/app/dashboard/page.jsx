// Enhanced dashboard with charts (requires: npm i chart.js react-chartjs-2)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Divider, Chip,
  Stack, Skeleton, Button,
  List, ListItem, ListItemText
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';

const number = v => Intl.NumberFormat().format(v || 0);

const surfacePaper = (extra = {}) => (theme) => ({
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  background: theme.palette.background.paper,
  overflow: 'hidden',
  ...extra
});

const BORROW_STATUS_LABELS = ['Pending', 'Awaiting Pickup', 'Active', 'Overdue', 'Returned', 'Rejected'];
const BORROW_STATUS_VALUE_KEYS = {
  Pending: 'pending',
  'Awaiting Pickup': 'awaiting',
  Active: 'active',
  Overdue: 'overdue',
  Returned: 'returned',
  Rejected: 'rejected'
};

const DashboardPage = () => {
  const theme = useTheme();
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

  const statusChipStyle = useCallback((status) => {
    const palette = theme.palette;
    const map = {
      Returned: { bg: alpha(palette.success.main, 0.12), color: palette.success.darker || palette.success.main },
      Active: { bg: alpha(palette.info.main, 0.12), color: palette.info.darker || palette.info.main },
      Overdue: { bg: alpha(palette.error.main, 0.16), color: palette.error.main },
      Rejected: { bg: alpha(palette.warning.main, 0.12), color: palette.warning.dark || palette.warning.main },
      Pending: { bg: alpha(palette.text.primary, 0.08), color: palette.text.secondary },
      'Awaiting Pickup': { bg: alpha(palette.primary.main, 0.12), color: palette.primary.main }
    };
    return map[status] || { bg: alpha(palette.text.primary, 0.08), color: palette.text.secondary };
  }, [theme]);

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
        } catch {
          // Ignore: fallback lookup handled below
        }

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

  const parseBorrowDate = useCallback((tx) => {
    const raw = tx?.BorrowDate || tx?.borrowDate;
    if (!raw) return null;
    return raw instanceof Date ? raw : new Date(raw);
  }, []);

  const quickStats = useMemo(() => ([
    { label: 'Book Titles', value: metrics.bookTitles },
    { label: 'Book Copies', value: metrics.bookCopies },
    { label: 'Document Titles', value: metrics.docTitles },
    { label: 'Digital Documents', value: metrics.digitalDocs },
    { label: 'Active Borrows', value: metrics.active },
    { label: 'Overdue Borrows', value: metrics.overdue }
  ]), [metrics]);

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

  const recentActivity = useMemo(() => {
    return [...(borrows || [])]
      .map(tx => {
        const borrowDate = parseBorrowDate(tx);
        const items = tx.items || [];
        const titles = items.map(itemTitle).filter(Boolean);
        const shown = titles.slice(0, 2);
        const more = titles.length > 2 ? ` +${titles.length - 2} more` : '';
        const diffMs = borrowDate ? Date.now() - borrowDate.getTime() : null;
        let relative = '';
        if (diffMs !== null) {
          const minute = 60 * 1000;
          const hour = 60 * minute;
          const day = 24 * hour;
          if (diffMs < minute) relative = 'just now';
          else if (diffMs < hour) relative = `${Math.floor(diffMs / minute)}m ago`;
          else if (diffMs < day) relative = `${Math.floor(diffMs / hour)}h ago`;
          else relative = `${Math.floor(diffMs / day)}d ago`;
        }
        return {
          id: tx.BorrowID,
          date: borrowDate,
          dateLabel: borrowDate ? borrowDate.toLocaleDateString() : '',
          when: relative,
          who: getBorrowerName(tx.BorrowerID),
          status: deriveStatusLabel(tx),
          itemsSummary: shown.join(' • ') + more,
          itemCount: items.length
        };
      })
      .sort((a,b) => {
        const da = a.date?.getTime?.() || 0;
        const db = b.date?.getTime?.() || 0;
        return db - da;
      })
      .slice(0, 4);
  }, [borrows, getBorrowerName, deriveStatusLabel, itemTitle, parseBorrowDate]);

  const dueSoon = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return (borrows || [])
      .map(tx => {
        const rawDue = dueMap[tx.BorrowID];
        if (!rawDue) return null;
        const dueDate = rawDue instanceof Date ? rawDue : new Date(rawDue);
        if (!dueDate || Number.isNaN(dueDate.getTime())) return null;
        const status = deriveStatusLabel(tx);
        if (!['Awaiting Pickup', 'Active', 'Overdue'].includes(status)) return null;
        const diffDays = Math.ceil((dueDate.getTime() - now) / dayMs);
        let deltaLabel = '';
        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          deltaLabel = overdueDays ? `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}` : 'Overdue';
        } else if (diffDays === 0) {
          deltaLabel = 'Due today';
        } else {
          deltaLabel = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        }

        const items = tx.items || [];
        const titles = items.map(itemTitle).filter(Boolean);
        const primaryTitle = titles[0] || 'Borrow request';
        const extraCount = Math.max(0, items.length - 1);

        return {
          id: tx.BorrowID,
          borrower: getBorrowerName(tx.BorrowerID),
          status,
          dueDate,
          dueLabel: dueDate.toLocaleDateString(),
          deltaLabel,
          isOverdue: diffDays < 0,
          primaryTitle,
          extraCount
        };
      })
  .filter(Boolean)
  .sort((a, b) => a.dueDate - b.dueDate)
  .slice(0, 4);
  }, [borrows, dueMap, deriveStatusLabel, getBorrowerName, itemTitle]);

  const statusSummary = useMemo(() => (
    BORROW_STATUS_LABELS
      .map(label => ({
        label,
        count: metrics[BORROW_STATUS_VALUE_KEYS[label]] ?? 0,
        order: BORROW_STATUS_LABELS.indexOf(label)
      }))
      .sort((a, b) => {
        if (b.count === a.count) return a.order - b.order;
        return b.count - a.count;
      })
  ), [metrics]);

  const borrowStatusTotal = useMemo(
    () => statusSummary.reduce((acc, item) => acc + item.count, 0),
    [statusSummary]
  );

  const availabilityBreakdown = useMemo(() => ([
    {
      label: 'Books',
      available: metrics.bookAvailable,
      unavailable: Math.max(0, metrics.bookCopies - metrics.bookAvailable),
      total: metrics.bookCopies
    },
    {
      label: 'Documents (Physical)',
      available: metrics.docPhysAvailable,
      unavailable: Math.max(0, metrics.docPhysCopies - metrics.docPhysAvailable),
      total: metrics.docPhysCopies
    },
    {
      label: 'Documents (Digital)',
      available: metrics.digitalDocs,
      unavailable: 0,
      total: metrics.digitalDocs
    }
  ]), [metrics]);

  const borrowMixBreakdown = useMemo(() => {
    let booksCount = 0;
    let physicalDocs = 0;
    let digitalDocs = 0;

    (borrows || []).forEach(tx => {
      (tx.items || []).forEach(item => {
        if (item.ItemType === 'Book') {
          booksCount += 1;
          return;
        }
        if (item.ItemType === 'Document' && item.DocumentStorageID) {
          physicalDocs += 1;
          return;
        }
        if (item.ItemType === 'Document') {
          digitalDocs += 1;
        }
      });
    });

    const total = booksCount + physicalDocs + digitalDocs;
    return {
      total,
      segments: [
        { label: 'Books', value: booksCount },
        { label: 'Documents (Physical)', value: physicalDocs },
        { label: 'Documents (Digital)', value: digitalDocs }
      ]
    };
  }, [borrows]);

  return (
    <Box p={{ xs: 2, md: 3 }} sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography fontWeight={700} fontSize={18} mb={0.5}>Dashboard Overview</Typography>
              <Typography variant="body2" color="text.secondary">
                Library activity and inventory status at a glance.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              {lastUpdated && (
                <Chip size="small" variant="outlined" label={`Updated ${lastUpdated.toLocaleTimeString()}`} sx={{ fontWeight: 600 }} />
              )}
              <Button variant="contained" size="small" onClick={fetchAll} disabled={loading} startIcon={<RefreshCw size={16} />} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {err && (
        <Paper
          sx={theme => ({
            ...surfacePaper({})(theme),
            mb: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`
          })}
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

      <Stack spacing={2} mt={0.5}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 38%' }, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 })}>
              <Typography fontWeight={800} fontSize={15}>Key Library Totals</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : (
                <Stack spacing={1.5}>
                  {quickStats.map(stat => (
                    <Box key={stat.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                      <Typography variant="h6" fontWeight={700}>{number(stat.value)}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total Borrow Records</Typography>
                    <Typography fontWeight={700}>{number(metrics.borrowTotal)}</Typography>
                  </Box>
                </Stack>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' })}>
              <Typography fontWeight={800} fontSize={15}>Borrow Status Summary</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={220} />
              ) : borrowStatusTotal ? (
                <List dense disablePadding sx={{ py: 0 }}>
                  {statusSummary.map(row => {
                    const style = statusChipStyle(row.label);
                    const share = borrowStatusTotal ? Math.round((row.count / borrowStatusTotal) * 100) : 0;
                    return (
                      <ListItem key={row.label} divider sx={{ py: 1.25, px: 0.5 }}>
                        <ListItemText
                          primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={row.label}
                          secondary={(
                            <Stack spacing={0.75} mt={0.75}>
                              <Typography variant="caption" color="text.secondary">
                                {number(row.count)} borrow{row.count === 1 ? '' : 's'}{borrowStatusTotal ? ` • ${share}%` : ''}
                              </Typography>
                              <Box sx={{ height: 6, borderRadius: 9999, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: 'hidden' }}>
                                <Box sx={{ width: `${share}%`, height: '100%', bgcolor: alpha(style.color, 0.4) }} />
                              </Box>
                            </Stack>
                          )}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                  <Typography variant="caption" color="text.secondary">No borrow activity recorded.</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 38%' }, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' })}>
              <Typography fontWeight={800} fontSize={15}>Availability Distribution</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : (
                <Stack spacing={1.5}>
                  {availabilityBreakdown.map(item => {
                    const total = item.total || 0;
                    const availableShare = total ? Math.round((item.available / total) * 100) : 0;
                    const unavailableShare = total ? Math.max(0, 100 - availableShare) : 0;
                    return (
                      <Box key={item.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {total ? `${number(item.available)} / ${number(total)}` : '0'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, alignItems: 'center' }}>
                          <Box sx={{ flexGrow: 1, height: 6, borderRadius: 9999, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: 'hidden' }}>
                            <Box sx={{ width: `${availableShare}%`, height: '100%', bgcolor: alpha(theme.palette.success.main, 0.4) }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">{availableShare}% available</Typography>
                        </Box>
                        {item.unavailable > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Unavailable: {number(item.unavailable)} ({unavailableShare}%)
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                  {availabilityBreakdown.every(item => !item.total) && (
                    <Typography variant="caption" color="text.secondary">No inventory data available.</Typography>
                  )}
                </Stack>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' })}>
              <Typography fontWeight={800} fontSize={15}>Borrow Mix</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : borrowMixBreakdown.total ? (
                <Stack spacing={1.5}>
                  {borrowMixBreakdown.segments.map(segment => {
                    const share = borrowMixBreakdown.total ? Math.round((segment.value / borrowMixBreakdown.total) * 100) : 0;
                    return (
                      <Box key={segment.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography variant="body2" color="text.secondary">{segment.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{number(segment.value)} item{segment.value === 1 ? '' : 's'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, alignItems: 'center' }}>
                          <Box sx={{ flexGrow: 1, height: 6, borderRadius: 9999, bgcolor: alpha(theme.palette.text.primary, 0.08), overflow: 'hidden' }}>
                            <Box sx={{ width: `${share}%`, height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.35) }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">{share}% of borrow items</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="body2" color="text.secondary">Total items in borrow records</Typography>
                    <Typography fontWeight={700}>{number(borrowMixBreakdown.total)}</Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">No borrow items recorded yet.</Typography>
              )}
            </Paper>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, minHeight: 280, display: 'flex', flexDirection: 'column' })}>
              <Typography fontWeight={800} fontSize={15}>Upcoming Due Items</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={200} />
              ) : dueSoon.length ? (
                <List dense disablePadding sx={{ py: 0, flexGrow: 1 }}>
                  {dueSoon.map(item => {
                    const style = statusChipStyle(item.status);
                    return (
                      <ListItem key={item.id} divider sx={{ alignItems: 'flex-start', py: 1.25 }}>
                        <ListItemText
                          primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={item.primaryTitle}
                          secondary={(
                            <Stack spacing={0.5} mt={0.75}>
                              <Typography variant="caption" color="text.secondary">
                                {item.borrower || `Borrow #${item.id}`} • Txn #{item.id}
                              </Typography>
                              <Typography variant="caption" color={item.isOverdue ? 'error.main' : 'text.secondary'}>
                                {item.deltaLabel}
                              </Typography>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                                <Chip size="small" label={item.status} sx={{ fontWeight: 600, bgcolor: style.bg, color: style.color }} />
                                <Chip size="small" variant="outlined" label={`Due ${item.dueLabel}`} sx={{ fontWeight: 600 }} />
                              </Stack>
                            </Stack>
                          )}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">No active borrows are due soon.</Typography>
                </Box>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={surfacePaper({ p: 2.5, minHeight: 280, display: 'flex', flexDirection: 'column' })}>
              <Typography fontWeight={800} fontSize={15}>Recent Borrow Activity</Typography>
              <Divider sx={{ my: 1 }} />
              {loading ? (
                <Skeleton variant="rounded" height={200} />
              ) : recentActivity.length ? (
                <List dense disablePadding sx={{ py: 0, flexGrow: 1 }}>
                  {recentActivity.map(it => {
                    const style = statusChipStyle(it.status);
                    return (
                      <ListItem key={it.id} divider sx={{ alignItems: 'flex-start', py: 1.25 }}>
                        <ListItemText
                          primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={it.who || `Borrow #${it.id}`}
                          secondary={(
                            <Stack spacing={0.5} mt={0.75}>
                              <Typography variant="caption" color="text.secondary">
                                {it.itemsSummary || 'No titles listed'}{it.itemCount ? ` • ${it.itemCount} item${it.itemCount === 1 ? '' : 's'}` : ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {it.dateLabel}{it.when ? ` • ${it.when}` : ''}
                              </Typography>
                              <Chip size="small" label={it.status} sx={{ fontWeight: 600, bgcolor: style.bg, color: style.color, width: 'fit-content' }} />
                            </Stack>
                          )}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">No recent lending activity recorded.</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default DashboardPage;