import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useSystemSettings } from "../../../contexts/SystemSettingsContext.jsx"; // added
import {
  Article,
  AssignmentLate,
  CheckCircle,
  Cancel,
  CloudDone,
  DoneAll,
  FilterAlt,
  Inbox,
  PendingActions,
  Refresh,
  ReportProblem,
  Search,
  TaskAlt,
  Undo,
  Visibility
} from "@mui/icons-material";
import { formatDate } from "../../../utils/date";
import { logAudit } from "../../../utils/auditLogger.js"; // NEW

const API_BASE = import.meta.env.VITE_API_BASE;
// Lost is controlled exclusively by the Lost checkbox, not as a condition option
const returnConditions = ['Good', 'Fair', 'Average', 'Poor', 'Bad'];
// const FINE_PER_DAY = parseFloat(import.meta.env.VITE_FINE) || 0; // remove this line
const statusFilterOptions = [
  { label: "All", codes: [] },
  { label: "Pending Approval", codes: ["pending"] },
  { label: "Awaiting Retrieval", codes: ["awaiting-pickup", "awaiting-pickup-overdue"] },
  { label: "Borrowed", codes: ["borrowed"] },
  { label: "Due Soon", codes: ["due-soon"] },
  { label: "Due Today", codes: ["due-today"] },
  { label: "Overdue", codes: ["overdue", "awaiting-pickup-overdue"] },
  { label: "Expired", codes: ["expired"] },
  { label: "Active (Digital)", codes: ["digital-active"] },
  { label: "Returned", codes: ["returned"] },
  { label: "Rejected", codes: ["rejected"] },
  { label: "Lost", codes: ["lost"] }
];

const formatFilterOptions = [
  { value: "all", label: "All formats" },
  { value: "digital", label: "Digital only" },
  { value: "physical", label: "Physical only" },
  { value: "mixed", label: "Mixed" }
];

const timeFilterOptions = [
  { value: "all", label: "Any due date" },
  { value: "due-today", label: "Due today" },
  { value: "due-soon", label: "Due in 3 days" },
  { value: "overdue", label: "Overdue" },
  { value: "expired", label: "Expired (Digital)" }
];

const DUE_SOON_DAYS = 3;
const DIGITAL_DUE_PRESETS = [1, 3, 7, 14];

