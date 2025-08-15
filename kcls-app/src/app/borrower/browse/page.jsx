import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, TextField, Tabs, Tab, Grid, Card, CardContent, Chip, Stack, InputAdornment,
  CircularProgress, Divider, Button, Snackbar, Alert, Fab, Badge, Drawer, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  Tooltip, Paper, Skeleton
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
      {/* Header / Filters Container */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: theme => `2px solid ${theme.palette.divider}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} lineHeight={1}>
            Browse Library
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Search & add items to your borrow cart
          </Typography>
        </Box>
        <TextField
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>),
          }}
          size="small"
          sx={{ width: 260 }}
        />
        <TextField
          select
          label="Filter Field"
            value={searchKey}
            onChange={e => setSearchKey(e.target.value)}
            size="small"
            sx={{ width: 160 }}
            SelectProps={{ native: true }}
        >
          <option value="All">All</option>
          <option value="Title">Title</option>
          <option value="Author">Author</option>
          <option value="Publisher">Publisher</option>
          <option value="ISBN">ISBN</option>
          <option value="Category">Category</option>
        </TextField>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            ml: 'auto',
            '& .MuiTabs-flexContainer': { gap: 1 },
            '& .MuiTab-root': {
              minHeight: 40,
              border: theme => `1.5px solid ${theme.palette.divider}`,
              borderRadius: 1,
              px: 2,
              textTransform: 'none',
              fontWeight: 600
            },
            '& .Mui-selected': {
              bgcolor: theme => theme.palette.background.paper,
              borderColor: theme => theme.palette.primary.main,
              color: 'primary.main !important'
            }
          }}
        >
          <Tab label="Books" icon={<Book fontSize="small" />} iconPosition="start" />
          <Tab label="Documents" icon={<Article fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Results */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Paper
                sx={{
                  p: 2,
                  border: theme => `2px solid ${theme.palette.divider}`,
                  borderRadius: 1
                }}
              >
                <Skeleton variant="rectangular" height={110} sx={{ mb: 1 }} />
                <Skeleton width="60%" />
                <Skeleton width="80%" />
                <Skeleton width="40%" />
                <Skeleton variant="rectangular" height={34} sx={{ mt: 2, borderRadius: 0.5 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).map(item => {
            const isBook = tab === 0;
            const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
            const docTypes = !isBook ? getAvailableDocTypes(item) : [];
            const showDigitalView = !isBook && (item.File_Path || item.file_path) && (item.Sensitivity === "Public" || item.sensitivity === "Public");

            const disabledReason = (() => {
              if (isBook) {
                if (isItemBorrowedOrPending(item, true)) return "Already borrowed or pending";
                if (isInCart(item, true)) return "Already in cart";
                if (availableCount === 0) return "No copies available";
              } else {
                if (docTypes.length === 0) return "No copies available";
                if (docTypes.every(dt => isItemBorrowedOrPending(item, false, dt) || isInCart(item, false, dt)))
                  return "All variants borrowed or in cart";
              }
              return null;
            })();

            const addDisabled = !!disabledReason || borrowLoading;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.Book_ID || item.Document_ID}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                    border: theme => `2px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    position: 'relative',
                    '&:hover': {
                      borderColor: theme => theme.palette.primary.main
                    }
                  }}
                >
                  {/* Type Badge */}
                  <Chip
                    label={isBook ? 'BOOK' : 'DOCUMENT'}
                    size="small"
                    color={isBook ? 'primary' : 'secondary'}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontWeight: 700,
                      borderRadius: 0.5
                    }}
                  />
                  <Stack direction="row" alignItems="flex-start" spacing={1} mb={1}>
                    <Box
                      sx={{
                        flexGrow: 1,
                        pr: 1
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        lineHeight={1.15}
                        sx={{ mb: 0.5 }}
                        noWrap
                        title={item.Title}
                      >
                        {item.Title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap title={item.Author || item.Publisher}>
                        {(item.Author || item.Publisher || '').slice(0, 54)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Box flexGrow={1}>
                    {renderDetails(item, isBook)}
                  </Box>

                  <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                    <Chip
                      label={`Available: ${availableCount}`}
                      size="small"
                      color={availableCount > 0 ? "success" : "default"}
                      sx={{ fontWeight: 600 }}
                    />
                    {!isBook && docTypes.map(t => (
                      <Chip
                        key={t}
                        label={t}
                        size="small"
                        variant="outlined"
                        color="info"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>

                  <Box mt={2}>
                    <Tooltip title={disabledReason || 'Add to borrow cart'} arrow disableInteractive>
                      <span>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          size="small"
                          disabled={addDisabled}
                          onClick={() => handleAddToCart(item, isBook)}
                          sx={{
                            fontWeight: 600,
                            borderRadius: 0.75,
                            boxShadow: 'none'
                          }}
                        >
                          {disabledReason ? disabledReason : 'Add to Cart'}
                        </Button>
                      </span>
                    </Tooltip>
                    {showDigitalView && (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        size="small"
                        sx={{ mt: 1, fontWeight: 600, borderRadius: 0.75 }}
                        onClick={() => handleViewPdf(item.File_Path || item.file_path)}
                        startIcon={<Visibility fontSize="small" />}
                      >
                        View Digital
                      </Button>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).length === 0 && (
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  border: theme => `2px dashed ${theme.palette.divider}`,
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}
              >
                <Typography color="text.secondary">
                  No {tab === 0 ? 'books' : 'documents'} match your search.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Floating Cart Button */}
      <Tooltip title="Open Borrow Cart">
        <Fab
          color="primary"
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            borderRadius: 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
          }}
          onClick={() => setCartOpen(true)}
        >
          <Badge badgeContent={cart.length} color="error">
            <ShoppingCart />
          </Badge>
        </Fab>
      </Tooltip>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            width: 360,
            borderLeft: theme => `2px solid ${theme.palette.divider}`,
            borderRadius: 0
          }
        }}
      >
        <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={800}>Borrow Cart</Typography>
          <IconButton size="small" onClick={() => setCartOpen(false)}><Close fontSize="small" /></IconButton>
        </Box>
        <Divider />
        <Box p={2} sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {cart.length === 0 ? (
            <Typography color="text.secondary" align="center" mt={4}>
              Your cart is empty.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {cart.map((ci, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    borderRadius: 1,
                    border: theme => `1.5px solid ${theme.palette.divider}`
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontSize={13} fontWeight={700} noWrap title={ci.item.Title}>
                      {ci.item.Title}
                    </Typography>
                    <Chip
                      size="small"
                      label={ci.type === 'Book' ? 'BOOK' : (ci.copyType || 'DOC')}
                      color={ci.type === 'Book' ? 'primary' : 'secondary'}
                      sx={{ fontSize: 10, fontWeight: 700 }}
                    />
                  </Stack>
                  {ci.type === 'Document' && (
                    <Typography variant="caption" color="text.secondary">
                      {ci.copyType} copy
                    </Typography>
                  )}
                  <Button
                    onClick={() => handleRemoveFromCart(idx)}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ alignSelf: 'flex-end', mt: 0.5, borderRadius: 0.75, fontSize: 11 }}
                  >
                    Remove
                  </Button>
                </Paper>
              ))}

              <Divider sx={{ my: 1 }} />

              <TextField
                label="Purpose"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
              <TextField
                label="Return Date"
                type="date"
                value={returnDate ? new Date(returnDate).toISOString().slice(0, 10) : ""}
                onChange={e => setReturnDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <Button
                variant="contained"
                color="success"
                fullWidth
                disabled={borrowLoading}
                onClick={handleBorrowAll}
                sx={{ mt: 1, fontWeight: 700, borderRadius: 0.75 }}
              >
                {borrowLoading ? "Processing..." : `Submit Borrow (${cart.length})`}
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Document Type Dialog */}
      <Dialog open={docTypeDialogOpen} onClose={() => setDocTypeDialogOpen(false)}>
        <DialogTitle
          sx={{
            fontWeight: 800,
            borderBottom: theme => `2px solid ${theme.palette.divider}`,
            py: 1.5
          }}
        >
          Select Document Type
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <RadioGroup
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
          >
            {selectedDoc && getAvailableDocTypes(selectedDoc).map(type => (
              <FormControlLabel
                key={type}
                value={type}
                control={<Radio />}
                label={type}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setDocTypeDialogOpen(false)} size="small" variant="text">
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmAddDoc}
            disabled={!selectedDocType}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer */}
      <DocumentPDFViewer
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        fileUrl={pdfUrl}
        title="Viewing PDF Document"
      />

      {/* Toast */}
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