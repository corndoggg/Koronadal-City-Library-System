import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Snackbar,
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
  Typography,
  useTheme
} from "@mui/material";
import {
  AccountBalanceWallet,
  AssignmentLate,
  CheckCircle,
  FilterAlt,
  Paid,
  ReceiptLong,
  Refresh,
  Search,
  WarningAmber
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useSystemSettings } from "../../../contexts/SystemSettingsContext.jsx";
import { formatDate } from "../../../utils/date";

const API_BASE = import.meta.env.VITE_API_BASE;

const statusFilters = [
  { value: "all", label: "All fines", predicate: () => true },
  { value: "outstanding", label: "Outstanding", predicate: item => item.fine > 0 && !item.finePaid },
  { value: "paid", label: "Collected", predicate: item => item.fine > 0 && item.finePaid },
  { value: "zero", label: "No charge", predicate: item => item.fine <= 0 },
  { value: "lost", label: "Lost cases", predicate: item => item.lost }
];

const dateFilters = [
  { value: "all", label: "Any date", predicate: () => true },
  {
    value: "7d",
    label: "Last 7 days",
    predicate: item =>
      item.returnDate ? Date.now() - new Date(item.returnDate).getTime() <= 7 * 86400000 : false
  },
  {
    value: "30d",
    label: "Last 30 days",
    predicate: item =>
      item.returnDate ? Date.now() - new Date(item.returnDate).getTime() <= 30 * 86400000 : false
  },
  {
    value: "quarter",
    label: "Last quarter",
    predicate: item =>
      item.returnDate ? Date.now() - new Date(item.returnDate).getTime() <= 90 * 86400000 : false
  }
];

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const formatCurrency = value => currency.format(Number.isFinite(value) ? value : 0);

const heroCopy = fineRateText => ({
  overline: "Borrowing fines",
  title: "Track outstanding balances and collection progress",
  description: `Review fines assessed during returns, highlight unpaid balances, and monitor settlements. The default fine rate is ${fineRateText} per overdue day.`
});

