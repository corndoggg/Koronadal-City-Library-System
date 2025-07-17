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
  Tooltip,
  Avatar,
} from "@mui/material";
import { ExpandMore, Book, Article } from "@mui/icons-material";

const BorrowerBorrowPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookDetails, setBookDetails] = useState({});
  const [docDetails, setDocDetails] = useState({});

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId = user?.UserID;

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, []);

  // Fetch book/document details for all borrowed items
  useEffect(() => {
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

      // --- Book Details ---
      const bookInfo = {};
      for (const copyId of bookCopyIds) {
        let bookId = null;
        let invData = null;
        try {
          // Get inventory by copy id
          const invRes = await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`);
          invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          bookId = invData?.Book_ID;
        } catch {}
        try {
          // Try to fetch book details
          const bookRes = await axios.get(`${API_BASE}/books/${bookId}`);
          if (bookRes.data && bookRes.data.Title) {
            bookInfo[copyId] = { ...bookRes.data, ...invData };
          }
        } catch {}
      }

      // --- Document Details ---
      const docInfo = {};
      for (const storageId of docStorageIds) {
        let docId = null;
        let invData = null;
        try {
          // Get inventory by storage id
          const invRes = await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`);
          invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
          docId = invData?.Document_ID;
        } catch {}
        // Fallback: try to use storageId as Document_ID if inventory lookup fails
        if (!docId) docId = storageId;
        try {
          // Try to fetch document details
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
  }, [transactions, API_BASE]);

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

  // Sort transactions: Pending > Approved > Rejected > Returned (history)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const statusOrder = {
      Pending: 1,
      Approved: 2,
      Rejected: 3,
      Returned: 4,
    };
    const aStatus = a.ReturnStatus === "Returned" ? "Returned" : a.ApprovalStatus;
    const bStatus = b.ReturnStatus === "Returned" ? "Returned" : b.ApprovalStatus;
    return statusOrder[aStatus] - statusOrder[bStatus];
  });

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

  return (
    <Box p={3} maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={2}>
        My Borrow Transactions
      </Typography>
      {loading ? (
        <Box textAlign="center" py={6}>
          <CircularProgress />
        </Box>
      ) : sortedTransactions.length === 0 ? (
        <Typography color="text.secondary" align="center">
          No borrow transactions found.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {sortedTransactions.map((tx) => (
            <Accordion key={tx.BorrowID} disableGutters>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                  {getStatusChip(tx)}
                  <Typography variant="body1" fontWeight={600}>
                    {tx.BorrowDate ? new Date(tx.BorrowDate).toLocaleDateString() : "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Purpose: {tx.Purpose}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Borrowed Items:
                </Typography>
                <Stack direction="column" spacing={2} mb={2}>
                  {(tx.items || []).map((item) => (
                    <Box key={item.BorrowedItemID} sx={{ mb: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip
                          title={item.ItemType === "Book" ? "Book" : "Document"}
                          arrow
                        >
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
                        </Tooltip>
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
                    </Box>
                  ))}
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    <b>Status:</b> {tx.ReturnStatus === "Returned" ? "Returned" : tx.ApprovalStatus}
                  </Typography>
                  {tx.ReturnStatus === "Returned" && (
                    <Typography variant="body2" color="success.main">
                      This transaction has been returned.
                    </Typography>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default BorrowerBorrowPage;