const getDocumentId = (obj) => obj?.Document_ID ?? obj?.DocumentID ?? obj?.documentId ?? obj?.DocumentId;
const isDigitalDocItem = (item) => item.ItemType === "Document" && !item.DocumentStorageID;
const hasAnyPhysical = (tx) => (tx?.items || []).some(item =>
  item.ItemType === "Book" || (item.ItemType === "Document" && !!item.DocumentStorageID)
);
const hasAnyDigital = (tx) => (tx?.items || []).some(item => item.ItemType === "Document" && !item.DocumentStorageID);
const isDigitalOnlyTx = (tx) => {
  const items = tx?.items || [];
  return items.length > 0 && items.every(item => item.ItemType === "Document" && !item.DocumentStorageID);
};
const getTxFormat = (tx) => {
  const items = tx?.items || [];
  if (!items.length) return "unknown";
  const digital = hasAnyDigital(tx);
  const physical = hasAnyPhysical(tx);
  if (digital && physical) return "mixed";
  if (digital) return "digital";
  if (physical) return "physical";
  return "unknown";
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const getDueMeta = (dueRaw) => {
  if (!dueRaw) {
    return { isDueToday: false, isDueSoon: false, isOverdue: false, dueTime: null };
  }
  const todayStart = startOfDay(new Date());
  const dueTime = startOfDay(new Date(dueRaw));
  const dueSoonThreshold = startOfDay(addDays(new Date(), DUE_SOON_DAYS));
  return {
    dueTime,
    isDueToday: dueTime === todayStart,
    isDueSoon: dueTime > todayStart && dueTime <= dueSoonThreshold,
    isOverdue: dueTime < todayStart
  };
};
const describeDue = (meta) => {
  if (!meta?.dueTime) return "—";
  const todayStart = startOfDay(new Date());
  const diffDays = Math.round((meta.dueTime - todayStart) / 86400000);
  if (meta.isOverdue) {
    const days = Math.abs(diffDays);
    return days ? `${days} day${days === 1 ? "" : "s"} overdue` : "Overdue";
  }
  if (meta.isDueToday) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays > 1) return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  return "On schedule";
};

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
  const [statusFilter, setStatusFilter] = useState("All"); // NEW: status filter
  const [formatFilter, setFormatFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTx, setReturnTx] = useState(null);
  const [returnData, setReturnData] = useState({});
  // NEW: remarks for return
  const [returnRemarks, setReturnRemarks] = useState("");
  // NEW: lost handling state
  // Row-level lost removed; use per-item lost inside the return modal only
  // Ensure lost flow auxiliary states exist for markLost
  const [lostRemarks, setLostRemarks] = useState("");
  const [lostSubmitting, setLostSubmitting] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostTarget, setLostTarget] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: null, tx: null });

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

  // Prefetch borrower names for visible transactions
  useEffect(() => {
    if (!transactions.length) return;
    const uniqueBorrowerIds = [...new Set(transactions.map(tx => tx.BorrowerID).filter(Boolean))];
    const missing = uniqueBorrowerIds.filter(id => !borrowerNameById[id]);
    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      const next = {};
      for (const id of missing) {
        try {
          const res = await axios.get(`${API_BASE}/users/borrower/${id}`);
          const data = res.data || {};
          const first = (data.Firstname || "").trim();
          const middle = (data.Middlename || "").trim();
          const last = (data.Lastname || "").trim();
          const middleInitial = middle ? ` ${middle[0]}.` : "";
          const name = `${first}${middleInitial} ${last}`.trim() || data.Username || `Borrower #${id}`;
          next[id] = name;
        } catch {
          // ignore errors; fallback to ID label
        }
      }
      if (!cancelled && Object.keys(next).length) {
        setBorrowerNameById(prev => ({ ...prev, ...next }));
      }
    })();

    return () => { cancelled = true; };
  }, [transactions, borrowerNameById]);

  // Map transactions to due dates (ReturnDate or DueDate fields)
  useEffect(() => {
    if (!transactions.length) {
      setDueDates({});
      return;
    }
    const map = {};
    transactions.forEach(tx => {
      map[tx.BorrowID] = tx.DueDate || tx.ReturnDate || tx.ExpectedReturnDate || null;
    });
    setDueDates(map);
  }, [transactions]);

  // Fetch document metadata for physical copies and digital items
  useEffect(() => {
    if (!transactions.length) {
      setDocDetails({});
      setDocMetaById({});
      return;
    }

    let cancelled = false;
    (async () => {
      let docStorageIds = [];
      let docIds = [];
      transactions.forEach(tx => (tx.items || []).forEach(item => {
        if (item.ItemType === "Document" && item.DocumentStorageID) {
          docStorageIds.push(item.DocumentStorageID);
        }
        if (item.ItemType === "Document" && !item.DocumentStorageID) {
          const did = getDocumentId(item);
          if (did) docIds.push(did);
        }
      }));

      docStorageIds = [...new Set(docStorageIds)];
      docIds = [...new Set(docIds)];

      const storageMap = {};
      for (const storageId of docStorageIds) {
        try {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          const docRes = await axios.get(`${API_BASE}/documents/${invData?.Document_ID || storageId}`);
          if (docRes.data?.Title) {
            storageMap[storageId] = { ...docRes.data, ...invData };
          }
        } catch {
          // ignore
        }
      }

      const digitalMap = {};
      for (const docId of docIds) {
        try {
          const docRes = await axios.get(`${API_BASE}/documents/${docId}`);
          if (docRes.data?.Title) {
            digitalMap[docId] = docRes.data;
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setDocDetails(Object.keys(storageMap).length ? storageMap : {});
        setDocMetaById(Object.keys(digitalMap).length ? digitalMap : {});
      }
    })();

    return () => { cancelled = true; };
  }, [transactions]);

  const renderTxModal = () => {
    if (!selectedTx) return null;
    const dueDate = dueDates[selectedTx.BorrowID];
    const borrowerInfo = getBorrowerInfo(selectedTx.BorrowerID);
    const items = selectedTx.items || [];
    const digitalOnly = isDigitalOnlyTx(selectedTx);
    const status = statusMap[selectedTx.BorrowID];
    const meta = status?.meta || getDueMeta(dueDate);
    const dueDescriptor = describeDue(meta);
    const format = getTxFormat(selectedTx);
    const formatLabelMap = {
      digital: "Digital access",
      physical: "Physical copies",
      mixed: "Hybrid request",
      unknown: "Unspecified"
    };
    const formatColorMap = {
      digital: "info",
      physical: "primary",
      mixed: "secondary"
    };
    const formatChipColor = formatColorMap[format];
    const dueChipColor = meta.isOverdue ? "error" : (meta.isDueSoon || meta.isDueToday) ? "warning" : "default";
    const physicalItems = items.filter(i => i.ItemType === 'Document' && i.DocumentStorageID);
    const canMarkLost = !digitalOnly && selectedTx.RetrievalStatus === "Retrieved" && selectedTx.ReturnStatus !== "Returned" && physicalItems.length > 0;
    return (
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Transaction #{selectedTx.BorrowID}</Typography>
              <Typography variant="h6" fontWeight={800}>Borrow summary</Typography>
            </Box>
            <StatusChip tx={selectedTx} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: 'background.default' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Borrower</Typography>
                  <Typography variant="body1" fontWeight={700}>{borrowerInfo || '—'}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {formatChipColor && (
                      <Chip size="small" color={formatChipColor} label={formatLabelMap[format]} sx={{ borderRadius: 1, fontWeight: 600 }} />
                    )}
                    <Chip size="small" variant="outlined" label={`${items.length} item${items.length === 1 ? '' : 's'}`} sx={{ borderRadius: 1, fontWeight: 600 }} />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Timeline</Typography>
                  <Typography variant="body2" fontWeight={700}>Borrowed {selectedTx.BorrowDate ? formatDate(selectedTx.BorrowDate) : '—'}</Typography>
                  <Typography variant="body2" fontWeight={700}>{digitalOnly ? 'Expires' : 'Due'} {dueDate ? formatDate(dueDate) : '—'}</Typography>
                  {dueDescriptor !== '—' && (
                    <Chip
                      size="small"
                      label={dueDescriptor}
                      color={dueChipColor === 'default' ? undefined : dueChipColor}
                      sx={{ borderRadius: 1, fontWeight: 600, alignSelf: 'flex-start' }}
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Purpose</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedTx.Purpose || '—'}</Typography>
              </Paper>
            </Grid>
            {selectedTx.Remarks && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Transaction remarks</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{selectedTx.Remarks}</Typography>
                </Paper>
              </Grid>
            )}
            {selectedTx.ReturnRemarks && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Return remarks</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{selectedTx.ReturnRemarks}</Typography>
                </Paper>
              </Grid>
            )}
            {digitalOnly && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.light, 0.08), borderColor: alpha(theme.palette.info.main, 0.4) }}>
                  <Typography variant="body2" fontWeight={600}>Digital access</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Borrower can view the digital document until {dueDate ? formatDate(dueDate) : 'the configured expiry'}. Access is automatically revoked after expiration.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          <Box sx={{ p: 1.5, border: `1.5px solid ${theme.palette.divider}`, borderRadius: 1.5, bgcolor: 'background.paper' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography fontWeight={800} fontSize={13}>Items ({items.length})</Typography>
              <Stack direction="row" spacing={1}>
                {physicalItems.length > 0 && (
                  <Chip size="small" variant="outlined" label={`${physicalItems.length} physical`} sx={{ borderRadius: 1, fontWeight: 500 }} />
                )}
                {items.length - physicalItems.length > 0 && (
                  <Chip size="small" variant="outlined" label={`${items.length - physicalItems.length} digital`} sx={{ borderRadius: 1, fontWeight: 500 }} />
                )}
              </Stack>
            </Stack>
            <Stack spacing={1.25}>
              {items.map(item => {
                const isDigital = isDigitalDocItem(item);
                const did = isDigital ? getDocumentId(item) : null;
                const metaInfo = isDigital
                  ? (did && docMetaById[did])
                  : (item.DocumentStorageID && docDetails[item.DocumentStorageID]);
                return (
                  <Paper key={item.BorrowedItemID} variant="outlined" sx={{ p: 1.25, borderRadius: 1.25, bgcolor: 'background.default' }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
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
                    {metaInfo && (
                      <Box mt={1} ml={0.5}>
                        <MetaLine data={[
                          ["Title", metaInfo.Title],
                          ["Author", metaInfo.Author],
                          ["Category", metaInfo.Category],
                          ["Department", metaInfo.Department],
                          ["Year", metaInfo.Year]
                        ]} />
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1, flexWrap: 'wrap', gap: 1 }}>
          {selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button onClick={() => openApprove(selectedTx)} variant="contained" size="small" color="success"
                startIcon={<CheckCircle />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Approve
              </Button>
              <Button onClick={() => openRejectDialog(selectedTx)} variant="outlined" size="small" color="error"
                startIcon={<Cancel />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Reject
              </Button>
            </>
          )}
          {!digitalOnly && selectedTx.ApprovalStatus === "Approved" && selectedTx.RetrievalStatus !== "Retrieved" && (
            <Button onClick={() => openConfirmAction('retrieved', selectedTx)} variant="contained" size="small" color="primary"
              startIcon={<TaskAlt />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Mark Retrieved
            </Button>
          )}
          {!digitalOnly && selectedTx.RetrievalStatus === "Retrieved" && selectedTx.ReturnStatus !== "Returned" && (
            <>
              <Button onClick={() => openReturnModal(selectedTx)} variant="contained" size="small" color="secondary"
                startIcon={<Undo />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Return
              </Button>
              {canMarkLost && (
                <Button onClick={() => openLostDialog(selectedTx)} variant="outlined" size="small" color="error"
                  startIcon={<ReportProblem fontSize="small" />} disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
                  Mark lost
                </Button>
              )}
            </>
          )}
          {selectedTx.ReturnStatus === "Returned" && !digitalOnly && (
            <Chip label="Completed" color="success" size="small" icon={<DoneAll />} sx={{ borderRadius: 0.75, fontWeight: 700 }} />
          )}
          <Button onClick={() => setModalOpen(false)} variant="text" size="small" sx={{ ml: 'auto', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Simplified: use cache or fallback label
  const getBorrowerInfo = useCallback((borrowerId) => {
    if (!borrowerId) return String(borrowerId || "");
    return borrowerNameById[borrowerId];
  }, [borrowerNameById]);

  // Compute status once per transaction (with digital semantics)
  const deriveStatus = (tx, due) => {
    const meta = getDueMeta(due);
    const approval = (tx.ApprovalStatus || "").trim();
    const retrieval = (tx.RetrievalStatus || "").trim();
    const returnStatus = (tx.ReturnStatus || "").trim();
    const digitalOnly = isDigitalOnlyTx(tx);
    const hasLostItems = (tx.items || []).some(item => {
      const status = (item.Status || item.ReturnCondition || item.Condition || "").toLowerCase();
      const lostFlag = (item.LostStatus || "").toLowerCase();
      return status === "lost" || lostFlag === "lost";
    }) || returnStatus.toLowerCase() === "lost";

    if (hasLostItems) {
      return { label: "Lost", color: "error", code: "lost", meta };
    }

    if (approval === "Rejected") {
      return { label: "Rejected", color: "error", code: "rejected", meta };
    }

    if (approval === "Cancelled") {
      return { label: "Cancelled", color: "default", code: "cancelled", meta };
    }

    if (returnStatus === "Returned") {
      if (digitalOnly) {
        return { label: "Expired", color: "error", code: "expired", meta };
      }
      return { label: "Returned", color: "success", code: "returned", meta };
    }

    if (digitalOnly) {
      if (approval === "Pending") {
        return { label: "Pending Approval", color: "warning", code: "pending", meta };
      }
      if (approval === "Approved") {
        if (meta.isOverdue) {
          return { label: "Expired", color: "error", code: "expired", meta };
        }
        if (meta.isDueToday) {
          return { label: "Expires Today", color: "warning", code: "due-today", meta };
        }
        if (meta.isDueSoon) {
          return { label: "Expiring Soon", color: "warning", code: "due-soon", meta };
        }
        return { label: "Active (Digital)", color: "info", code: "digital-active", meta };
      }
      return { label: approval || "Unknown", color: "default", code: "unknown", meta };
    }

    if (approval === "Pending") {
      return { label: "Pending Approval", color: "warning", code: "pending", meta };
    }

    if (approval === "Approved" && retrieval !== "Retrieved") {
      if (meta.isOverdue) {
        return { label: "Overdue (Awaiting Pickup)", color: "error", code: "awaiting-pickup-overdue", meta };
      }
      return { label: "Awaiting Retrieval", color: "info", code: "awaiting-pickup", meta };
    }

    if (retrieval === "Retrieved" && returnStatus !== "Returned") {
      if (meta.isOverdue) {
        return { label: "Overdue", color: "error", code: "overdue", meta };
      }
      if (meta.isDueToday) {
        return { label: "Due Today", color: "warning", code: "due-today", meta };
      }
      if (meta.isDueSoon) {
        return { label: "Due Soon", color: "warning", code: "due-soon", meta };
      }
      return { label: "Borrowed", color: "secondary", code: "borrowed", meta };
    }

    return { label: approval || "Unknown", color: "default", code: "unknown", meta };
  };

  const statusMap = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      map[tx.BorrowID] = deriveStatus(tx, dueDates[tx.BorrowID]);
    }
    return map;
  }, [transactions, dueDates]);

  const StatusChip = ({ tx }) => {
    const status = statusMap[tx.BorrowID] || { label: "Unknown", color: "default", code: "unknown" };
    const dueRaw = dueDates[tx.BorrowID];
    const dueText = dueRaw ? formatDate(dueRaw) : "No due date";
    const tooltipLabel = (() => {
      if (status.code === "lost") return "Items in this transaction were reported lost.";
      if (status.code === "pending") return "Awaiting librarian approval.";
      if (status.code === "awaiting-pickup" || status.code === "awaiting-pickup-overdue") return "Approved and ready for borrower pickup.";
      if (status.code === "digital-active") return dueRaw ? `Digital access active until ${dueText}.` : "Digital access active.";
      if (status.code === "due-today") return `Due on ${dueText}.`;
      if (status.code === "due-soon") return `Due soon on ${dueText}.`;
      if (status.code === "overdue" || status.code === "awaiting-pickup-overdue") return dueRaw ? `Overdue since ${dueText}.` : "Overdue.";
      if (status.code === "expired") return dueRaw ? `Digital access expired on ${dueText}.` : "Digital access expired.";
      return status.label;
    })();
    return (
      <Tooltip title={tooltipLabel} arrow>
        <Chip
          size="small"
          label={status.label}
          color={status.color === "default" ? undefined : status.color}
          sx={{ fontWeight: 700, borderRadius: 0.75, fontSize: 11 }}
        />
      </Tooltip>
    );
  };

  const FormatChip = ({ tx }) => {
    const format = getTxFormat(tx);
    const formatMap = {
      digital: { label: "Digital", color: "info" },
      physical: { label: "Physical", color: "primary" },
      mixed: { label: "Mixed", color: "secondary" }
    };
    const config = formatMap[format];
    if (!config) return null;
    return (
      <Chip
        size="small"
        variant="outlined"
        label={config.label}
        color={config.color}
        sx={{ borderRadius: 0.75, fontWeight: 600 }}
      />
    );
  };

  const filtersActive = statusFilter !== "All" || formatFilter !== "all" || timeFilter !== "all" || !!search.trim();
  const resetFilters = () => {
    setStatusFilter("All");
    setFormatFilter("all");
    setTimeFilter("all");
    setSearch("");
  };

  const renderEmptyState = () => (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main, width: 56, height: 56 }}>
        <Inbox />
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700} textAlign="center">
        {filtersActive ? "No transactions match the current filters" : "No document transactions yet"}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
        {filtersActive ? "Try adjusting your filters or refreshing to see the latest activity." : "Approvals, loans, and returns will appear here once borrowers submit requests."}
      </Typography>
    </Stack>
  );

  // Actions (admin role)
  // Approve dialog for digital-only: pick expiration/due date
  const [approveDlgOpen, setApproveDlgOpen] = useState(false);
  const [approveDue, setApproveDue] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);
  // Quick approve options removed per request

  const openConfirmAction = (action, tx) => {
    if (!tx) return;
    setConfirmState({ open: true, action, tx });
  };

  const closeConfirmAction = () => {
    if (actionLoading) return;
    setConfirmState({ open: false, action: null, tx: null });
  };

  const openApprove = (tx) => {
    if (isDigitalOnlyTx(tx)) {
      setApproveTarget(tx);
      setApproveDue((dueDates[tx.BorrowID] || "").slice(0, 10));
      setApproveDlgOpen(true);
    } else {
      openConfirmAction('approve-physical', tx);
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    if (approveDue && approveDue < todayIso) {
      setApproveDue(todayIso);
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${approveTarget.BorrowID}/approve?role=admin`, approveDue ? {
        returnDate: approveDue
      } : {});
      logAudit('BORROW_APPROVE', 'Borrow', approveTarget.BorrowID, { role: 'admin', mode: 'digital', due: approveDue }); // NEW
      setApproveDlgOpen(false);
      setApproveTarget(null);
      setApproveDue("");
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // Removed quick approve (+days) functionality

  const approveTx = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve?role=admin`);
      logAudit('BORROW_APPROVE', 'Borrow', tx.BorrowID, { role: 'admin', mode: 'physical/mixed' }); // NEW
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };
  const rejectTx = async (tx, remarksText = "") => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/reject?role=admin`, {
        remarks: remarksText || undefined
      });
      logAudit('BORROW_REJECT', 'Borrow', tx.BorrowID, { role: 'admin', remarks: remarksText || undefined }); // NEW
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  const openRejectDialog = (tx) => {
    if (!tx) return;
    setRejectTarget(tx);
    setRejectRemarks("");
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = () => {
    if (actionLoading) return;
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectRemarks("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const remarksValue = rejectRemarks.trim();
    if (!remarksValue) return;
    await rejectTx(rejectTarget, remarksValue);
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectRemarks("");
  };
  const markRetrieved = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/retrieved?role=admin`);
      logAudit('BORROW_RETRIEVE', 'Borrow', tx.BorrowID, { role: 'admin' }); // NEW
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  const handleConfirmAction = async () => {
    if (!confirmState.tx) return;
    const target = confirmState.tx;
    try {
      switch (confirmState.action) {
        case 'approve-physical':
          await approveTx(target);
          break;
        case 'retrieved':
          await markRetrieved(target);
          break;
        default:
          break;
      }
    } finally {
      setConfirmState({ open: false, action: null, tx: null });
    }
  };

  // Add: search-based filter
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const statusDef = statusFilterOptions.find(opt => opt.label === statusFilter);
    const selectedStatusCodes = statusDef?.codes || [];
    const bySearch = (tx) => {
      const borrower = (getBorrowerInfo(tx.BorrowerID) || "").toLowerCase();
      const purpose = (tx.Purpose || "").toLowerCase();
      const idStr = String(tx.BorrowID || "");
      const borrowDate = (tx.BorrowDate || "").toLowerCase();
      const due = (dueDates[tx.BorrowID] || "").toLowerCase();
      const statusLabel = (statusMap[tx.BorrowID]?.label || "").toLowerCase();
      if (!q) return true;
      return (
        borrower.includes(q) ||
        purpose.includes(q) ||
        idStr.includes(q) ||
        borrowDate.includes(q) ||
        due.includes(q) ||
        statusLabel.includes(q)
      );
    };
    const byStatus = (tx) => {
      if (!selectedStatusCodes.length) return true;
      const code = statusMap[tx.BorrowID]?.code;
      return code ? selectedStatusCodes.includes(code) : false;
    };
    const byFormat = (tx) => {
      if (formatFilter === "all") return true;
      return getTxFormat(tx) === formatFilter;
    };
    const byDueWindow = (tx) => {
      if (timeFilter === "all") return true;
      const status = statusMap[tx.BorrowID];
      if (!status) return false;
      const meta = status.meta || getDueMeta(dueDates[tx.BorrowID]);
      switch (timeFilter) {
        case "due-today":
          return !!meta.isDueToday;
        case "due-soon":
          return !!meta.isDueSoon;
        case "overdue":
          return !!meta.isOverdue || status.code === "overdue" || status.code === "awaiting-pickup-overdue";
        case "expired":
          return status.code === "expired";
        default:
          return true;
      }
    };
    return transactions.filter(tx => bySearch(tx) && byStatus(tx) && byFormat(tx) && byDueWindow(tx));
  }, [transactions, search, dueDates, statusMap, statusFilter, formatFilter, timeFilter, getBorrowerInfo]);

  // Add: fine helpers used by return modal
  
  const calcFineForBorrow = (borrowId) => {
    const dueRaw = dueDates[borrowId];
    if (!dueRaw) return 0;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueRaw));
    const days = Math.max(0, Math.floor((today - due) / 86400000));
    return days * finePerDay;
  };

  // Search/filter/sort (treat Expired like Overdue)
  const statusPriority = (code) => {
    const priorities = {
      lost: 0,
      overdue: 1,
      "awaiting-pickup-overdue": 1,
      "due-today": 2,
      "due-soon": 3,
      pending: 4,
      "awaiting-pickup": 5,
      "digital-active": 6,
      borrowed: 7,
      expired: 8,
      returned: 9,
      rejected: 10,
      cancelled: 11,
      unknown: 12
    };
    return code && priorities[code] !== undefined ? priorities[code] : priorities.unknown;
  };
  const rows = useMemo(() => {
    const base = [...filtered].sort((a, b) => {
      const statusA = statusMap[a.BorrowID];
      const statusB = statusMap[b.BorrowID];
      const diff = statusPriority(statusA?.code) - statusPriority(statusB?.code);
      if (diff !== 0) return diff;
      const dueA = statusA?.meta?.dueTime ?? getDueMeta(dueDates[a.BorrowID]).dueTime ?? 0;
      const dueB = statusB?.meta?.dueTime ?? getDueMeta(dueDates[b.BorrowID]).dueTime ?? 0;
      if (dueA && dueB && dueA !== dueB) return dueA - dueB;
      const ta = a.BorrowDate ? new Date(a.BorrowDate).getTime() : 0;
      const tb = b.BorrowDate ? new Date(b.BorrowDate).getTime() : 0;
      if (tb !== ta) return tb - ta; // latest first
      return (b.BorrowID || 0) - (a.BorrowID || 0);
    });
    return base;
  }, [filtered, statusMap, dueDates]);

  const filteredCount = rows.length;
  const approveDueMeta = approveDue ? getDueMeta(approveDue) : null;
  const approveDueDescriptor = approveDueMeta ? describeDue(approveDueMeta) : null;
  const approveDueChipColor = approveDueMeta
    ? approveDueMeta.isOverdue
      ? 'error'
      : (approveDueMeta.isDueSoon || approveDueMeta.isDueToday)
        ? 'warning'
        : 'info'
    : 'info';

  const scenarioTallies = useMemo(() => {
    const tallies = {
      total: transactions.length,
      pending: 0,
      awaitingPickup: 0,
      borrowed: 0,
      dueSoon: 0,
      dueToday: 0,
      overdue: 0,
      returned: 0,
      rejected: 0,
      lost: 0,
      expired: 0,
      digitalActive: 0,
      digitalOnly: 0,
      physicalOnly: 0,
      mixed: 0,
      byCode: {}
    };
    const activeCodes = new Set(["awaiting-pickup", "awaiting-pickup-overdue", "borrowed", "due-soon", "due-today", "digital-active"]);

    transactions.forEach(tx => {
      const status = statusMap[tx.BorrowID];
      if (!status) return;

      const code = status.code || "unknown";
      tallies.byCode[code] = (tallies.byCode[code] || 0) + 1;

      const format = getTxFormat(tx);
      if (format === "digital") tallies.digitalOnly += 1;
      else if (format === "physical") tallies.physicalOnly += 1;
      else if (format === "mixed") tallies.mixed += 1;

      switch (code) {
        case "pending":
          tallies.pending += 1;
          break;
        case "awaiting-pickup":
          tallies.awaitingPickup += 1;
          break;
        case "awaiting-pickup-overdue":
          tallies.awaitingPickup += 1;
          tallies.overdue += 1;
          break;
        case "borrowed":
          tallies.borrowed += 1;
          break;
        case "due-soon":
          tallies.dueSoon += 1;
          break;
        case "due-today":
          tallies.dueToday += 1;
          break;
        case "overdue":
          tallies.overdue += 1;
          break;
        case "expired":
          tallies.expired += 1;
          tallies.overdue += 1;
          break;
        case "digital-active":
          tallies.digitalActive += 1;
          break;
        case "returned":
          tallies.returned += 1;
          break;
        case "rejected":
          tallies.rejected += 1;
          break;
        case "lost":
          tallies.lost += 1;
          break;
        default:
          break;
      }

      if (activeCodes.has(code)) {
        tallies.active = (tallies.active || 0) + 1;
      }
    });

    tallies.active = tallies.active || 0;
    return tallies;
  }, [transactions, statusMap]);

  const MetaLine = ({ data }) => (
    <Stack spacing={0.5} sx={{ fontSize: 12, '& b': { fontWeight: 600 } }}>
  {data.filter(([, v]) => v).map(([k, v]) => (
        <Typography key={k} variant="caption" sx={{ display: 'block' }}>
          <b>{k}:</b> {v}
        </Typography>
      ))}
    </Stack>
  );


  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const baseFine = calcFineForBorrow(tx.BorrowID); // uses context-backed fine
    const data = {};
    (tx.items || []).forEach(i => {
      data[i.BorrowedItemID] = { condition: "Good", fine: baseFine, lost: false };
    });
    setReturnData(data);
    setReturnRemarks("");
    setReturnModalOpen(true);
  };
  const handleReturnChange = (id, field, value) =>
    setReturnData(prev => {
      const nextItem = { ...prev[id], [field]: value };
      if (field === 'lost') {
        if (value) {
          nextItem.condition = 'Lost';
        } else if (nextItem.condition === 'Lost') {
          nextItem.condition = 'Good';
        }
      }
      return { ...prev, [id]: nextItem };
    });
  const submitReturn = async () => {
    if (!returnTx) return;
    setActionLoading(true);
    try {
      const allItems = (returnTx.items || []);
      const lostItems = allItems.filter(i => returnData[i.BorrowedItemID]?.lost);
      const keptItems = allItems.filter(i => !returnData[i.BorrowedItemID]?.lost);

      // First, post lost items to /lost (with fines)
      if (lostItems.length) {
        await axios.post(`${API_BASE}/lost`, {
          borrowId: returnTx.BorrowID,
          items: lostItems.map(i => ({
            borrowedItemId: i.BorrowedItemID,
            fine: parseFloat(returnData[i.BorrowedItemID]?.fine) || 0
          })),
          remarks: returnRemarks || undefined
        });
      }

      // Then, submit remaining returns to /return
      if (keptItems.length) {
        const items = keptItems.map(i => ({
          borrowedItemId: i.BorrowedItemID,
          returnCondition: returnData[i.BorrowedItemID]?.condition || 'Good',
          fine: parseFloat(returnData[i.BorrowedItemID]?.fine) || 0
        }));
        await axios.post(`${API_BASE}/return`, {
          borrowId: returnTx.BorrowID,
          returnDate: new Date().toISOString().slice(0, 10),
          items,
          remarks: returnRemarks || undefined
        });
      }
  // Log after both operations; include summary counts
  const lostCount = lostItems.length;
  const returnedCount = keptItems.length;
  logAudit('BORROW_RETURN', 'Borrow', returnTx.BorrowID, { lostItems: lostCount, returnedItems: returnedCount });
      setReturnModalOpen(false);
      await fetchTransactions();
    } finally { setActionLoading(false); }
  };

  // NEW: mark selected transaction's physical items as Lost
  const markLost = async (tx, remarks = "") => {
    if (!tx) return;
    const items = (tx.items || [])
      .filter(i => i.ItemType === 'Document' && i.DocumentStorageID)
      .map(i => ({ borrowedItemId: i.BorrowedItemID }));
    if (!items.length) return;
    setLostSubmitting(true);
    try {
      await axios.post(`${API_BASE}/lost`, {
        borrowId: tx.BorrowID,
        items,
        remarks: remarks || undefined
      });
      logAudit('BORROW_MARK_LOST', 'Borrow', tx.BorrowID, { items: items.length, remarks: remarks || undefined });
      await fetchTransactions();
    } finally { setLostSubmitting(false); }
  };

  const openLostDialog = (tx) => {
    if (!tx) return;
    setLostTarget(tx);
    setLostRemarks("");
    setLostDialogOpen(true);
  };

  const closeLostDialog = () => {
    if (lostSubmitting) return;
    setLostDialogOpen(false);
    setLostTarget(null);
    setLostRemarks("");
  };

  const handleLostSubmit = async () => {
    if (!lostTarget) return;
    await markLost(lostTarget, lostRemarks);
    closeLostDialog();
  };

  const renderLostDialog = () => {
    if (!lostDialogOpen || !lostTarget) return null;
    const physicalItems = (lostTarget.items || []).filter(i => i.ItemType === 'Document' && i.DocumentStorageID);
    return (
      <Dialog open={lostDialogOpen} onClose={closeLostDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          Mark items as lost • Borrow #{lostTarget.BorrowID}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary">
            This will flag the selected physical copies as lost, applying the appropriate penalties and updating inventory records.
          </Typography>
          <Stack spacing={1.25}>
            {physicalItems.map(item => (
              <Paper key={item.BorrowedItemID} variant="outlined" sx={{ p: 1.25, borderRadius: 1, bgcolor: 'background.paper' }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Avatar sx={{ bgcolor: theme.palette.error.light, color: theme.palette.error.dark, width: 34, height: 34, borderRadius: 1 }}>
                    <Article fontSize="small" />
                  </Avatar>
                  <Chip size="small" label={`Doc Storage #${item.DocumentStorageID}`} sx={{ borderRadius: 0.75, fontWeight: 600 }} />
                  <Typography fontSize={12} color="text.secondary" sx={{ flexGrow: 1 }} noWrap>
                    {docDetails[item.DocumentStorageID]?.Title || 'Untitled document'}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <TextField
            label="Remarks"
            placeholder="Optional context (e.g., borrower explanation, follow-up actions)"
            value={lostRemarks}
            onChange={(e) => setLostRemarks(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          <Button onClick={closeLostDialog} variant="outlined" size="small" sx={{ borderRadius: 1 }} disabled={lostSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleLostSubmit}
            variant="contained"
            color="error"
            size="small"
            startIcon={lostSubmitting ? <CircularProgress size={16} /> : <ReportProblem fontSize="small" />}
            disabled={lostSubmitting}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {lostSubmitting ? 'Marking…' : 'Confirm lost'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderRejectDialog = () => {
    if (!rejectDialogOpen || !rejectTarget) return null;
    const borrowerLabel = getBorrowerInfo(rejectTarget.BorrowerID) || `Borrower #${rejectTarget.BorrowerID || '—'}`;
    return (
      <Dialog open={rejectDialogOpen} onClose={closeRejectDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          Reject request • Borrow #{rejectTarget.BorrowID}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary">
            This note is sent to {borrowerLabel}. Keep it short and specific so the borrower understands the next steps.
          </Typography>
          <TextField
            label="Remarks"
            placeholder="Reason for rejection (required)"
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            multiline
            minRows={3}
            autoFocus
            fullWidth
            sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          <Button onClick={closeRejectDialog} variant="outlined" size="small" sx={{ borderRadius: 1 }} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            size="small"
            color="error"
            disabled={actionLoading || !rejectRemarks.trim()}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {actionLoading ? 'Rejecting…' : 'Reject request'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderActionConfirm = () => {
    if (!confirmState.open || !confirmState.tx) return null;
    const { action, tx } = confirmState;
    const borrowerLabel = getBorrowerInfo(tx.BorrowerID) || `Borrower #${tx.BorrowerID || '—'}`;

    let title = 'Confirm action';
    let description = 'Are you sure you want to continue?';
    let confirmLabel = 'Confirm';
    let confirmColor = 'primary';

    if (action === 'approve-physical') {
      title = 'Approve borrow request';
      description = `Approve this request so ${borrowerLabel} can pick up the physical copies.`;
      confirmLabel = 'Approve';
      confirmColor = 'success';
    } else if (action === 'retrieved') {
      title = 'Mark as retrieved';
      description = `Confirm that ${borrowerLabel} has picked up the items for borrow #${tx.BorrowID}.`;
      confirmLabel = 'Mark retrieved';
      confirmColor = 'primary';
    }

    return (
      <Dialog open={confirmState.open} onClose={closeConfirmAction} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          {title}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          <Button onClick={closeConfirmAction} variant="outlined" size="small" sx={{ borderRadius: 1 }} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            size="small"
            color={confirmColor}
            disabled={actionLoading}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {actionLoading ? 'Working…' : confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderReturnModal = () => {
    if (!returnTx) return null;
    const dueRaw = dueDates[returnTx.BorrowID];
    const dueMeta = getDueMeta(dueRaw);
    const dueDescriptor = describeDue(dueMeta);
    const overdueChipColor = dueMeta.isOverdue ? 'error' : (dueMeta.isDueSoon || dueMeta.isDueToday) ? 'warning' : 'default';
    const totalFine = Object.values(returnData).reduce((sum, v) => sum + (parseFloat(v?.fine) || 0), 0);
    const itemCount = (returnTx.items || []).length;

    return (
      <Dialog open={returnModalOpen} onClose={() => setReturnModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Return items • Borrow #{returnTx.BorrowID}</Typography>
              <Typography variant="h6" fontWeight={800}>Physical return review</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" variant="outlined" label={`${itemCount} item${itemCount === 1 ? '' : 's'}`} sx={{ borderRadius: 1, fontWeight: 600 }} />
              {dueDescriptor !== '—' && (
                <Chip size="small" label={dueDescriptor} color={overdueChipColor === 'default' ? undefined : overdueChipColor}
                  sx={{ borderRadius: 1, fontWeight: 600 }} />
              )}
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: 'background.default' }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.paper' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Set condition</InputLabel>
                <Select
                  label="Set condition"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    setReturnData(prev => {
                      const next = { ...prev };
                      Object.keys(next).forEach(k => { next[k] = { ...next[k], condition: v }; });
                      return next;
                    });
                  }}
                >
                  <MenuItem value=""><em>Choose…</em></MenuItem>
                  {returnConditions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                label="Fine for all"
                inputProps={{ min: 0, step: '0.01' }}
                onChange={(e) => {
                  const v = e.target.value;
                  setReturnData(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => { next[k] = { ...next[k], fine: v }; });
                    return next;
                  });
                }}
                sx={{ maxWidth: 200 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const dueRawInner = dueDates[returnTx.BorrowID];
                  const today = startOfDay(new Date());
                  const due = dueRawInner ? startOfDay(new Date(dueRawInner)) : null;
                  const days = due ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
                  const autoFine = (days * finePerDay).toFixed(2);
                  setReturnData(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => { next[k] = { ...next[k], fine: autoFine }; });
                    return next;
                  });
                }}
              >
                Auto-calc fines
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.4 } }}>
                    <TableCell>Item</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell width={180}>Condition</TableCell>
                    <TableCell width={80} align="center">Lost</TableCell>
                    <TableCell width={180}>Fine</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(returnTx.items || []).map(item => (
                    <TableRow key={item.BorrowedItemID} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 28, height: 28, borderRadius: 1 }}>
                            <Article fontSize="small" />
                          </Avatar>
                          <Typography fontSize={12} fontWeight={700}>Doc Storage #{item.DocumentStorageID}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} color="text.secondary" noWrap>
                          {docDetails[item.DocumentStorageID]?.Title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <InputLabel>Return Condition</InputLabel>
                          <Select
                            label="Return Condition"
                            value={returnData[item.BorrowedItemID]?.condition || 'Good'}
                            onChange={e => handleReturnChange(item.BorrowedItemID, 'condition', e.target.value)}
                            disabled={!!returnData[item.BorrowedItemID]?.lost}
                          >
                            {returnConditions.map(o => (
                              <MenuItem key={o} value={o}>{o}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={!!returnData[item.BorrowedItemID]?.lost}
                          onChange={e => handleReturnChange(item.BorrowedItemID, 'lost', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <TextField
                          label="Fine"
                          type="number"
                          size="small"
                          value={returnData[item.BorrowedItemID]?.fine ?? 0}
                          onChange={e => handleReturnChange(item.BorrowedItemID, 'fine', e.target.value)}
                          inputProps={{ min: 0, step: '0.01' }}
                          fullWidth
                          sx={{ '& input': { textAlign: 'right' } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Chip label={`Items: ${itemCount}`} size="small" sx={{ borderRadius: 1 }} />
            <Chip label={`Total fine: ₱${totalFine.toFixed(2)}`} size="small" color={totalFine > 0 ? 'warning' : 'default'} sx={{ borderRadius: 1 }} />
            {dueDescriptor !== '—' && (
              <Chip label={dueDescriptor} size="small" color={overdueChipColor === 'default' ? 'default' : overdueChipColor} sx={{ borderRadius: 1 }} />
            )}
          </Stack>

          <TextField
            label="Remarks"
            placeholder="Optional notes (e.g., reason for delay, condition details)"
            value={returnRemarks}
            onChange={(e) => setReturnRemarks(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `2px solid ${theme.palette.divider}`, py: 1 }}>
          <Button onClick={() => setReturnModalOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 1, mr: 'auto' }} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={submitReturn} variant="contained" size="small" disabled={actionLoading} sx={{ borderRadius: 1, fontWeight: 700 }}>
            {actionLoading ? "Processing…" : "Submit return"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', py: { xs: 3, md: 4 }, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: { xs: 2, md: 2.5 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 1.5, md: 2 },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                Document approvals
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
                Review borrower requests, monitor due windows, and keep digital access in sync without extra visuals.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Chip
                label={`Total: ${scenarioTallies.total}`}
                size="small"
                sx={{ fontWeight: 600, borderRadius: 1 }}
              />
              <Button
                onClick={fetchTransactions}
                startIcon={<Refresh fontSize="small" />}
                variant="outlined"
                disabled={loading}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              >
                Refresh
              </Button>
            </Stack>
          </Paper>

          <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                  <FilterAlt fontSize="small" />
                </Avatar>
              }
              title="Filters"
              subheader="Combine filters to focus on the scenarios you care about"
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
                    label="Search borrowers, purposes, dates, or IDs"
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
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
                    Format
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={formatFilter}
                    onChange={(event, value) => value && setFormatFilter(value)}
                    sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}
                  >
                    {formatFilterOptions.map(option => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        sx={{ textTransform: 'none', borderRadius: 999, px: 1.5, fontWeight: 600 }}
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
                    Due window
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={timeFilter}
                    onChange={(event, value) => value && setTimeFilter(value)}
                    sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}
                  >
                    {timeFilterOptions.map(option => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        sx={{ textTransform: 'none', borderRadius: 999, px: 1.5, fontWeight: 600 }}
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4, mb: 1, display: 'block' }}>
                    Status
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {statusFilterOptions.map(option => {
                      const isActive = statusFilter === option.label;
                      const count = option.label === 'All'
                        ? scenarioTallies.total
                        : option.codes.reduce((sum, code) => sum + (scenarioTallies.byCode[code] || 0), 0);
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
                            sx={{ borderRadius: 1.5, fontWeight: 600 }}
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
              title="Transactions"
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
            ) : rows.length ? (
              <TableContainer sx={{ maxHeight: '68vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, bgcolor: theme.palette.background.paper, borderBottom: `2px solid ${theme.palette.divider}` } }}>
                      <TableCell width={160}>Status</TableCell>
                      <TableCell width={180}>Borrower</TableCell>
                      <TableCell width={120}>Format</TableCell>
                      <TableCell width={90} align="center">Items</TableCell>
                      <TableCell width={120}>Borrowed</TableCell>
                      <TableCell width={150}>Due / Expiry</TableCell>
                      <TableCell>Purpose</TableCell>
                      <TableCell width={220}>Remarks</TableCell>
                      <TableCell width={240} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ '& tr:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) }, '& td': { borderBottom: `1px solid ${theme.palette.divider}` } }}>
                    {rows.map(tx => {
                      const due = dueDates[tx.BorrowID];
                      const status = statusMap[tx.BorrowID] || { label: 'Unknown', color: 'default', code: 'unknown' };
                      const meta = status.meta || getDueMeta(due);
                      const dueDescriptor = describeDue(meta);
                      const digitalOnly = isDigitalOnlyTx(tx);
                      const itemCount = (tx.items || []).length;
                      const txRemark = (tx.Remarks || '').trim();
                      const returnRemark = (tx.ReturnRemarks || '').trim();
                      const remarkText = status.code === 'returned'
                        ? (returnRemark || txRemark)
                        : txRemark || returnRemark;
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
                              <Typography fontSize={13} fontWeight={700} noWrap>{getBorrowerInfo(tx.BorrowerID) || '—'}</Typography>
                              <Typography variant="caption" color="text.secondary">Borrower #{tx.BorrowerID || '—'}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                              <FormatChip tx={tx} />
                              {digitalOnly ? (
                                <Chip size="small" variant="outlined" label="Auto-return" sx={{ borderRadius: 0.75, fontWeight: 500 }} />
                              ) : (hasAnyPhysical(tx) && hasAnyDigital(tx)) ? (
                                <Chip size="small" variant="outlined" label="Hybrid" sx={{ borderRadius: 0.75, fontWeight: 500 }} />
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={itemCount} sx={{ borderRadius: 0.75, fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} fontWeight={600}>{tx.BorrowDate ? formatDate(tx.BorrowDate) : '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{tx.ApprovalStatus || 'Pending'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} fontWeight={700} color={meta.isOverdue ? 'error.main' : 'text.primary'}>
                              {due ? formatDate(due) : '—'}
                            </Typography>
                            <Typography variant="caption" color={meta.isOverdue ? 'error.main' : (meta.isDueSoon || meta.isDueToday) ? 'warning.main' : 'text.secondary'}>
                              {dueDescriptor}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12} color="text.secondary" noWrap maxWidth={220}>
                              {tx.Purpose || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {remarkText ? (
                              <Tooltip title={<Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{remarkText}</Typography>}>
                                <Typography variant="caption" color="text.primary" noWrap sx={{ maxWidth: 200 }}>
                                  {remarkText}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
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
                                  <Tooltip title="Approve">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => openApprove(tx)}
                                      disabled={actionLoading}
                                      sx={{ border: `1px solid ${alpha(theme.palette.success.main, 0.5)}`, borderRadius: 1 }}
                                    >
                                      <CheckCircle fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reject">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => openRejectDialog(tx)}
                                      disabled={actionLoading}
                                      sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`, borderRadius: 1 }}
                                    >
                                      <Cancel fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {!digitalOnly && tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => openConfirmAction('retrieved', tx)}
                                  disabled={actionLoading}
                                  sx={{ borderRadius: 1, fontWeight: 700, px: 1.5 }}
                                >
                                  Retrieved
                                </Button>
                              )}
                              {!digitalOnly && tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned' && (
                                <>
                                  <Button
                                    size="small"
                                    color="secondary"
                                    variant="contained"
                                    onClick={() => openReturnModal(tx)}
                                    disabled={actionLoading}
                                    sx={{ borderRadius: 1, fontWeight: 700, px: 1.5 }}
                                  >
                                    Return
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    startIcon={<ReportProblem fontSize="small" />}
                                    onClick={() => openLostDialog(tx)}
                                    disabled={actionLoading}
                                    sx={{ borderRadius: 1, fontWeight: 700, px: 1.5 }}
                                  >
                                    Mark lost
                                  </Button>
                                </>
                              )}
                              {status.code === 'lost' && (
                                <Chip
                                  size="small"
                                  label="Lost"
                                  color="error"
                                  icon={<ReportProblem fontSize="small" />}
                                  sx={{ borderRadius: 1, fontWeight: 600 }}
                                />
                              )}
                              {tx.ReturnStatus === 'Returned' && !digitalOnly && (
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
      {renderLostDialog()}
      {renderRejectDialog()}
      {renderActionConfirm()}

      {/* Approve dialog for digital-only */}
      <Dialog open={approveDlgOpen} onClose={() => setApproveDlgOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ fontWeight: 800, py: 1.25, borderBottom: `2px solid ${theme.palette.divider}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Typography variant="h6" fontWeight={800}>Approve digital access</Typography>
            {approveDueDescriptor && (
              <Chip
                size="small"
                label={approveDueDescriptor}
                color={approveDueChipColor === 'info' ? 'info' : approveDueChipColor}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Typography variant="caption" color="text.secondary">
            Choose when the borrower’s digital access should expire. You can pick a date or use a quick preset.
          </Typography>
          <TextField
            label="Expiration date"
            type="date"
            size="small"
            value={approveDue}
            onChange={e => setApproveDue(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: todayIso }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {DIGITAL_DUE_PRESETS.map(days => (
              <Button
                key={days}
                size="small"
                variant="outlined"
                onClick={() => setApproveDue(addDays(new Date(), days).toISOString().slice(0, 10))}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              >
                +{days} day{days === 1 ? '' : 's'}
              </Button>
            ))}
          </Stack>
          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1, bgcolor: alpha(theme.palette.info.light, 0.08), borderColor: alpha(theme.palette.info.main, 0.4) }}>
            <Typography variant="caption" color="text.secondary">
              Digital requests are automatically marked as expired after this date. Borrowers will no longer be able to view the document.
            </Typography>
          </Paper>
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