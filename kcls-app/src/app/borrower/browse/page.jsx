import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, TextField, Tabs, Tab, Grid, Card, CardContent, Chip, Stack, InputAdornment,
  CircularProgress, Divider, Button, Snackbar, Alert, Fab, Badge, Drawer, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import { Book, Article, Search, ShoppingCart, Close, Visibility } from "@mui/icons-material";
import '@react-pdf-viewer/core/lib/styles/index.css';
import DocumentPDFViewer from '../../../components/DocumentPDFViewer';

const BrowseLibraryPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  // CHANGE: use real BorrowerID (NOT UserID) so FK constraint passes
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId = user?.borrower?.BorrowerID || user?.BorrowerID || null;  // UPDATED
  const [tab, setTab] = useState(0), [books, setBooks] = useState([]), [documents, setDocuments] = useState([]),
    [search, setSearch] = useState(""), [searchKey, setSearchKey] = useState("All"), [loading, setLoading] = useState(false),
    [borrowed, setBorrowed] = useState([]), [borrowLoading, setBorrowLoading] = useState(false), [toast, setToast] = useState({ open: false, message: "", severity: "success" }),
    [cart, setCart] = useState([]), [cartOpen, setCartOpen] = useState(false), [purpose, setPurpose] = useState(""), [returnDate, setReturnDate] = useState(null),
    [docTypeDialogOpen, setDocTypeDialogOpen] = useState(false), [selectedDoc, setSelectedDoc] = useState(null), [selectedDocType, setSelectedDocType] = useState("Physical");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => { fetchData(); fetchBorrowed(); }, []);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`), axios.get(`${API_BASE}/documents`)
      ]);
      setBooks(await Promise.all((booksRes.data || []).map(async (book) => {
        book.inventory = (await axios.get(`${API_BASE}/books/inventory/${book.Book_ID}`)).data || [];
        return book;
      })));
      setDocuments(await Promise.all((docsRes.data || []).map(async (doc) => {
        doc.inventory = (await axios.get(`${API_BASE}/documents/inventory/${doc.Document_ID}`)).data || [];
        return doc;
      })));
    } catch { setBooks([]); setDocuments([]); }
    setLoading(false);
  };
  const fetchBorrowed = async () => {
    if (!borrowerId) return;
    try { setBorrowed((await axios.get(`${API_BASE}/borrow/borrower/${borrowerId}`)).data || []); }
    catch { setBorrowed([]); }
  };
  const filterItems = (items, allKeys) => items.filter(item =>
    !search ? true : searchKey === "All"
      ? allKeys.some(key => (item[key] || "").toLowerCase().includes(search.toLowerCase()))
      : (item[searchKey] || "").toLowerCase().includes(search.toLowerCase())
  );
  const isItemBorrowedOrPending = (item, isBook, docType = null) =>
    borrowed.some(tx =>
      (tx.items || []).some(bi =>
        isBook
          ? bi.BookCopyID && item.Book_ID && bi.BookCopyID === item.Book_ID
          : bi.DocumentStorageID && item.Document_ID && bi.DocumentStorageID === item.Document_ID &&
            (!docType || (bi.CopyType === docType))
      ) && (tx.ReturnStatus !== "Returned" || tx.ApprovalStatus === "Pending")
    );
  const isInCart = (item, isBook, docType = null) =>
    cart.some(ci =>
      ci.type === (isBook ? "Book" : "Document") &&
      ((isBook && ci.item.Book_ID === item.Book_ID) ||
        (!isBook && ci.item.Document_ID === item.Document_ID && (!docType || ci.copyType === docType)))
    );
  const handleAddToCart = (item, isBook) => {
    if (isBook) {
      const available = (item.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
      if (!available) return setToast({ open: true, message: "No available copy for this item.", severity: "info" });
      setCart([...cart, { type: "Book", item, inventory: available }]);
      setToast({ open: true, message: "Added to cart!", severity: "success" });
    } else {
      setSelectedDoc(item); setSelectedDocType("Physical"); setDocTypeDialogOpen(true);
    }
  };
  const handleConfirmAddDoc = () => {
    if (!selectedDoc) return;
    let available;
    if (selectedDocType === "Physical") {
      available = (selectedDoc.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
      if (!available) {
        setToast({ open: true, message: "No available physical copy for this document.", severity: "info" });
        setDocTypeDialogOpen(false); return;
      }
    } else if (selectedDocType === "Digital") {
      if (!(selectedDoc.File_Path || selectedDoc.file_path)) {
        setToast({ open: true, message: "No digital copy available for this document.", severity: "info" });
        setDocTypeDialogOpen(false); return;
      }
      available = { ...selectedDoc, isDigital: true };
    }
    setCart([...cart, { type: "Document", item: selectedDoc, inventory: available, copyType: selectedDocType }]);
    setToast({ open: true, message: "Added to cart!", severity: "success" });
    setDocTypeDialogOpen(false);
  };
  const handleRemoveFromCart = idx => setCart(cart.filter((_, i) => i !== idx));
  const handleBorrowAll = async () => {
    if (!borrowerId) return setToast({ open: true, message: "Login required.", severity: "error" });
    if (cart.length === 0) return setToast({ open: true, message: "Your cart is empty.", severity: "warning" });
    if (!purpose.trim()) return setToast({ open: true, message: "Please enter a purpose.", severity: "warning" });
    if (!returnDate) return setToast({ open: true, message: "Please select a return date.", severity: "warning" });
    setBorrowLoading(true);
    try {
      const items = cart.map(ci =>
        ci.type === "Book"
          ? { itemType: "Book", bookCopyId: ci.inventory.Copy_ID, initialCondition: ci.inventory.condition || "" }
          : {
              itemType: "Document",
              documentStorageId: ci.inventory.Storage_ID,
              initialCondition: ci.inventory.Condition || ci.inventory.condition || "",
              copyType: ci.copyType || ci.inventory.copyType || ci.inventory.CopyType || ci.inventory.type || ci.inventory.Type || "Physical"
            }
      );
      await axios.post(`${API_BASE}/borrow`, {
        borrowerId,            // now correct BorrowerID value
        purpose,
        items,
        borrowDate: new Date().toISOString().slice(0, 10),
        returnDate: returnDate ? new Date(returnDate).toISOString().slice(0, 10) : null,
      });
      setToast({ open: true, message: "Borrow request submitted!", severity: "success" });
      setCart([]); setPurpose(""); setReturnDate(null); fetchBorrowed();
    } catch {
      setToast({ open: true, message: "Failed to borrow items.", severity: "error" });
    }
    setBorrowLoading(false); setCartOpen(false);
  };
  const renderDetails = (item, isBook) => (
    <Box>
      <Box sx={{ width: "100%", height: 120, background: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", mb: 2, borderRadius: 2, overflow: "hidden" }}>
        <img src={isBook ? "https://placehold.co/400x120?text=Book+Cover" : "https://placehold.co/400x120?text=PDF+Document"} alt={isBook ? "Book Cover" : "PDF Document"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          <Typography variant="body2" sx={{ mt: 1 }}><b>Dept:</b> {item.Department || "N/A"}</Typography>
          <Typography variant="body2"><b>Classification:</b> {item.Classification || "N/A"}</Typography>
          <Typography variant="body2"><b>Sensitivity:</b> {item.Sensitivity || "N/A"}</Typography>
        </>
      )}
    </Box>
  );
  // Show "Physical" if any inventory is available, "Digital" if File_Path exists
  const getAvailableDocTypes = (doc) => {
    const types = new Set();
    if ((doc.inventory || []).some(inv => (inv.availability || inv.Availability) === "Available")) types.add("Physical");
    if ((doc.File_Path || doc.file_path)) types.add("Digital");
    return Array.from(types);
  };

  // Handler to open PDF dialog
  const handleViewPdf = (filePath) => {
    setPdfUrl(`${API_BASE}${filePath}`);
    setPdfDialogOpen(true);
  };

  return (
    <Box p={3} pb={10}>
      <Typography variant="h4" fontWeight={700} mb={2}>Browse Library</Typography>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <TextField
          placeholder="Search books or documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          sx={{ width: 350 }}
        />
        <TextField
          select label="Filter by" value={searchKey} onChange={e => setSearchKey(e.target.value)}
          sx={{ width: 150 }} size="small" SelectProps={{ native: true }}
        >
          <option value="All">All</option>
          <option value="Title">Title</option>
          <option value="Author">Author</option>
          <option value="Publisher">Publisher</option>
          <option value="ISBN">ISBN</option>
          <option value="Category">Category</option>
        </TextField>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
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
            const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
            const docTypes = !isBook ? getAvailableDocTypes(item) : [];
            // --- Add: show digital view button if document is public and has digital file ---
            const showDigitalView = !isBook && (item.File_Path || item.file_path) && (item.Sensitivity === "Public" || item.sensitivity === "Public");
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.Book_ID || item.Document_ID}>
                <Card sx={{ borderRadius: 3, boxShadow: 4, height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      {isBook ? <Book color="primary" /> : <Article color="secondary" />}
                      <Typography variant="h6" fontWeight={600}>{item.Title}</Typography>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    {renderDetails(item, isBook)}
                    <Chip label={isBook ? "Book" : "Document"} color={isBook ? "primary" : "secondary"} size="small" sx={{ mt: 2, mr: 1 }} />
                    <Chip label={`Available: ${availableCount}`} color={availableCount > 0 ? "success" : "default"} size="small" sx={{ mt: 2 }} />
                    <Box mt={2}>
                      <Button
                        variant="outlined" color="primary" fullWidth
                        disabled={
                          borrowLoading ||
                          (isBook
                            ? isItemBorrowedOrPending(item, true)
                            : docTypes.length === 0 ||
                              docTypes.every(dt => isItemBorrowedOrPending(item, false, dt) || isInCart(item, false, dt))
                          ) ||
                          isInCart(item, isBook) ||
                          availableCount === 0
                        }
                        onClick={() => handleAddToCart(item, isBook)}
                      >
                        {isBook
                          ? isItemBorrowedOrPending(item, true)
                            ? "Already Borrowed or Pending"
                            : isInCart(item, true)
                            ? "In Cart"
                            : availableCount === 0
                            ? "Not Available"
                            : "Add to Cart"
                          : docTypes.length === 0
                          ? "Not Available"
                          : docTypes.every(dt => isItemBorrowedOrPending(item, false, dt) || isInCart(item, false, dt))
                          ? "Already Borrowed or In Cart"
                          : "Add to Cart"}
                      </Button>
                      {/* Digital View Button */}
                      {showDigitalView && (
                        <Button
                          variant="contained"
                          color="secondary"
                          fullWidth
                          sx={{ mt: 1 }}
                          onClick={() => handleViewPdf(item.File_Path || item.file_path)}
                        >
                          View Digital Copy
                        </Button>
                      )}
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
      <Fab color="primary" sx={{ position: "fixed", bottom: 32, right: 32, zIndex: 1200 }} onClick={() => setCartOpen(true)}>
        <Badge badgeContent={cart.length} color="error"><ShoppingCart /></Badge>
      </Fab>
      {/* Cart Drawer */}
      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)} PaperProps={{ sx: { width: 340, p: 2 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6" fontWeight={700}>Borrow Cart</Typography>
          <IconButton onClick={() => setCartOpen(false)}><Close /></IconButton>
        </Box>
        <Divider />
        <Box p={2}>
          {cart.length === 0 ? (
            <Typography color="text.secondary" align="center" mt={4}>Your cart is empty.</Typography>
          ) : (
            <>
              <Stack direction="column" spacing={1}>
                {cart.map((ci, idx) => (
                  <Chip
                    key={idx}
                    label={ci.type === "Book" ? `${ci.type}: ${ci.item.Title}` : `${ci.type}: ${ci.item.Title} (${ci.copyType || "Physical"})`}
                    onDelete={() => handleRemoveFromCart(idx)}
                    color={ci.type === "Book" ? "primary" : "secondary"}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
              <TextField label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)} fullWidth sx={{ mt: 2 }} required />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>Return Date</Typography>
                <TextField
                  label="Return Date" type="date"
                  value={returnDate ? new Date(returnDate).toISOString().slice(0, 10) : ""}
                  onChange={e => setReturnDate(e.target.value)}
                  fullWidth sx={{ mt: 2 }} InputLabelProps={{ shrink: true }} required
                />
              </Box>
              <Button variant="contained" color="success" sx={{ mt: 3 }} fullWidth disabled={borrowLoading} onClick={handleBorrowAll}>
                {borrowLoading ? "Processing..." : "Borrow All"}
              </Button>
            </>
          )}
        </Box>
      </Drawer>
      {/* Document Type Selection Dialog */}
      <Dialog open={docTypeDialogOpen} onClose={() => setDocTypeDialogOpen(false)}>
        <DialogTitle>Select Document Type</DialogTitle>
        <DialogContent>
          <RadioGroup value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}>
            {selectedDoc && getAvailableDocTypes(selectedDoc).map(type => (
              <FormControlLabel key={type} value={type} control={<Radio />} label={type} />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocTypeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAddDoc} disabled={!selectedDocType}>Add to Cart</Button>
        </DialogActions>
      </Dialog>
      {/* PDF Viewer Component */}
      <DocumentPDFViewer
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        fileUrl={pdfUrl}
        title="Viewing PDF Document"
      />
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BrowseLibraryPage;