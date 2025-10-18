import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
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
import { formatDate, formatDateTime } from "../../../utils/date";

const API_BASE = import.meta.env.VITE_API_BASE;
const SCANNER_BASE = (import.meta.env.VITE_SCANNER_BASE || "http://localhost:7070").replace(/\/$/, "");

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
    error: "",
    printAfter: true
  });
  const [printingState, setPrintingState] = useState({ rowId: null, loading: false });

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

  const buildReceiptPayload = useCallback(
    row => {
      if (!row) return null;
      const receiptNumber = `${row.returnId || ""}-${row.returnedItemId || row.borrowedItemId || ""}`.replace(/(^-|-$)/g, "") || `${row.returnId || "return"}`;
      const printedAt = formatDateTime(new Date());
      const returnDateText = row.returnDate ? formatDateTime(row.returnDate) : "Pending";
      const borrowDateText = row.borrowDate ? formatDateTime(row.borrowDate) : "—";
      const libraryName = (String(settings?.library_name || settings?.libraryName || "Koronadal City Library").trim() || "Koronadal City Library");

      const lines = [
        libraryName,
        "Fine Payment Receipt",
        "----------------------------------------",
        `Receipt #: ${receiptNumber}`,
        `Printed: ${printedAt}`,
        "",
        `Borrower: ${row.borrowerName || "Unknown"}`,
        `Borrow #: ${row.borrowId || "—"}`,
        `Borrowed on: ${borrowDateText}`,
        `Item: ${row.itemLabel || "Library item"}`,
        `Return date: ${returnDateText}`,
        "",
        `Fine amount: ${formatCurrency(row.fine)}`,
        `Status: Paid`,
        "",
        `Received by: ${row.receivedBy ? `Staff ${row.receivedBy}` : "—"}`,
        `Remarks: ${row.remarks || "None"}`,
        "",
        "Thank you for settling your balance.",
        ""
      ];

      return {
        content: lines.join("\r\n"),
        jobName: `FineReceipt-${receiptNumber}`,
        copies: 1,
        metadata: {
          receiptNumber,
          borrowId: row.borrowId,
          returnId: row.returnId,
          returnedItemId: row.returnedItemId || row.borrowedItemId,
          borrowerId: row.borrowerId,
          borrowerName: row.borrowerName,
          amount: row.fine,
          printedAt
        }
      };
    },
    [settings]
  );

  const sendReceiptToScanner = useCallback(
    async row => {
      if (!SCANNER_BASE) {
        throw new Error("Scanner client URL is not configured.");
      }
      const payload = buildReceiptPayload(row);
      if (!payload) {
        throw new Error("Receipt details are missing.");
      }

      const response = await fetch(`${SCANNER_BASE}/print-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let message = `Printer responded with status ${response.status}`;
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {
          const text = await response.text().catch(() => "");
          if (text) message = text;
        }
        throw new Error(message);
      }

      return response.json().catch(() => null);
    },
    [buildReceiptPayload]
  );

  const handlePrintReceipt = useCallback(
    async row => {
      if (!row) return;
      setPrintingState({ rowId: row.id, loading: true });
      try {
        await sendReceiptToScanner({ ...row, finePaid: true });
        setSnackbar({ open: true, message: "Receipt sent to printer.", severity: "success" });
      } catch (error) {
        const message = error?.message || "Failed to print receipt.";
        setSnackbar({ open: true, message, severity: "error" });
      } finally {
        setPrintingState({ rowId: null, loading: false });
      }
    },
    [sendReceiptToScanner, setSnackbar]
  );

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
  const fineRateText = formatCurrency(Number(settings?.fine ?? 0));

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
      error: "",
      printAfter: true
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
        error: "",
        printAfter: true
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

      const receiptRow = paymentDialog.printAfter ? { ...paymentDialog.row, finePaid: true } : null;
      let snackbarSeverity = "success";
      let snackbarMessage = "Fine payment recorded.";

      if (paymentDialog.printAfter && receiptRow) {
        try {
          await sendReceiptToScanner(receiptRow);
          snackbarMessage = "Fine payment recorded. Receipt sent to printer.";
        } catch (printError) {
          const errMessage = printError?.message || "Receipt printing failed.";
          snackbarSeverity = "warning";
          snackbarMessage = `Fine payment recorded but printing failed: ${errMessage}`;
        }
      }

      setPaymentDialog({
        open: false,
        row: null,
        amount: "",
        submitting: false,
        error: "",
        printAfter: true
      });
      setSnackbar({ open: true, message: snackbarMessage, severity: snackbarSeverity });
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
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: { xs: 2, md: 2.5 },
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 2, md: 3 },
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between"
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                Fine Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
                Monitor assessed fines, settle balances, and keep lost cases visible. The default overdue rate is {fineRateText} per day.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" sx={{ mt: 1.25 }}>
                <Chip
                  icon={<AccountBalanceWallet fontSize="small" />}
                  label={`Total assessed: ${formatCurrency(summary.total)}`}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
                <Chip
                  icon={<AssignmentLate fontSize="small" />}
                  label={`${summary.outstandingCount} outstanding`}
                  size="small"
                  color={summary.outstandingCount ? "error" : "default"}
                  variant={summary.outstandingCount ? "filled" : "outlined"}
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
                <Chip
                  icon={<CheckCircle fontSize="small" />}
                  label={`${summary.paidCount} collected`}
                  size="small"
                  color={summary.paidCount ? "success" : "default"}
                  variant={summary.paidCount ? "filled" : "outlined"}
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
                <Chip
                  icon={<WarningAmber fontSize="small" />}
                  label={`${summary.lostCount} lost cases`}
                  size="small"
                  color={summary.lostCount ? "warning" : "default"}
                  variant={summary.lostCount ? "filled" : "outlined"}
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
              </Stack>
            </Box>
            <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ minWidth: { md: 220 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
                Outstanding balance
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: outstandingColor }}>
                {formatCurrency(summary.outstanding)}
              </Typography>
              <Button
                onClick={refreshData}
                startIcon={<Refresh fontSize="small" />}
                disabled={loading}
                variant="outlined"
                size="small"
                sx={{ borderRadius: 1, fontWeight: 600 }}
              >
                Refresh
              </Button>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 } }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main }}>
                  <FilterAlt fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Filters
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Search and focus on specific fine scenarios
                  </Typography>
                </Box>
              </Stack>
              <Button
                size="small"
                onClick={resetFilters}
                disabled={filtersAreDefault}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Clear all
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
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
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              sx={{ p: { xs: 2, md: 2.5 }, pb: 0 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Fine ledger
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {`${filteredRows.length} of ${summary.incidents} assessed items`}
                </Typography>
              </Box>
              <Chip
                icon={<AssignmentLate fontSize="small" />}
                label={`${summary.outstandingCount} outstanding`}
                color={summary.outstandingCount ? "error" : "default"}
                size="small"
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
            </Stack>
            <Divider sx={{ mt: 2 }} />
            {loading ? (
              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                </Stack>
              </Box>
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
                    {filteredRows.map(row => {
                      const isPrintingRow = printingState.loading && printingState.rowId === row.id;
                      const printingLocked = printingState.loading && printingState.rowId !== null && printingState.rowId !== row.id;
                      return (
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
                          {row.finePaid && row.fine > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ReceiptLong fontSize="small" />}
                              disabled={printingLocked || isPrintingRow}
                              onClick={() => handlePrintReceipt(row)}
                              sx={{ mt: 1, borderRadius: 1, fontWeight: 600 }}
                            >
                              {isPrintingRow ? "Printing…" : "Print receipt"}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
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
              </Box>
            )}
          </Paper>
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
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(paymentDialog.printAfter)}
                        onChange={e => updatePaymentField("printAfter", e.target.checked)}
                        disabled={paymentDialog.submitting}
                      />
                    }
                    label="Print receipt after saving"
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
