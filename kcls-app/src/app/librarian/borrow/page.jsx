import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider, Avatar, MenuItem, Select,
  InputLabel, FormControl, TextField, Checkbox, FormControlLabel
} from "@mui/material";
import { Book, Article, Visibility, Search } from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;
const returnConditions = ["Good", "Slightly Damaged", "Heavily Damaged", "Lost"];

const getStatusChip = (tx) => {
  if (tx.ReturnStatus === "Returned") return <Chip label="Returned" color="success" size="small" />;
  if (tx.ApprovalStatus === "Pending") return <Chip label="Pending" color="warning" size="small" />;
  if (tx.ApprovalStatus === "Approved") return <Chip label="Approved" color="primary" size="small" />;
  if (tx.ApprovalStatus === "Rejected") return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={tx.ApprovalStatus} size="small" />;
};

const LibrarianBorrowPage = () => {
  const [transactions, setTransactions] = useState([]), [loading, setLoading] = useState(false),
    [selectedTx, setSelectedTx] = useState(null), [modalOpen, setModalOpen] = useState(false),
    [actionLoading, setActionLoading] = useState(false), [bookDetails, setBookDetails] = useState({}),
    [docDetails, setDocDetails] = useState({}), [users, setUsers] = useState([]), [dueDates, setDueDates] = useState({}),
    [returnModalOpen, setReturnModalOpen] = useState(false), [returnData, setReturnData] = useState({}), [returnTx, setReturnTx] = useState(null),
    [search, setSearch] = useState(""); // <-- search state

  useEffect(() => { fetchTransactions(); fetchUsers(); }, []);
  const fetchUsers = async () => { try { setUsers((await axios.get(`${API_BASE}/users`)).data || []); } catch { setUsers([]); } };
  const getBorrowerInfo = (id) => { const u = users.find(u => u.UserID === id); return u ? `${u.Firstname || ""} ${u.Middlename || ""} ${u.Lastname || ""} (${u.Email || ""})` : null; };

  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      const newDueDates = {};
      await Promise.all(transactions.map(async (tx) => {
        try { newDueDates[tx.BorrowID] = (await axios.get(`${API_BASE}/borrow/${tx.BorrowID}/due-date`)).data.DueDate; }
        catch { newDueDates[tx.BorrowID] = tx.ReturnDate || null; }
      }));
      setDueDates(newDueDates);
    })();
  }, [transactions]);

  useEffect(() => {
    if (!transactions.length) return;
    (async () => {
      let bookCopyIds = [], docStorageIds = [];
      transactions.forEach(tx => (tx.items || []).forEach(item => {
        if (item.ItemType === "Book" && item.BookCopyID) bookCopyIds.push(item.BookCopyID);
        if (item.ItemType === "Document" && item.DocumentStorageID) docStorageIds.push(item.DocumentStorageID);
      }));
      bookCopyIds = [...new Set(bookCopyIds)]; docStorageIds = [...new Set(docStorageIds)];
      const bookInfo = {}, docInfo = {};
      for (const copyId of bookCopyIds) {
        let bookId = null, invData = null;
        try { invData = Array.isArray((await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`)).data) ? (await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`)).data[0] : (await axios.get(`${API_BASE}/books/inventory/copy/${copyId}`)).data; bookId = invData?.Book_ID; } catch {}
        if (!bookId) bookId = copyId;
        try { const bookRes = await axios.get(`${API_BASE}/books/${bookId}`); if (bookRes.data && bookRes.data.Title) bookInfo[copyId] = { ...bookRes.data, ...invData }; } catch {}
      }
      for (const storageId of docStorageIds) {
        let docId = null, invData = null;
        try { invData = Array.isArray((await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`)).data) ? (await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`)).data[0] : (await axios.get(`${API_BASE}/documents/inventory/storage/${storageId}`)).data; docId = invData?.Document_ID; } catch {}
        if (!docId) docId = storageId;
        try { const docRes = await axios.get(`${API_BASE}/documents/${docId}`); if (docRes.data && docRes.data.Title) docInfo[storageId] = { ...docRes.data, ...invData }; } catch {}
      }
      setBookDetails(bookInfo); setDocDetails(docInfo);
    })();
  }, [transactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    try { setTransactions((await axios.get(`${API_BASE}/borrow`)).data || []); } catch { setTransactions([]); }
    setLoading(false);
  };

  const handleApprove = async (tx) => { setActionLoading(true); try { await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/approve`, { approvalStatus: "Approved" }); fetchTransactions(); setModalOpen(false); } catch {} setActionLoading(false); };
  const handleReject = async (tx) => { setActionLoading(true); try { await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/reject`, { approvalStatus: "Rejected" }); fetchTransactions(); setModalOpen(false); } catch {} setActionLoading(false); };
  const handleSetRetrieved = async (tx) => { setActionLoading(true); try { await axios.put(`${API_BASE}/borrow/${tx.BorrowID}/retrieved`, { retrievalStatus: "Retrieved" }); fetchTransactions(); setModalOpen(false); } catch {} setActionLoading(false); };

  // Return Modal Logic
  const openReturnModal = (tx) => {
    setReturnTx(tx);
    const data = {};
    (tx.items || []).forEach(item => { data[item.BorrowedItemID] = { condition: "Good", fine: 0, finePaid: false }; });
    setReturnData(data); setReturnModalOpen(true);
  };
  const handleReturnChange = (itemId, field, value) => setReturnData(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  const handleReturnSubmit = async () => {
    if (!returnTx) return;
    setActionLoading(true);
    try {
      const items = (returnTx.items || []).map(item => ({
        borrowedItemId: item.BorrowedItemID,
        returnCondition: returnData[item.BorrowedItemID].condition,
        fine: parseFloat(returnData[item.BorrowedItemID].fine) || 0,
        finePaid: returnData[item.BorrowedItemID].finePaid ? "Yes" : "No",
      }));
      await axios.post(`${API_BASE}/return`, {
        borrowId: returnTx.BorrowID,
        returnDate: new Date().toISOString().slice(0, 10),
        items,
      });
      setReturnModalOpen(false); fetchTransactions();
    } catch {}
    setActionLoading(false);
  };

  const renderReturnModal = () => !returnTx ? null : (
    <Dialog open={returnModalOpen} onClose={() => setReturnModalOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Return Items for Borrow #{returnTx.BorrowID}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {(returnTx.items || []).map(item => (
            <Box key={item.BorrowedItemID} sx={{ border: "1px solid #eee", borderRadius: 1, p: 2 }}>
              <Typography fontWeight={600}>
                {item.ItemType === "Book" ? `Book Copy #${item.BookCopyID}` : `Document Storage #${item.DocumentStorageID}`}
              </Typography>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Return Condition</InputLabel>
                <Select
                  label="Return Condition"
                  value={returnData[item.BorrowedItemID]?.condition || "Good"}
                  onChange={e => handleReturnChange(item.BorrowedItemID, "condition", e.target.value)}
                >
                  {returnConditions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Fine"
                type="number"
                value={returnData[item.BorrowedItemID]?.fine || 0}
                onChange={e => handleReturnChange(item.BorrowedItemID, "fine", e.target.value)}
                fullWidth sx={{ mt: 2 }} inputProps={{ min: 0, step: "0.01" }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!returnData[item.BorrowedItemID]?.finePaid}
                    onChange={e => handleReturnChange(item.BorrowedItemID, "finePaid", e.target.checked)}
                  />
                }
                label="Fine Paid" sx={{ mt: 1 }}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReturnModalOpen(false)} variant="outlined">Cancel</Button>
        <Button onClick={handleReturnSubmit} variant="contained" color="primary" disabled={actionLoading}>
          {actionLoading ? "Processing..." : "Submit Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderTxModal = () => {
    if (!selectedTx) return null;
    const dueDate = dueDates[selectedTx.BorrowID], borrowerInfo = getBorrowerInfo(selectedTx.BorrowerID);
    return (
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" mb={1}><b>Borrower:</b> {borrowerInfo || selectedTx.BorrowerID}</Typography>
          <Typography variant="subtitle1" mb={1}><b>Purpose:</b> {selectedTx.Purpose}</Typography>
          <Typography variant="subtitle1" mb={1}><b>Date:</b> {selectedTx.BorrowDate?.slice(0, 10)}</Typography>
          <Typography variant="subtitle1" mb={1}><b>Due Date:</b> {dueDate ? dueDate.slice(0, 10) : "N/A"}</Typography>
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
            <Button onClick={() => handleSetRetrieved(selectedTx)} color="primary" disabled={actionLoading} variant="contained">
              Mark as Retrieved
            </Button>
          )}
          {selectedTx.items.some(i => i.ItemType === "Book") && selectedTx.ApprovalStatus === "Pending" && (
            <>
              <Button onClick={() => handleApprove(selectedTx)} color="success" disabled={actionLoading} variant="contained">Accept</Button>
              <Button onClick={() => handleReject(selectedTx)} color="error" disabled={actionLoading} variant="outlined">Reject</Button>
            </>
          )}
          {selectedTx.items.every(i => i.ItemType === "Document") && selectedTx.ApprovalStatus === "Pending" && (
            <Button onClick={() => handleSetRetrieved(selectedTx)} color="primary" disabled={actionLoading} variant="contained">
              Set as Retrieved
            </Button>
          )}
          <Button onClick={() => setModalOpen(false)} variant="text">Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // --- Filter transactions by search ---
  const filteredTransactions = transactions.filter(tx => {
    const borrower = getBorrowerInfo(tx.BorrowerID) || "";
    const searchLower = search.toLowerCase();
    return (
      borrower.toLowerCase().includes(searchLower) ||
      (tx.Purpose || "").toLowerCase().includes(searchLower) ||
      (tx.BorrowDate || "").toLowerCase().includes(searchLower) ||
      (dueDates[tx.BorrowID] || "").toLowerCase().includes(searchLower) ||
      String(tx.BorrowID).includes(searchLower)
    );
  });

  // Helper to determine status order
  const getTxOrder = (tx) => {
    if (tx.ReturnStatus === "Returned") return 3;
    if (tx.ApprovalStatus === "Pending") return 0;
    // Overdue: not returned and due date in the past
    const due = dueDates[tx.BorrowID] ? new Date(dueDates[tx.BorrowID]) : null;
    if (due && due < new Date()) return 1;
    return 2; // Due (not overdue, not returned, not pending)
  };

  const sortedTransactions = [...filteredTransactions].sort((a, b) => getTxOrder(a) - getTxOrder(b));

  return (
    <Box p={3} maxWidth="lg" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={2}>Borrow Transactions</Typography>
      <Box mb={2} display="flex" alignItems="center" gap={1}>
        <Search color="action" />
        <TextField
          size="small"
          placeholder="Search by borrower, purpose, date, due date, or ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Box>
      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Borrower</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTransactions.map(tx => (
                <TableRow key={tx.BorrowID}>
                  <TableCell>{getStatusChip(tx)}</TableCell>
                  <TableCell>{tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}</TableCell>
                  <TableCell>{dueDates[tx.BorrowID] ? dueDates[tx.BorrowID].slice(0, 10) : "N/A"}</TableCell>
                  <TableCell>{getBorrowerInfo(tx.BorrowerID) || tx.BorrowerID}</TableCell>
                  <TableCell>{tx.Purpose}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <Button size="small" startIcon={<Visibility />} onClick={() => { setSelectedTx(tx); setModalOpen(true); }} variant="outlined">View</Button>
                      </Tooltip>
                      {tx.ReturnStatus !== "Returned" && (
                        <Tooltip title="Return Items">
                          <Button size="small" color="secondary" onClick={() => openReturnModal(tx)} variant="contained">Return</Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No transactions found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {renderTxModal()}
      {renderReturnModal()}
    </Box>
  );
};

export default LibrarianBorrowPage;