import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box, Typography, TextField, Tabs, Tab, Grid, Chip, Stack, InputAdornment,
  CircularProgress, Button, Snackbar, Alert, Fab, Badge, Drawer, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  Tooltip, Paper, Skeleton, MenuItem, Select, FormControl, InputLabel, Divider
} from "@mui/material";
import {
  Book, Article, Search, ShoppingCart, Close, Visibility, FilterAlt,
  RestartAlt, Sort, Info, Delete, Add, PictureAsPdf
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import DocumentPDFViewer from '../../../components/DocumentPDFViewer';

const PAGE_SIZE_OPTIONS = [8, 12, 16, 24];
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0,10);
};

const BrowseLibraryPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId = user?.borrower?.BorrowerID || user?.BorrowerID || null;

  // Data state
  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [borrowed, setBorrowed] = useState([]);

  // UI state
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState("All");
  const [sort, setSort] = useState("title_asc");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  // Borrow form
  const [purpose, setPurpose] = useState("");
  const [returnDate, setReturnDate] = useState(null);

  // Doc type selection
  const [docTypeDialogOpen, setDocTypeDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("Physical");

  // PDF
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => { fetchData(); fetchBorrowed(); }, []);
  useEffect(() => { setPage(1); }, [tab, search, searchKey, sort, onlyAvailable, rowsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`)
      ]);
      const enrichedBooks = await Promise.all(
        (booksRes.data || []).map(async b => {
          try {
            b.inventory = (await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`)).data || [];
          } catch { b.inventory = []; }
          return b;
        })
      );
      const enrichedDocs = await Promise.all(
        (docsRes.data || []).map(async d => {
          try {
            d.inventory = (await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`)).data || [];
          } catch { d.inventory = []; }
          return d;
        })
      );
      setBooks(enrichedBooks);
      setDocuments(enrichedDocs);
    } catch {
      setBooks([]); setDocuments([]);
    }
    setLoading(false);
  };

  const fetchBorrowed = async () => {
    if (!borrowerId) return;
    try {
      const res = await axios.get(`${API_BASE}/borrow/borrower/${borrowerId}`);
      setBorrowed(res.data || []);
    } catch { setBorrowed([]); }
  };

  // Helpers
  const filterItems = (items, keys) => items.filter(item => {
    if (!search) return true;
    if (searchKey === "All") {
      return keys.some(k => (item[k] || "").toString().toLowerCase().includes(search.toLowerCase()));
    }
    return (item[searchKey] || "").toString().toLowerCase().includes(search.toLowerCase());
  });

  const getAvailableDocTypes = (doc) => {
    const set = new Set();
    if ((doc.inventory || []).some(inv => (inv.availability || inv.Availability) === "Available")) set.add("Physical");
    if (doc.File_Path || doc.file_path) set.add("Digital");
    return [...set];
  };

  const isItemBorrowedOrPending = (item, isBook, type = null) =>
    borrowed.some(tx =>
      (tx.items || []).some(bi =>
        isBook
          ? bi.BookCopyID && item.inventory?.some(inv => inv.Copy_ID === bi.BookCopyID) && (tx.ReturnStatus !== "Returned")
          : bi.DocumentStorageID &&
            item.inventory?.some(inv => inv.Storage_ID === bi.DocumentStorageID) &&
            (tx.ReturnStatus !== "Returned") &&
            (!type || (bi.CopyType || bi.copyType) === type)
      )
    );

  const isInCart = (item, isBook, type = null) =>
    cart.some(ci =>
      ci.type === (isBook ? "Book" : "Document") &&
      (isBook
        ? ci.item.Book_ID === item.Book_ID
        : ci.item.Document_ID === item.Document_ID && (!type || ci.copyType === type))
    );

  // Add actions
  const handleAddToCart = (item, isBook) => {
    if (isBook) {
      const available = (item.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
      if (!available) return notify("No available copy.", "info");
      setCart(prev => [...prev, { type: "Book", item, inventory: available }]);
      return notify("Added to cart.", "success");
    }
    setSelectedDoc(item);
    setSelectedDocType(getAvailableDocTypes(item)[0] || "Physical");
    setDocTypeDialogOpen(true);
  };

  const handleConfirmAddDoc = () => {
    if (!selectedDoc) return;
    const types = getAvailableDocTypes(selectedDoc);
    if (!types.length) return notify("No copies available.", "info");

    let available = null;
    if (selectedDocType === "Physical") {
      available = (selectedDoc.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
      if (!available) return notify("No physical copy available.", "info");
    } else {
      if (!(selectedDoc.File_Path || selectedDoc.file_path)) return notify("No digital copy.", "info");
      available = { isDigital: true, Storage_ID: null };
    }

    if (isInCart(selectedDoc, false, selectedDocType)) return notify("Already in cart.", "info");

    setCart(prev => [...prev, {
      type: "Document",
      item: selectedDoc,
      inventory: available,
      copyType: selectedDocType
    }]);
    notify("Added to cart.", "success");
    setDocTypeDialogOpen(false);
  };

  const handleRemoveFromCart = idx => setCart(c => c.filter((_, i) => i !== idx));

  const handleBorrowAll = async () => {
    if (!borrowerId) return notify("Login required.", "error");
    if (!cart.length) return notify("Cart is empty.", "warning");
    if (!purpose.trim()) return notify("Enter purpose.", "warning");
    if (!returnDate) return notify("Select return date.", "warning");
    setBorrowLoading(true);
    try {
      const items = cart.map(ci =>
        ci.type === "Book"
          ? {
              itemType: "Book",
              bookCopyId: ci.inventory.Copy_ID,
              initialCondition: ci.inventory.condition || ci.inventory.Condition || ""
            }
          : {
              itemType: "Document",
              documentStorageId: ci.inventory.Storage_ID,
              initialCondition: ci.inventory.condition || ci.inventory.Condition || "",
              copyType: ci.copyType
            }
      );
      await axios.post(`${API_BASE}/borrow`, {
        borrowerId,
        purpose,
        items,
        borrowDate: new Date().toISOString().slice(0,10),
        returnDate: new Date(returnDate).toISOString().slice(0,10)
      });
      notify("Borrow request submitted.", "success");
      setCart([]); setPurpose(""); setReturnDate(null);
      fetchBorrowed();
      setCartOpen(false);
    } catch {
      notify("Borrow failed.", "error");
    }
    setBorrowLoading(false);
  };

  const notify = (message, severity="success") => setToast({ open: true, message, severity });

  const handleViewPdf = (filePath) => {
    setPdfUrl(`${API_BASE}${filePath}`);
    setPdfDialogOpen(true);
  };

  // Sorting
  const sortItems = (items, isBook) => {
    return [...items].sort((a,b) => {
      const avA = (a.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
      const avB = (b.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
      switch (sort) {
        case "title_asc": return (a.Title||"").localeCompare(b.Title||"");
        case "title_desc": return (b.Title||"").localeCompare(a.Title||"");
        case "avail_desc": return avB - avA || (a.Title||"").localeCompare(b.Title||"");
        case "avail_asc": return avA - avB || (a.Title||"").localeCompare(b.Title||"");
        case "year_desc": return (b.Year||0) - (a.Year||0);
        case "year_asc": return (a.Year||0) - (b.Year||0);
        default: return 0;
      }
    });
  };

  // Base list
  const baseList = tab === 0
    ? filterItems(books, ["Title","Author","Publisher","ISBN","Category","Edition","Description"])
    : filterItems(documents, ["Title","Author","Category","Department","Classification","Year","Description"]);

  const afterAvail = onlyAvailable
    ? baseList.filter(i =>
        tab === 0
          ? (i.inventory||[]).some(inv => (inv.availability||inv.Availability)==="Available")
          : getAvailableDocTypes(i).length > 0
      )
    : baseList;

  const finalList = sortItems(afterAvail, tab === 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(finalList.length / rowsPerPage));
  const paged = finalList.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const disabledReason = (item, isBook) => {
    const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
    if (isBook) {
      if (isItemBorrowedOrPending(item, true)) return "Borrowed / pending";
      if (isInCart(item, true)) return "In cart";
      if (availableCount === 0) return "No copies";
      return null;
    }
    const types = getAvailableDocTypes(item);
    if (!types.length) return "No copies";
    if (types.every(t => isItemBorrowedOrPending(item,false,t) || isInCart(item,false,t)))
      return "All variants used";
    return null;
  };

  // Card
  const renderDetails = (item, isBook) => (
    <Stack spacing={0.4} sx={{ fontSize: 12 }}>
      {isBook ? (
        <>
          <MetaLine label="Author" value={item.Author} />
          <MetaLine label="Publisher" value={item.Publisher} />
          <MetaLine label="ISBN" value={item.ISBN} />
          <MetaLine label="Year" value={item.Year} />
          <MetaLine label="Edition" value={item.Edition} />
        </>
      ) : (
        <>
          <MetaLine label="Author" value={item.Author} />
          <MetaLine label="Category" value={item.Category} />
          <MetaLine label="Department" value={item.Department} />
          <MetaLine label="Classification" value={item.Classification} />
          <MetaLine label="Year" value={item.Year} />
          <MetaLine label="Sensitivity" value={item.Sensitivity} />
        </>
      )}
    </Stack>
  );

  const MetaLine = ({ label, value }) => value ? (
    <Typography variant="caption" sx={{ display:'block', lineHeight:1.2 }}>
      <b>{label}:</b> {value}
    </Typography>
  ) : null;

  const ClearFiltersButton = () => (
    <Button
      size="small"
      variant="text"
      startIcon={<RestartAlt fontSize="small" />}
      onClick={() => { setSearch(""); setSearchKey("All"); setOnlyAvailable(false); setSort("title_asc"); }}
      sx={{ fontWeight:600 }}
    >
      Reset
    </Button>
  );

  return (
    <Box p={3} pb={10} sx={{ minHeight:'100vh', bgcolor:'background.default' }}>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p:2,
          mb:3,
          border: theme => `2px solid ${theme.palette.divider}`,
          borderRadius:1,
          display:'flex',
          flexWrap:'wrap',
          gap:1.5,
          alignItems:'center',
          bgcolor:'background.paper'
        }}
      >
        <Box mr={2}>
          <Typography fontWeight={800} fontSize={18} lineHeight={1}>Browse Library</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Discover & queue items to borrow
          </Typography>
        </Box>

        <TextField
          placeholder="Search..."
          size="small"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          InputProps={{
            startAdornment:<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            sx:{ borderRadius:1 }
          }}
          sx={{ width:230 }}
        />

        <FormControl size="small" sx={{ width:150 }}>
          <InputLabel>Field</InputLabel>
          <Select
            label="Field"
            value={searchKey}
            onChange={e=>setSearchKey(e.target.value)}
            sx={{ borderRadius:1 }}
          >
            {["All","Title","Author","Publisher","ISBN","Category"].map(k=>
              <MenuItem key={k} value={k}>{k}</MenuItem>
            )}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ width:170 }}>
          <InputLabel>Sort</InputLabel>
            <Select
              label="Sort"
              value={sort}
              onChange={e=>setSort(e.target.value)}
              sx={{ borderRadius:1 }}
            >
              <MenuItem value="title_asc">Title A-Z</MenuItem>
              <MenuItem value="title_desc">Title Z-A</MenuItem>
              <MenuItem value="avail_desc">Availability High-Low</MenuItem>
              <MenuItem value="avail_asc">Availability Low-High</MenuItem>
              <MenuItem value="year_desc">Year New-Old</MenuItem>
              <MenuItem value="year_asc">Year Old-New</MenuItem>
            </Select>
        </FormControl>

        <Chip
          icon={<FilterAlt fontSize="small" />}
          label={onlyAvailable ? "Only Available" : "All Copies"}
          onClick={()=>setOnlyAvailable(o=>!o)}
          size="small"
          color={onlyAvailable ? "success" : "default"}
          sx={{ fontWeight:600, borderRadius:0.75 }}
        />

        <ClearFiltersButton />

        <Tabs
          value={tab}
          onChange={(_,v)=>setTab(v)}
          sx={{
            ml:'auto',
            '& .MuiTabs-flexContainer':{ gap:1 },
            '& .MuiTab-root':{
              minHeight:40,
              border: theme => `1.5px solid ${theme.palette.divider}`,
              borderRadius:1,
              px:2,
              textTransform:'none',
              fontWeight:600
            },
            '& .Mui-selected':{
              borderColor: theme=> theme.palette.primary.main,
              color:'primary.main !important'
            }
          }}
        >
          <Tab label={`Books (${books.length})`} icon={<Book fontSize="small" />} iconPosition="start" />
          <Tab label={`Documents (${documents.length})`} icon={<Article fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Pagination Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb:1 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          Showing {finalList.length ? ((page-1)*rowsPerPage+1) : 0}
          {" - "}
          {Math.min(page*rowsPerPage, finalList.length)} of {finalList.length}
        </Typography>
        <Divider flexItem orientation="vertical" />
        <FormControl size="small">
          <Select
            value={rowsPerPage}
            onChange={e=>setRowsPerPage(e.target.value)}
            sx={{ height:32, borderRadius:1 }}
          >
            {PAGE_SIZE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}/page</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={0.5} ml="auto">
          <Button
            size="small"
            variant="outlined"
            disabled={page===1}
            onClick={()=>setPage(1)}
            sx={{ borderRadius:0.75 }}
          >First</Button>
          <Button
            size="small"
            variant="outlined"
            disabled={page===1}
            onClick={()=>setPage(p=>Math.max(1,p-1))}
            sx={{ borderRadius:0.75 }}
          >Prev</Button>
          <Button
            size="small"
            variant="outlined"
            disabled={page===totalPages}
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
            sx={{ borderRadius:0.75 }}
          >Next</Button>
          <Button
            size="small"
            variant="outlined"
            disabled={page===totalPages}
            onClick={()=>setPage(totalPages)}
            sx={{ borderRadius:0.75 }}
          >Last</Button>
        </Stack>
      </Stack>

      {/* Results */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: rowsPerPage }).map((_,i)=>(
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Paper sx={{
                p:2,
                border: theme => `2px solid ${theme.palette.divider}`,
                borderRadius:1
              }}>
                <Skeleton variant="rectangular" height={90} sx={{ mb:1, borderRadius:0.75 }} />
                <Skeleton width="70%" />
                <Skeleton width="50%" />
                <Skeleton width="90%" />
                <Skeleton variant="rectangular" height={32} sx={{ mt:2, borderRadius:0.5 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {paged.map(item => {
            const isBook = tab === 0;
            const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
            const docTypes = !isBook ? getAvailableDocTypes(item) : [];
            const reason = disabledReason(item, isBook);
            const showDigitalView = !isBook && (item.File_Path || item.file_path) && (item.Sensitivity || item.sensitivity) === "Public";
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.Book_ID || item.Document_ID}>
                <Paper
                  elevation={0}
                  sx={{
                    position:'relative',
                    height:'100%',
                    display:'flex',
                    flexDirection:'column',
                    p:1.75,
                    border: theme => `2px solid ${theme.palette.divider}`,
                    borderRadius:1,
                    bgcolor:'background.paper',
                    transition:'border-color .2s, box-shadow .2s',
                    '&:hover':{
                      borderColor: theme => theme.palette.primary.main,
                      boxShadow: theme => `0 4px 14px ${alpha(theme.palette.primary.main,0.15)}`
                    }
                  }}
                >
                  <Chip
                    label={isBook ? "BOOK" : "DOC"}
                    size="small"
                    color={isBook ? "primary" : "secondary"}
                    sx={{
                      position:'absolute',
                      top:8,
                      right:8,
                      fontWeight:700,
                      borderRadius:0.5
                    }}
                  />
                  {reason && (
                    <Box
                      sx={{
                        position:'absolute',
                        inset:0,
                        bgcolor: theme => alpha(theme.palette.background.default,0.68),
                        backdropFilter:'blur(1px)',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        borderRadius:1,
                        textAlign:'center',
                        px:1
                      }}
                    >
                      <Typography fontSize={12} fontWeight={700} color="text.secondary">
                        {reason}
                      </Typography>
                    </Box>
                  )}

                  <Box mb={0.5}>
                    <Typography
                      fontWeight={700}
                      fontSize={14}
                      noWrap
                      title={item.Title}
                      sx={{ lineHeight:1.15 }}
                    >
                      {item.Title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      title={item.Author || item.Publisher}
                    >
                      {(item.Author || item.Publisher || "")}
                    </Typography>
                  </Box>

                  <Divider sx={{ my:1 }} />

                  <Box flexGrow={1}>
                    {renderDetails(item, isBook)}
                  </Box>

                  <Stack direction="row" spacing={0.5} mt={1.25} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Available: ${availableCount}`}
                      color={availableCount > 0 ? "success" : "default"}
                      sx={{ fontSize:11, fontWeight:600 }}
                    />
                    {!isBook && docTypes.map(t=>(
                      <Chip
                        key={t}
                        size="small"
                        label={t}
                        variant="outlined"
                        color="info"
                        sx={{ fontSize:11, fontWeight:600 }}
                      />
                    ))}
                    {!isBook && showDigitalView && (
                      <Tooltip title="View digital preview">
                        <IconButton
                          size="small"
                          onClick={()=>handleViewPdf(item.File_Path || item.file_path)}
                          sx={{
                            ml:'auto',
                            border: theme => `1px solid ${theme.palette.divider}`,
                            borderRadius:0.75
                          }}
                        >
                          <PictureAsPdf fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    disabled={!!reason || borrowLoading}
                    onClick={()=>handleAddToCart(item, isBook)}
                    startIcon={<Add fontSize="small" />}
                    sx={{
                      mt:1.25,
                      fontWeight:600,
                      borderRadius:0.75,
                      boxShadow:'none'
                    }}
                  >
                    {reason || "Add to Cart"}
                  </Button>
                </Paper>
              </Grid>
            );
          })}
          {!paged.length && (
            <Grid item xs={12}>
              <Paper
                sx={{
                  p:6,
                  textAlign:'center',
                  border: theme => `2px dashed ${theme.palette.divider}`,
                  borderRadius:1
                }}
              >
                <Typography color="text.secondary" fontWeight={600}>
                  No {tab===0 ? "books" : "documents"} match filters.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Floating Cart */}
      <Tooltip title="Borrow Cart">
        <Fab
          color="primary"
          onClick={()=>setCartOpen(true)}
          sx={{
            position:'fixed',
            bottom:32,
            right:32,
            borderRadius:1,
            boxShadow:'0 4px 16px rgba(0,0,0,0.25)'
          }}
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
        onClose={()=>setCartOpen(false)}
        PaperProps={{
          sx:{
            width:380,
            borderLeft: theme => `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <Box p={2} display="flex" alignItems="center" gap={1}>
          <Typography fontWeight={800} fontSize={15}>Borrow Cart</Typography>
          <Chip
            size="small"
            label={`${cart.length} item${cart.length!==1?'s':''}`}
            sx={{ fontWeight:600 }}
          />
          <IconButton
            size="small"
            onClick={()=>setCart([])}
            disabled={!cart.length}
            sx={{
              ml:'auto',
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius:0.75
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={()=>setCartOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <Box p={2} sx={{ flexGrow:1, overflowY:'auto' }}>
          {!cart.length ? (
            <Typography color="text.secondary" align="center" mt={4} fontSize={13}>
              Cart empty. Add items to submit a borrow request.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {cart.map((ci, i)=>(
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p:1,
                    borderRadius:1,
                    border: theme => `1.5px solid ${theme.palette.divider}`,
                    display:'flex',
                    flexDirection:'column',
                    gap:.25
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      label={ci.type === "Book" ? "BOOK" : (ci.copyType || "DOC")}
                      size="small"
                      color={ci.type === "Book" ? "primary":"secondary"}
                      sx={{ fontWeight:700 }}
                    />
                    <Typography fontWeight={600} fontSize={13} flexGrow={1} noWrap title={ci.item.Title}>
                      {ci.item.Title}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={()=>handleRemoveFromCart(i)}
                      sx={{
                        border: theme => `1px solid ${alpha('#f44336',.4)}`,
                        borderRadius:0.75
                      }}
                    >
                      <Close fontSize="inherit" />
                    </IconButton>
                  </Stack>
                  {ci.type === "Document" && (
                    <Typography variant="caption" color="text.secondary">
                      {ci.copyType} copy
                    </Typography>
                  )}
                </Paper>
              ))}
              <Divider sx={{ my:1 }} />
              <TextField
                label="Purpose"
                value={purpose}
                onChange={e=>setPurpose(e.target.value)}
                size="small"
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label="Return Date"
                type="date"
                size="small"
                value={returnDate || ""}
                onChange={e=>setReturnDate(e.target.value)}
                inputProps={{ min: tomorrow() }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Tooltip
                title={!borrowerId ? "Login required" : ""}
                disableHoverListener={!!borrowerId}
              >
                <span>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    disabled={borrowLoading || !borrowerId}
                    onClick={handleBorrowAll}
                    sx={{ fontWeight:700, borderRadius:0.75 }}
                  >
                    {borrowLoading ? "Submitting..." : `Submit Borrow (${cart.length})`}
                  </Button>
                </span>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Borrow requests may require approval. Digital documents (Public only) are view-only.
              </Typography>
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Document Type Dialog */}
      <Dialog
        open={docTypeDialogOpen}
        onClose={()=>setDocTypeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx:{
            borderRadius:1,
            border: theme => `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight:800,
            py:1.25,
            borderBottom: theme => `2px solid ${theme.palette.divider}`
          }}
        >
          Select Document Type
        </DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <RadioGroup
            value={selectedDocType}
            onChange={e=>setSelectedDocType(e.target.value)}
          >
            {selectedDoc && getAvailableDocTypes(selectedDoc).map(t=>(
              <FormControlLabel key={t} value={t} control={<Radio />} label={t} />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: theme => `2px solid ${theme.palette.divider}`,
            py:1
          }}
        >
          <Button size="small" onClick={()=>setDocTypeDialogOpen(false)}>Cancel</Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmAddDoc}
            disabled={!selectedDocType}
            sx={{ fontWeight:700 }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer */}
      <DocumentPDFViewer
        open={pdfDialogOpen}
        onClose={()=>setPdfDialogOpen(false)}
        fileUrl={pdfUrl}
        title="Digital Document Preview"
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3200}
        onClose={()=>setToast({...toast, open:false})}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}
      >
        <Alert
          onClose={()=>setToast({...toast, open:false})}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius:1, fontWeight:600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BrowseLibraryPage;