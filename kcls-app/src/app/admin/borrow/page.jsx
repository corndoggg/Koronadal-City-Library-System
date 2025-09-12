import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box, Paper, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel, CircularProgress
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useSystemSettings } from '../../../contexts/SystemSettingsContext.jsx'; // added
import {
  Search, Refresh, Visibility, CheckCircle, Cancel, TaskAlt, Undo, DoneAll, Article
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;
const returnConditions = ["Good", "Slightly Damaged", "Heavily Damaged", "Lost"];
// const FINE_PER_DAY = parseFloat(import.meta.env.VITE_FINE) || 0; // remove this line

const DocumentApprovalPage = () => {
  const theme = useTheme();
  const { settings } = useSystemSettings(); // added
  const finePerDay = Number(settings?.fine ?? 0); // added
  const [transactions, setTransactions] = useState([]);
  const [borrowerNameById, setBorrowerNameById] = useState({});
  const [docDetails, setDocDetails] = useState({});
  const [docMetaById, setDocMetaById] = useState({}); // NEW: docs by DocumentID for digital
  const [dueDates, setDueDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTx, setReturnTx] = useState(null);
  const [returnData, setReturnData] = useState({});
  // NEW: remarks for return
  const [returnRemarks, setReturnRemarks] = useState("");

  // Only fetch transactions on mount
  useEffect(() => { fetchTransactions(); }, []);

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/borrow?role=admin`);
      setTransactions(res.data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
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

  // Detect digital vs physical by presence of DocumentStorageID
  const isDigitalDocItem = (item) => item.ItemType === "Document" && !item.DocumentStorageID;
  const isDigitalOnlyTx = (tx) => {
    const items = tx?.items || [];
    return items.length > 0 && items.every(i => i.ItemType === "Document" && !i.DocumentStorageID);
  };
  const hasAnyPhysical = (tx) => (tx?.items || []).some(i => i.ItemType === "Document" && !!i.DocumentStorageID);

  // Load document metadata (physical by Storage_ID)
  useEffect(() => {
    (async () => {
      if (!transactions.length) return;
      const storageIds = [...new Set(transactions.flatMap(tx => (tx.items || [])
        .filter(i => i.ItemType === "Document" && i.DocumentStorageID).map(i => i.DocumentStorageID)))];
      if (!storageIds.length) return;

      try {
        const entries = await Promise.all(storageIds.map(async (storageId) => {
          try {
            const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
            const invRow = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
            const docId = invRow?.Document_ID ?? storageId;
            const docRes = await axios.get(`${API_BASE}/documents/${docId}`);
            if (docRes.data?.Title) {
              return [storageId, { ...docRes.data, ...invRow }];
            }
          } catch {}
          return null;
        }));
        const info = {};
        entries.filter(Boolean).forEach(([id, val]) => { info[id] = val; });
        setDocDetails(info);
      } catch {}
    })();
  }, [transactions]);

  // Helper: prefer Document_ID with safe fallbacks
  const getDocumentId = (obj) => obj?.Document_ID ?? obj?.DocumentID ?? obj?.documentId ?? obj?.DocumentId;

  // NEW: Load metadata for digital items by Document_ID
  useEffect(() => {
    (async () => {
      if (!transactions.length) return;
      const docIds = [...new Set(transactions.flatMap(tx => (tx.items || [])
        .filter(i => i.ItemType === "Document" && !i.DocumentStorageID && getDocumentId(i))
        .map(i => getDocumentId(i))))];
      if (!docIds.length) return;

      const map = {};
      await Promise.all(docIds.map(async id => {
        try {
          const r = await axios.get(`${API_BASE}/documents/${id}`);
          if (r.data?.Title) map[id] = r.data;
        } catch {}
      }));
      setDocMetaById(map);
    })();
  }, [transactions]);

  // Prefetch borrower names via /users/borrower/:borrowerId
  useEffect(() => {
    (async () => {
      if (!transactions.length) return;
      const uniqueIds = [...new Set(transactions.map(tx => tx.BorrowerID).filter(Boolean))];
      const missing = uniqueIds.filter(id => !borrowerNameById[id]);
      if (!missing.length) return;

      try {
        const results = await Promise.all(missing.map(id =>
          axios.get(`${API_BASE}/users/borrower/${id}`).then(r => ({ id, data: r.data })).catch(() => null)
        ));
        const updates = {};
        results.filter(Boolean).forEach(({ id, data }) => {
          const f = (data.Firstname || '').trim();
          const m = (data.Middlename || '').trim();
          const l = (data.Lastname || '').trim();
          const mi = m ? ` ${m[0]}.` : '';
          updates[id] = `${f}${mi} ${l}`.trim() || data.Username || `Borrower #${id}`;
        });
        if (Object.keys(updates).length) {
          setBorrowerNameById(prev => ({ ...prev, ...updates }));
        }
      } catch { /* ignore */ }
    })();
  }, [transactions, borrowerNameById]);

  // Simplified: use cache or fallback label
  const getBorrowerInfo = (borrowerId) => {
    if (!borrowerId) return String(borrowerId || "");
    return borrowerNameById[borrowerId];
  };

  // Compute status once per transaction (with digital semantics)
  const deriveStatus = (tx, due) => {
    const dueDate = due ? new Date(due) : null;
    const today = new Date();
    const digitalOnly = isDigitalOnlyTx(tx);

    // Digital flow
    if (digitalOnly) {
      if (tx.ApprovalStatus === "Pending") return { label: "Pending Approval", color: "warning" };
      // If auto-marked returned, treat as expired regardless of due date
      if (tx.ReturnStatus === "Returned") return { label: "Expired", color: "error" };
      if (tx.ApprovalStatus === "Approved") {
        if (dueDate && dueDate < today) return { label: "Expired", color: "error" };
        return { label: "Active (Digital)", color: "info" };
      }
      return { label: tx.ApprovalStatus || "Unknown", color: "default" };
    }

    // Physical/mixed flow
    if (tx.ReturnStatus === "Returned") return { label: "Returned", color: "success" };
    if (tx.ApprovalStatus === "Rejected") return { label: "Rejected", color: "error" };
    if (tx.ApprovalStatus === "Pending") return { label: "Pending Approval", color: "warning" };
    if (tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved") {
      if (dueDate && dueDate < today) return { label: "Overdue (Awaiting Retrieval)", color: "error" };
      return { label: "Approved", color: "info" };
    }
    if (tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned") {
      if (dueDate && dueDate < today) return { label: "Overdue", color: "error" };
      return { label: "Borrowed", color: "secondary" };
    }
    return { label: tx.ApprovalStatus || "Unknown", color: "default" };
  };

  const statusMap = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      map[tx.BorrowID] = deriveStatus(tx, dueDates[tx.BorrowID]);
    }
    return map;
  }, [transactions, dueDates]);

  const StatusChip = ({ tx }) => {
    const s = statusMap[tx.BorrowID] || { label: "Unknown", color: "default" };
    return (
      <Chip
        size="small"
        label={s.label}
        color={s.color === "default" ? undefined : s.color}
        sx={{ fontWeight: 700, borderRadius: 0.75, fontSize: 11 }}
      />
    );
  };

  // Actions (admin role)
  // Approve dialog for digital-only: pick expiration/due date
  const [approveDlgOpen, setApproveDlgOpen] = useState(false);
  const [approveDue, setApproveDue] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);

  const openApprove = (tx) => {
    if (isDigitalOnlyTx(tx)) {
      setApproveTarget(tx);
      setApproveDue((dueDates[tx.BorrowID] || "").slice(0, 10));
      setApproveDlgOpen(true);
    } else {
      approveTx(tx); // physical/mixed, approve immediately
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${approveTarget.BorrowID}/approve?role=admin`, approveDue ? {
        returnDate: approveDue // backend treats as expiration for digital
      } : {});
      setApproveDlgOpen(false);
      setApproveTarget(null);
      setApproveDue("");
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  const approveTx = async (tx) => {
    setActionLoading(true);
    try {
      // For physical/mixed, approving without body; for digital-only, we route via openApprove
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve?role=admin`);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };
  const rejectTx = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/reject?role=admin`);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };
  const markRetrieved = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/retrieved?role=admin`);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // Add: search-based filter
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const borrower = (getBorrowerInfo(tx.BorrowerID) || "").toLowerCase();
      const purpose = (tx.Purpose || "").toLowerCase();
      const idStr = String(tx.BorrowID || "");
      const borrowDate = (tx.BorrowDate || "").toLowerCase();
      const due = (dueDates[tx.BorrowID] || "").toLowerCase();
      const statusLabel = (statusMap[tx.BorrowID]?.label || "").toLowerCase();
      return (
        borrower.includes(q) ||
        purpose.includes(q) ||
        idStr.includes(q) ||
        borrowDate.includes(q) ||
        due.includes(q) ||
        statusLabel.includes(q)
      );
    });
  }, [transactions, search, borrowerNameById, dueDates, statusMap]);

  // Add: fine helpers used by return modal
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const calcFineForBorrow = (borrowId) => {
    const dueRaw = dueDates[borrowId];
    if (!dueRaw) return 0;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueRaw));
    const days = Math.max(0, Math.floor((today - due) / 86400000));
    return days * finePerDay;
  };

  // Search/filter/sort (treat Expired like Overdue)
  const statusPriority = (label) => {
    if (label.startsWith("Overdue") || label === "Expired") return 0;
    if (label === "Pending Approval") return 1;
    if (label === "Approved" || label === "Active (Digital)") return 2;
    if (label === "Borrowed") return 3;
    if (label === "Returned") return 4;
    if (label === "Rejected") return 5;
    return 6;
  };
  const rows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const la = (statusMap[a.BorrowID]?.label) || "Unknown";
      const lb = (statusMap[b.BorrowID]?.label) || "Unknown";
      return statusPriority(la) - statusPriority(lb);
    });
  }, [filtered, statusMap]);

  const summary = useMemo(() => {
    const labels = Object.values(statusMap).map(s => s.label);
    const count = (t) => labels.filter(l =>
      l === t || (t === "Overdue" && (l.startsWith("Overdue") || l === "Expired"))
    ).length;
    return [
      { label: "Pending", value: count("Pending Approval"), color: theme.palette.warning.main },
      { label: "Approved", value: count("Approved") + count("Active (Digital)"), color: theme.palette.info.main },
      { label: "Borrowed", value: count("Borrowed"), color: theme.palette.secondary.main },
      { label: "Overdue", value: count("Overdue"), color: theme.palette.error.main },
      { label: "Returned", value: count("Returned"), color: theme.palette.success.main }
    ];
  }, [statusMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const InfoBlock = ({ label, value }) => (
    <Box sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, minWidth: 140, flex: '1 1 auto', bgcolor: 'background.paper' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: .4 }}>{label}</Typography>
      <Box mt={0.25}>{typeof value === "string" || typeof value === "number"
        ? <Typography fontSize={13} fontWeight={700} noWrap>{value}</Typography>
        : value}</Box>
    </Box>
  );
  const MetaLine = ({ data }) => (
    <Stack spacing={0.5} sx={{ fontSize: 12, '& b': { fontWeight: 600 } }}>
      {data.filter(([_, v]) => v).map(([k, v]) => (
        <Typography key={k} variant="caption" sx={{ display: 'block' }}>
          <b>{k}:</b> {v}
        </Typography>
      ))}
    </Stack>
  );

  const renderTxModal = () => {
    if (!selectedTx) return null;
    const dueDate = dueDates[selectedTx.BorrowID];
    const borrowerInfo = getBorrowerInfo(selectedTx.BorrowerID);
    const items = selectedTx.items || [];
    const digitalOnly = isDigitalOnlyTx(selectedTx);
    return (
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          Document Transaction #{selectedTx.BorrowID}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <InfoBlock label="Borrower" value={borrowerInfo} />
            <InfoBlock label="Purpose" value={selectedTx.Purpose || "—"} />
            <InfoBlock label={digitalOnly ? "Expires" : "Due Date"} value={dueDate ? dueDate.slice(0, 10) : "—"} />
            <InfoBlock label="Borrow Date" value={selectedTx.BorrowDate?.slice(0, 10) || "—"} />
            <InfoBlock label="Status" value={<StatusChip tx={selectedTx} />} />
          </Box>
          <Box sx={{ p: 1.5, border: `1.5px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography fontWeight={800} fontSize={13} mb={1}>Items ({items.length})</Typography>
            <Stack spacing={1.25}>
              {items.map(item => {
                const isDigital = isDigitalDocItem(item);
                const did = isDigital ? getDocumentId(item) : null;
                const meta = isDigital
                  ? (did && docMetaById[did])
                  : (item.DocumentStorageID && docDetails[item.DocumentStorageID]);
                return (
                  <Box key={item.BorrowedItemID} sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.default' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 34, height: 34, borderRadius: 1 }}>
                        <Article fontSize="small" />
                      </Avatar>
                      <Chip
                        size="small"
                        color="secondary"
                        label={isDigital ? `Doc #${did}` : `Doc Storage #${item.DocumentStorageID}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75 }}
                      />
                      <Chip size="small" variant="outlined" label={isDigital ? "Digital" : "Physical"} sx={{ borderRadius: 0.75 }} />
                    </Stack>
                    {meta && (
                      <Box mt={1} ml={0.5}>
                        <MetaLine data={[
                          ["Title", meta.Title],
                          ["Author", meta.Author],
                          ["Category", meta.Category],
                          ["Department", meta.Department],
                          ["Year", meta.Year]
                        ]} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          {selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button onClick={() => openApprove(selectedTx)} variant="contained" size="small" color="success"
                startIcon={<CheckCircle />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Approve
              </Button>
              <Button onClick={() => rejectTx(selectedTx)} variant="outlined" size="small" color="error"
                startIcon={<Cancel />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Reject
              </Button>
            </>
          )}
          {/* Hide retrieval/return for digital-only */}
          {!isDigitalOnlyTx(selectedTx) && selectedTx.ApprovalStatus === "Approved" && selectedTx.RetrievalStatus !== "Retrieved" && (
            <Button onClick={() => markRetrieved(selectedTx)} variant="contained" size="small" color="primary"
              startIcon={<TaskAlt />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Mark Retrieved
            </Button>
          )}
          {!isDigitalOnlyTx(selectedTx) && selectedTx.RetrievalStatus === "Retrieved" && selectedTx.ReturnStatus !== "Returned" && (
            <Button onClick={() => openReturnModal(selectedTx)} variant="contained" size="small" color="secondary"
              startIcon={<Undo />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Return
            </Button>
          )}
          {selectedTx.ReturnStatus === "Returned" && !isDigitalOnlyTx(selectedTx) && (
            <Chip label="Completed" color="success" size="small" icon={<DoneAll />} sx={{ borderRadius: 0.75, fontWeight: 700 }} />
          )}
          <Button onClick={() => setModalOpen(false)} variant="text" size="small" sx={{ ml: 'auto', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const baseFine = calcFineForBorrow(tx.BorrowID); // uses context-backed fine
    const data = {};
    (tx.items || []).forEach(i => {
      data[i.BorrowedItemID] = { condition: "Good", fine: baseFine, finePaid: false };
    });
    setReturnData(data);
    setReturnRemarks("");
    setReturnModalOpen(true);
  };
  const handleReturnChange = (id, field, value) =>
    setReturnData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const submitReturn = async () => {
    if (!returnTx) return;
    setActionLoading(true);
    try {
      const items = (returnTx.items || []).map(i => ({
        borrowedItemId: i.BorrowedItemID,
        returnCondition: returnData[i.BorrowedItemID]?.condition || "Good",
        fine: parseFloat(returnData[i.BorrowedItemID]?.fine) || 0,
        finePaid: returnData[i.BorrowedItemID]?.finePaid ? "Yes" : "No"
      }));
      await axios.post(`${API_BASE}/return`, {
        borrowId: returnTx.BorrowID,
        returnDate: new Date().toISOString().slice(0, 10),
        items,
        // include remarks
        remarks: returnRemarks || undefined
      });
      setReturnModalOpen(false);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  const renderReturnModal = () => !returnTx ? null : (
    <Dialog open={returnModalOpen} onClose={() => setReturnModalOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
      <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
        Return Items • Borrow #{returnTx.BorrowID}
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
        {(returnTx.items || []).map(item => {
          const dueRaw = dueDates[returnTx.BorrowID];
          const today = startOfDay(new Date());
          const due = dueRaw ? startOfDay(new Date(dueRaw)) : null;
          const days = due ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
          const autoFine = (days * finePerDay).toFixed(2); // changed
          return (
            <Box key={item.BorrowedItemID} sx={{ p: 1.5, border: `1.5px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 36, height: 36, borderRadius: 1 }}>
                  <Article fontSize="small" />
                </Avatar>
                <Typography fontWeight={700} fontSize={13}>Doc Storage #{item.DocumentStorageID}</Typography>
              </Stack>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Return Condition</InputLabel>
                <Select
                  label="Return Condition"
                  value={returnData[item.BorrowedItemID]?.condition || "Good"}
                  onChange={e => handleReturnChange(item.BorrowedItemID, "condition", e.target.value)}
                >
                  {returnConditions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Fine"
                type="number"
                size="small"
                value={returnData[item.BorrowedItemID]?.fine ?? 0}
                onChange={e => handleReturnChange(item.BorrowedItemID, "fine", e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Auto: {finePerDay.toFixed(2)}/day × {days} day(s) = {autoFine} {/* changed */}
              </Typography>
              <FormControlLabel
                sx={{ m: 0, mt: 0.5 }}
                control={<Checkbox checked={!!returnData[item.BorrowedItemID]?.finePaid}
                  onChange={e => handleReturnChange(item.BorrowedItemID, "finePaid", e.target.checked)} />}
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
          minRows={3}
          fullWidth
        />
      </DialogContent>
      <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
        <Button onClick={() => setReturnModalOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 1 }}>Cancel</Button>
        <Button onClick={submitReturn} variant="contained" size="small" disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
          {actionLoading ? "Processing..." : "Submit Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box p={3} sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={0} sx={{ mb: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center', border: `2px solid ${theme.palette.divider}`, borderRadius: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={.5}>Document Approval</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Approve, reject, and manage document borrowings</Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search borrower / purpose / dates / ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: { xs: '100%', sm: 340, md: 400 }, ml: { xs: 0, md: 'auto' }, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
        />
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchTransactions} sx={{ borderRadius: 1, border: `1.5px solid ${theme.palette.divider}` }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        {summary.map(s => (
          <Paper key={s.label} elevation={0}
            sx={{ px: 1.5, py: 1, minWidth: 120, border: `1.5px solid ${alpha(s.color, .5)}`, bgcolor: alpha(s.color, .08), borderRadius: 1 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: .4 }}>{s.label}</Typography>
            <Typography fontWeight={800} fontSize={18} lineHeight={1}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {loading ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `2px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          <CircularProgress /><Typography mt={2} variant="caption" color="text.secondary" fontWeight={600}>Loading…</Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ border: `2px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '68vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, bgcolor: theme.palette.background.default, borderBottom: `2px solid ${theme.palette.divider}` } }}>
                  <TableCell width={140}>Status</TableCell>
                  <TableCell width={105}>Borrow Date</TableCell>
                  <TableCell width={105}>Due Date</TableCell>
                  <TableCell>Borrower</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell width={260} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr:hover': { backgroundColor: theme.palette.action.hover }, '& td': { borderBottom: `1px solid ${theme.palette.divider}` } }}>
                {rows.map(tx => {
                  const due = dueDates[tx.BorrowID];
                  const s = statusMap[tx.BorrowID] || { label: "Unknown", color: "default" };
                  const digitalOnly = isDigitalOnlyTx(tx); // NEW
                  return (
                    <TableRow key={tx.BorrowID}>
                      <TableCell><StatusChip tx={tx} /></TableCell>
                      <TableCell><Typography fontSize={12} fontWeight={600}>{tx.BorrowDate?.slice(0, 10) || "—"}</Typography></TableCell>
                      <TableCell>
                        <Typography fontSize={12} fontWeight={700} color={s.label.startsWith("Overdue") ? 'error.main' : 'text.primary'}>
                          {due ? due.slice(0, 10) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography fontSize={13} fontWeight={600} noWrap>{getBorrowerInfo(tx.BorrowerID)}</Typography></TableCell>
                      <TableCell><Typography fontSize={12} noWrap maxWidth={180}>{tx.Purpose || '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap">
                          <Tooltip title="View Details">
                            <Button size="small" variant="outlined" startIcon={<Visibility />}
                              onClick={() => { setSelectedTx(tx); setModalOpen(true); }} sx={{ borderRadius: 0.75, fontWeight: 600 }}>
                              View
                            </Button>
                          </Tooltip>

                          {/* Pending: allow Approve/Reject (digital or physical) */}
                          {tx.ApprovalStatus === "Pending" && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton size="small" color="success" onClick={() => openApprove(tx)}
                                  sx={{ border: `1px solid ${alpha(theme.palette.success.main, .5)}`, borderRadius: 0.75 }}>
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" color="error" onClick={() => rejectTx(tx)}
                                  sx={{ border: `1px solid ${alpha(theme.palette.error.main, .5)}`, borderRadius: 0.75 }}>
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                          {/* Digital-only: no retrieval/return actions */}
                          {!digitalOnly && tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved" && (
                            <Tooltip title="Mark Retrieved">
                              <Button size="small" variant="contained" onClick={() => markRetrieved(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}>
                                Retrieved
                              </Button>
                            </Tooltip>
                          )}

                          {!digitalOnly && tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned" && (
                            <Tooltip title="Return Items">
                              <Button size="small" color="secondary" variant="contained" onClick={() => openReturnModal(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}>
                                Return
                              </Button>
                            </Tooltip>
                          )}

                          {tx.ReturnStatus === "Returned" && !digitalOnly && (
                            <Chip size="small" label="Completed" color="success" icon={<DoneAll fontSize="small" />}
                              sx={{ borderRadius: 0.75, fontWeight: 600 }} />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!rows.length && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No document transactions found{search ? " for this search." : "."}</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {renderTxModal()}
      {renderReturnModal()}

      {/* Approve dialog for digital-only */}
      <Dialog open={approveDlgOpen} onClose={() => setApproveDlgOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          Approve Digital Borrow
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Set an expiration date for this digital transaction.
          </Typography>
          <TextField
            label="Expiration (Due) Date"
            type="date"
            size="small"
            value={approveDue}
            onChange={e => setApproveDue(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setApproveDlgOpen(false)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" size="small" onClick={confirmApprove} disabled={actionLoading || !approveDue} sx={{ borderRadius: 1, fontWeight: 700 }}>
            {actionLoading ? "Saving…" : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentApprovalPage;