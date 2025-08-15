import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Avatar,
  Button,
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
          try {
            const r = await axios.get(`${API_BASE}/borrow/${tx.BorrowID}/due-date`);
            obj[tx.BorrowID] = r.data?.DueDate || null;
          } catch {
            obj[tx.BorrowID] = tx.ReturnDate || null;
          }
        })
      );
      setDueDates(obj);
    })();
  }, [transactions, API_BASE]);

  // fetch item metadata
  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      let bookCopyIds = [];
      let docStorageIds = [];
      transactions.forEach((tx) =>
        (tx.items || []).forEach((it) => {
          if (it.ItemType === "Book" && it.BookCopyID) bookCopyIds.push(it.BookCopyID);
          if (it.ItemType === "Document" && it.DocumentStorageID) docStorageIds.push(it.DocumentStorageID);
        })
      );
      bookCopyIds = [...new Set(bookCopyIds)];
      docStorageIds = [...new Set(docStorageIds)];

      const bInfo = {};
      for (const id of bookCopyIds) {
        try {
          const invRes = await axios.get(`${API_BASE}/books/inventory/copy/${id}`);
          const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          const bRes = await axios.get(`${API_BASE}/books/${invData?.Book_ID || id}`);
          if (bRes.data?.Title) bInfo[id] = { ...bRes.data, ...invData };
        } catch {}
      }

      const dInfo = {};
      for (const sid of docStorageIds) {
        try {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${sid}`);
          const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          const dRes = await axios.get(`${API_BASE}/documents/${invData?.Document_ID || sid}`);
          if (dRes.data?.Title) dInfo[sid] = { ...dRes.data, ...invData };
        } catch {}
      }

      setBookDetails(bInfo);
      setDocDetails(dInfo);
    })();
  }, [transactions, API_BASE]);

  // derive status
  const deriveStatus = (tx) => {
    const dueRaw = dueDates[tx.BorrowID];
    const due = dueRaw ? new Date(dueRaw) : null;
    const today = new Date();
    if (tx.ReturnStatus === "Returned") return { label: "Returned", color: "success", tone: "success" };
    if (tx.ApprovalStatus === "Rejected") return { label: "Rejected", color: "error", tone: "error" };
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
  };

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

  // sorting (priority)
  const statusOrder = (tx) => {
    const lbl = deriveStatus(tx).label;
    if (lbl.startsWith("Overdue")) return 0;
    if (lbl === "Pending Approval") return 1;
    if (lbl === "Approved") return 2;
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

  // summaries
  const count = (fn) => transactions.filter(fn).length;
  const summary = useMemo(
    () => [
      { label: "Pending", value: count((t) => deriveStatus(t).label === "Pending Approval"), color: "warning.main" },
      { label: "Approved", value: count((t) => deriveStatus(t).label === "Approved"), color: "info.main" },
      { label: "Borrowed", value: count((t) => deriveStatus(t).label === "Borrowed"), color: "secondary.main" },
      { label: "Overdue", value: count((t) => deriveStatus(t).label.startsWith("Overdue")), color: "error.main" },
      { label: "Returned", value: count((t) => deriveStatus(t).label === "Returned"), color: "success.main" }
    ],
    [transactions, dueDates]
  );

  const openDetail = (tx) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedTx(null);
  };

  const MetaLine = ({ k, v }) =>
    v ? (
      <Typography variant="caption" sx={{ display: "block", lineHeight: 1.3 }}>
        <b>{k}:</b> {v}
      </Typography>
    ) : null;

  return (
    <Box p={{ xs: 2, md: 3 }} sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
            p: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.25,
            alignItems: "center",
            border: (t) => `2px solid ${t.palette.divider}`,
            borderRadius: 1,
            bgcolor: "background.paper"
        }}
      >
        <Box>
          <Typography fontWeight={800} fontSize={18} lineHeight={1}>
            My Borrow Transactions
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Track requests, borrowed and returned items
          </Typography>
        </Box>
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
            ml: { xs: 0, md: "auto" },
            width: { xs: "100%", md: 340 },
            "& .MuiOutlinedInput-root": { borderRadius: 1 }
          }}
        />
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={fetchTransactions}
            sx={{
              borderRadius: 1,
              border: (t) => `1.5px solid ${t.palette.divider}`,
              "&:hover": { bgcolor: "action.hover" }
            }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Summaries */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1.25}
        sx={{ mb: 2 }}
      >
        {summary.map((s) => (
          <Paper
            key={s.label}
            elevation={0}
            sx={{
              px: 1.5,
              py: 1,
              minWidth: 115,
              border: (t) => `1.5px solid ${alpha(t.palette.getContrastText("#fff"), 0.08)}`,
              borderColor: (t) => alpha(t.palette.getContrastText("#fff"), 0.09),
              bgcolor: (t) => {
                const parts = (s.color || "").split(".");
                let baseColor = s.color;
                if (parts.length === 2 && t.palette[parts[0]] && t.palette[parts[0]][parts[1]]) {
                  baseColor = t.palette[parts[0]][parts[1]];
                } else if (parts.length === 1 && t.palette[parts[0]] && t.palette[parts[0]].main) {
                  baseColor = t.palette[parts[0]].main;
                }
                return alpha(baseColor || t.palette.primary.main, 0.08);
              },
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0.25
            }}
          >
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {s.label}
            </Typography>
            <Typography fontWeight={800} fontSize={18} lineHeight={1}>
              {s.value}
            </Typography>
          </Paper>
        ))}
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

      <Stack spacing={1.75}>
        {sorted.map((tx) => {
          const st = deriveStatus(tx);
          const due = dueDates[tx.BorrowID];
          return (
            <Paper
              key={tx.BorrowID}
              elevation={0}
              sx={{
                p: 1.5,
                border: (t) => `2px solid ${alpha(
                  st.tone === "default"
                    ? t.palette.divider
                    : (t.palette[st.tone] && t.palette[st.tone].main) || t.palette.divider,
                  0.55
                )}`,
                borderRadius: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                bgcolor: "background.paper"
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <StatusChip tx={tx} />
                <Typography fontSize={13} fontWeight={700}>
                  Borrow #{tx.BorrowID}
                </Typography>
                <Divider flexItem orientation="vertical" />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Borrowed: {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "—"}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color={
                    due && !st.label.startsWith("Returned") && new Date(due) < new Date()
                      ? "error.main"
                      : "text.secondary"
                  }
                >
                  Due: {due ? due.slice(0, 10) : "—"}
                </Typography>
                <Box ml="auto" />
                <Tooltip title="View details">
                  <IconButton
                    size="small"
                    onClick={() => openDetail(tx)}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 0.75,
                      "&:hover": { bgcolor: "action.hover" }
                    }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Divider />

              <Stack direction="row" gap={1} flexWrap="wrap">
                {(tx.items || []).slice(0, 4).map((item) => {
                  const isBook = item.ItemType === "Book";
                  return (
                    <Chip
                      key={item.BorrowedItemID}
                      size="small"
                      avatar={
                        <Avatar
                          sx={{
                            bgcolor: isBook ? "primary.main" : "secondary.main",
                            color: "#fff",
                            width: 28,
                            height: 28,
                            borderRadius: 1
                          }}
                        >
                          {isBook ? <Book fontSize="small" /> : <Article fontSize="small" />}
                        </Avatar>
                      }
                      label={
                        isBook
                          ? `Book Copy #${item.BookCopyID}`
                          : `Doc Storage #${item.DocumentStorageID}`
                      }
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 0.75, pl: 0.5 }}
                    />
                  );
                })}
                {(tx.items || []).length > 4 && (
                  <Chip
                    size="small"
                    label={`+${(tx.items || []).length - 4} more`}
                    sx={{ fontWeight: 600, borderRadius: 0.75 }}
                  />
                )}
              </Stack>

              {tx.Purpose && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    px: 1,
                    py: 0.5,
                    border: (t) => `1px dashed ${t.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: "background.default",
                    fontWeight: 500
                  }}
                >
                  Purpose: {tx.Purpose}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Stack>

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
                <MetaLine k="Borrowed" v={selectedTx.BorrowDate?.slice(0, 10)} />
                <MetaLine
                  k="Due"
                  v={dueDates[selectedTx.BorrowID]?.slice(0, 10)}
                />
                <MetaLine k="Purpose" v={selectedTx.Purpose} />
                <MetaLine k="Status" v={deriveStatus(selectedTx).label} />
              </Paper>

              <Box>
                <Typography fontWeight={800} fontSize={13} mb={1}>
                  Items ({selectedTx.items?.length || 0})
                </Typography>
                <Stack spacing={1.25}>
                  {(selectedTx.items || []).map((item) => {
                    const isBook = item.ItemType === "Book";
                    const b = isBook ? bookDetails[item.BookCopyID] : docDetails[item.DocumentStorageID];
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
                              isBook
                                ? `Book Copy #${item.BookCopyID}`
                                : `Doc Storage #${item.DocumentStorageID}`
                            }
                            size="small"
                            color={isBook ? "primary" : "secondary"}
                            sx={{ fontWeight: 600, borderRadius: 0.75 }}
                          />
                        </Stack>
                        {b ? (
                          <Stack mt={1} spacing={0.25} pl={0.5}>
                            {isBook && (
                              <>
                                <MetaLine k="Title" v={b.Title} />
                                <MetaLine k="Author" v={b.Author} />
                                <MetaLine k="Edition" v={b.Edition} />
                                <MetaLine k="Publisher" v={b.Publisher} />
                                <MetaLine k="Year" v={b.Year} />
                                <MetaLine k="ISBN" v={b.ISBN} />
                                <MetaLine k="Condition (Out)" v={b.Condition || b.condition} />
                              </>
                            )}
                            {!isBook && (
                              <>
                                <MetaLine k="Title" v={b.Title} />
                                <MetaLine k="Author" v={b.Author} />
                                <MetaLine k="Category" v={b.Category} />
                                <MetaLine k="Department" v={b.Department} />
                                <MetaLine k="Year" v={b.Year} />
                                <MetaLine k="Classification" v={b.Classification} />
                                <MetaLine k="Condition (Out)" v={b.Condition || b.condition} />
                              </>
                            )}
                          </Stack>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            mt={1}
                            pl={0.5}
                          >
                            Details not available.
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
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
    </Box>
  );
};

export default BorrowerBorrowPage;