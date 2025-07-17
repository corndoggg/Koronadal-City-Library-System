import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  InputAdornment,
  CircularProgress,
  Divider,
  Button,
  Snackbar,
  Alert,
  Fab,
  Badge,
  Drawer,
  IconButton,
} from "@mui/material";
import { Book, Article, Search, ShoppingCart, Close } from "@mui/icons-material";

const BrowseLibraryPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [tab, setTab] = useState(0);
  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState("All");
  const [loading, setLoading] = useState(false);
  const [borrowed, setBorrowed] = useState([]);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId = user?.UserID;

  useEffect(() => {
    fetchData();
    fetchBorrowed();
    // eslint-disable-next-line
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`)
      ]);
      // Fetch inventory for each book/document to show availability
      const booksWithInventory = await Promise.all(
        (booksRes.data || []).map(async (book) => {
          const invRes = await axios.get(`${API_BASE}/books/inventory/${book.Book_ID}`);
          book.inventory = invRes.data || [];
          return book;
        })
      );
      const docsWithInventory = await Promise.all(
        (docsRes.data || []).map(async (doc) => {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/${doc.Document_ID}`);
          doc.inventory = invRes.data || [];
          return doc;
        })
      );
      setBooks(booksWithInventory);
      setDocuments(docsWithInventory);
    } catch {
      setBooks([]);
      setDocuments([]);
    }
    setLoading(false);
  };

  const fetchBorrowed = async () => {
    if (!borrowerId) return;
    try {
      const res = await axios.get(`${API_BASE}/borrow/borrower/${borrowerId}`);
      setBorrowed(res.data || []);
    } catch {
      setBorrowed([]);
    }
  };

  const handleTabChange = (_, v) => setTab(v);

  const filterItems = (items, allKeys) => {
    return items.filter(item => {
      if (!search) return true;
      if (searchKey === "All") {
        return allKeys.some(key =>
          (item[key] || "").toLowerCase().includes(search.toLowerCase())
        );
      } else {
        return (item[searchKey] || "").toLowerCase().includes(search.toLowerCase());
      }
    });
  };

  // Check if the user has borrowed or has a pending borrow for this specific book/document and not returned it
  const isItemBorrowedOrPending = (item, isBook) => {
    return borrowed.some(tx =>
      (tx.items || []).some(bi =>
        isBook
          ? bi.BookCopyID && item.Book_ID && bi.BookCopyID === item.Book_ID
          : bi.DocumentStorageID && item.Document_ID && bi.DocumentStorageID === item.Document_ID
      ) && (tx.ReturnStatus !== "Returned" || tx.ApprovalStatus === "Pending")
    );
  };

  // Check if item is already in cart
  const isInCart = (item, isBook) =>
    cart.some(ci =>
      ci.type === (isBook ? "Book" : "Document") &&
      ((isBook && ci.item.Book_ID === item.Book_ID) ||
        (!isBook && ci.item.Document_ID === item.Document_ID))
    );

  // Add to cart handler
  const handleAddToCart = async (item, isBook) => {
    // Find first available inventory
    let available;
    if (isBook) {
      available = (item.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
    } else {
      available = (item.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
    }
    if (!available) {
      setToast({ open: true, message: "No available copy for this item.", severity: "info" });
      return;
    }
    setCart([...cart, { type: isBook ? "Book" : "Document", item, inventory: available }]);
    setToast({ open: true, message: "Added to cart!", severity: "success" });
  };

  // Remove from cart
  const handleRemoveFromCart = idx => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  // Borrow all items in cart
  const handleBorrowAll = async () => {
    if (!borrowerId) {
      setToast({ open: true, message: "You must be logged in as a borrower.", severity: "error" });
      return;
    }
    if (cart.length === 0) {
      setToast({ open: true, message: "Your cart is empty.", severity: "warning" });
      return;
    }
    setBorrowLoading(true);
    try {
      const items = cart.map(ci =>
        ci.type === "Book"
          ? {
              itemType: "Book",
              bookCopyId: ci.inventory.Copy_ID,
              initialCondition: ci.inventory.condition || "",
            }
          : {
              itemType: "Document",
              documentStorageId: ci.inventory.Storage_ID,
              initialCondition: ci.inventory.Condition || ci.inventory.condition || "",
            }
      );
      await axios.post(`${API_BASE}/borrow`, {
        borrowerId,
        purpose: "Personal Reading",
        items,
        borrowDate: new Date().toISOString().slice(0, 10),
      });
      setToast({ open: true, message: "Borrow request submitted!", severity: "success" });
      setCart([]);
      fetchBorrowed();
    } catch {
      setToast({ open: true, message: "Failed to borrow items.", severity: "error" });
    }
    setBorrowLoading(false);
    setCartOpen(false);
  };

  const renderDetails = (item, isBook) => (
    <Box>
      <Box
        sx={{
          width: "100%",
          height: 120,
          background: "#e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <img
          src={
            isBook
              ? "https://placehold.co/400x120?text=Book+Cover"
              : "https://placehold.co/400x120?text=PDF+Document"
          }
          alt={isBook ? "Book Cover" : "PDF Document"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
      {isBook ? (
        <>
          <Typography variant="body2"><b>Author:</b> {item.Author}</Typography>
          <Typography variant="body2"><b>Publisher:</b> {item.Publisher}</Typography>
          <Typography variant="body2"><b>ISBN:</b> {item.ISBN}</Typography>
          <Typography variant="body2"><b>Year:</b> {item.Year}</Typography>
          <Typography variant="body2"><b>Edition:</b> {item.Edition}</Typography>
        </>
      ) : (
        <>
          <Typography variant="h6" fontWeight={700}>{item.Title}</Typography>
          <Typography variant="body2">{item.Author || "N/A"}</Typography>
          <Typography variant="body2">{item.Category || "Other"} • {item.Year || "N/A"}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Dept:</b> {item.Department || "N/A"}
          </Typography>
          <Typography variant="body2">
            <b>Classification:</b> {item.Classification || "N/A"}
          </Typography>
          <Typography variant="body2">
            <b>Sensitivity:</b> {item.Sensitivity || "N/A"}
          </Typography>
        </>
      )}
    </Box>
  );

  return (
    <Box p={3} pb={10}>
      <Typography variant="h4" fontWeight={700} mb={2}>Browse Library</Typography>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <TextField
          placeholder="Search books or documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ width: 350 }}
        />
        <TextField
          select
          label="Filter by"
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          sx={{ width: 150 }}
          size="small"
          SelectProps={{ native: true }}
        >
          <option value="All">All</option>
          <option value="Title">Title</option>
          <option value="Author">Author</option>
          <option value="Publisher">Publisher</option>
          <option value="ISBN">ISBN</option>
          <option value="Category">Category</option>
        </TextField>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Books" icon={<Book />} iconPosition="start" />
          <Tab label="Documents" icon={<Article />} iconPosition="start" />
        </Tabs>
      </Stack>
      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).map(item => {
            const isBook = tab === 0;
            const availableCount = (item.inventory || []).filter(
              inv => (inv.availability || inv.Availability) === "Available"
            ).length;
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.Book_ID || item.Document_ID}>
                <Card sx={{ borderRadius: 3, boxShadow: 4, height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      {isBook ? <Book color="primary" /> : <Article color="secondary" />}
                      <Typography variant="h6" fontWeight={600}>
                        {item.Title}
                      </Typography>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    {renderDetails(item, isBook)}
                    <Chip
                      label={isBook ? "Book" : "Document"}
                      color={isBook ? "primary" : "secondary"}
                      size="small"
                      sx={{ mt: 2, mr: 1 }}
                    />
                    <Chip
                      label={`Available: ${availableCount}`}
                      color={availableCount > 0 ? "success" : "default"}
                      size="small"
                      sx={{ mt: 2 }}
                    />
                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        disabled={
                          borrowLoading ||
                          isItemBorrowedOrPending(item, isBook) ||
                          isInCart(item, isBook) ||
                          availableCount === 0
                        }
                        onClick={() => handleAddToCart(item, isBook)}
                      >
                        {isItemBorrowedOrPending(item, isBook)
                          ? "Already Borrowed or Pending"
                          : isInCart(item, isBook)
                          ? "In Cart"
                          : availableCount === 0
                          ? "Not Available"
                          : "Add to Cart"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={6}>
                <Typography color="text.secondary">No {tab === 0 ? "books" : "documents"} found.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Floating Cart Button */}
      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1200,
        }}
        onClick={() => setCartOpen(true)}
      >
        <Badge badgeContent={cart.length} color="error">
          <ShoppingCart />
        </Badge>
      </Fab>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{ sx: { width: 340, p: 2 } }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6" fontWeight={700}>Borrow Cart</Typography>
          <IconButton onClick={() => setCartOpen(false)}>
            <Close />
          </IconButton>
        </Box>
        <Divider />
        <Box p={2}>
          {cart.length === 0 ? (
            <Typography color="text.secondary" align="center" mt={4}>
              Your cart is empty.
            </Typography>
          ) : (
            <>
              <Stack direction="column" spacing={1}>
                {cart.map((ci, idx) => (
                  <Chip
                    key={idx}
                    label={`${ci.type}: ${ci.item.Title}`}
                    onDelete={() => handleRemoveFromCart(idx)}
                    color={ci.type === "Book" ? "primary" : "secondary"}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
              <Button
                variant="contained"
                color="success"
                sx={{ mt: 3 }}
                fullWidth
                disabled={borrowLoading}
                onClick={handleBorrowAll}
              >
                {borrowLoading ? "Processing..." : "Borrow All"}
              </Button>
            </>
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BrowseLibraryPage;