const FinesPage = () => {
  const theme = useTheme();
  const { settings } = useSystemSettings();
  const [returns, setReturns] = useState([]);
  const [borrowMap, setBorrowMap] = useState({});
  const [borrowerNames, setBorrowerNames] = useState({});
  const [bookDetails, setBookDetails] = useState({});
  const [docDetails, setDocDetails] = useState({});
  const [docStorageDetails, setDocStorageDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    row: null,
    amount: "",
    submitting: false,
    error: ""
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/return`);
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    if (!returns.length) {
      setBorrowMap({});
      return;
    }
    const borrowIds = [...new Set(returns.map(r => r.BorrowID).filter(Boolean))];
    if (!borrowIds.length) {
      setBorrowMap({});
      return;
    }

    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/borrow`);
        const map = {};
        for (const tx of res.data || []) {
          if (borrowIds.includes(tx.BorrowID)) {
            map[tx.BorrowID] = tx;
          }
        }
        setBorrowMap(map);
      } catch {
        setBorrowMap({});
      }
    })();
  }, [returns]);

  useEffect(() => {
    const ids = Object.values(borrowMap)
      .map(tx => tx.BorrowerID)
      .filter(Boolean);
    const missing = [...new Set(ids)].filter(id => !borrowerNames[id]);
    if (!missing.length) return;

    (async () => {
      const updates = {};
      for (const borrowerId of missing) {
        try {
          const res = await axios.get(`${API_BASE}/users/borrower/${borrowerId}`);
          const u = res.data || {};
          const first = (u.Firstname || "").trim();
          const middle = (u.Middlename || "").trim();
          const last = (u.Lastname || "").trim();
          const name = [first, middle ? `${middle[0]}.` : "", last]
            .filter(Boolean)
            .join(" ") || u.Username || `Borrower #${borrowerId}`;
          updates[borrowerId] = name;
        } catch {
          updates[borrowerId] = `Borrower #${borrowerId}`;
        }
      }
      setBorrowerNames(prev => ({ ...prev, ...updates }));
    })();
  }, [borrowMap, borrowerNames]);

  useEffect(() => {
    const transactions = Object.values(borrowMap);
    if (!transactions.length) {
      setBookDetails({});
      setDocDetails({});
      setDocStorageDetails({});
      return;
    }

    (async () => {
      const bookCopyIds = new Set();
      const docStorageIds = new Set();
      const docIds = new Set();

      transactions.forEach(tx => {
        (tx.items || []).forEach(item => {
          if (item.ItemType === "Book" && item.BookCopyID) bookCopyIds.add(item.BookCopyID);
          if (item.ItemType === "Document") {
            if (item.DocumentStorageID) docStorageIds.add(item.DocumentStorageID);
            if (item.Document_ID) docIds.add(item.Document_ID);
          }
        });
      });

      const docInfo = {};
      await Promise.all([...docIds].map(async id => {
        try {
          const res = await axios.get(`${API_BASE}/documents/${id}`);
          if (res.data?.Title) docInfo[id] = res.data;
        } catch {
          /* ignore */
        }
      }));

      const bookInfo = {};
      await Promise.all([...bookCopyIds].map(async copyId => {
        try {
          const invResp = await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`);
          const invData = Array.isArray(invResp.data) ? invResp.data[0] : invResp.data;
          const bookId = invData?.Book_ID || invData?.BookID;
          if (!bookId) return;
          const bookResp = await axios.get(`${API_BASE}/books/${bookId}`);
          if (bookResp.data?.Title) {
            bookInfo[copyId] = { ...bookResp.data, ...invData };
          }
        } catch {
          /* ignore */
        }
      }));

      const docStorageInfo = {};
      await Promise.all([...docStorageIds].map(async storageId => {
        try {
          const invResp = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          const invData = Array.isArray(invResp.data) ? invResp.data[0] : invResp.data;
          const docId = invData?.Document_ID || invData?.DocumentID;
          const meta = docInfo[docId] || {};
          docStorageInfo[storageId] = { ...meta, ...invData };
        } catch {
          /* ignore */
        }
      }));

      setDocDetails(docInfo);
      setDocStorageDetails(docStorageInfo);
      setBookDetails(bookInfo);
    })();
  }, [borrowMap]);

  const getBorrowerName = useCallback(
    borrowId => {
      const tx = borrowMap[borrowId];
      const borrowerId = tx?.BorrowerID;
      if (!borrowerId) return `Borrow #${borrowId}`;
      return borrowerNames[borrowerId] || `Borrower #${borrowerId}`;
    },
    [borrowMap, borrowerNames]
  );

  const borrowedItemLookup = useMemo(() => {
    const result = {};
    Object.values(borrowMap).forEach(tx => {
      (tx.items || []).forEach(item => {
        if (item.BorrowedItemID) {
          result[item.BorrowedItemID] = item;
        }
      });
    });
    return result;
  }, [borrowMap]);

  const fineRows = useMemo(() => {
    const rows = [];
    for (const ret of returns) {
      const borrow = borrowMap[ret.BorrowID];
      (ret.items || []).forEach(item => {
        const borrowed = borrowedItemLookup[item.BorrowedItemID] || {};
        const fine = Number(item.Fine || 0);
        const finePaid = String(item.FinePaid || "No").toLowerCase() === "yes";
        const isLost = (item.ReturnCondition || "").toLowerCase() === "lost";
        const returnedItemId = item.ReturnedItemID || item.ReturnedItemId;
        let title = "";
        if (borrowed.ItemType === "Book") {
          const meta = bookDetails[borrowed.BookCopyID] || {};
          title = meta.Title ? `${meta.Title} (Copy #${borrowed.BookCopyID})` : `Book Copy #${borrowed.BookCopyID || "—"}`;
        } else if (borrowed.ItemType === "Document") {
          if (borrowed.DocumentStorageID) {
            const meta = docStorageDetails[borrowed.DocumentStorageID] || {};
            title = meta.Title ? `${meta.Title} (Storage #${borrowed.DocumentStorageID})` : `Document Copy #${borrowed.DocumentStorageID}`;
          } else if (borrowed.Document_ID) {
            const meta = docDetails[borrowed.Document_ID] || {};
            title = meta.Title ? `${meta.Title} (Digital)` : `Document #${borrowed.Document_ID}`;
          } else {
            title = "Document";
          }
        } else {
          title = "Library item";
        }

        rows.push({
          id: `${ret.ReturnID}-${item.BorrowedItemID}`,
          borrowId: ret.BorrowID,
          returnId: ret.ReturnID,
          returnedItemId,
          borrowedItemId: borrowed.BorrowedItemID || item.BorrowedItemID,
          borrowerName: getBorrowerName(ret.BorrowID),
          borrowerId: borrow?.BorrowerID,
          itemType: borrowed.ItemType || "Unknown",
          itemLabel: title,
          fine,
          finePaid,
          finePaidRaw: item.FinePaid || "No",
          returnDate: ret.ReturnDate,
          receivedBy: ret.ReceivedByStaffID,
          remarks: ret.Remarks,
          condition: item.ReturnCondition,
          lost: isLost,
          borrowPurpose: borrow?.Purpose || "",
          borrowDate: borrow?.BorrowDate || null
        });
      });
    }

    return rows.sort((a, b) => {
      const aTime = a.returnDate ? new Date(a.returnDate).getTime() : 0;
      const bTime = b.returnDate ? new Date(b.returnDate).getTime() : 0;
      return bTime - aTime;
    });
  }, [
    returns,
    borrowMap,
    borrowedItemLookup,
    bookDetails,
    docStorageDetails,
    docDetails,
    getBorrowerName
  ]);

  const filteredRows = useMemo(() => {
    const statusRule = statusFilters.find(opt => opt.value === statusFilter) || statusFilters[0];
    const dateRule = dateFilters.find(opt => opt.value === dateFilter) || dateFilters[0];
    const query = search.trim().toLowerCase();

    return fineRows.filter(row => {
      const matchesStatus = statusRule.predicate(row);
      const matchesDate = dateRule.predicate(row);
      const matchesSearch =
        !query ||
        [row.borrowerName, row.itemLabel, row.remarks, String(row.borrowId), row.condition || ""]
          .some(value => (value || "").toLowerCase().includes(query));
      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [fineRows, statusFilter, dateFilter, search]);

  const summary = useMemo(() => {
    const total = fineRows.reduce((sum, row) => sum + (row.fine || 0), 0);
    const collected = fineRows.filter(row => row.finePaid).reduce((sum, row) => sum + (row.fine || 0), 0);
    const outstanding = total - collected;
    const outstandingCount = fineRows.filter(row => row.fine > 0 && !row.finePaid).length;
    const paidCount = fineRows.filter(row => row.fine > 0 && row.finePaid).length;
    const lostCount = fineRows.filter(row => row.lost).length;
    return { total, collected, outstanding, outstandingCount, paidCount, lostCount, incidents: fineRows.length };
  }, [fineRows]);

  const outstandingColor = summary.outstanding > 0 ? theme.palette.error.main : theme.palette.success.main;
  const heroContent = heroCopy(formatCurrency(Number(settings?.fine ?? 0)));

  const filtersAreDefault = !search && statusFilter === "all" && dateFilter === "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const openPaymentDialog = row => {
    if (!row) return;
    setPaymentDialog({
      open: true,
      row,
      amount: row.fine ? row.fine.toFixed(2) : "",
      submitting: false,
      error: ""
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog(prev => {
      if (prev.submitting) {
        return prev;
      }
      return {
        open: false,
        row: null,
        amount: "",
        submitting: false,
        error: ""
      };
    });
  };

  const updatePaymentField = (field, value) => {
    setPaymentDialog(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentSubmit = async () => {
    if (!paymentDialog.row) {
      return;
    }

    const rawAmount = Number(paymentDialog.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      setPaymentDialog(prev => ({ ...prev, error: "Enter a valid payment amount." }));
      return;
    }

    const outstanding = Number(paymentDialog.row.fine || 0);
    if (Math.abs(rawAmount - outstanding) > 0.01) {
      setPaymentDialog(prev => ({
        ...prev,
        error: `Payment must match the outstanding fine of ${formatCurrency(outstanding)}.`
      }));
      return;
    }

    const payload = { amount: rawAmount };

    if (!paymentDialog.row.returnedItemId) {
      setPaymentDialog(prev => ({ ...prev, error: "Unable to identify the fine record. Please refresh and try again." }));
      return;
    }

    setPaymentDialog(prev => ({ ...prev, submitting: true, error: "" }));

    try {
      await axios.post(
        `${API_BASE}/return/${paymentDialog.row.returnId}/items/${paymentDialog.row.returnedItemId}/pay`,
        payload
      );
      setPaymentDialog({
        open: false,
        row: null,
        amount: "",
        submitting: false,
        error: ""
      });
      setSnackbar({ open: true, message: "Fine payment recorded.", severity: "success" });
      await refreshData();
    } catch (error) {
      const message = error?.response?.data?.error || "Unable to record payment.";
      setPaymentDialog(prev => ({ ...prev, submitting: false, error: message }));
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default", py: { xs: 3, md: 4 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box
            sx={{
              position: "relative",
              borderRadius: 3,
              overflow: "hidden",
              p: { xs: 2.5, md: 3.25 },
              backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.dark, 0.75)} 100%)`,
              color: theme.palette.mode === "dark" ? theme.palette.primary.contrastText : theme.palette.common.white,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              boxShadow: `0 18px 44px ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1.25}>
                <Typography variant="overline" sx={{ letterSpacing: 0.6, opacity: 0.85, fontWeight: 700 }}>
                  {heroContent.overline}
                </Typography>
                <Typography variant="h4" fontWeight={800} letterSpacing={0.5}>
                  {heroContent.title}
                </Typography>
                <Typography variant="body2" sx={{ maxWidth: 520, opacity: 0.9 }}>
                  {heroContent.description}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    icon={<AccountBalanceWallet fontSize="small" />}
                    label={`Total assessed: ${formatCurrency(summary.total)}`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.16),
                      color: alpha(theme.palette.common.white, 0.95),
                      fontWeight: 700
                    }}
                  />
                  <Chip
                    icon={<AssignmentLate fontSize="small" />}
                    label={`${summary.outstandingCount} outstanding`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.18),
                      color: theme.palette.error.contrastText,
                      fontWeight: 700
                    }}
                  />
                  <Chip
                    icon={<CheckCircle fontSize="small" />}
                    label={`${summary.paidCount} collected`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.success.light, 0.2),
                      color: theme.palette.success.contrastText,
                      fontWeight: 700
                    }}
                  />
                </Stack>
              </Stack>
              <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.78 }}>
                  Outstanding balance
                </Typography>
                <Typography variant="h3" fontWeight={800} sx={{ color: outstandingColor }}>
                  {formatCurrency(summary.outstanding)}
                </Typography>
                <Button
                  variant="contained"
                  color="inherit"
                  onClick={refreshData}
                  startIcon={<Refresh fontSize="small" />}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 2.5,
                    fontWeight: 700,
                    bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.18) : theme.palette.common.white,
                    color: theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.grey[900]
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                label: "Collected",
                value: formatCurrency(summary.collected),
                description: `${summary.paidCount} incidents fully paid`,
                icon: <Paid fontSize="small" />,
                color: theme.palette.success.main
              },
              {
                label: "Outstanding",
                value: formatCurrency(summary.outstanding),
                description: `${summary.outstandingCount} fines pending`,
                icon: <AssignmentLate fontSize="small" />,
                color: theme.palette.error.main
              },
              {
                label: "Lost cases",
                value: summary.lostCount,
                description: "Marked as lost during returns",
                icon: <WarningAmber fontSize="small" />,
                color: theme.palette.warning.main
              },
              {
                label: "Total incidents",
                value: summary.incidents,
                description: "Returned items evaluated",
                icon: <ReceiptLong fontSize="small" />,
                color: theme.palette.info.main
              }
            ].map(card => (
              <Grid key={card.label} item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(card.color, 0.35)}`,
                    boxShadow: `0 18px 32px ${alpha(card.color, 0.16)}`,
                    height: "100%"
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(card.color, 0.12), color: card.color, width: 48, height: 48 }}>
                          {card.icon}
                        </Avatar>
                        <Stack spacing={0.25}>
                          <Typography variant="overline" sx={{ color: card.color, letterSpacing: 0.6, fontWeight: 700 }}>
                            {card.label}
                          </Typography>
                          <Typography variant="h5" fontWeight={800}>
                            {card.value}
                          </Typography>
                        </Stack>
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
              subheader="Search and focus on specific fine scenarios"
              action={
                <Button
                  size="small"
                  onClick={resetFilters}
                  disabled={filtersAreDefault}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
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
                    label="Search borrower, item, remarks, or ID"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
                    Fine status
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={statusFilter}
                    onChange={(event, value) => value && setStatusFilter(value)}
                    sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}
                  >
                    {statusFilters.map(option => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        sx={{ textTransform: "none", borderRadius: 999, px: 1.5, fontWeight: 600 }}
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
                    Return window
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={dateFilter}
                    onChange={(event, value) => value && setDateFilter(value)}
                    sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}
                  >
                    {dateFilters.map(option => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        sx={{ textTransform: "none", borderRadius: 999, px: 1.5, fontWeight: 600 }}
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, overflow: "hidden" }}>
            <CardHeader
              title="Fine ledger"
              subheader={`${filteredRows.length} of ${summary.incidents} assessed items`}
              action={
                <Chip
                  icon={<AssignmentLate fontSize="small" />}
                  label={`${summary.outstandingCount} outstanding`}
                  color={summary.outstandingCount ? "error" : "default"}
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
            ) : filteredRows.length ? (
              <TableContainer sx={{ maxHeight: "70vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        "& th": {
                          fontWeight: 700,
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          bgcolor: theme.palette.background.paper,
                          borderBottom: `2px solid ${theme.palette.divider}`
                        }
                      }}
                    >
                      <TableCell width={140}>Status</TableCell>
                      <TableCell width={200}>Borrower</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell width={140} align="right">Fine</TableCell>
                      <TableCell width={140} align="center">Collected</TableCell>
                      <TableCell width={160}>Returned</TableCell>
                      <TableCell width={180}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& tr:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                      "& td": { borderBottom: `1px solid ${theme.palette.divider}` }
                    }}
                  >
                    {filteredRows.map(row => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Stack spacing={0.75}>
                            <Chip
                              size="small"
                              label={
                                row.lost
                                  ? "Lost"
                                  : row.finePaid
                                    ? "Collected"
                                    : row.fine > 0
                                      ? "Outstanding"
                                      : "No charge"
                              }
                              color={
                                row.lost
                                  ? "warning"
                                  : row.finePaid
                                    ? "success"
                                    : row.fine > 0
                                      ? "error"
                                      : "default"
                              }
                              sx={{ fontWeight: 600, borderRadius: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              Borrow #{row.borrowId}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.borrowerName}</Typography>
                          {row.borrowPurpose && (
                            <Typography variant="caption" color="text.secondary">
                              Purpose: {row.borrowPurpose}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>{row.itemLabel}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Condition: {row.condition || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(row.fine)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            color={row.finePaid ? "success" : row.fine > 0 ? "error" : "default"}
                            label={row.finePaid ? "Paid" : row.fine > 0 ? "Unpaid" : "—"}
                            sx={{ fontWeight: 600, borderRadius: 1 }}
                          />
                          {!row.finePaid && row.fine > 0 && row.returnedItemId && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Paid fontSize="small" />}
                              onClick={() => openPaymentDialog(row)}
                              sx={{ mt: 1, borderRadius: 1, fontWeight: 600 }}
                            >
                              Record payment
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>
                              {row.returnDate ? formatDate(row.returnDate) : "Pending"}
                            </Typography>
                            {row.receivedBy && (
                              <Typography variant="caption" color="text.secondary">
                                Staff ID #{row.receivedBy}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {row.remarks || "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <CardContent>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    p: 4,
                    borderStyle: "dashed",
                    borderColor: alpha(theme.palette.primary.main, 0.25),
                    textAlign: "center"
                  }}
                >
                  <Stack spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main }}>
                      <ReceiptLong fontSize="small" />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {filtersAreDefault ? "No fines recorded yet" : "No fines match the current filters"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" maxWidth={360}>
                      {filtersAreDefault
                        ? "Assessments will appear here once returns include fines or lost items."
                        : "Try a different filter or clear the search to widen the results."}
                    </Typography>
                  </Stack>
                </Paper>
              </CardContent>
            )}
          </Card>
        </Stack>

        <Dialog
          open={paymentDialog.open}
          onClose={closePaymentDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Record fine payment</DialogTitle>
          <DialogContent dividers>
            {paymentDialog.row && (
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {paymentDialog.row.itemLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Borrower: {paymentDialog.row.borrowerName} · Borrow #{paymentDialog.row.borrowId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Outstanding fine: {formatCurrency(paymentDialog.row.fine)}
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <TextField
                    label="Payment amount"
                    type="number"
                    value={paymentDialog.amount}
                    onChange={e => updatePaymentField("amount", e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText={`Must equal ${formatCurrency(paymentDialog.row.fine)}.`}
                    required
                    size="small"
                    fullWidth
                  />
                </Stack>

                {paymentDialog.error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {paymentDialog.error}
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={closePaymentDialog}
              disabled={paymentDialog.submitting}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={paymentDialog.submitting}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {paymentDialog.submitting ? "Saving…" : "Confirm payment"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FinesPage;
