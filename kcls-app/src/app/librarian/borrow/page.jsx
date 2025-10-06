import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from 'axios';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import {
  Article,
  AssignmentLate,
  Book,
  Cancel,
  CheckCircle,
  DoneAll,
  FilterAlt,
  Inbox,
  PendingActions,
  Refresh,
  Search,
  TaskAlt,
  Undo,
  Visibility
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useSystemSettings } from '../../../contexts/SystemSettingsContext.jsx'; // added
import { formatDate } from '../../../utils/date';
import { logAudit } from '../../../utils/auditLogger.js'; // NEW

const API_BASE = import.meta.env.VITE_API_BASE;
// Lost is controlled by the checkbox; dropdown excludes 'Lost'
const returnConditions = ['Good', 'Fair', 'Average', 'Poor', 'Bad'];
// const FINE_PER_DAY = parseFloat(import.meta.env.VITE_FINE) || 0; // remove this line
const statusFilterOptions = [
  {
    label: "All",
    matcher: () => true,
    countKey: (tallies) => tallies.total
  },
  {
    label: "Pending approval",
    matcher: (label) => label === "Pending Approval",
    countKey: (tallies) => tallies.pending
  },
  {
    label: "Awaiting pickup",
    matcher: (label) => label === "Approved",
    countKey: (tallies) => tallies.awaitingPickup
  },
  {
    label: "Borrowed",
    matcher: (label) => label === "Borrowed",
    countKey: (tallies) => tallies.borrowed
  },
  {
    label: "Overdue",
    matcher: (label) => label.startsWith("Overdue"),
    countKey: (tallies) => tallies.overdue
  },
  {
    label: "Returned",
    matcher: (label) => label === "Returned",
    countKey: (tallies) => tallies.returned
  },
  {
    label: "Rejected",
    matcher: (label) => label === "Rejected",
    countKey: (tallies) => tallies.rejected
  }
];

const LibrarianBorrowPage = () => {
  const theme = useTheme();
  const { settings } = useSystemSettings(); // added
  const finePerDay = Number(settings?.fine ?? 0); // added
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [bookDetails, setBookDetails] = useState({});
  const [docDetails, setDocDetails] = useState({});
  const [dueDates, setDueDates] = useState({});
  // Cache for BorrowerID -> Full Name
  const [borrowerNameById, setBorrowerNameById] = useState({});

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnData, setReturnData] = useState({});
  const [returnTx, setReturnTx] = useState(null);
  // NEW: remarks for return
  const [returnRemarks, setReturnRemarks] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(statusFilterOptions[0].label);

  // Fetch only librarian-visible transactions (books only)
  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/borrow?role=librarian`);
      setTransactions(res.data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Prefetch borrower names for visible transactions via /users/borrower/:borrowerId
  useEffect(() => {
    if (!transactions.length) return;
    const uniqueBorrowerIds = [...new Set(transactions.map(tx => tx.BorrowerID).filter(Boolean))];
    const missing = uniqueBorrowerIds.filter(id => !borrowerNameById[id]);
    if (!missing.length) return;

    (async () => {
      const updates = {};
      for (const id of missing) {
        try {
          const res = await axios.get(`${API_BASE}/users/borrower/${id}`);
          const u = res.data || {};
          const f = (u.Firstname || '').trim();
          const m = (u.Middlename || '').trim();
          const l = (u.Lastname || '').trim();
          const mi = m ? ` ${m[0]}.` : '';
          const name = `${f}${mi} ${l}`.trim() || u.Username || `Borrower #${id}`;
          updates[id] = name;
        } catch {
          // ignore; fallback will label by ID if missing
        }
      }
      if (Object.keys(updates).length) {
        setBorrowerNameById(prev => ({ ...prev, ...updates }));
      }
    })();
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simplified: use cache or fallback label
  const getBorrowerInfo = useCallback((borrowerId) => {
    if (!borrowerId) return '';
    return borrowerNameById[borrowerId] || `Borrower #${borrowerId}`;
  }, [borrowerNameById]);

  // Due dates (from /borrow payload)
  useEffect(() => {
    if (!transactions.length) { setDueDates({}); return; }
    const map = {};
    for (const tx of transactions) {
      map[tx.BorrowID] = tx.ReturnDate || null;
    }
    setDueDates(map);
  }, [transactions]);

  // fetch related item metadata
  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      let bookCopyIds = [], docStorageIds = [];
      transactions.forEach(tx => (tx.items || []).forEach(item => {
        if (item.ItemType === "Book" && item.BookCopyID) bookCopyIds.push(item.BookCopyID);
        if (item.ItemType === "Document" && item.DocumentStorageID) docStorageIds.push(item.DocumentStorageID);
      }));
      bookCopyIds = [...new Set(bookCopyIds)];
      docStorageIds = [...new Set(docStorageIds)];
      const bookInfo = {}, docInfo = {};
      for (const copyId of bookCopyIds) {
        try {
          const invResp = await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`);
          const invData = Array.isArray(invResp.data) ? invResp.data[0] : invResp.data;
          const bookResp = await axios.get(`${API_BASE}/books/${invData?.Book_ID || copyId}`);
          if (bookResp.data?.Title) bookInfo[copyId] = { ...bookResp.data, ...invData };
        } catch { /* ignore */ }
      }
      for (const storageId of docStorageIds) {
        try {
          const invResp = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          const invData = Array.isArray(invResp.data) ? invResp.data[0] : invResp.data;
          const docResp = await axios.get(`${API_BASE}/documents/${invData?.Document_ID || storageId}`);
          if (docResp.data?.Title) docInfo[storageId] = { ...docResp.data, ...invData };
        } catch { /* ignore */ }
      }
      setBookDetails(bookInfo);
      setDocDetails(docInfo);
    })();
  }, [transactions]);

  // Guard: book-only transactions (should already be true due to API filter)
  const isBookOnly = (tx) => (tx?.items || []).every(it => it.ItemType === 'Book');

  // Actions must pass role=librarian
  const handleApprove = async (tx) => {
    if (!isBookOnly(tx)) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve?role=librarian`);
      logAudit('BORROW_APPROVE', 'Borrow', tx.BorrowID, { role: 'librarian' }); // NEW
      await fetchTransactions();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (tx) => {
    if (!isBookOnly(tx)) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/reject?role=librarian`);
      logAudit('BORROW_REJECT', 'Borrow', tx.BorrowID, { role: 'librarian' }); // NEW
      await fetchTransactions();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetRetrieved = async (tx) => {
    if (!isBookOnly(tx)) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/retrieved?role=librarian`);
      logAudit('BORROW_RETRIEVE', 'Borrow', tx.BorrowID, { role: 'librarian' }); // NEW
      await fetchTransactions();
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: compute auto fine by overdue days for a borrow
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const calcFineForBorrow = (borrowId, dueDatesMap) => {
    const dueRaw = dueDatesMap[borrowId];
    if (!dueRaw) return 0;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueRaw));
    const days = Math.max(0, Math.floor((today - due) / 86400000));
    return days * finePerDay; // changed
  };

  // Return Modal Logic
  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const baseFine = calcFineForBorrow(tx.BorrowID, dueDates);
    const data = {};
    (tx.items || []).forEach(item => {
      data[item.BorrowedItemID] = { condition: "Good", fine: baseFine, finePaid: false, lost: false };
    });
    setReturnData(data);
    // reset remarks when opening
    setReturnRemarks("");
    setReturnModalOpen(true);
  };
  const handleReturnChange = (itemId, field, value) =>
    setReturnData(prev => {
      const nextItem = { ...prev[itemId], [field]: value };
      if (field === 'lost') {
        if (value) {
          nextItem.condition = 'Lost';
        } else if (nextItem.condition === 'Lost') {
          nextItem.condition = 'Good';
        }
      }
      return { ...prev, [itemId]: nextItem };
    });
  const handleReturnSubmit = async () => {
    if (!returnTx) return;
    setActionLoading(true);
    try {
      const allItems = (returnTx.items || []);
      const lostItems = allItems.filter(i => returnData[i.BorrowedItemID]?.lost);
      const keptItems = allItems.filter(i => !returnData[i.BorrowedItemID]?.lost);

      if (lostItems.length) {
        await axios.post(`${API_BASE}/lost`, {
          borrowId: returnTx.BorrowID,
          items: lostItems.map(i => ({
            borrowedItemId: i.BorrowedItemID,
            fine: parseFloat(returnData[i.BorrowedItemID]?.fine) || 0,
            finePaid: returnData[i.BorrowedItemID]?.finePaid ? 'Yes' : 'No'
          })),
          remarks: returnRemarks || undefined
        });
      }

      if (keptItems.length) {
        const items = keptItems.map(item => ({
          borrowedItemId: item.BorrowedItemID,
          returnCondition: returnData[item.BorrowedItemID].condition,
          fine: parseFloat(returnData[item.BorrowedItemID].fine) || 0,
          finePaid: returnData[item.BorrowedItemID].finePaid ? "Yes" : "No",
        }));
        await axios.post(`${API_BASE}/return`, {
          borrowId: returnTx.BorrowID,
          returnDate: new Date().toISOString().slice(0, 10),
          items,
          remarks: returnRemarks || undefined
        });
      }
      logAudit('BORROW_RETURN', 'Borrow', returnTx.BorrowID, { lostItems: lostItems.length, returnedItems: keptItems.length });
      setReturnModalOpen(false);
      fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // Derived Status + Chip
  const deriveStatus = useCallback((tx) => {
    const dueRaw = dueDates[tx.BorrowID];
    const due = dueRaw ? new Date(dueRaw) : null;
    const today = new Date();
    if (tx.ReturnStatus === "Returned") return { label: "Returned", color: "success" };
    if (tx.ApprovalStatus === "Rejected") return { label: "Rejected", color: "error" };
    if (tx.ApprovalStatus === "Pending") return { label: "Pending Approval", color: "warning" };
    if (tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved") {
      if (due && due < today) return { label: "Overdue (Awaiting Retrieval)", color: "error" };
      return { label: "Approved", color: "info" };
    }
    if (tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned") {
      if (due && due < today) return { label: "Overdue", color: "error" };
      return { label: "Borrowed", color: "secondary" };
    }
    return { label: tx.ApprovalStatus || "Unknown", color: "default" };
  }, [dueDates]);

  const StatusChip = ({ tx }) => {
    const s = deriveStatus(tx);
    return (
      <Chip
        size="small"
        label={s.label}
        color={s.color === "default" ? undefined : s.color}
        sx={{
          fontWeight: 700,
          borderRadius: 0.75,
          fontSize: 11
        }}
      />
    );
  };
  const scenarioTallies = useMemo(() => {
    const tallies = {
      total: transactions.length,
      pending: 0,
      awaitingPickup: 0,
      borrowed: 0,
      overdue: 0,
      returned: 0,
      rejected: 0,
      active: 0
    };

    transactions.forEach(tx => {
      const status = deriveStatus(tx).label;
      if (status.startsWith("Overdue")) {
        tallies.overdue += 1;
      } else if (status === "Pending Approval") {
        tallies.pending += 1;
      } else if (status === "Approved") {
        tallies.awaitingPickup += 1;
      } else if (status === "Borrowed") {
        tallies.borrowed += 1;
      } else if (status === "Returned") {
        tallies.returned += 1;
      } else if (status === "Rejected") {
        tallies.rejected += 1;
      }
    });

    tallies.active = tallies.awaitingPickup + tallies.borrowed;
    return tallies;
  }, [transactions, deriveStatus]);

  const summaryCards = useMemo(() => ([
    {
      label: "Pending approvals",
      value: scenarioTallies.pending,
      icon: <PendingActions fontSize="small" />,
      description: "Awaiting librarian review",
      color: theme.palette.warning.main
    },
    {
      label: "Active checkouts",
      value: scenarioTallies.active,
      icon: <TaskAlt fontSize="small" />,
      description: `${scenarioTallies.awaitingPickup || 0} pickup • ${scenarioTallies.borrowed || 0} borrowed`,
      color: theme.palette.primary.main
    },
    {
      label: "Overdue items",
      value: scenarioTallies.overdue,
      icon: <AssignmentLate fontSize="small" />,
      description: "Prioritize follow-ups today",
      color: theme.palette.error.main
    },
    {
      label: "Completed returns",
      value: scenarioTallies.returned,
      icon: <DoneAll fontSize="small" />,
      description: "Successfully closed transactions",
      color: theme.palette.success.main
    }
  ]), [scenarioTallies, theme]);

  // Return Modal
  const renderReturnModal = () => !returnTx ? null : (
    <Dialog
      open={returnModalOpen}
      onClose={() => setReturnModalOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
        Return Items • Borrow #{returnTx.BorrowID}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: theme.palette.background.default }}
      >
        {/* Summary */}
        {(() => {
          const dueRaw = dueDates[returnTx.BorrowID];
          const today = startOfDay(new Date());
          const due = dueRaw ? startOfDay(new Date(dueRaw)) : null;
          const days = due ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
          const total = Object.values(returnData).reduce((sum, v) => sum + (parseFloat(v?.fine) || 0), 0);
          return (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Chip label={`Items: ${(returnTx.items || []).length}`} size="small" />
              <Chip label={`Overdue: ${days} day(s)`} color={days > 0 ? 'error' : 'default'} size="small" />
              <Chip label={`Total fine: ₱${total.toFixed(2)}`} color={total > 0 ? 'warning' : 'default'} size="small" />
            </Stack>
          );
        })()}

        {/* Batch tools */}
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Set all to</InputLabel>
              <Select label="Set all to" onChange={(e) => {
                const v = e.target.value;
                setReturnData(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(k => { next[k] = { ...next[k], condition: v }; });
                  return next;
                });
              }} value="">
                <MenuItem value=""><em>Choose…</em></MenuItem>
                {returnConditions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="number" label="Set fine for all" inputProps={{ min: 0, step: '0.01' }}
              onChange={(e) => {
                const v = e.target.value;
                setReturnData(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(k => { next[k] = { ...next[k], fine: v }; });
                  return next;
                });
              }} sx={{ maxWidth: 180 }} />
            <FormControlLabel sx={{ m: 0 }} control={<Checkbox onChange={(e) => {
              const checked = e.target.checked;
              setReturnData(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { next[k] = { ...next[k], finePaid: checked }; });
                return next;
              });
            }} />} label="Mark all fine paid" />
            <Button size="small" variant="outlined" onClick={() => {
              const dueRaw = dueDates[returnTx.BorrowID];
              const today = startOfDay(new Date());
              const due = dueRaw ? startOfDay(new Date(dueRaw)) : null;
              const days = due ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
              const autoFine = (days * finePerDay).toFixed(2);
              setReturnData(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { next[k] = { ...next[k], fine: autoFine }; });
                return next;
              });
            }}>Auto-calc fines</Button>
          </Stack>
        </Paper>

        {/* Items table */}
        <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell width={160}>Condition</TableCell>
                  <TableCell width={80} align="center">Lost</TableCell>
                  <TableCell width={120}>Fine</TableCell>
                  <TableCell width={100} align="center">Paid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(returnTx.items || []).map(item => {
                  const id = item.BorrowedItemID;
                  const rd = returnData[id] || {};
                  const title = item.ItemType === 'Book'
                    ? (bookDetails[item.BookCopyID]?.Title || `Book Copy #${item.BookCopyID}`)
                    : (docDetails[item.DocumentStorageID]?.Title || `Doc Storage #${item.DocumentStorageID}`);
                  return (
                    <TableRow key={id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: item.ItemType === 'Book' ? 'primary.main' : 'secondary.main' }}>
                            {item.ItemType === 'Book' ? <Book fontSize="small" /> : <Article fontSize="small" />}
                          </Avatar>
                          <Typography fontSize={12} fontWeight={700}>
                            {item.ItemType === 'Book' ? `Copy #${item.BookCopyID}` : `Storage #${item.DocumentStorageID}`}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} noWrap maxWidth={240}>{title}</Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={rd.condition || 'Good'}
                            onChange={e => handleReturnChange(id, 'condition', e.target.value)}
                            disabled={!!rd.lost}
                          >
                            {returnConditions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={!!rd.lost}
                          onChange={e => handleReturnChange(id, 'lost', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={rd.fine ?? 0}
                          onChange={e => handleReturnChange(id, 'fine', e.target.value)}
                          inputProps={{ min: 0, step: '0.01' }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={!!rd.finePaid}
                          onChange={e => handleReturnChange(id, 'finePaid', e.target.checked)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {/* Remarks at bottom */}
        <TextField
          label="Remarks"
          placeholder="Optional notes (e.g., reason for delay, condition details)"
          value={returnRemarks}
          onChange={(e) => setReturnRemarks(e.target.value)}
          multiline
          minRows={2}
          maxRows={4}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 1 },
            '& .MuiInputBase-root': { bgcolor: 'background.default' }
          }}
        />
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: `2px solid ${theme.palette.divider}`,
          py: 1
        }}
      >
        <Button
          onClick={() => setReturnModalOpen(false)}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 1 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleReturnSubmit}
          variant="contained"
          size="small"
          disabled={actionLoading}
          sx={{ borderRadius: 1, fontWeight: 700 }}
        >
          {actionLoading ? "Processing..." : "Submit Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Transaction Detail Modal
  const renderTxModal = () => {
    if (!selectedTx) return null;
    const dueDate = dueDates[selectedTx.BorrowID];
    const borrowerInfo = getBorrowerInfo(selectedTx.BorrowerID);
    return (
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          Transaction #{selectedTx.BorrowID}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: theme.palette.background.default
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <InfoBlock label="Borrower" value={borrowerInfo || selectedTx.BorrowerID} />
            <InfoBlock label="Purpose" value={selectedTx.Purpose || "—"} />
            <InfoBlock label="Borrow Date" value={selectedTx.BorrowDate ? formatDate(selectedTx.BorrowDate) : "—"} />
            <InfoBlock label="Due Date" value={dueDate ? formatDate(dueDate) : "—"} />
            <InfoBlock label="Status" value={<StatusChip tx={selectedTx} />} />
          </Box>

          <Box
            sx={{
              p: 1.5,
              border: `1.5px solid ${theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}
          >
            <Typography fontWeight={800} fontSize={13} mb={1}>
              Items ({selectedTx.items?.length || 0})
            </Typography>
            <Stack spacing={1.25}>
              {(selectedTx.items || []).map(item => (
                <Box
                  key={item.BorrowedItemID}
                  sx={{
                    p: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      sx={{
                        bgcolor: item.ItemType === "Book" ? theme.palette.primary.main : theme.palette.secondary.main,
                        width: 34,
                        height: 34,
                        fontSize: 16,
                        borderRadius: 1
                      }}
                    >
                      {item.ItemType === "Book" ? <Book fontSize="small" /> : <Article fontSize="small" />}
                    </Avatar>
                    <Chip
                      size="small"
                      color={item.ItemType === "Book" ? "primary" : "secondary"}
                      label={
                        item.ItemType === "Book"
                          ? `Book Copy #${item.BookCopyID}`
                          : `Doc Storage #${item.DocumentStorageID}`
                      }
                      sx={{ fontWeight: 600, borderRadius: 0.75 }}
                    />
                  </Stack>
                  <Box mt={1} ml={0.5}>
                    {item.ItemType === "Book" && bookDetails[item.BookCopyID] && (
                      <MetaLine
                        data={[
                          ["Title", bookDetails[item.BookCopyID].Title],
                          ["Author", bookDetails[item.BookCopyID].Author],
                          ["Edition", bookDetails[item.BookCopyID].Edition],
                          ["Publisher", bookDetails[item.BookCopyID].Publisher],
                          ["Year", bookDetails[item.BookCopyID].Year],
                          ["ISBN", bookDetails[item.BookCopyID].ISBN]
                        ]}
                      />
                    )}
                    {item.ItemType === "Document" && docDetails[item.DocumentStorageID] && (
                      <MetaLine
                        data={[
                          ["Title", docDetails[item.DocumentStorageID].Title],
                          ["Author", docDetails[item.DocumentStorageID].Author],
                          ["Category", docDetails[item.DocumentStorageID].Category],
                          ["Department", docDetails[item.DocumentStorageID].Department],
                          ["Year", docDetails[item.DocumentStorageID].Year]
                        ]}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          {selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button
                onClick={() => handleApprove(selectedTx)}
                variant="contained"
                size="small"
                color="success"
                startIcon={<CheckCircle />}
                disabled={actionLoading}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                Approve
              </Button>
              <Button
                onClick={() => handleReject(selectedTx)}
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Cancel />}
                disabled={actionLoading}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                Reject
              </Button>
            </>
          )}
          {selectedTx.ApprovalStatus === "Approved" && selectedTx.RetrievalStatus !== "Retrieved" && (
            <Button
              onClick={() => handleSetRetrieved(selectedTx)}
              variant="contained"
              size="small"
              color="primary"
              startIcon={<TaskAlt />}
              disabled={actionLoading}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Mark Retrieved
            </Button>
          )}
          {selectedTx.RetrievalStatus === "Retrieved" && selectedTx.ReturnStatus !== "Returned" && (
            <Button
              onClick={() => openReturnModal(selectedTx)}
              variant="contained"
              size="small"
              color="secondary"
              startIcon={<Undo />}
              disabled={actionLoading}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Return
            </Button>
          )}
          {selectedTx.ReturnStatus === "Returned" && (
            <Chip
              label="Completed"
              color="success"
              size="small"
              icon={<DoneAll />}
              sx={{ fontWeight: 700, borderRadius: 0.75 }}
            />
          )}
          <Button
            onClick={() => setModalOpen(false)}
            variant="text"
            size="small"
            sx={{ ml: 'auto', fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Small helper components
  const InfoBlock = ({ label, value }) => (
    <Box
      sx={{
        p: 1,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        minWidth: 120,
        flex: '1 1 auto',
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: .4 }}>
        {label}
      </Typography>
      {typeof value === "string" || typeof value === "number" ? (
        <Typography fontSize={13} fontWeight={700} mt={0.25} noWrap>
          {value}
        </Typography>
      ) : (
        <Box mt={0.5}>{value}</Box>
      )}
    </Box>
  );

  const MetaLine = ({ data }) => (
    <Stack
      spacing={0.5}
      sx={{
        fontSize: 12,
        '& b': { fontWeight: 600 }
      }}
    >
      {data.filter(([, value]) => value).map(([key, value]) => (
        <Typography key={key} variant="caption" sx={{ display: 'block' }}>
          <b>{key}:</b> {value}
        </Typography>
      ))}
    </Stack>
  );

  // Search, filter, and sort
  const filtersActive = statusFilter !== statusFilterOptions[0].label || search.trim().length > 0;

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(statusFilterOptions[0].label);
  };

  const filteredTransactions = useMemo(() => {
    const activeOption = statusFilterOptions.find(opt => opt.label === statusFilter) ?? statusFilterOptions[0];
    const matcher = activeOption.matcher;
    const searchLower = search.trim().toLowerCase();

    return transactions.filter(tx => {
      const statusLabel = deriveStatus(tx).label;
      if (!matcher(statusLabel)) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      const borrower = (getBorrowerInfo(tx.BorrowerID) || "").toLowerCase();
      const purpose = (tx.Purpose || "").toLowerCase();
      const borrowDate = (tx.BorrowDate || "").toLowerCase();
      const dueRaw = (dueDates[tx.BorrowID] || "").toLowerCase();
      const idString = String(tx.BorrowID || "").toLowerCase();

      return (
        borrower.includes(searchLower) ||
        purpose.includes(searchLower) ||
        borrowDate.includes(searchLower) ||
        dueRaw.includes(searchLower) ||
        idString.includes(searchLower)
      );
    });
  }, [transactions, statusFilter, search, deriveStatus, getBorrowerInfo, dueDates]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const ta = a.BorrowDate ? new Date(a.BorrowDate).getTime() : 0;
      const tb = b.BorrowDate ? new Date(b.BorrowDate).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (b.BorrowID || 0) - (a.BorrowID || 0);
    });
  }, [filteredTransactions]);

  const filteredCount = sortedTransactions.length;

  const renderEmptyState = () => (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main, width: 56, height: 56 }}>
        <Inbox fontSize="small" />
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700} textAlign="center">
        {filtersActive ? "No transactions match the current filters" : "No borrow transactions yet"}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
        {filtersActive
          ? "Try adjusting your filters or refreshing to see the latest circulation updates."
          : "Approve, track, and close out physical book borrowings. New requests will appear here."}
      </Typography>
    </Stack>
  );

  return (
    <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', py: { xs: 3, md: 4 }, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 3,
              overflow: 'hidden',
              p: { xs: 2.5, md: 3 },
              backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.65)} 100%)`,
              color: theme.palette.common.white,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
              boxShadow: `0 18px 42px ${alpha(theme.palette.primary.main, 0.16)}`
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={800} letterSpacing={0.6}>
                  Circulation dashboard
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75, color: alpha(theme.palette.common.white, 0.85), maxWidth: 520 }}>
                  Stay on top of physical lending requests, retrievals, and returns with scenarios tailored for librarians.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Chip
                  label={`Total: ${scenarioTallies.total}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.15),
                    color: alpha(theme.palette.common.white, 0.95),
                    fontWeight: 700
                  }}
                />
                <Button
                  onClick={fetchTransactions}
                  startIcon={<Refresh fontSize="small" />}
                  variant="contained"
                  color="inherit"
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 2.5,
                    fontWeight: 700,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.18) : theme.palette.common.white,
                    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.grey[900],
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.24)
                        : alpha(theme.palette.common.white, 0.9)
                    }
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {summaryCards.map(card => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(card.color, 0.35)}`, boxShadow: `0 18px 32px ${alpha(card.color, 0.14)}`, height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(card.color, 0.12), color: card.color, width: 48, height: 48 }}>
                          {card.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="overline" sx={{ color: card.color, letterSpacing: 0.6, fontWeight: 700, textTransform: 'uppercase' }}>
                            {card.label}
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                            {card.value}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {card.description}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                  <FilterAlt fontSize="small" />
                </Avatar>
              }
              title="Filters"
              subheader="Search borrowers or focus on a status lane"
              action={
                <Button size="small" onClick={resetFilters} disabled={!filtersActive} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Clear all
                </Button>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search borrower, purpose, ID, or date"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4, mb: 1, display: 'block' }}>
                    Status
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {statusFilterOptions.map(option => {
                      const count = option.countKey(scenarioTallies) || 0;
                      const isActive = statusFilter === option.label;
                      return (
                        <Badge
                          key={option.label}
                          color="primary"
                          badgeContent={count || null}
                          invisible={!count}
                          overlap="rectangular"
                          sx={{ '& .MuiBadge-badge': { right: -6, top: -6 } }}
                        >
                          <Chip
                            label={option.label}
                            onClick={() => setStatusFilter(option.label)}
                            variant={isActive ? 'filled' : 'outlined'}
                            color={isActive ? 'primary' : 'default'}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'capitalize' }}
                          />
                        </Badge>
                      );
                    })}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, overflow: 'hidden' }}>
            <CardHeader
              title="Borrow transactions"
              subheader={`${filteredCount} of ${scenarioTallies.total} transactions`}
              action={
                <Chip
                  icon={<AssignmentLate fontSize="small" />}
                  label={`${scenarioTallies.overdue} overdue`}
                  color={scenarioTallies.overdue ? 'error' : 'default'}
                  size="small"
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
              }
            />
            <Divider />
            {loading ? (
              <CardContent>
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                </Stack>
              </CardContent>
            ) : sortedTransactions.length ? (
              <TableContainer sx={{ maxHeight: '68vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, bgcolor: theme.palette.background.paper, borderBottom: `2px solid ${theme.palette.divider}` } }}>
                      <TableCell width={160}>Status</TableCell>
                      <TableCell width={180}>Borrower</TableCell>
                      <TableCell width={110}>Borrowed</TableCell>
                      <TableCell width={140}>Due date</TableCell>
                      <TableCell>Purpose</TableCell>
                      <TableCell width={90} align="center">Items</TableCell>
                      <TableCell width={240} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ '& tr:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) }, '& td': { borderBottom: `1px solid ${theme.palette.divider}` } }}>
                    {sortedTransactions.map(tx => {
                      const due = dueDates[tx.BorrowID];
                      const status = deriveStatus(tx);
                      const isOverdue = status.label.startsWith('Overdue');
                      const dueDescriptor = (() => {
                        if (!due) return '—';
                        const dueTime = startOfDay(new Date(due));
                        const todayTime = startOfDay(new Date());
                        const diffDays = Math.round((dueTime - todayTime) / 86400000);
                        if (dueTime < todayTime) return `Overdue ${Math.abs(diffDays)}d`;
                        if (diffDays === 0) return 'Due today';
                        if (diffDays === 1) return 'Due tomorrow';
                        return `Due in ${diffDays}d`;
                      })();
                      const borrowerName = getBorrowerInfo(tx.BorrowerID) || '—';
                      const itemCount = (tx.items || []).length;
                      return (
                        <TableRow key={tx.BorrowID} hover>
                          <TableCell>
                            <Stack spacing={0.5} alignItems="flex-start">
                              <StatusChip tx={tx} />
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>#{tx.BorrowID}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontSize={13} fontWeight={700} noWrap>{borrowerName}</Typography>
                              <Typography variant="caption" color="text.secondary">Borrower #{tx.BorrowerID || '—'}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} fontWeight={600}>{tx.BorrowDate ? formatDate(tx.BorrowDate) : '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{tx.ApprovalStatus || 'Pending'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} fontWeight={700} color={isOverdue ? 'error.main' : 'text.primary'}>
                              {due ? formatDate(due) : '—'}
                            </Typography>
                            <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                              {dueDescriptor}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} color="text.secondary" noWrap maxWidth={220}>
                              {tx.Purpose || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={itemCount} sx={{ borderRadius: 0.75, fontWeight: 600 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap">
                              <Tooltip title="View details">
                                <IconButton
                                  size="small"
                                  onClick={() => { setSelectedTx(tx); setModalOpen(true); }}
                                  sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {tx.ApprovalStatus === 'Pending' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    startIcon={<CheckCircle fontSize="small" />}
                                    onClick={() => handleApprove(tx)}
                                    disabled={actionLoading}
                                    sx={{ borderRadius: 1, fontWeight: 600 }}
                                  >
                                    Approve
                                  </Button>
                                  <Tooltip title="Reject">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleReject(tx)}
                                      disabled={actionLoading}
                                      sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`, borderRadius: 1 }}
                                    >
                                      <Cancel fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleSetRetrieved(tx)}
                                  disabled={actionLoading}
                                  sx={{ borderRadius: 1, fontWeight: 700 }}
                                >
                                  Retrieved
                                </Button>
                              )}
                              {tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned' && (
                                <Button
                                  size="small"
                                  color="secondary"
                                  variant="contained"
                                  onClick={() => openReturnModal(tx)}
                                  disabled={actionLoading}
                                  sx={{ borderRadius: 1, fontWeight: 700 }}
                                >
                                  Return
                                </Button>
                              )}
                              {tx.ReturnStatus === 'Returned' && (
                                <Chip
                                  size="small"
                                  label="Completed"
                                  color="success"
                                  icon={<DoneAll fontSize="small" />}
                                  sx={{ borderRadius: 1, fontWeight: 600 }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <CardContent>{renderEmptyState()}</CardContent>
            )}
          </Card>
        </Stack>
      </Container>

      {renderTxModal()}
      {renderReturnModal()}
    </Box>
  );
};

export default LibrarianBorrowPage;