import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Avatar,
  Button,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Alert
} from "@mui/material";
import {
  Book,
  Article,
  Search,
  Refresh,
  Visibility,
  Close
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { formatDate } from '../../../utils/date';
import DocumentPDFViewer from "../../../components/DocumentPDFViewer"; // added
import { useSystemSettings } from "../../../contexts/SystemSettingsContext.jsx"; // added

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP"
});

const getLatestReturnForItem = (item) => {
  if (!item) return null;
  if (item.latestReturn) return item.latestReturn;
  const history = Array.isArray(item.returnHistory) ? item.returnHistory : [];
  return history.length ? history[0] : null;
};

const parseFineAmount = (value) => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const summarizeRecordedFines = (items = []) => {
  return items.reduce(
    (acc, item) => {
      const latest = getLatestReturnForItem(item);
      if (!latest) return acc;
      const fineAmount = parseFineAmount(latest.Fine ?? latest.fine);
      if (fineAmount > 0) {
        acc.total += fineAmount;
        const paidValue = String(latest.FinePaid ?? latest.finePaid ?? "")
          .toLowerCase()
          .trim();
        if (paidValue !== "yes") {
          acc.unpaid += 1;
        }
      }
      return acc;
    },
    { total: 0, unpaid: 0 }
  );
};

const BorrowerBorrowPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId =
    user?.borrower?.BorrowerID ||
    user?.BorrowerID ||
    user?.UserID ||
    null;
  const { settings } = useSystemSettings(); // added
  const finePerDay = Number(settings?.fine ?? 0); // added

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookDetails, setBookDetails] = useState({});
  const [docDetails, setDocDetails] = useState({});
  const [dueDates, setDueDates] = useState({});
  const [search, setSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [docMetaById, setDocMetaById] = useState({}); // added: digital docs by DocumentID
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false); // added
  const [pdfUrl, setPdfUrl] = useState(""); // added
  const [page, setPage] = useState(1);

  // fetch transactions
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, [borrowerId]);

  const fetchTransactions = async () => {
    if (!borrowerId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/borrow/borrower/${borrowerId}`);
      setTransactions(res.data || []);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  };

  // fetch due dates for each transaction
  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      const obj = {};
      await Promise.all(
        transactions.map(async (tx) => {
          // Simplified: derive due/return date from transaction fields
          // Prefer explicit DueDate if present, else ReturnDate (server may use either naming)
          obj[tx.BorrowID] = tx.DueDate || tx.ReturnDate || null;
        })
      );
      setDueDates(obj);
    })();
  }, [transactions, API_BASE]);
  // Removed stray JSX artifact from previous patch
  const getDocumentId = (obj) => obj?.Document_ID ?? obj?.DocumentID ?? obj?.documentId ?? obj?.DocumentId;

  // fetch item metadata (books, physical docs by storage, digital docs by document id)
  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      let bookCopyIds = [];
      let docStorageIds = [];
      let docIds = [];
      transactions.forEach((tx) =>
        (tx.items || []).forEach((it) => {
          if (it.ItemType === "Book" && it.BookCopyID) bookCopyIds.push(it.BookCopyID);
          if (it.ItemType === "Document" && it.DocumentStorageID) docStorageIds.push(it.DocumentStorageID);
          if (it.ItemType === "Document" && !it.DocumentStorageID) {
            const did = getDocumentId(it);
            if (did) docIds.push(did);
          }
        })
      );
      bookCopyIds = [...new Set(bookCopyIds)];
      docStorageIds = [...new Set(docStorageIds)];
      docIds = [...new Set(docIds)];

      const bInfo = {};
      for (const id of bookCopyIds) {
        try {
          const invRes = await axios.get(`${API_BASE}/books/inventory/copy/${id}`);
          const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          const bRes = await axios.get(`${API_BASE}/books/${invData?.Book_ID || id}`);
          if (bRes.data?.Title) bInfo[id] = { ...bRes.data, ...invData };
        } catch (err) {
          void err;
        }
      }

      const dInfo = {};
      for (const sid of docStorageIds) {
        try {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${sid}`);
          const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          const dRes = await axios.get(`${API_BASE}/documents/${invData?.Document_ID || sid}`);
          if (dRes.data?.Title) dInfo[sid] = { ...dRes.data, ...invData };
        } catch (err) {
          void err;
        }
      }

      const dById = {};
      for (const did of [...new Set(docIds)]) {
        try {
          const r = await axios.get(`${API_BASE}/documents/${did}`);
          if (r.data?.Title) dById[did] = r.data;
        } catch (err) {
          void err;
        }
      }

      setBookDetails(bInfo);
      setDocDetails(dInfo);
      setDocMetaById(dById); // added
    })();
  }, [transactions, API_BASE]);

  // Helpers: Digital/Physical detection (no DocType; digital if no DocumentStorageID)
  const isDigitalOnlyTx = (tx) => {
    const items = tx?.items || [];
    return items.length > 0 && items.every(i => i.ItemType === "Document" && !i.DocumentStorageID);
  }; // changed
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const calcExpectedFine = (tx) => {
    if (!tx || finePerDay <= 0) return 0;
    if (tx.ReturnStatus === "Returned" || tx.ApprovalStatus === "Rejected") return 0;
    if (isDigitalOnlyTx(tx)) return 0;
    const dueRaw = dueDates[tx.BorrowID];
    if (!dueRaw) return 0;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueRaw));
    const diffDays = Math.floor((today - due) / 86400000);
    if (diffDays <= 0) return 0;
    return diffDays * finePerDay;
  };
  // status derivation: treat digital 'Returned' as Expired and hide PDF button
  const deriveStatus = useCallback((tx) => {
    const dueRaw = dueDates[tx.BorrowID];
    const due = dueRaw ? new Date(dueRaw) : null;
    const today = new Date();

    const digitalOnly = (tx.items || []).length > 0 &&
      (tx.items || []).every(i => i.ItemType === "Document" && !i.DocumentStorageID);

    if (tx.ApprovalStatus === "Rejected") return { label: "Rejected", color: "error", tone: "error" };

    if (digitalOnly) {
      // Auto-returned digital is always Expired
      if (tx.ReturnStatus === "Returned") return { label: "Expired", color: "error", tone: "error" };
      if (tx.ApprovalStatus === "Pending") return { label: "Pending Approval", color: "warning", tone: "warning" };
      if (tx.ApprovalStatus === "Approved") {
        if (due && due < today) return { label: "Expired", color: "error", tone: "error" };
        return { label: "Active (Digital)", color: "info", tone: "info" };
      }
      return { label: tx.ApprovalStatus || "Unknown", color: "default", tone: "default" };
    }

    if (tx.ReturnStatus === "Returned") return { label: "Returned", color: "success", tone: "success" };
    if (tx.ApprovalStatus === "Pending") return { label: "Pending Approval", color: "warning", tone: "warning" };
    if (tx.ApprovalStatus === "Approved" && tx.RetrievalStatus !== "Retrieved") {
      if (due && due < today) return { label: "Overdue (Awaiting Pickup)", color: "error", tone: "error" };
      return { label: "Approved", color: "info", tone: "info" };
    }
    if (tx.RetrievalStatus === "Retrieved" && tx.ReturnStatus !== "Returned") {
      if (due && due < today) return { label: "Overdue", color: "error", tone: "error" };
      return { label: "Borrowed", color: "secondary", tone: "secondary" };
    }
    return { label: tx.ApprovalStatus || "Unknown", color: "default", tone: "default" };
  }, [dueDates]);

  const StatusChip = ({ tx }) => {
    const s = deriveStatus(tx);
    return (
      <Chip
        label={s.label}
        size="small"
        color={s.color === "default" ? "default" : s.color}
        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 11 }}
      />
    );
  };

  // status sorting (treat Expired like Overdue)
  const statusOrder = (tx) => {
    const lbl = deriveStatus(tx).label;
    if (lbl.startsWith("Overdue") || lbl === "Expired") return 0;
    if (lbl === "Pending Approval") return 1;
    if (lbl === "Approved" || lbl === "Active (Digital)") return 2;
    if (lbl === "Borrowed") return 3;
    if (lbl === "Returned") return 4;
    if (lbl === "Rejected") return 5;
    return 6;
  };

  // filter
  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      String(tx.BorrowID).includes(q) ||
      (tx.Purpose || "").toLowerCase().includes(q) ||
      (tx.BorrowDate || "").toLowerCase().includes(q) ||
      (dueDates[tx.BorrowID] || "").toLowerCase().includes(q) ||
      deriveStatus(tx).label.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => statusOrder(a) - statusOrder(b));
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, page]);

  const selectedFineSummary = useMemo(() => {
    if (!selectedTx?.items) return { total: 0, unpaid: 0 };
    return summarizeRecordedFines(selectedTx.items);
  }, [selectedTx]);

  // summaries
  const summary = useMemo(() => {
    const totals = {
      pending: 0,
      approved: 0,
      borrowed: 0,
      overdue: 0,
      returned: 0
    };

    transactions.forEach((transaction) => {
      const label = deriveStatus(transaction).label;
      if (label === "Pending Approval") totals.pending += 1;
      if (label === "Approved" || label === "Active (Digital)") totals.approved += 1;
      if (label === "Borrowed") totals.borrowed += 1;
      if (label.startsWith("Overdue") || label === "Expired") totals.overdue += 1;
      if (label === "Returned") totals.returned += 1;
    });

    return [
      { label: "Pending", value: totals.pending, tone: "warning" },
      { label: "Approved", value: totals.approved, tone: "info" },
      { label: "Borrowed", value: totals.borrowed, tone: "secondary" },
      { label: "Overdue", value: totals.overdue, tone: "error" },
      { label: "Returned", value: totals.returned, tone: "success" }
    ];
  }, [transactions, deriveStatus]);

  const openDetail = (tx) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedTx(null);
  };

  const handleViewPdf = (filePath) => { // added
    if (!filePath) return;
    setPdfUrl(`${API_BASE}${filePath}`);
    setPdfDialogOpen(true);
  };

  const MetaLine = ({ k, v }) =>
    v ? (
      <Typography variant="caption" sx={{ display: "block", lineHeight: 1.3 }}>
        <b>{k}:</b> {v}
      </Typography>
    ) : null;

  const TransactionProgress = ({ tx }) => {
    if (!tx) return null;

    const status = deriveStatus(tx);
    const digitalOnly = isDigitalOnlyTx(tx);
    const dueRaw = dueDates[tx.BorrowID];
    const dueText = dueRaw ? formatDate(dueRaw) : null;
    const isOverdue = status.label.startsWith("Overdue") || status.label === "Expired";

    const containerProps = {
      variant: "outlined",
      sx: {
        p: 1.25,
        borderRadius: 1,
        border: (t) => `1.5px solid ${t.palette.divider}`,
        bgcolor: "background.paper"
      }
    };

    if (status.label === "Rejected") {
      return (
        <Paper {...containerProps}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{ letterSpacing: 0.4, mb: 1 }}
          >
            Progress
          </Typography>
          <Alert severity="error" variant="outlined" sx={{ borderRadius: 1 }}>
            This request was rejected and will not proceed further.
          </Alert>
        </Paper>
      );
    }

    const digitalSteps = [
      { key: "pending", label: "Pending Approval" },
      { key: "active", label: "Digital Access" },
      { key: "expired", label: "Expired / Returned" }
    ];

    const physicalSteps = [
      { key: "pending", label: "Pending Approval" },
      { key: "approved", label: "Awaiting Pickup" },
      { key: "retrieved", label: "Borrowed" },
      { key: "returned", label: "Returned" }
    ];

    const steps = digitalOnly ? digitalSteps : physicalSteps;

    let stageIdx = 0;
    if (digitalOnly) {
      if (status.label === "Active (Digital)") {
        stageIdx = 1;
      } else if (status.label === "Expired" || tx.ReturnStatus === "Returned") {
        stageIdx = steps.length;
      }
    } else {
      if (tx.ReturnStatus === "Returned") {
        stageIdx = steps.length;
      } else if (tx.RetrievalStatus === "Retrieved") {
        stageIdx = 2;
      } else if (tx.ApprovalStatus === "Approved") {
        stageIdx = 1;
      }
    }

    const activeStep = Math.min(stageIdx, steps.length);

    const optionalLabel = (stepKey) => {
      if (!dueText) return undefined;
      if (digitalOnly && stepKey === "active") {
        return (
          <Typography variant="caption" color={isOverdue ? "error.main" : "text.secondary"}>
            Expires {dueText}
          </Typography>
        );
      }
      if (!digitalOnly && stepKey === "retrieved") {
        return (
          <Typography variant="caption" color={isOverdue ? "error.main" : "text.secondary"}>
            Due {dueText}
          </Typography>
        );
      }
      return undefined;
    };

    return (
      <Paper {...containerProps}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: 0.4, mb: 1 }}
        >
          Progress
        </Typography>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            '& .MuiStepConnector-line': {
              borderTopWidth: 2
            },
            '& .MuiStepLabel-label': {
              fontSize: 12,
              fontWeight: 600
            }
          }}
        >
          {steps.map((step) => (
            <Step key={step.key}>
              <StepLabel
                error={!digitalOnly && step.key === "retrieved" && isOverdue}
                optional={optionalLabel(step.key)}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
    );
  };

  return (
    <Box p={{ xs: 2, md: 3 }} sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 2,
          p: { xs: 2, md: 2.5 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 1.5, md: 2 },
          alignItems: { xs: "flex-start", md: "center" }
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            My Borrow Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track requests, monitor due dates, and access digital files from a single view.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
            {summary.map((s) => (
              <Chip
                key={s.label}
                label={`${s.label}: ${s.value}`}
                size="small"
                color={s.tone === "secondary" ? "secondary" : s.tone}
                variant={s.value ? "filled" : "outlined"}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Box>
        <Box
          sx={{
            minWidth: { xs: "100%", md: 280 },
            display: "flex",
            gap: 1,
            alignItems: "center",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            flexWrap: "wrap"
          }}
        >
          <TextField
            size="small"
            placeholder="Search ID / purpose / date / status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{
              flexGrow: 0,
              width: { xs: "100%", md: 260 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.25
              }
            }}
          />
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={fetchTransactions}
              sx={{
                borderRadius: 1.5,
                border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Content */}
      {!borrowerId && (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            border: (t) => `2px dashed ${t.palette.divider}`,
            borderRadius: 1,
            bgcolor: "background.paper"
          }}
        >
          <Typography fontWeight={600} mb={1}>
            Login required
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sign in to view your borrowing activity.
          </Typography>
        </Paper>
      )}

      {borrowerId && loading && (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            border: (t) => `2px solid ${t.palette.divider}`,
            borderRadius: 1,
            bgcolor: "background.paper"
          }}
        >
          <CircularProgress />
          <Typography variant="caption" fontWeight={600} color="text.secondary" mt={2}>
            Loading transactions...
          </Typography>
          <Stack mt={3} spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={64} />
            ))}
          </Stack>
        </Paper>
      )}

      {borrowerId && !loading && sorted.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            border: (t) => `2px dashed ${t.palette.divider}`,
            borderRadius: 1,
            bgcolor: "background.paper"
          }}
        >
          <Typography color="text.secondary" fontWeight={600}>
            No transactions found{search ? " for this search." : "."}
          </Typography>
        </Paper>
      )}

      {borrowerId && !loading && sorted.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { xs: 180, md: 220 } }}>Transaction</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Items</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Access</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Borrowed</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Due / Expires</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Purpose</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Remarks</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((tx) => {
                const status = deriveStatus(tx);
                const items = tx.items || [];
                const due = dueDates[tx.BorrowID];
                const dueText = due ? formatDate(due) : "—";
                const borrowedText = tx.BorrowDate ? formatDate(tx.BorrowDate) : "—";
                const digitalItems = items.filter((item) => item.ItemType === "Document" && !item.DocumentStorageID);
                const physicalItems = items.filter((item) => item.ItemType === "Book" || (item.ItemType === "Document" && item.DocumentStorageID));
                const digitalOnly = digitalItems.length > 0 && physicalItems.length === 0;
                const docAccessLabel = digitalOnly
                  ? "Digital access"
                  : digitalItems.length && physicalItems.length
                    ? "Mixed access"
                    : physicalItems.length
                      ? "Physical copies"
                      : "Items";
                const expectedFine = calcExpectedFine(tx);
                const previewNames = items.slice(0, 2).map((item) => {
                  const isBook = item.ItemType === "Book";
                  const isDigital = !isBook && !item.DocumentStorageID;
                  const docId = isDigital ? getDocumentId(item) : null;
                  const meta = isBook
                    ? bookDetails[item.BookCopyID]
                    : item.DocumentStorageID
                      ? docDetails[item.DocumentStorageID]
                      : docId
                        ? docMetaById[docId]
                        : undefined;
                  return meta?.Title || (isBook ? `Book Copy #${item.BookCopyID}` : isDigital ? `Doc #${docId}` : `Doc Storage #${item.DocumentStorageID}`);
                }).filter(Boolean);
                let previewText = previewNames.join(", ");
                if (items.length > 2) {
                  previewText = `${previewText}${previewText ? ", " : ""}+${items.length - 2} more`;
                }
                const dueIsPast = due ? new Date(due) < new Date() : false;
                const remarksText = tx.ReturnStatus === "Returned"
                  ? (tx.ReturnRemarks || tx.Remarks || "")
                  : (tx.Remarks || tx.ReturnRemarks || "");

                return (
                  <TableRow key={tx.BorrowID} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusChip tx={tx} />
                        <Typography fontWeight={700} fontSize={13}>
                          #{tx.BorrowID}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={13}>
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </Typography>
                      {previewText ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {previewText}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={docAccessLabel}
                        variant="outlined"
                        color={digitalOnly ? "info" : digitalItems.length && physicalItems.length ? "secondary" : "default"}
                        sx={{ borderRadius: 0.75, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {borrowedText}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={dueIsPast && status.label !== "Returned" ? "error.main" : "text.secondary"}
                        fontWeight={dueIsPast && status.label !== "Returned" ? 600 : 400}
                      >
                        {digitalOnly ? "Expires" : "Due"}: {dueText}
                      </Typography>
                      {expectedFine > 0 && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          fontWeight={600}
                          sx={{ display: "block" }}
                        >
                          Expected fine: {pesoFormatter.format(expectedFine)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 220,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {tx.Purpose || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {remarksText ? (
                        <Tooltip
                          title={
                            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                              {remarksText}
                            </Typography>
                          }
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block", maxWidth: 220 }}
                          >
                            {remarksText}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility fontSize="small" />}
                        onClick={() => openDetail(tx)}
                        sx={{ borderRadius: 1 }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {sorted.length > ITEMS_PER_PAGE && (
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      )}

      {/* Detail Modal */}
      <Dialog
        open={detailOpen}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: (t) => `2px solid ${t.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: (t) => `2px solid ${t.palette.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 1
          }}
        >
          <Typography fontSize={16} fontWeight={800}>
            Transaction Details
          </Typography>
          <Box ml="auto" />
          <IconButton size="small" onClick={closeDetail}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            bgcolor: "background.default"
          }}
        >
          {!selectedTx && (
            <Typography variant="caption" color="text.secondary">
              No data.
            </Typography>
          )}
          {selectedTx && (
            <>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: (t) => `1.5px solid ${t.palette.divider}`,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1
                }}
              >
                <MetaLine k="Borrow ID" v={selectedTx.BorrowID} />
                <MetaLine k="Borrowed" v={selectedTx.BorrowDate ? formatDate(selectedTx.BorrowDate) : ''} />
                <MetaLine
                  k={isDigitalOnlyTx(selectedTx) ? "Expires" : "Due"}
                  v={dueDates[selectedTx.BorrowID] ? formatDate(dueDates[selectedTx.BorrowID]) : ''}
                />
                <MetaLine k="Returned" v={selectedTx.ReturnDate ? formatDate(selectedTx.ReturnDate) : ''} />
                <MetaLine k="Purpose" v={selectedTx.Purpose} />
                <MetaLine k="Status" v={deriveStatus(selectedTx).label} />
                {(() => {
                  const fineValue = calcExpectedFine(selectedTx);
                  return fineValue > 0 ? (
                    <MetaLine k="Expected fine" v={pesoFormatter.format(fineValue)} />
                  ) : null;
                })()}
                {selectedFineSummary.total > 0 ? (
                  <MetaLine k="Recorded fines" v={pesoFormatter.format(selectedFineSummary.total)} />
                ) : null}
                {selectedFineSummary.unpaid > 0 ? (
                  <MetaLine
                    k="Outstanding fines"
                    v={`${selectedFineSummary.unpaid} item${selectedFineSummary.unpaid === 1 ? '' : 's'}`}
                  />
                ) : null}
              </Paper>

              <TransactionProgress tx={selectedTx} />

              {selectedTx.Remarks && (
                <Paper
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 1, border: (t) => `1.5px solid ${t.palette.divider}` }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.4 }}>
                    Request remarks
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-line" }}>
                    {selectedTx.Remarks}
                  </Typography>
                </Paper>
              )}

              {selectedTx.ReturnRemarks && (
                <Paper
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 1, border: (t) => `1.5px solid ${t.palette.divider}` }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.4 }}>
                    Return remarks
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-line" }}>
                    {selectedTx.ReturnRemarks}
                  </Typography>
                </Paper>
              )}

              {/*
                FIX: compute digitalActive for the selectedTx (used below in the items map)
              */}
              {(() => {
                const st = deriveStatus(selectedTx);
                // Active (Digital) means PDF can be viewed; if Returned/expired, hide button
                const digitalActive = st.label === "Active (Digital)";

                return (
                  <Box>
                    <Typography fontWeight={800} fontSize={13} mb={1}>
                      Items ({selectedTx.items?.length || 0})
                    </Typography>
                    <Stack spacing={1.25}>
                      {(selectedTx.items || []).map((item) => {
                        const isBook = item.ItemType === "Book";
                        const isDigital = !isBook && !item.DocumentStorageID;
                        const did = isDigital ? getDocumentId(item) : null;
                        const meta = isBook
                          ? bookDetails[item.BookCopyID]
                          : (item.DocumentStorageID
                              ? docDetails[item.DocumentStorageID]
                              : (did && docMetaById[did]));
                        const filePath = meta?.File_Path || meta?.file_path || meta?.FilePath;
                        const latestReturn = getLatestReturnForItem(item);
                        const fineAmount = latestReturn ? parseFineAmount(latestReturn.Fine ?? latestReturn.fine) : 0;
                        const finePaid = latestReturn
                          ? String(latestReturn.FinePaid ?? latestReturn.finePaid ?? "").toLowerCase().trim() === "yes"
                          : false;
                        const initialCondition = item.InitialCondition ?? item.initialCondition ?? '';
                        const returnCondition = latestReturn
                          ? latestReturn.ReturnCondition ?? latestReturn.returnCondition ?? ''
                          : '';
                        return (
                          <Paper
                            key={item.BorrowedItemID}
                            variant="outlined"
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              border: (t) => `1px solid ${t.palette.divider}`,
                              bgcolor: "background.paper"
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar
                                sx={{
                                  bgcolor: isBook ? "primary.main" : "secondary.main",
                                  width: 34,
                                  height: 34,
                                  borderRadius: 1
                                }}
                              >
                                {isBook ? <Book fontSize="small" /> : <Article fontSize="small" />}
                              </Avatar>
                              <Chip
                                label={
                                  (meta && meta.Title) ||
                                  (isBook ? `Book Copy #${item.BookCopyID}` : (isDigital ? `Doc #${did}` : `Doc Storage #${item.DocumentStorageID}`))
                                }
                                size="small"
                                color={isBook ? "primary" : "secondary"}
                                sx={{
                                  fontWeight: 600,
                                  borderRadius: 0.75,
                                  maxWidth: 320,
                                  '& .MuiChip-label': {
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }
                                }}
                              />
                              {!isBook && (
                                <Chip size="small" variant="outlined" label={isDigital ? "Digital" : "Physical"} sx={{ borderRadius: 0.75 }} />
                              )}
                              {!isBook && isDigital && digitalActive && filePath && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleViewPdf(filePath)}
                                  sx={{ ml: 'auto', borderRadius: 0.75, fontWeight: 600 }}
                                >
                                  View PDF
                                </Button>
                              )}
                            </Stack>
                            {meta ? (
                              <Stack mt={1} spacing={0.25} pl={0.5}>
                                {isBook ? (
                                  <>
                                    <MetaLine k="Title" v={meta.Title} />
                                    <MetaLine k="Author" v={meta.Author} />
                                    <MetaLine k="Edition" v={meta.Edition} />
                                    <MetaLine k="Publisher" v={meta.Publisher} />
                                    <MetaLine k="Year" v={meta.Year} />
                                    <MetaLine k="ISBN" v={meta.ISBN} />
                                    <MetaLine k="Condition (Out)" v={meta.Condition || meta.condition} />
                                  </>
                                ) : (
                                  <>
                                    <MetaLine k="Title" v={meta.Title} />
                                    <MetaLine k="Author" v={meta.Author} />
                                    <MetaLine k="Category" v={meta.Category} />
                                    <MetaLine k="Department" v={meta.Department} />
                                    <MetaLine k="Year" v={meta.Year} />
                                    <MetaLine k="Classification" v={meta.Classification} />
                                    <MetaLine k="Condition (Out)" v={meta.Condition || meta.condition} />
                                  </>
                                )}
                                <MetaLine k="Initial condition" v={initialCondition || '—'} />
                                {latestReturn ? (
                                  <>
                                    <MetaLine k="Return condition" v={returnCondition || '—'} />
                                    <MetaLine
                                      k="Recorded fine"
                                      v={fineAmount > 0 ? pesoFormatter.format(fineAmount) : 'None'}
                                    />
                                    <MetaLine
                                      k="Fine status"
                                      v={fineAmount > 0 ? (finePaid ? 'Paid' : 'Unpaid') : '—'}
                                    />
                                    <MetaLine
                                      k="Returned"
                                      v={latestReturn.ReturnDate ? formatDate(latestReturn.ReturnDate) : ''}
                                    />
                                    <MetaLine k="Return remarks" v={latestReturn.ReturnRemarks} />
                                  </>
                                ) : null}
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.secondary" mt={1} pl={0.5}>
                                Details not available.
                              </Typography>
                            )}
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: (t) => `2px solid ${t.palette.divider}`,
            py: 1
          }}
        >
          <Button onClick={closeDetail} variant="outlined" size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer (added) */}
      <DocumentPDFViewer
        open={pdfDialogOpen}
        onClose={() => { setPdfDialogOpen(false); setPdfUrl(''); }}
        fileUrl={pdfUrl}
        title="Digital Document"
      />
    </Box>
  );
};

export default BorrowerBorrowPage;