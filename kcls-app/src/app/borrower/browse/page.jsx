import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from '../../../utils/date';
import axios from "axios";
import {
  Box, Typography, TextField, Grid, Chip, Stack, InputAdornment,
  CircularProgress, Button, Snackbar, Alert, Fab, Badge, Drawer, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  Tooltip, Paper, Skeleton, MenuItem, Select, FormControl, Divider, Container, Card,
  ToggleButton, ToggleButtonGroup, Pagination
} from "@mui/material";
import {
  Book, Article, Search, ListAlt, Close, FilterAlt,
  Delete, Add, PictureAsPdf, RestartAlt
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import DocumentPDFViewer from '../../../components/DocumentPDFViewer';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext.jsx';

const DEFAULT_ROWS_PER_PAGE = 8;
const today = () => formatDate(new Date());

const SEARCHABLE_KEYS_BY_TYPE = {
  Book: ["Title", "Author", "Publisher", "ISBN", "Category", "Edition", "Description"],
  Document: ["Title", "Author", "Category", "Department", "Classification", "Year", "Description"]
};

const BrowseLibraryPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const borrowerId = user?.borrower?.BorrowerID || user?.BorrowerID || null;
  const { settings: systemSettings } = useSystemSettings();

  const borrowLimit = useMemo(() => {
    const val = Number(systemSettings?.borrow_limit ?? 3);
    if (!Number.isFinite(val) || val <= 0) return 3;
    return Math.trunc(val);
  }, [systemSettings]);

  // Data state
  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [borrowed, setBorrowed] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("title_asc");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = DEFAULT_ROWS_PER_PAGE;

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

  const handleResourceFilterChange = (_, value) => {
    if (value !== null) {
      setResourceFilter(value);
    }
  };

  const fetchData = useCallback(async () => {
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
  }, [API_BASE]);

  const fetchBorrowed = useCallback(async () => {
    if (!borrowerId) return;
    try {
      const res = await axios.get(`${API_BASE}/borrow/borrower/${borrowerId}`);
      setBorrowed(res.data || []);
    } catch { setBorrowed([]); }
  }, [API_BASE, borrowerId]);

  useEffect(() => { fetchData(); fetchBorrowed(); }, [fetchData, fetchBorrowed]);
  useEffect(() => { setPage(1); }, [search, sort, onlyAvailable, resourceFilter]);

  // Add status helpers (ignore Rejected and Returned for occupancy)
  const txStatus = useCallback((tx) => {
    if (tx.ReturnStatus === 'Returned') return 'Returned';
    if (tx.ApprovalStatus === 'Rejected') return 'Rejected';
    if (tx.ApprovalStatus === 'Pending') return 'Pending';
    if (tx.ApprovalStatus === 'Approved' && tx.RetrievalStatus !== 'Retrieved') return 'ApprovedAwaitingPickup';
    if (tx.RetrievalStatus === 'Retrieved' && tx.ReturnStatus !== 'Returned') return 'Borrowed';
    return tx.ApprovalStatus || 'Unknown';
  }, []);
  const statusOccupiesCopy = useCallback(
    (status) => status === 'Pending' || status === 'ApprovedAwaitingPickup' || status === 'Borrowed',
    [],
  );

  const activeBorrowCount = useMemo(() => {
    if (!Array.isArray(borrowed)) return 0;
    return borrowed.reduce((total, tx) => {
      const status = txStatus(tx);
      if (!statusOccupiesCopy(status)) return total;
      const items = Array.isArray(tx.items) ? tx.items : [];
      return total + items.length;
    }, 0);
  }, [borrowed, statusOccupiesCopy, txStatus]);

  const totalQueued = activeBorrowCount + cart.length;
  const rawRemaining = borrowLimit - totalQueued;
  const remainingSlots = Math.max(rawRemaining, 0);
  const limitReached = rawRemaining <= 0;
  const overCapacity = rawRemaining < 0;

  // Update: only physical document items occupy inventory; detect physical by DocumentStorageID
  const isItemBorrowedOrPending = (item, isBook, type = null) =>
    borrowed.some(tx => {
      const s = txStatus(tx);
      if (!statusOccupiesCopy(s)) return false;
      return (tx.items || []).some(bi => {
        if (isBook) {
          return bi.BookCopyID && item.inventory?.some(inv => inv.Copy_ID === bi.BookCopyID);
        }
        // physical only blocks: must have storage id
        if (!bi.DocumentStorageID) return false; // digital doesn't block copies
        if (type && type !== 'Physical') return false; // we only block 'Physical'
        return item.inventory?.some(inv => inv.Storage_ID === bi.DocumentStorageID);
      });
    });

  const isInCart = (item, isBook, type = null) =>
    cart.some(ci =>
      ci.type === (isBook ? "Book" : "Document") &&
      (isBook
        ? ci.item.Book_ID === item.Book_ID
        : ci.item.Document_ID === item.Document_ID && (!type || ci.copyType === type))
    );

  // Add actions
  const handleAddToCart = (item, isBook) => {
    if (borrowLimit && limitReached) {
      const message = overCapacity
        ? `Borrow limit exceeded. Reduce your queue by ${totalQueued - borrowLimit} item${totalQueued - borrowLimit === 1 ? '' : 's'}.`
        : borrowLimit <= activeBorrowCount
          ? `Borrow limit reached (${borrowLimit}). Return existing items before queuing more.`
          : `Borrow limit reached (${borrowLimit}). You already have ${cart.length} queued and ${activeBorrowCount} active.`;
      return notify(message, overCapacity ? "error" : "warning");
    }
    if (isBook) {
      const available = (item.inventory || []).find(inv => (inv.availability || inv.Availability) === "Available");
      if (!available) return notify("No available copy.", "info");
      setCart(prev => [...prev, { type: "Book", item, inventory: available }]);
      return notify("Added to queue.", "success");
    }
    setSelectedDoc(item);
    setSelectedDocType(getAvailableDocTypes(item)[0] || "Physical");
    setDocTypeDialogOpen(true);
  };

  const handleConfirmAddDoc = () => {
    if (borrowLimit && limitReached) {
      setDocTypeDialogOpen(false);
      const message = overCapacity
        ? `Borrow limit exceeded. Reduce your queue by ${totalQueued - borrowLimit} item${totalQueued - borrowLimit === 1 ? '' : 's'}.`
        : borrowLimit <= activeBorrowCount
          ? `Borrow limit reached (${borrowLimit}). Return existing items before queuing more.`
          : `Borrow limit reached (${borrowLimit}). You already have ${cart.length} queued and ${activeBorrowCount} active.`;
      return notify(message, overCapacity ? "error" : "warning");
    }
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

    if (isInCart(selectedDoc, false, selectedDocType)) return notify("Already in queue.", "info");

    setCart(prev => [...prev, {
      type: "Document",
      item: selectedDoc,
      inventory: available,
      copyType: selectedDocType
    }]);
    notify("Added to queue.", "success");
    setDocTypeDialogOpen(false);
  };

  const handleRemoveFromCart = idx => setCart(c => c.filter((_, i) => i !== idx));

  const handleBorrowAll = async () => {
    if (!borrowerId) return notify("Login required.", "error");
    if (!cart.length) return notify("Cart is empty.", "warning");
    if (!purpose.trim()) return notify("Enter purpose.", "warning");
    if (!returnDate) return notify("Select return date.", "warning");
    if (borrowLimit && overCapacity) {
      return notify(
        `Borrow limit exceeded. Limit is ${borrowLimit} item${borrowLimit === 1 ? '' : 's'} (active + queued). Remove items from your queue.`,
        "error",
      );
    }
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
              documentId: ci.item.Document_ID, // NEW: always send Document_ID
              documentStorageId: ci.inventory?.Storage_ID || null, // null => digital
              initialCondition: ci.inventory?.condition || ci.inventory?.Condition || ""
            }
      );
      await axios.post(`${API_BASE}/borrow`, {
        borrowerId,
        purpose,
        items,
        borrowDate: formatDate(new Date()),
        returnDate: formatDate(new Date(returnDate))
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

  // Helpers: available doc types and text filtering
  const getAvailableDocTypes = (doc) => {
    const types = [];
    const inv = doc?.inventory || [];
    const hasPhysical = inv.some(i => (i.availability || i.Availability) === 'Available');
    const hasDigital = !!(doc?.File_Path || doc?.file_path);
    if (hasPhysical) types.push('Physical');
    if (hasDigital) types.push('Digital');
    return types;
  };

  const filterItems = useCallback((list) => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;

    const matchValue = (val) => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(q);
    };

    return (list || []).filter(item => {
      const keys = SEARCHABLE_KEYS_BY_TYPE[item.type] || [];
      return keys.some(k => matchValue(item?.[k]));
    });
  }, [search]);

  // Sorting
  const sortItems = useCallback((items) => {
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
  }, [sort]);

  const catalog = useMemo(
    () => [
      ...(books || []).map(book => ({ ...book, type: 'Book' })),
      ...(documents || []).map(doc => ({ ...doc, type: 'Document' }))
    ],
    [books, documents]
  );

  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (resourceFilter !== 'all') {
      const typeValue = resourceFilter === 'book' ? 'Book' : 'Document';
      list = list.filter(item => item.type === typeValue);
    }

    list = filterItems(list);

    if (onlyAvailable) {
      list = list.filter(item =>
        item.type === 'Book'
          ? (item.inventory || []).some(inv => (inv.availability || inv.Availability) === 'Available')
          : getAvailableDocTypes(item).length > 0
      );
    }

    return sortItems(list);
  }, [catalog, resourceFilter, onlyAvailable, filterItems, sortItems]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / rowsPerPage));
  const paged = filteredCatalog.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const headerStats = [
    { label: 'Books catalogued', value: books.length },
    { label: 'Documents available', value: documents.length },
    {
      label: 'Borrow slots used',
      value: borrowLimit
        ? `${Math.min(totalQueued, borrowLimit)}/${borrowLimit}${overCapacity ? '+' : ''}`
        : totalQueued,
    }
  ];

  const emptyLabel = resourceFilter === 'document' ? 'documents' : resourceFilter === 'book' ? 'books' : 'items';

  const disabledReason = (item, isBook) => {
    const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
    if (isBook) {
      if (isItemBorrowedOrPending(item, true)) return "Borrowed / pending";
      if (isInCart(item, true)) return "In queue";
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme => alpha(theme.palette.background.default, 0.85) }}>
      <Container maxWidth="xl" sx={{ py: { xs: 0, md: 0 } }}>
        <Stack spacing={{ xs: 1, md: 1 }}>
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              backgroundImage: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)}, ${alpha(theme.palette.secondary.main, 0.82)})`,
              color: 'common.white',
              px: { xs: 1, md: 3 },
              py: { xs: 0, md: 2 }
            }}
          >
            <Stack
              spacing={{ xs: 1, md: 3 }}
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Box maxWidth={{ md: '60%' }}>
                <Typography variant="overline" sx={{ color: alpha('#fff', 0.7), fontWeight: 700, letterSpacing: 1.2 }}>
                  Borrower experience
                </Typography>
                <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1, mt: 1 }}>
                  Browse the Koronadal collections
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.5, opacity: 0.86 }}>
                  Discover books and city documents, manage your borrowing queue, and keep tabs on availability in one high-performance workspace.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'row', sm: 'column', md: 'row' }} spacing={1} flexWrap="wrap">
                {headerStats.map(stat => (
                  <Paper
                    key={stat.label}
                    elevation={0}
                    sx={{
                      px: 1.75,
                      py: 0.75,
                      borderRadius: 2,
                      bgcolor: alpha('#000', 0.18),
                      border: `1px solid ${alpha('#fff', 0.22)}`,
                      minWidth: 150
                    }}
                  >
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.72), fontWeight: 600, letterSpacing: 0.6 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                      {stat.value}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: theme => `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              backdropFilter: 'blur(8px)',
              backgroundColor: theme => alpha(theme.palette.background.paper, 0.92),
              p: { xs: 2.5, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', lg: 'center' }}
            >
              <TextField
                placeholder="Search title, author, category, publisher, ISBN..."
                fullWidth
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
                  <Select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    displayEmpty
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="title_asc">Title A–Z</MenuItem>
                    <MenuItem value="title_desc">Title Z–A</MenuItem>
                    <MenuItem value="avail_desc">Availability High–Low</MenuItem>
                    <MenuItem value="avail_asc">Availability Low–High</MenuItem>
                    <MenuItem value="year_desc">Year New–Old</MenuItem>
                    <MenuItem value="year_asc">Year Old–New</MenuItem>
                  </Select>
                </FormControl>
                <Chip
                  icon={<FilterAlt fontSize="small" />}
                  label={onlyAvailable ? 'Only Available' : 'All Copies'}
                  onClick={() => setOnlyAvailable(o => !o)}
                  color={onlyAvailable ? 'success' : 'default'}
                  sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.25 }}
                />
                <Button
                  size="small"
                  startIcon={<RestartAlt fontSize="small" />}
                  onClick={() => { setSearch(''); setOnlyAvailable(false); setSort('title_asc'); }}
                  sx={{ fontWeight: 600, borderRadius: 1.5 }}
                >
                  Reset
                </Button>
              </Stack>
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary' }}>
                Resource filter
              </Typography>
              <ToggleButtonGroup
                value={resourceFilter}
                exclusive
                onChange={handleResourceFilterChange}
                sx={{
                  backgroundColor: theme => alpha(theme.palette.background.default, 0.6),
                  borderRadius: 2,
                  p: 0.5,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 1.5,
                    px: 2.5,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    gap: 0.5
                  },
                  '& .Mui-selected': {
                    backgroundColor: theme => alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main'
                  }
                }}
              >
                <ToggleButton value="all">
                  All items&nbsp;
                  <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ({catalog.length})
                  </Typography>
                </ToggleButton>
                <ToggleButton value="book">
                  <Book fontSize="small" />
                  Books&nbsp;
                  <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ({books.length})
                  </Typography>
                </ToggleButton>
                <ToggleButton value="document">
                  <Article fontSize="small" />
                  Documents&nbsp;
                  <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ({documents.length})
                  </Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Card>

          {loading ? (
            <Grid container spacing={2.5}>
              {Array.from({ length: rowsPerPage }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                  <Paper
                    sx={{
                      p: 2,
                      border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                      borderRadius: 3
                    }}
                  >
                    <Skeleton variant="rectangular" height={110} sx={{ mb: 1.5, borderRadius: 2 }} />
                    <Skeleton width="70%" />
                    <Skeleton width="50%" />
                    <Skeleton width="90%" />
                    <Skeleton variant="rectangular" height={34} sx={{ mt: 2, borderRadius: 1 }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={2.5}>
              {paged.map(item => {
                const isBook = item.type === 'Book';
                const availableCount = (item.inventory || []).filter(inv => (inv.availability || inv.Availability) === "Available").length;
                const docTypes = !isBook ? getAvailableDocTypes(item) : [];
                const reason = disabledReason(item, isBook);
                const showDigitalView = !isBook && (item.File_Path || item.file_path) && (item.Sensitivity || item.sensitivity) === "Public";
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`${item.type}-${item.Book_ID || item.Document_ID}`}>
                    <Paper
                      elevation={0}
                      sx={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 2,
                        border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        transition: 'border-color .2s, box-shadow .2s',
                        '&:hover': {
                          borderColor: theme => theme.palette.primary.main,
                          boxShadow: theme => `0 8px 26px ${alpha(theme.palette.primary.main, 0.18)}`
                        }
                      }}
                    >
                      {reason && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: theme => alpha(theme.palette.background.default, 0.74),
                            backdropFilter: 'blur(1px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 3,
                            textAlign: 'center',
                            px: 2
                          }}
                        >
                          <Typography fontSize={12} fontWeight={700} color="text.secondary">
                            {reason}
                          </Typography>
                        </Box>
                      )}

                      <Box
                        component="img"
                        src={`https://placehold.co/400x200?text=${encodeURIComponent((item.Title || 'Untitled').slice(0, 40))}`}
                        alt={item.Title || 'Untitled'}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 2,
                          mb: 1.5,
                          border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`
                        }}
                      />
                      <Stack direction="row" alignItems="flex-start" spacing={1} mb={0.5}>
                        <Box flexGrow={1} minWidth={0}>
                          <Typography
                            fontWeight={700}
                            fontSize={14}
                            noWrap
                            title={item.Title}
                            sx={{ lineHeight: 1.2 }}
                          >
                            {item.Title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            title={item.Author || item.Publisher}
                          >
                            {item.Author || item.Publisher || ''}
                          </Typography>
                        </Box>
                        <Chip
                          label={isBook ? 'BOOK' : 'DOC'}
                          size="small"
                          color={isBook ? 'primary' : 'secondary'}
                          sx={{ fontWeight: 700, borderRadius: 1, flexShrink: 0 }}
                        />
                      </Stack>

                      <Divider sx={{ my: 1 }} />

                      <Box flexGrow={1}>
                        {renderDetails(item, isBook)}
                      </Box>

                      <Stack direction="row" spacing={0.75} mt={1.5} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={`Available: ${availableCount}`}
                          color={availableCount > 0 ? 'success' : 'default'}
                          sx={{ fontSize: 11, fontWeight: 600, borderRadius: 1 }}
                        />
                        {!isBook && docTypes.map(t => (
                          <Chip
                            key={t}
                            size="small"
                            label={t}
                            variant="outlined"
                            color="info"
                            sx={{ fontSize: 11, fontWeight: 600, borderRadius: 1 }}
                          />
                        ))}
                        {!isBook && showDigitalView && (
                          <Tooltip title="View digital preview">
                            <IconButton
                              size="small"
                              onClick={() => handleViewPdf(item.File_Path || item.file_path)}
                              sx={{
                                ml: 'auto',
                                border: theme => `1px solid ${theme.palette.divider}`,
                                borderRadius: 1.5
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
                        onClick={() => handleAddToCart(item, isBook)}
                        startIcon={<Add fontSize="small" />}
                        sx={{
                          mt: 1.5,
                          fontWeight: 600,
                          borderRadius: 1.5,
                          boxShadow: 'none'
                        }}
                      >
                        {reason || 'Add to Queue'}
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
              {!paged.length && (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 6,
                      textAlign: 'center',
                      border: theme => `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                      borderRadius: 3,
                      bgcolor: theme => alpha(theme.palette.background.paper, 0.7)
                    }}
                  >
                    <Typography color="text.secondary" fontWeight={600}>
                      No {emptyLabel} match the current filters.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Page {Math.min(page, totalPages)} of {totalPages}
            </Typography>
            <Pagination
              count={totalPages}
              page={Math.min(page, totalPages)}
              onChange={(_, value) => setPage(value)}
              shape="rounded"
              color="primary"
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </Stack>
      </Container>

      {/* Floating Cart */}
      <Tooltip title={borrowLimit
        ? `Borrow Queue (${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left)`
        : 'Borrow Queue'}>
        <Fab
          color="primary"
          onClick={() => setCartOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            borderRadius: 2,
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)'
          }}
        >
          <Badge badgeContent={cart.length} color="error">
            <ListAlt />
          </Badge>
        </Fab>
      </Tooltip>

      {/* Queue Drawer */}
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
          <Typography fontWeight={800} fontSize={15}>Borrow Queue</Typography>
          <Chip
            size="small"
            label={borrowLimit
              ? `${cart.length} queued · ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`
              : `${cart.length} item${cart.length !== 1 ? 's' : ''}`}
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
              Queue empty. Add items to submit a borrow request.
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
                      onClick={() => handleRemoveFromCart(i)}
                      sx={{
                        border: `1px solid ${alpha('#f44336', 0.4)}`,
                        borderRadius: 0.75
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
              {borrowLimit ? (
                <Alert
                  severity={overCapacity ? 'error' : limitReached ? 'warning' : 'info'}
                  variant="outlined"
                  sx={{ borderRadius:1 }}
                >
                  {overCapacity
                    ? `Reduce your queue by ${totalQueued - borrowLimit} item${totalQueued - borrowLimit === 1 ? '' : 's'} to meet the limit of ${borrowLimit}. Active loans: ${activeBorrowCount}, queued: ${cart.length}.`
                    : limitReached
                      ? `Borrow limit reached (${borrowLimit}). Active loans: ${activeBorrowCount}, queued: ${cart.length}. Remove items to free up slots.`
                      : `You can add ${remainingSlots} more item${remainingSlots === 1 ? '' : 's'} (limit ${borrowLimit}). Active loans: ${activeBorrowCount}.`}
                </Alert>
              ) : null}
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
                inputProps={{ min: today() }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Tooltip
                title={!borrowerId
                  ? "Login required"
                  : overCapacity
                    ? `Reduce queue by ${totalQueued - borrowLimit} item${totalQueued - borrowLimit === 1 ? '' : 's'} to meet the ${borrowLimit}-item limit.`
                    : ""}
                disableHoverListener={!!borrowerId && !overCapacity}
              >
                <span>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    disabled={borrowLoading || !borrowerId || overCapacity}
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
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
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