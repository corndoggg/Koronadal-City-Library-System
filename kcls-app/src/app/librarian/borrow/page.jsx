import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
} from "@mui/material";
import { ExpandMore, Book, Article, Visibility } from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;

const statusOrder = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Returned: 4,
};

const getStatusChip = (tx) => {
  if (tx.ReturnStatus === "Returned") {
    return <Chip label="Returned" color="success" />;
  }
  if (tx.ApprovalStatus === "Pending") {
    return <Chip label="Pending" color="warning" />;
  }
  if (tx.ApprovalStatus === "Approved") {
    return <Chip label="Approved" color="primary" />;
  }
  if (tx.ApprovalStatus === "Rejected") {
    return <Chip label="Rejected" color="error" />;
  }
  return <Chip label={tx.ApprovalStatus} />;
};

const LibrarianBorrowPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bookDetails, setBookDetails] = useState({});
  const [docDetails, setDocDetails] = useState({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    // Fetch book and document details for all items in all transactions
    const fetchDetails = async () => {
      let bookCopyIds = [];
      let docStorageIds = [];
      transactions.forEach(tx => {
        (tx.items || []).forEach(item => {
          if (item.ItemType === "Book" && item.BookCopyID) bookCopyIds.push(item.BookCopyID);
          if (item.ItemType === "Document" && item.DocumentStorageID) docStorageIds.push(item.DocumentStorageID);
        });
      });
      bookCopyIds = [...new Set(bookCopyIds)];
      docStorageIds = [...new Set(docStorageIds)];

      // Book Details
      const bookInfo = {};
      for (const copyId of bookCopyIds) {
        let bookId = null;
        let invData = null;
        try {
          const invRes = await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`);
          invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          bookId = invData?.Book_ID;
        } catch {}
        if (!bookId) bookId = copyId;
        try {
          const bookRes = await axios.get(`${API_BASE}/books/${bookId}`);
          if (bookRes.data && bookRes.data.Title) {
            bookInfo[copyId] = { ...bookRes.data, ...invData };
          }
        } catch {}
      }

      // Document Details
      const docInfo = {};
      for (const storageId of docStorageIds) {
        let docId = null;
        let invData = null;
        try {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          docId = invData?.Document_ID;
        } catch {}
        if (!docId) docId = storageId;
        try {
          const docRes = await axios.get(`${API_BASE}/documents/${docId}`);
          if (docRes.data && docRes.data.Title) {
            docInfo[storageId] = { ...docRes.data, ...invData };
          }
        } catch {}
      }

      setBookDetails(bookInfo);
      setDocDetails(docInfo);
    };

    if (transactions.length > 0) fetchDetails();
  }, [transactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/borrow`);
      setTransactions(res.data || []);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  };

  // Sort transactions by status
  const sorted = (filterFn) =>
    [...transactions]
      .filter(filterFn)
      .sort((a, b) => statusOrder[(a.ReturnStatus === "Returned" ? "Returned" : a.ApprovalStatus)] - statusOrder[(b.ReturnStatus === "Returned" ? "Returned" : b.ApprovalStatus)]);

  // Accept/Reject handlers for books
  const handleApprove = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve`, { approvalStatus: "Approved" });
      fetchTransactions();
      setModalOpen(false);
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/reject`, { approvalStatus: "Rejected" });
      fetchTransactions();
      setModalOpen(false);
    } catch {}
    setActionLoading(false);
  };

  // Set as retrieved (for both books and documents)
  const handleSetRetrieved = async (tx) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/retrieved`, { retrievalStatus: "Retrieved" });
      fetchTransactions();
      setModalOpen(false);
    } catch {}
    setActionLoading(false);
  };

  // Modal for transaction details
  const renderTxModal = () => {
    if (!selectedTx) return null;
    return (
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" mb={1}><b>Borrower ID:</b> {selectedTx.BorrowerID}</Typography>
          <Typography variant="subtitle1" mb={1}><b>Purpose:</b> {selectedTx.Purpose}</Typography>
          <Typography variant="subtitle1" mb={1}><b>Date:</b> {selectedTx.BorrowDate?.slice(0, 10)}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Items:</Typography>
          <Stack direction="column" spacing={2}>
            {(selectedTx.items || []).map((item) => (
              <Stack key={item.BorrowedItemID} direction="row" alignItems="center" spacing={1}>
                <Chip
                  avatar={
                    <Avatar sx={{ bgcolor: item.ItemType === "Book" ? "primary.main" : "secondary.main" }}>
                      {item.ItemType === "Book" ? <Book fontSize="small" /> : <Article fontSize="small" />}
                    </Avatar>
                  }
                  label={
                    item.ItemType === "Book"
                      ? `Book Copy #${item.BookCopyID}`
                      : `Document Storage #${item.DocumentStorageID}`
                  }
                  color={item.ItemType === "Book" ? "primary" : "secondary"}
                />
                <Box>
                  {item.ItemType === "Book" && bookDetails[item.BookCopyID] ? (
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      <b>Title:</b> {bookDetails[item.BookCopyID].Title || "N/A"} &nbsp;
                      <b>Author:</b> {bookDetails[item.BookCopyID].Author || "N/A"} &nbsp;
                      <b>Edition:</b> {bookDetails[item.BookCopyID].Edition || "N/A"} &nbsp;
                      <b>Publisher:</b> {bookDetails[item.BookCopyID].Publisher || "N/A"} &nbsp;
                      <b>Year:</b> {bookDetails[item.BookCopyID].Year || "N/A"} &nbsp;
                      <b>ISBN:</b> {bookDetails[item.BookCopyID].ISBN || "N/A"}
                    </Typography>
                  ) : item.ItemType === "Book" ? (
                    <Typography variant="body2" sx={{ ml: 2, color: "text.secondary" }}>
                      Book details not found.
                    </Typography>
                  ) : null}
                  {item.ItemType === "Document" && docDetails[item.DocumentStorageID] ? (
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      <b>Title:</b> {docDetails[item.DocumentStorageID].Title || "N/A"} &nbsp;
                      <b>Author:</b> {docDetails[item.DocumentStorageID].Author || "N/A"} &nbsp;
                      <b>Category:</b> {docDetails[item.DocumentStorageID].Category || "N/A"} &nbsp;
                      <b>Department:</b> {docDetails[item.DocumentStorageID].Department || "N/A"} &nbsp;
                      <b>Year:</b> {docDetails[item.DocumentStorageID].Year || "N/A"}
                    </Typography>
                  ) : item.ItemType === "Document" ? (
                    <Typography variant="body2" sx={{ ml: 2, color: "text.secondary" }}>
                      Document details not found.
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          {selectedTx.ApprovalStatus === "Approved" && selectedTx.ReturnStatus !== "Returned" && (
            <Button
              onClick={() => handleSetRetrieved(selectedTx)}
              color="primary"
              disabled={actionLoading}
              variant="contained"
            >
              Mark as Retrieved
            </Button>
          )}
          {selectedTx.items.some(i => i.ItemType === "Book") && selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button
                onClick={() => handleApprove(selectedTx)}
                color="success"
                disabled={actionLoading}
                variant="contained"
              >
                Accept
              </Button>
              <Button
                onClick={() => handleReject(selectedTx)}
                color="error"
                disabled={actionLoading}
                variant="outlined"
              >
                Reject
              </Button>
            </>
          )}
          {selectedTx.items.every(i => i.ItemType === "Document") && selectedTx.ApprovalStatus === "Pending" && (
            <Button
              onClick={() => handleSetRetrieved(selectedTx)}
              color="primary"
              disabled={actionLoading}
              variant="contained"
            >
              Set as Retrieved
            </Button>
          )}
          <Button onClick={() => setModalOpen(false)} variant="text">Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box p={3} maxWidth="lg" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={2}>Borrow Transactions</Typography>
      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          {/* Pending */}
          <Typography variant="h6" mt={3} mb={1}>Pending</Typography>
          <Stack spacing={2}>
            {sorted(tx => tx.ApprovalStatus === "Pending" && tx.ReturnStatus !== "Returned").map(tx => (
              <Accordion key={tx.BorrowID} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                    {getStatusChip(tx)}
                    <Typography variant="body1" fontWeight={600}>
                      {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Purpose: {tx.Purpose}
                    </Typography>
                    <Tooltip title="View Details">
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                          setModalOpen(true);
                        }}
                        variant="outlined"
                      >
                        View
                      </Button>
                    </Tooltip>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Click "View" to see transaction details and take action.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
            {sorted(tx => tx.ApprovalStatus === "Pending" && tx.ReturnStatus !== "Returned").length === 0 && (
              <Typography color="text.secondary" align="center">No pending transactions.</Typography>
            )}
          </Stack>

          {/* Approved */}
          <Typography variant="h6" mt={4} mb={1}>Approved</Typography>
          <Stack spacing={2}>
            {sorted(tx => tx.ApprovalStatus === "Approved" && tx.ReturnStatus !== "Returned").map(tx => (
              <Accordion key={tx.BorrowID} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                    {getStatusChip(tx)}
                    <Typography variant="body1" fontWeight={600}>
                      {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Purpose: {tx.Purpose}
                    </Typography>
                    <Tooltip title="View Details">
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                          setModalOpen(true);
                        }}
                        variant="outlined"
                      >
                        View
                      </Button>
                    </Tooltip>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Approved by librarian.
                  </Typography>
                  <Button
                    sx={{ mt: 2 }}
                    onClick={() => {
                      setSelectedTx(tx);
                      setModalOpen(true);
                    }}
                    color="primary"
                    variant="contained"
                  >
                    Mark as Retrieved
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
            {sorted(tx => tx.ApprovalStatus === "Approved" && tx.ReturnStatus !== "Returned").length === 0 && (
              <Typography color="text.secondary" align="center">No approved transactions.</Typography>
            )}
          </Stack>

          {/* Rejected */}
          <Typography variant="h6" mt={4} mb={1}>Rejected</Typography>
          <Stack spacing={2}>
            {sorted(tx => tx.ApprovalStatus === "Rejected" && tx.ReturnStatus !== "Returned").map(tx => (
              <Accordion key={tx.BorrowID} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                    {getStatusChip(tx)}
                    <Typography variant="body1" fontWeight={600}>
                      {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Purpose: {tx.Purpose}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Rejected by librarian.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
            {sorted(tx => tx.ApprovalStatus === "Rejected" && tx.ReturnStatus !== "Returned").length === 0 && (
              <Typography color="text.secondary" align="center">No rejected transactions.</Typography>
            )}
          </Stack>

          {/* History (Returned) */}
          <Typography variant="h6" mt={4} mb={1}>History</Typography>
          <Stack spacing={2}>
            {sorted(tx => tx.ReturnStatus === "Returned").map(tx => (
              <Accordion key={tx.BorrowID} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                    {getStatusChip(tx)}
                    <Typography variant="body1" fontWeight={600}>
                      {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Purpose: {tx.Purpose}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="success.main">
                    This transaction has been returned.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
            {sorted(tx => tx.ReturnStatus === "Returned").length === 0 && (
              <Typography color="text.secondary" align="center">No history yet.</Typography>
            )}
          </Stack>
        </>
      )}
      {renderTxModal()}
    </Box>
  );
};

export default LibrarianBorrowPage;