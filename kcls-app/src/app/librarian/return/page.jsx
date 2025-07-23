import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import { ExpandMore, Visibility } from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;

const returnConditions = [
  "Good",
  "Slightly Damaged",
  "Heavily Damaged",
  "Lost",
];

function getStatus(tx, dueDate) {
  if (tx.ReturnStatus === "Returned") return "Returned";
  if (!dueDate) return "Unknown";
  const today = new Date();
  const due = new Date(dueDate);
  if (today > due) return "Overdue";
  if ((due - today) / (1000 * 60 * 60 * 24) <= 2) return "Incoming Due";
  return "Borrowed";
}

const LibrarianReturnPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [dueDates, setDueDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [returnData, setReturnData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Fetch borrow transactions that are not returned
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/borrow`);
      // Only those not returned
      const notReturned = (res.data || []).filter(tx => tx.ReturnStatus !== "Returned");
      setTransactions(notReturned);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  };

  // Fetch due dates for all transactions
  useEffect(() => {
    const fetchDueDates = async () => {
      if (!transactions.length) return;
      const newDueDates = {};
      await Promise.all(transactions.map(async (tx) => {
        try {
          const res = await axios.get(`${API_BASE}/borrow/${tx.BorrowID}/due-date`);
          newDueDates[tx.BorrowID] = res.data.DueDate;
        } catch {
          newDueDates[tx.BorrowID] = null;
        }
      }));
      setDueDates(newDueDates);
    };
    fetchDueDates();
  }, [transactions]);

  // Categorize
  const categorized = {
    "Overdue": [],
    "Incoming Due": [],
    "Borrowed": [],
    "All": [],
  };
  transactions.forEach(tx => {
    const due = dueDates[tx.BorrowID];
    const status = getStatus(tx, due);
    if (status === "Overdue") categorized["Overdue"].push(tx);
    else if (status === "Incoming Due") categorized["Incoming Due"].push(tx);
    else if (status === "Borrowed") categorized["Borrowed"].push(tx);
    categorized["All"].push(tx);
  });

  // Modal handlers
  const openReturnModal = (tx) => {
    setSelectedTx(tx);
    // Prepare default return data for each item
    const data = {};
    (tx.items || []).forEach(item => {
      data[item.BorrowedItemID] = {
        condition: "Good",
        fine: 0,
        finePaid: false,
      };
    });
    setReturnData(data);
    setModalOpen(true);
  };

  const handleReturnChange = (itemId, field, value) => {
    setReturnData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  // Submit return
  const handleReturnSubmit = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      const items = (selectedTx.items || []).map(item => ({
        borrowedItemId: item.BorrowedItemID,
        returnCondition: returnData[item.BorrowedItemID].condition,
        fine: parseFloat(returnData[item.BorrowedItemID].fine) || 0,
        finePaid: returnData[item.BorrowedItemID].finePaid ? "Yes" : "No",
      }));
      await axios.post(`${API_BASE}/return`, {
        borrowId: selectedTx.BorrowID,
        returnDate: new Date().toISOString().slice(0, 10),
        items,
      });
      setModalOpen(false);
      fetchTransactions();
    } catch {
      // handle error
    }
    setActionLoading(false);
  };

  // Modal UI
  const renderReturnModal = () => {
    if (!selectedTx) return null;
    return (
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Return Items for Borrow #{selectedTx.BorrowID}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {(selectedTx.items || []).map(item => (
              <Box key={item.BorrowedItemID} sx={{ border: "1px solid #eee", borderRadius: 1, p: 2 }}>
                <Typography fontWeight={600}>
                  {item.ItemType === "Book"
                    ? `Book Copy #${item.BookCopyID}`
                    : `Document Storage #${item.DocumentStorageID}`}
                </Typography>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel>Return Condition</InputLabel>
                  <Select
                    label="Return Condition"
                    value={returnData[item.BorrowedItemID]?.condition || "Good"}
                    onChange={e => handleReturnChange(item.BorrowedItemID, "condition", e.target.value)}
                  >
                    {returnConditions.map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Fine"
                  type="number"
                  value={returnData[item.BorrowedItemID]?.fine || 0}
                  onChange={e => handleReturnChange(item.BorrowedItemID, "fine", e.target.value)}
                  fullWidth
                  sx={{ mt: 2 }}
                  inputProps={{ min: 0, step: "0.01" }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!returnData[item.BorrowedItemID]?.finePaid}
                      onChange={e => handleReturnChange(item.BorrowedItemID, "finePaid", e.target.checked)}
                    />
                  }
                  label="Fine Paid"
                  sx={{ mt: 1 }}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleReturnSubmit}
            variant="contained"
            color="primary"
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : "Submit Return"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Section rendering
  const renderSection = (title, txs) => (
    <>
      <Typography variant="h6" mt={4} mb={1}>{title}</Typography>
      <Stack spacing={2}>
        {txs.map(tx => (
          <Accordion key={tx.BorrowID} disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                <Chip
                  label={getStatus(tx, dueDates[tx.BorrowID])}
                  color={
                    getStatus(tx, dueDates[tx.BorrowID]) === "Overdue"
                      ? "error"
                      : getStatus(tx, dueDates[tx.BorrowID]) === "Incoming Due"
                      ? "warning"
                      : "primary"
                  }
                />
                <Typography variant="body1" fontWeight={600}>
                  {tx.BorrowDate ? tx.BorrowDate.slice(0, 10) : "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Due: {dueDates[tx.BorrowID] ? dueDates[tx.BorrowID].slice(0, 10) : "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Borrower: {tx.BorrowerID}
                </Typography>
                <Tooltip title="Return Items">
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={e => {
                      e.stopPropagation();
                      openReturnModal(tx);
                    }}
                    variant="outlined"
                  >
                    Return
                  </Button>
                </Tooltip>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Click "Return" to process item returns.
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
        {txs.length === 0 && (
          <Typography color="text.secondary" align="center">No transactions.</Typography>
        )}
      </Stack>
    </>
  );

  return (
    <Box p={3} maxWidth="lg" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={2}>Return Transactions</Typography>
      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          {renderSection("Overdue", categorized["Overdue"])}
          {renderSection("Incoming Due", categorized["Incoming Due"])}
          {renderSection("Borrowed", categorized["Borrowed"])}
          {renderSection("All", categorized["All"])}
        </>
      )}
      {renderReturnModal()}
    </Box>
  );
};

export default LibrarianReturnPage;