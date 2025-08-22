import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Paper, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel, CircularProgress
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Search, Refresh, Visibility, CheckCircle, Cancel, TaskAlt, Undo, DoneAll, Article
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;
const returnConditions = ["Good", "Slightly Damaged", "Heavily Damaged", "Lost"];

const DocumentApprovalPage = () => {
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [docDetails, setDocDetails] = useState({});
  const [dueDates, setDueDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTx, setReturnTx] = useState(null);
  const [returnData, setReturnData] = useState({});

  useEffect(() => { fetchTransactions(); fetchBorrowers(); }, []);

  const fetchBorrowers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/borrowers`);
      setBorrowers(res.data || []);
    } catch {
      try {
        const res = await axios.get(`${API_BASE}/users?type=borrower`);
        setBorrowers(res.data || []);
      } catch {
        setBorrowers([]);
      }
    }
  };

  const getBorrowerInfo = (userId) => {
    const b = borrowers.find(x => x.UserID === userId || x.BorrowerID === userId);
    if (!b) return String(userId || "");
    const first = b.Firstname || "";
    const mid = b.Middlename ? ` ${b.Middlename[0]}.` : "";
    const last = b.Lastname || "";
    return `${first}${mid} ${last}`.trim();
  };

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

  // Due dates
  useEffect(() => {
    (async () => {
      if (!transactions.length) return;
      const map = {};
      await Promise.all(transactions.map(async (tx) => {
        try {
          const r = await axios.get(`${API_BASE}/borrow/${tx.BorrowID}/due-date`);
          map[tx.BorrowID] = r.data?.DueDate || null;
        } catch { map[tx.BorrowID] = tx.ReturnDate || null; }
      }));
      setDueDates(map);
    })();
  }, [transactions]);

  // Load document metadata (by storage IDs)
  useEffect(() => {
    (async () => {
      if (!transactions.length) return;
      const storageIds = [...new Set(transactions.flatMap(tx => (tx.items || [])
        .filter(i => i.ItemType === "Document" && i.DocumentStorageID).map(i => i.DocumentStorageID)))];
      const info = {};
      for (const storageId of storageIds) {
        try {
          const inv = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          const invRow = Array.isArray(inv.data) ? inv.data[0] : inv.data;
          const doc = await axios.get(`${API_BASE}/documents/${invRow?.Document_ID || storageId}`);
          if (doc.data?.Title) info[storageId] = { ...doc.data, ...invRow };
        } catch { /* ignore */ }
      }
      setDocDetails(info);
    })();
  }, [transactions]);

  // Status helpers
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
        sx={{ fontWeight: 700, borderRadius: 0.75, fontSize: 11 }}
      />
    );
  };

  // Actions (admin role)
  const approveTx = async (tx) => {
    setActionLoading(true);
    try {
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

  // Return modal
  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const data = {};
    (tx.items || []).forEach(i => { data[i.BorrowedItemID] = { condition: "Good", fine: 0, finePaid: false }; });
    setReturnData(data);
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
        items
      });
      setReturnModalOpen(false);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // Search/filter/sort
  const filtered = transactions.filter(tx => {
    const borrower = getBorrowerInfo(tx.BorrowerID) || "";
    const q = search.toLowerCase();
    return (
      borrower.toLowerCase().includes(q) ||
      (tx.Purpose || "").toLowerCase().includes(q) ||
      (tx.BorrowDate || "").toLowerCase().includes(q) ||
      (dueDates[tx.BorrowID] || "").toLowerCase().includes(q) ||
      String(tx.BorrowID).includes(q)
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
  const rows = [...filtered].sort((a, b) => statusPriority(a) - statusPriority(b));

  const summary = [
    { label: "Pending", value: transactions.filter(t => deriveStatus(t).label === "Pending Approval").length, color: theme.palette.warning.main },
    { label: "Approved", value: transactions.filter(t => deriveStatus(t).label === "Approved").length, color: theme.palette.info.main },
    { label: "Borrowed", value: transactions.filter(t => deriveStatus(t).label === "Borrowed").length, color: theme.palette.secondary.main },
    { label: "Overdue", value: transactions.filter(t => deriveStatus(t).label.startsWith("Overdue")).length, color: theme.palette.error.main },
    { label: "Returned", value: transactions.filter(t => deriveStatus(t).label === "Returned").length, color: theme.palette.success.main }
  ];

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

  // Detail modal
  const renderTxModal = () => {
    if (!selectedTx) return null;
    const dueDate = dueDates[selectedTx.BorrowID];
    const borrowerInfo = getBorrowerInfo(selectedTx.BorrowerID);
    const items = selectedTx.items || [];
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
            <InfoBlock label="Borrow Date" value={selectedTx.BorrowDate?.slice(0, 10) || "—"} />
            <InfoBlock label="Due Date" value={dueDate ? dueDate.slice(0, 10) : "—"} />
            <InfoBlock label="Status" value={<StatusChip tx={selectedTx} />} />
          </Box>
          <Box sx={{ p: 1.5, border: `1.5px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography fontWeight={800} fontSize={13} mb={1}>Items ({items.length})</Typography>
            <Stack spacing={1.25}>
              {items.map(item => (
                <Box key={item.BorrowedItemID} sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.default' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 34, height: 34, borderRadius: 1 }}>
                      <Article fontSize="small" />
                    </Avatar>
                    <Chip size="small" color="secondary" label={`Doc Storage #${item.DocumentStorageID}`} sx={{ fontWeight: 600, borderRadius: 0.75 }} />
                  </Stack>
                  {docDetails[item.DocumentStorageID] && (
                    <Box mt={1} ml={0.5}>
                      <MetaLine data={[
                        ["Title", docDetails[item.DocumentStorageID].Title],
                        ["Author", docDetails[item.DocumentStorageID].Author],
                        ["Category", docDetails[item.DocumentStorageID].Category],
                        ["Department", docDetails[item.DocumentStorageID].Department],
                        ["Year", docDetails[item.DocumentStorageID].Year]
                      ]} />
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          {selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button onClick={() => approveTx(selectedTx)} variant="contained" size="small" color="success"
                startIcon={<CheckCircle />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Approve
              </Button>
              <Button onClick={() => rejectTx(selectedTx)} variant="outlined" size="small" color="error"
                startIcon={<Cancel />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Reject
              </Button>
            </>
          )}
          {selectedTx.ApprovalStatus === "Approved" && selectedTx.RetrievalStatus !== "Retrieved" && (
            <Button onClick={() => markRetrieved(selectedTx)} variant="contained" size="small" color="primary"
              startIcon={<TaskAlt />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Mark Retrieved
            </Button>
          )}
          {selectedTx.RetrievalStatus === "Retrieved" && selectedTx.ReturnStatus !== "Returned" && (
            <Button onClick={() => openReturnModal(selectedTx)} variant="contained" size="small" color="secondary"
              startIcon={<Undo />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Return
            </Button>
          )}
          {selectedTx.ReturnStatus === "Returned" && (
            <Chip label="Completed" color="success" size="small" icon={<DoneAll />} sx={{ borderRadius: 0.75, fontWeight: 700 }} />
          )}
          <Button onClick={() => setModalOpen(false)} variant="text" size="small" sx={{ ml: 'auto', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderReturnModal = () => !returnTx ? null : (
    <Dialog open={returnModalOpen} onClose={() => setReturnModalOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
      <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
        Return Items • Borrow #{returnTx.BorrowID}
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
        {(returnTx.items || []).map(item => (
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
              value={returnData[item.BorrowedItemID]?.fine || 0}
              onChange={e => handleReturnChange(item.BorrowedItemID, "fine", e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              sx={{ mt: 1 }}
            />
            <FormControlLabel
              sx={{ m: 0, mt: 0.5 }}
              control={<Checkbox checked={!!returnData[item.BorrowedItemID]?.finePaid}
                onChange={e => handleReturnChange(item.BorrowedItemID, "finePaid", e.target.checked)} />}
              label="Fine Paid"
            />
          </Box>
        ))}
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
                  return (
                    <TableRow key={tx.BorrowID}>
                      <TableCell><StatusChip tx={tx} /></TableCell>
                      <TableCell><Typography fontSize={12} fontWeight={600}>{tx.BorrowDate?.slice(0, 10) || "—"}</Typography></TableCell>
                      <TableCell>
                        <Typography fontSize={12} fontWeight={700} color={deriveStatus(tx).label.startsWith("Overdue") ? 'error.main' : 'text.primary'}>
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

                          {tx.ApprovalStatus === "Pending" && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton size="small" color="success" onClick={() => approveTx(tx)}
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

                          {tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved" && (
                            <Tooltip title="Mark Retrieved">
                              <Button size="small" variant="contained" onClick={() => markRetrieved(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}>
                                Retrieved
                              </Button>
                            </Tooltip>
                          )}

                          {tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned" && (
                            <Tooltip title="Return Items">
                              <Button size="small" color="secondary" variant="contained" onClick={() => openReturnModal(tx)}
                                sx={{ borderRadius: 0.75, fontWeight: 700 }}>
                                Return
                              </Button>
                            </Tooltip>
                          )}

                          {tx.ReturnStatus === "Returned" && (
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
    </Box>
  );
};

export default DocumentApprovalPage;