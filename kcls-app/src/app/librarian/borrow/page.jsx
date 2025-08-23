import React, { useEffect, useState } from "react";
import axios from 'axios';
import {
  Box, Typography, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, Divider, Avatar,
  MenuItem, Select, InputLabel, FormControl, TextField, Checkbox,
  FormControlLabel, IconButton, useTheme, InputAdornment
} from "@mui/material";
import {
  Book, Article, Visibility, Search, CheckCircle, Cancel, DoneAll,
  Undo, TaskAlt, Refresh
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

const API_BASE = import.meta.env.VITE_API_BASE;
const returnConditions = ["Good", "Slightly Damaged", "Heavily Damaged", "Lost"];
// Auto fine per day from env
const FINE_PER_DAY = parseFloat(import.meta.env.VITE_FINE) || 0;

const LibrarianBorrowPage = () => {
  const theme = useTheme();
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
  const getBorrowerInfo = (borrowerId) => {
    if (!borrowerId) return '';
    return borrowerNameById[borrowerId] || `Borrower #${borrowerId}`;
  };

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

  // Helper: status mapping (show Rejected correctly)
  const txStatus = (tx) => {
    if (tx?.ApprovalStatus === 'Rejected') return 'Rejected';
    if (tx?.ReturnStatus === 'Returned') return 'Returned';
    if (tx?.ApprovalStatus === 'Pending') return 'Pending';
    if (tx?.ApprovalStatus === 'Approved' && tx?.RetrievalStatus !== 'Retrieved') return 'Approved (Awaiting Pickup)';
    if (tx?.RetrievalStatus === 'Retrieved' && tx?.ReturnStatus !== 'Returned') return 'Borrowed';
    return tx?.ApprovalStatus || 'Unknown';
  };

  // Guard: book-only transactions (should already be true due to API filter)
  const isBookOnly = (tx) => (tx?.items || []).every(it => it.ItemType === 'Book');

  // Actions must pass role=librarian
  const handleApprove = async (tx) => {
    if (!isBookOnly(tx)) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve?role=librarian`);
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
    return days * FINE_PER_DAY;
  };

  // Return Modal Logic
  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const baseFine = calcFineForBorrow(tx.BorrowID, dueDates);
    const data = {};
    (tx.items || []).forEach(item => {
      data[item.BorrowedItemID] = { condition: "Good", fine: baseFine, finePaid: false };
    });
    setReturnData(data);
    // reset remarks when opening
    setReturnRemarks("");
    setReturnModalOpen(true);
  };
  const handleReturnChange = (itemId, field, value) =>
    setReturnData(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  const handleReturnSubmit = async () => {
    if (!returnTx) return;
    setActionLoading(true);
    try {
      const items = (returnTx.items || []).map(item => ({
        borrowedItemId: item.BorrowedItemID,
        returnCondition: returnData[item.BorrowedItemID].condition,
        fine: parseFloat(returnData[item.BorrowedItemID].fine) || 0,
        finePaid: returnData[item.BorrowedItemID].finePaid ? "Yes" : "No",
      }));
      await axios.post(`${API_BASE}/return`, {
        borrowId: returnTx.BorrowID,
        returnDate: new Date().toISOString().slice(0, 10),
        items,
        // include remarks
        remarks: returnRemarks || undefined
      });
      setReturnModalOpen(false);
      fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // Derived Status + Chip
  const deriveStatus = (tx) => {
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
  };

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

  const countBy = (predicate) => transactions.filter(predicate).length;
  const summary = [
    { label: "Pending", value: countBy(t => deriveStatus(t).label === "Pending Approval"), color: theme.palette.warning.main },
    { label: "Approved", value: countBy(t => deriveStatus(t).label === "Approved"), color: theme.palette.info.main },
    { label: "Borrowed", value: countBy(t => deriveStatus(t).label === "Borrowed"), color: theme.palette.secondary.main },
    { label: "Overdue", value: countBy(t => deriveStatus(t).label.startsWith("Overdue")), color: theme.palette.error.main },
    { label: "Returned", value: countBy(t => deriveStatus(t).label === "Returned"), color: theme.palette.success.main }
  ];

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
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: theme.palette.background.default }}
      >
        {(returnTx.items || []).map(item => {
          const dueRaw = dueDates[returnTx.BorrowID];
          const today = startOfDay(new Date());
          const due = dueRaw ? startOfDay(new Date(dueRaw)) : null;
          const days = due ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
          const autoFine = (days * FINE_PER_DAY).toFixed(2);
          return (
            <Box
              key={item.BorrowedItemID}
              sx={{
                p: 1.5,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    bgcolor: item.ItemType === "Book" ? theme.palette.primary.main : theme.palette.secondary.main,
                    width: 36,
                    height: 36,
                    fontSize: 18,
                    borderRadius: 1
                  }}
                >
                  {item.ItemType === "Book" ? <Book fontSize="small" /> : <Article fontSize="small" />}
                </Avatar>
                <Typography fontWeight={700} fontSize={13}>
                  {item.ItemType === "Book"
                    ? `Book Copy #${item.BookCopyID}`
                    : `Doc Storage #${item.DocumentStorageID}`}
                </Typography>
              </Stack>
              <FormControl fullWidth size="small">
                <InputLabel>Return Condition</InputLabel>
                <Select
                  label="Return Condition"
                  value={returnData[item.BorrowedItemID]?.condition || "Good"}
                  onChange={e => handleReturnChange(item.BorrowedItemID, "condition", e.target.value)}
                >
                  {returnConditions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Fine"
                type="number"
                size="small"
                value={returnData[item.BorrowedItemID]?.fine ?? 0}
                onChange={e => handleReturnChange(item.BorrowedItemID, "fine", e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
              />
              <Typography variant="caption" color="text.secondary">
                Auto: {FINE_PER_DAY.toFixed(2)}/day × {days} day(s) = {autoFine}
              </Typography>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={!!returnData[item.BorrowedItemID]?.finePaid}
                    onChange={e => handleReturnChange(item.BorrowedItemID, "finePaid", e.target.checked)}
                  />
                }
                label="Fine Paid"
              />
            </Box>
          );
        })}
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
    const derived = deriveStatus(selectedTx);
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
            <InfoBlock label="Borrow Date" value={selectedTx.BorrowDate?.slice(0, 10) || "—"} />
            <InfoBlock label="Due Date" value={dueDate ? dueDate.slice(0, 10) : "—"} />
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
      {data.filter(([_, v]) => v).map(([k, v]) => (
        <Typography key={k} variant="caption" sx={{ display: 'block' }}>
          <b>{k}:</b> {v}
        </Typography>
      ))}
    </Stack>
  );

  // Search, table, and UI
  const filteredTransactions = transactions.filter(tx => {
    const borrower = getBorrowerInfo(tx.BorrowerID) || "";
    const searchLower = search.toLowerCase();
    return (
      borrower.toLowerCase().includes(searchLower) ||
      (tx.Purpose || "").toLowerCase().includes(searchLower) ||
      (tx.BorrowDate || "").toLowerCase().includes(searchLower) ||
      (dueDates[tx.BorrowID] || "").toLowerCase().includes(searchLower) ||
      String(tx.BorrowID).includes(searchLower)
    );
  });

  const statusPriority = (tx) => {
    const d = deriveStatus(tx).label;
    if (d.startsWith("Overdue")) return 0;
    if (d === "Pending Approval") return 1;
    if (d === "Approved") return 2;
    if (d === "Borrowed") return 3;
    if (d === "Returned") return 4;
    if (d === "Rejected") return 5;
    return 6;
  };
  const sortedTransactions = [...filteredTransactions].sort((a, b) => statusPriority(a) - statusPriority(b));

  return (
    <Box p={3} sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={.5} lineHeight={1.15}>
            Borrow Transactions
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Monitor & manage borrowing lifecycle
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search borrower / purpose / dates / ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{
            width: { xs: '100%', sm: 340, md: 400 },
            ml: { xs: 0, md: 'auto' },
            '& .MuiOutlinedInput-root': { borderRadius: 1 }
          }}
        />
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={fetchTransactions}
            sx={{
              borderRadius: 1,
              border: `1.5px solid ${theme.palette.divider}`,
              '&:hover': { bgcolor: theme.palette.action.hover }
            }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Summary */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2
        }}
      >
        {summary.map(s => (
          <Paper
            key={s.label}
            elevation={0}
            sx={{
              px: 1.5,
              py: 1,
              minWidth: 120,
              border: `1.5px solid ${alpha(s.color, .5)}`,
              bgcolor: alpha(s.color, .08),
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: .25
            }}
          >
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: .4 }}>
              {s.label}
            </Typography>
            <Typography fontWeight={800} fontSize={18} lineHeight={1}>
              {s.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Table */}
      {loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <CircularProgress />
          <Typography mt={2} variant="caption" color="text.secondary" fontWeight={600}>
            Loading transactions…
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}
        >
          <TableContainer
            sx={{
              maxHeight: '68vh',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.divider,
                borderRadius: 4
              }
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: .5,
                      bgcolor: theme.palette.background.default,
                      borderBottom: `2px solid ${theme.palette.divider}`
                    }
                  }}
                >
                  <TableCell width={140}>Status</TableCell>
                  <TableCell width={105}>Borrow Date</TableCell>
                  <TableCell width={105}>Due Date</TableCell>
                  <TableCell>Borrower</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell width={260} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  '& tr:hover': { backgroundColor: theme.palette.action.hover },
                  '& td': { borderBottom: `1px solid ${theme.palette.divider}` }
                }}
              >
                {sortedTransactions.map(tx => {
                  const due = dueDates[tx.BorrowID];
                  const dStatus = deriveStatus(tx);
                  const isOverdue = dStatus.label.startsWith("Overdue");
                  return (
                    <TableRow key={tx.BorrowID}>
                      <TableCell>
                        <StatusChip tx={tx} />
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} fontWeight={600}>
                          {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          fontSize={12}
                          fontWeight={700}
                          color={isOverdue ? 'error.main' : 'text.primary'}
                        >
                          {due ? due.slice(0, 10) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={600} noWrap>
                          {getBorrowerInfo(tx.BorrowerID) || tx.BorrowerID}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} noWrap maxWidth={180}>
                          {tx.Purpose || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap">
                          <Tooltip title="View Details">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => { setSelectedTx(tx); setModalOpen(true); }}
                              sx={{ borderRadius: 0.75, fontWeight: 600 }}
                            >
                              View
                            </Button>
                          </Tooltip>

                          {tx.ApprovalStatus === "Pending" && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApprove(tx)}
                                  sx={{
                                    border: `1px solid ${alpha(theme.palette.success.main, .5)}`,
                                    borderRadius: 0.75
                                  }}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleReject(tx)}
                                  sx={{
                                    border: `1px solid ${alpha(theme.palette.error.main, .5)}`,
                                    borderRadius: 0.75
                                  }}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                          {tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved" && (
                            <Tooltip title="Mark Retrieved">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSetRetrieved(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}
                              >
                                Retrieved
                              </Button>
                            </Tooltip>
                          )}

                          {tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned" && (
                            <Tooltip title="Return Items">
                              <Button
                                size="small"
                                color="secondary"
                                variant="contained"
                                onClick={() => openReturnModal(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}
                              >
                                Return
                              </Button>
                            </Tooltip>
                          )}

                          {tx.ReturnStatus === "Returned" && (
                            <Chip
                              size="small"
                              label="Completed"
                              color="success"
                              icon={<DoneAll fontSize="small" />}
                              sx={{ borderRadius: 0.75, fontWeight: 600 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No transactions found{search ? " for this search." : "."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {renderTxModal()}
      {renderReturnModal()}
    </Box>
  );
};

export default LibrarianBorrowPage;