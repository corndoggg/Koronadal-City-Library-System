import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Paper,
  Card,
  CardContent,
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
  InputAdornment
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

const BorrowerBorrowPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId =
    user?.borrower?.BorrowerID ||
    user?.BorrowerID ||
    user?.UserID ||
    null;

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
      { label: "Pending", value: totals.pending, color: "warning.main" },
      { label: "Approved", value: totals.approved, color: "info.main" },
      { label: "Borrowed", value: totals.borrowed, color: "secondary.main" },
      { label: "Overdue", value: totals.overdue, color: "error.main" },
      { label: "Returned", value: totals.returned, color: "success.main" }
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

  return (
    <Box p={{ xs: 2, md: 3 }} sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.85)} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.92)} 0%, ${theme.palette.primary.main} 85%)`,
          color: (theme) => {
            const base = theme.palette.mode === "dark" ? theme.palette.primary.dark : theme.palette.primary.main;
            return theme.palette.getContrastText(base);
          },
          overflow: "hidden",
          position: "relative"
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2, md: 2.5 }}
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="inherit" sx={{ letterSpacing: 0.6, fontWeight: 700, opacity: 0.85 }}>
              Borrowing activity
            </Typography>
            <Typography fontWeight={800} fontSize={20} color="inherit">
              My Borrow Transactions
            </Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.9, fontWeight: 600 }}>
              Track requests, borrowed items, and digital access in real time.
            </Typography>
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
                    borderRadius: 1.25,
                    bgcolor: theme => alpha(theme.palette.background.paper, 0.85)
                  }
                }}
              />
              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  onClick={fetchTransactions}
                  sx={{
                    borderRadius: 1.5,
                    border: theme => `1px solid ${alpha(theme.palette.common.white, 0.6)}`,
                    color: theme => theme.palette.common.white
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Summaries */}
      <Stack sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Snapshot
          </Typography>
          <Divider flexItem orientation="horizontal" sx={{ borderColor: theme => alpha(theme.palette.divider, 0.6) }} />
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1.25}>
          {summary.map((s) => (
            <Card
              key={s.label}
              elevation={0}
              sx={{
                minWidth: 140,
                borderRadius: 1.5,
                border: theme => `1px solid ${alpha(theme.palette.getContrastText("#fff"), 0.04)}`,
                flex: "1 1 140px"
              }}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {s.label}
                </Typography>
                <Typography fontWeight={800} fontSize={20} lineHeight={1.2} sx={{ mt: 0.5 }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>

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

      <Stack spacing={2.25}>
        {paginated.map((tx) => {
          const status = deriveStatus(tx);
          const items = tx.items || [];
          const due = dueDates[tx.BorrowID];
          const dueText = due ? formatDate(due) : "—";
          const borrowedText = tx.BorrowDate ? formatDate(tx.BorrowDate) : "—";
          const digitalItems = items.filter((item) => item.ItemType === "Document" && !item.DocumentStorageID);
          const physicalItems = items.filter((item) => item.ItemType === "Book" || (item.ItemType === "Document" && item.DocumentStorageID));
          const digitalOnly = digitalItems.length > 0 && physicalItems.length === 0;
          const digitalActive = digitalOnly && status.label === "Active (Digital)";
          const docAccessLabel = digitalOnly
            ? "Digital access"
            : digitalItems.length && physicalItems.length
              ? "Mixed access"
              : physicalItems.length
                ? "Physical copies"
                : "Items";
          const visibleItems = items.slice(0, 4);
          const extraCount = items.length - visibleItems.length;
          const dueIsPast = due ? new Date(due) < new Date() : false;

          return (
            <Card
              key={tx.BorrowID}
              elevation={0}
              sx={{
                borderRadius: 1.75,
                border: (theme) => {
                  const paletteEntry = status.tone ? theme.palette[status.tone] : undefined;
                  const base = typeof paletteEntry === "object" ? paletteEntry?.main : paletteEntry;
                  return `1px solid ${alpha(base || theme.palette.divider, 0.45)}`;
                },
                boxShadow: (theme) => `0 14px 36px ${alpha(theme.palette.common.black, 0.08)}`,
                backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
                width: "100%",
                maxWidth: { xs: "100%", lg: 840 }
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.75, p: { xs: 2, md: 2.5 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }} flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <StatusChip tx={tx} />
                    <Typography fontWeight={700} fontSize={14}>
                      Borrow #{tx.BorrowID}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${items.length} item${items.length === 1 ? "" : "s"}`}
                      sx={{ borderRadius: 0.75, fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      label={docAccessLabel}
                      color={digitalOnly ? "info" : physicalItems.length ? "secondary" : "default"}
                      sx={{ borderRadius: 0.75, fontWeight: 600 }}
                    />
                  </Stack>
                  <Box flexGrow={1} />
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      Borrowed: {borrowedText}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={dueIsPast && status.label !== "Returned" ? "error.main" : "text.secondary"}
                    >
                      {digitalOnly ? "Expires" : "Due"}: {dueText}
                    </Typography>
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => openDetail(tx)}
                        sx={{
                          borderRadius: 1,
                          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                          "&:hover": { bgcolor: "action.hover" }
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Divider />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {visibleItems.map((item) => {
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
                    const label =
                      meta?.Title ||
                      (isBook
                        ? `Book Copy #${item.BookCopyID}`
                        : isDigital
                          ? `Doc #${docId}`
                          : `Doc Storage #${item.DocumentStorageID}`);
                    return (
                      <Chip
                        key={item.BorrowedItemID}
                        size="small"
                        avatar={(
                          <Avatar
                            sx={{
                              bgcolor: isBook ? "primary.main" : "secondary.main",
                              color: "common.white",
                              width: 26,
                              height: 26,
                              borderRadius: 0.75
                            }}
                          >
                            {isBook ? <Book fontSize="inherit" /> : <Article fontSize="inherit" />}
                          </Avatar>
                        )}
                        label={label}
                        variant="outlined"
                        sx={{
                          borderRadius: 0.75,
                          fontWeight: 600,
                          px: 0.5,
                          maxWidth: 220,
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }
                        }}
                      />
                    );
                  })}
                  {extraCount > 0 && (
                    <Chip
                      size="small"
                      label={`+${extraCount} more`}
                      sx={{ borderRadius: 0.75, fontWeight: 600 }}
                    />
                  )}
                </Stack>
                {digitalItems.length > 0 && (
                  <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                    {digitalItems.map((item) => {
                      const docId = getDocumentId(item);
                      const meta = docId ? docMetaById[docId] : undefined;
                      const filePath = meta?.File_Path || meta?.file_path || meta?.FilePath;
                      return (
                        <Stack key={`${tx.BorrowID}-${docId}`} direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" fontWeight={700}>
                            {meta?.Title || `Doc #${docId}`}
                          </Typography>
                          {meta?.Author && (
                            <Typography variant="caption" color="text.secondary">
                              by {meta.Author}
                            </Typography>
                          )}
                          <Box flexGrow={1} />
                          {filePath && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewPdf(filePath)}
                              disabled={!digitalActive}
                              sx={{ borderRadius: 0.75, fontWeight: 600 }}
                            >
                              {digitalActive ? "View PDF" : "Access expired"}
                            </Button>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
                {tx.Purpose && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      border: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                      borderRadius: 1,
                      bgcolor: "background.default",
                      fontWeight: 500
                    }}
                  >
                    Purpose: {tx.Purpose}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

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
                <MetaLine k="Purpose" v={selectedTx.Purpose} />
                <MetaLine k="Status" v={deriveStatus(selectedTx).label} />
              </Paper>

              {/*
                FIX: compute digitalActive for the selectedTx (used below in the items map)
              */}
              {(() => {
                const st = deriveStatus(selectedTx);
                // Active (Digital) means PDF can be viewed; if Returned/expired, hide button
                var digitalActive = st.label === "Active (Digital)";

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