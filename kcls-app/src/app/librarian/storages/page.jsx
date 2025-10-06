import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, useTheme, Chip, Stack, CircularProgress, InputAdornment, Divider,
  Skeleton, MenuItem, LinearProgress, Grid
} from "@mui/material";
import { Add, Edit, Storage, Book, Article, Search, Visibility, Refresh, Delete as DeleteIcon, WarningAmber, Inventory2, ReportProblem } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

const initialForm = { name: "", capacity: "" };

const StorageManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const conditionOptions = ["Good", "Fair", "Average", "Poor", "Bad", "Lost"]; // standardized
  const availabilityOptions = ["Available", "Borrowed", "Reserved", "Lost"]; // unified
  const [storages, setStorages] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);
  const [docsBooks, setDocsBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editInv, setEditInv] = useState(null);
  const [openEditInv, setOpenEditInv] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewAllItems, setViewAllItems] = useState([]);
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [viewAllPage, setViewAllPage] = useState(0);
  const rowsPerPage = 10;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchStorages = useCallback(async () => {
    try { setStorages((await axios.get(`${API_BASE}/storages`)).data || []); }
    catch { setStorages([]); }
  }, [API_BASE]);

  const fetchDocsBooks = useCallback(async () => {
    setLoading(true);
    try {
      const booksRes = await axios.get(`${API_BASE}/books`);
      const booksWithInventory = await Promise.all(
        (booksRes.data || []).map(async (b) => {
          const invRes = await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`);
            const inventory = (invRes.data || []).map(copy => ({
            ...copy,
            location: copy.StorageLocation != null ? String(copy.StorageLocation) : (copy.location != null ? String(copy.location) : ''),
            accessionNumber: copy.accessionNumber ?? copy.AccessionNumber ?? "",
            availability: copy.availability ?? copy.Availability ?? "",
            condition: copy.condition ?? copy.Condition ?? ""
          }));
          return { type: "Book", title: b.Title, id: b.Book_ID, inventory };
        })
      );
      const docsRes = await axios.get(`${API_BASE}/documents`);
      const docsWithInventory = await Promise.all(
        (docsRes.data || []).map(async (d) => {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`);
          const inventory = (invRes.data || []).map(inv => ({
            ...inv,
            location: inv.StorageLocation != null ? String(inv.StorageLocation) : '',
            availability: inv.availability ?? inv.Availability ?? "",
            condition: inv.condition ?? inv.Condition ?? ""
          }));
          return { type: "Document", title: d.Title, id: d.Document_ID, inventory };
        })
      );
      setDocsBooks([...booksWithInventory, ...docsWithInventory]);
    } catch { setDocsBooks([]); }
    setLoading(false);
      }, [API_BASE]);

      useEffect(() => { fetchStorages(); fetchDocsBooks(); }, [fetchStorages, fetchDocsBooks]);

  const handleOpen = () => { setForm(initialForm); setIsEdit(false); setOpen(true); };
  const handleEdit = (storage) => { setForm({ name: storage.Name || "", capacity: String(storage.Capacity ?? "") }); setEditId(storage.ID); setIsEdit(true); setOpen(true); };
  const handleClose = () => { setOpen(false); setForm(initialForm); setIsEdit(false); setEditId(null); };
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const name = form.name?.trim();
    const capacityNum = form.capacity === "" ? 0 : Number(form.capacity);
    if (!name) return setToast({ open: true, message: "Name is required.", severity: "error" });
    if (Number.isNaN(capacityNum) || capacityNum < 0) {
      return setToast({ open: true, message: "Capacity must be a non-negative number.", severity: "error" });
    }
    // duplicate name guard (case-insensitive, excluding current editing id)
    const dup = storages.some(s => s.Name?.toLowerCase().trim() === name.toLowerCase() && (!isEdit || s.ID !== editId));
    if (dup) {
      return setToast({ open: true, message: "A storage with this name already exists.", severity: "error" });
    }
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/storages/${editId}`, { name, capacity: capacityNum });
        setToast({ open: true, message: "Storage updated.", severity: "success" });
      } else {
        await axios.post(`${API_BASE}/storages`, { name, capacity: capacityNum });
        setToast({ open: true, message: "Storage added.", severity: "success" });
      }
      fetchStorages(); handleClose();
    } catch {
      setToast({ open: true, message: "Failed to save storage.", severity: "error" });
    }
  };

  const handleEditInventory = (item, inv) => {
    // ensure defaults for a straightforward edit
    const normalized = {
      ...inv,
      location: inv.StorageLocation != null ? String(inv.StorageLocation) : (inv.location != null ? String(inv.location) : ""),
      availability: inv.availability || inv.Availability || "Available",
      condition: inv.condition || inv.Condition || "Good"
    };
    setEditItem(item);
    setEditInv({
      ...normalized,
      originalAvailability: normalized.availability,
      originalLocation: normalized.location
    });
    setOpenEditInv(true);
  };
  const handleSaveInventory = async () => {
    if (!editInv) return;
    const originalAvailability = editInv.originalAvailability || editInv.availability || "Available";
    const originalLocation = editInv.originalLocation ?? editInv.location;
    const isBorrowed = originalAvailability === "Borrowed";

    if (isBorrowed) {
      if (editInv.availability && editInv.availability !== originalAvailability) {
        setToast({ open: true, message: "Borrowed items must be returned before adjusting availability.", severity: "warning" });
        return;
      }
      if (editInv.location && editInv.location !== originalLocation) {
        setToast({ open: true, message: "Borrowed items must be returned before moving locations.", severity: "warning" });
        return;
      }
    }

    const nextAvailability = isBorrowed ? originalAvailability : (editInv.availability || "Available");
    const nextLocationValue = isBorrowed ? originalLocation : editInv.location;

    if (!nextLocationValue) {
      setToast({ open: true, message: "Location is required.", severity: "error" });
      return;
    }
    if (!nextAvailability) {
      setToast({ open: true, message: "Availability is required.", severity: "error" });
      return;
    }

    try {
      const locId = parseInt(String(nextLocationValue), 10);
      const normalizedLocation = Number.isNaN(locId) ? String(nextLocationValue) : locId;
      const normalizedCondition = editInv.condition || "Good";
      if (editItem.type === "Book") {
        await axios.put(
          `${API_BASE}/books/inventory/${editItem.id}/${editInv.Copy_ID || editInv.id || editInv.ID}`,
          {
            accessionNumber: editInv.accessionNumber,
            availability: nextAvailability,
            condition: normalizedCondition,
            location: normalizedLocation
          }
        );
      } else {
        const docInvKey = editInv.Storage_ID || editInv.storageId || normalizedLocation;
        await axios.put(
          `${API_BASE}/documents/inventory/${editItem.id}/${docInvKey}`,
          {
            availability: nextAvailability,
            condition: normalizedCondition,
            location: normalizedLocation
          }
        );
      }
      setToast({ open: true, message: "Item updated.", severity: "success" });
      setOpenEditInv(false);
      setEditInv(null);
      fetchDocsBooks();
    } catch {
      setToast({ open: true, message: "Failed to update item.", severity: "error" });
    }
  };

  const handleCloseEditInv = () => {
    setOpenEditInv(false);
    setEditInv(null);
    setEditItem(null);
  };

  const allItems = useMemo(() =>
    docsBooks.flatMap(item =>
      (item.inventory || []).map(inv => ({
        type: item.type,
        title: item.title,
        id: item.id,
        storageId: inv.StorageLocation || inv.location,
        accessionNumber: inv.accessionNumber,
        availability: inv.availability,
        condition: inv.condition,
        inv
      }))
    ), [docsBooks]);

  // Simple dashboard stats
  const { totalItems, booksCount, docsCount, conditionCounts } = useMemo(() => {
    const total = allItems.length;
    const books = allItems.filter(i => i.type === 'Book').length;
    const docs = allItems.filter(i => i.type === 'Document').length;
    const conds = { Good: 0, Fair: 0, Average: 0, Poor: 0, Bad: 0, Unknown: 0 };
    for (const i of allItems) {
      const c = (i.condition || '').trim();
      if (Object.prototype.hasOwnProperty.call(conds, c)) conds[c] += 1; else conds.Unknown += 1;
    }
    return { totalItems: total, booksCount: books, docsCount: docs, conditionCounts: conds };
  }, [allItems]);

  const availabilityCounts = useMemo(() => {
    const counts = { available: 0, borrowed: 0, reserved: 0, lost: 0 };
    for (const entry of allItems) {
      const availability = (entry.availability || '').toLowerCase();
      if (availability === 'available') counts.available += 1;
      else if (availability === 'borrowed') counts.borrowed += 1;
      else if (availability === 'reserved') counts.reserved += 1;
      else if (availability === 'lost') counts.lost += 1;
    }
    return counts;
  }, [allItems]);
  const {
    available: availableCount,
    borrowed: borrowedCount,
    reserved: reservedCount,
    lost: lostCount
  } = availabilityCounts;

  const capacityUsage = useMemo(() => {
    return (storages || []).map(s => {
      const used = allItems.filter(i => String(i.storageId) === String(s.ID)).length;
      const cap = Number(s.Capacity ?? 0);
      const percent = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
      return { id: s.ID, name: s.Name, used, capacity: cap, percent, over: cap > 0 && used > cap };
    }).sort((a, b) => b.used - a.used);
  }, [storages, allItems]);
  const overCapacityCount = useMemo(() => capacityUsage.filter(s => s.over).length, [capacityUsage]);

  const filteredStorages = useMemo(() => {
    const q = search.toLowerCase();
    return storages.filter(s =>
      s.Name.toLowerCase().includes(q) ||
      allItems.some(i => String(i.storageId) === String(s.ID) &&
        (
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.accessionNumber && i.accessionNumber.toLowerCase().includes(q)) ||
          (i.availability && i.availability.toLowerCase().includes(q)) ||
          (i.condition && i.condition.toLowerCase().includes(q))
        )
      )
    );
  }, [storages, allItems, search]);

  const handleViewAll = (storageId) => {
    setViewAllItems(allItems.filter(i => String(i.storageId) === String(storageId)));
    setViewAllSearch("");
    setViewAllPage(0);
    setViewAllOpen(true);
  };

  const filteredViewAllItems = useMemo(() => {
    const q = viewAllSearch.toLowerCase();
    if (!q) return viewAllItems;
    return viewAllItems.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.accessionNumber && item.accessionNumber.toLowerCase().includes(q)) ||
      (item.availability && item.availability.toLowerCase().includes(q)) ||
      (item.condition && item.condition.toLowerCase().includes(q))
    );
  }, [viewAllItems, viewAllSearch]);

  const paginatedViewAll = useMemo(() => {
    const start = viewAllPage * rowsPerPage;
    return filteredViewAllItems.slice(start, start + rowsPerPage);
  }, [filteredViewAllItems, viewAllPage]);

  const totalPages = Math.max(1, Math.ceil(filteredViewAllItems.length / rowsPerPage));
  const isBorrowedEdit = editInv?.originalAvailability === "Borrowed";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2.5,
            p: { xs: 2.5, md: 3 },
            backgroundImage: t => `linear-gradient(135deg, ${t.palette.mode === 'dark' ? t.palette.primary.dark : alpha(t.palette.primary.light, 0.9)} 0%, ${t.palette.mode === 'dark' ? t.palette.primary.main : t.palette.primary.dark} 100%)`,
            color: t => t.palette.common.white,
            border: t => `1px solid ${alpha(t.palette.primary.main, 0.4)}`,
            boxShadow: t => `0 24px 48px ${alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.45 : 0.25)}`
          }}
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} alignItems={{ lg: 'center' }}>
              <Stack spacing={1.25} flex={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Storage sx={{ opacity: 0.9 }} />
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>
                    Storage oversight
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={800} letterSpacing={0.4}>
                  Librarian storage workspace
                </Typography>
                <Typography variant="body2" sx={{ maxWidth: 560, opacity: 0.9 }}>
                  Track capacity, availability, and borrowed circulation across every storage location. Use the quick actions to refresh inventory or register a new shelf.
                </Typography>
              </Stack>
              <Stack spacing={1.25} alignItems={{ xs: 'stretch', lg: 'flex-end' }} minWidth={{ lg: 320 }}>
                <TextField
                  size="small"
                  placeholder="Search storage, items, or accession"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 1.25,
                      bgcolor: alpha(theme.palette.common.white, 0.12),
                      color: 'inherit',
                      '& fieldset': { borderColor: alpha(theme.palette.common.white, 0.2) },
                      '&:hover fieldset': { borderColor: alpha(theme.palette.common.white, 0.4) }
                    }
                  }}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-input': { color: 'inherit' }
                  }}
                />
                <Stack direction="row" gap={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }} flexWrap="wrap">
                  <Tooltip title="Refresh inventory data">
                    <IconButton
                      onClick={() => { fetchStorages(); fetchDocsBooks(); }}
                      size="small"
                      sx={{
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.common.white, 0.4)}`,
                        color: 'inherit',
                        '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.16) }
                      }}
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleOpen}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 1,
                      px: 2.25,
                      boxShadow: 'none'
                    }}
                  >
                    Add Storage
                  </Button>
                </Stack>
                {loading && (
                  <LinearProgress
                    color="inherit"
                    sx={{ width: '100%', borderRadius: 1, backgroundColor: alpha(theme.palette.common.white, 0.2) }}
                  />
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            border: t => `1.5px solid ${t.palette.divider}`,
            bgcolor: 'background.paper',
            p: { xs: 2, md: 2.75 }
          }}
        >
          <Stack spacing={2.5}>
            <Grid container spacing={2.5}>
              {[{
                title: 'Storage locations',
                value: storages.length,
                caption: overCapacityCount ? `${overCapacityCount} over capacity` : 'All shelves within limits',
                secondary: overCapacityCount ? 'Triage overflow locations soon.' : 'Balanced shelving footprint.',
                icon: <Storage fontSize="small" />,
                color: 'primary'
              }, {
                title: 'Items tracked',
                value: totalItems,
                caption: `${booksCount} books • ${docsCount} documents`,
                secondary: `${conditionCounts.Good} good • ${conditionCounts.Fair} fair • ${conditionCounts.Poor + conditionCounts.Bad} needs care`,
                icon: <Inventory2 fontSize="small" />,
                color: 'secondary'
              }, {
                title: 'Borrowed right now',
                value: borrowedCount,
                caption: `${reservedCount} reserved • ${lostCount} lost`,
                secondary: borrowedCount ? 'Return to free up capacity.' : 'No outstanding loans.',
                icon: <WarningAmber fontSize="small" />,
                color: 'warning'
              }, {
                title: 'Available on shelves',
                value: availableCount,
                caption: `${reservedCount} awaiting pickup`,
                secondary: availableCount ? 'Plenty of inventory ready to lend.' : 'Restock recommended.',
                icon: <Book fontSize="small" />,
                color: 'success'
              }].map(card => (
                <Grid item xs={12} sm={6} xl={3} key={card.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 1.75,
                      p: 2,
                      height: '100%',
                      border: theme => `1px solid ${alpha(theme.palette[card.color]?.main || theme.palette.primary.main, 0.25)}`,
                      bgcolor: theme => alpha(theme.palette[card.color]?.main || theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: theme => alpha(theme.palette.background.paper, 0.35)
                          }}
                        >
                          {card.icon}
                        </Box>
                        <Box>
                          <Typography variant="overline" sx={{ letterSpacing: 0.6, opacity: 0.75 }}>
                            {card.title}
                          </Typography>
                          <Typography variant="h5" fontWeight={800}>
                            {card.value}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        {card.caption}
                      </Typography>
                      {card.secondary && (
                        <Typography variant="caption" sx={{ opacity: 0.65 }}>
                          {card.secondary}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Divider />

            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Typography fontWeight={800} fontSize={12} color="text.secondary" textTransform="uppercase" letterSpacing={0.8}>
                  Capacity usage snapshot
                </Typography>
                <Chip
                  size="small"
                  icon={<WarningAmber fontSize="small" />}
                  label={overCapacityCount ? `${overCapacityCount} locations over limit` : 'All locations within limits'}
                  color={overCapacityCount ? 'warning' : 'default'}
                  sx={{ fontWeight: 700, borderRadius: 1 }}
                />
              </Stack>
              {loading ? (
                <Stack gap={1}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={36} />
                  ))}
                </Stack>
              ) : (
                <Stack gap={1.15}>
                  {capacityUsage.slice(0, 6).map(s => (
                    <Box key={s.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700} fontSize={12}>{s.name}</Typography>
                        <Typography fontSize={12} color={s.over ? 'error.main' : 'text.secondary'}>
                          {s.capacity ? `${s.used}/${s.capacity}` : `${s.used}/∞`}
                        </Typography>
                      </Stack>
                      {s.capacity ? (
                        <LinearProgress
                          variant="determinate"
                          value={s.percent}
                          color={s.over ? 'error' : 'primary'}
                          sx={{ height: 8, borderRadius: 0.75, mt: 0.5 }}
                        />
                      ) : (
                        <Box sx={{ height: 8, borderRadius: 0.75, mt: 0.5, bgcolor: 'action.hover' }} />
                      )}
                    </Box>
                  ))}
                  {capacityUsage.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No storages to display.</Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              borderColor: theme.palette.divider,
              bgcolor: 'background.paper'
            }}
          >
            <CircularProgress size={46} />
            <Typography mt={2} variant="caption" color="text.secondary" display="block" fontWeight={600}>
              Loading inventory…
            </Typography>
            <Box mt={3} display="flex" flexDirection="column" gap={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={46} />
              ))}
            </Box>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: theme.palette.divider,
              overflow: 'hidden',
              bgcolor: 'background.paper'
            }}
          >
            <TableContainer
              sx={{
                maxHeight: '65vh',
                '&::-webkit-scrollbar': { width: 8 },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.divider,
                  borderRadius: 4
                }
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: 0.6,
                        bgcolor: theme.palette.background.default,
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        textTransform: 'uppercase'
                      }
                    }}
                  >
                    <TableCell width="35%">Storage</TableCell>
                    <TableCell width="15%" align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody
                  sx={{
                    '& tr:hover': { backgroundColor: theme.palette.action.hover },
                    '& td': { borderBottom: `1px solid ${theme.palette.divider}` }
                  }}
                >
                  {filteredStorages.map(storage => {
                    const itemsInStorage = allItems.filter(i => String(i.storageId) === String(storage.ID));
                    const storageAvailable = itemsInStorage.filter(i => i.availability === 'Available').length;
                    const usedCount = itemsInStorage.length;
                    const capacity = Number(storage.Capacity ?? 0);
                    const overCapacity = capacity > 0 && usedCount > capacity;
                    return (
                      <TableRow key={storage.ID}>
                        <TableCell>
                          <Stack spacing={0.75}>
                            <Typography fontWeight={800} fontSize={13} lineHeight={1.1}>
                              {storage.Name}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              <Chip
                                size="small"
                                label={`Items: ${usedCount}`}
                                sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                              />
                              <Chip
                                size="small"
                                color="success"
                                label={`Available: ${storageAvailable}`}
                                sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                              />
                              <Chip
                                size="small"
                                color={overCapacity ? 'error' : 'default'}
                                label={`Capacity: ${capacity || '∞'}${capacity ? ` • Used: ${usedCount}/${capacity}` : ''}`}
                                sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                              />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={`View Items (${itemsInStorage.length})`}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!itemsInStorage.length}
                                onClick={() => handleViewAll(storage.ID)}
                                sx={{
                                  mr: 1,
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 0.75,
                                  '&:hover': { bgcolor: theme.palette.action.hover }
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Edit Storage">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(storage)}
                              sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 0.75,
                                '&:hover': { bgcolor: theme.palette.action.hover }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={itemsInStorage.length ? "Remove all items from this location first" : "Delete Storage"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={itemsInStorage.length > 0}
                                onClick={() => { setDeleteTarget(storage); setDeleteOpen(true); }}
                                sx={{
                                  ml: 1,
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 0.75,
                                  '&:hover': { bgcolor: theme.palette.action.hover }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredStorages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No storage locations found{search ? ' for this search.' : '.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>

      {/* View All Items Modal */}
      <Dialog
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          Items in Location
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            size="small"
            placeholder="Search items (title / accession / availability / condition)"
            fullWidth
            value={viewAllSearch}
            onChange={e => { setViewAllSearch(e.target.value); setViewAllPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          />
          <Stack direction="column" gap={1}>
            {filteredViewAllItems.length === 0 ? (
              <Typography color="text.secondary">No items match this search.</Typography>
            ) : (
              paginatedViewAll.map((item, idx) => {
                const availability = (item.availability || '').toLowerCase();
                const chipColor = availability === 'borrowed'
                  ? 'warning'
                  : availability === 'reserved'
                  ? 'info'
                  : availability === 'lost'
                  ? 'error'
                  : 'success';
                return (
                  <Chip
                    key={idx}
                    icon={item.type === "Book" ? <Book /> : <Article />}
                    label={
                      item.type === "Book"
                        ? `Book: ${item.title} • Acc# ${item.accessionNumber || '-'} • ${item.availability}${item.condition ? ` • ${item.condition}` : ""}`
                        : `Doc: ${item.title} • ${item.availability}${item.condition ? ` • ${item.condition}` : ""}`
                    }
                    color={chipColor}
                    variant="outlined"
                    onClick={() => handleEditInventory(
                      { type: item.type, title: item.title, id: item.id }, item.inv
                    )}
                    sx={{
                      borderRadius: 0.75,
                      fontSize: 12,
                      fontWeight: 600,
                      borderWidth: 1.25,
                      '& .MuiChip-icon': { fontSize: 18 }
                    }}
                  />
                );
              })
            )}
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={1.5}
            sx={{ mt: 2 }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {filteredViewAllItems.length ? `Showing ${Math.min(filteredViewAllItems.length, viewAllPage * rowsPerPage + 1)}-${Math.min(filteredViewAllItems.length, (viewAllPage + 1) * rowsPerPage)} of ${filteredViewAllItems.length}` : ' '} 
            </Typography>
            <Stack direction="row" gap={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                disabled={viewAllPage === 0}
                onClick={() => setViewAllPage(p => Math.max(0, p - 1))}
                sx={{ borderRadius: 1 }}
              >
                Prev
              </Button>
              <Typography variant="caption" fontWeight={700}>
                Page {viewAllPage + 1} / {totalPages}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={viewAllPage >= totalPages - 1}
                onClick={() => setViewAllPage(p => Math.min(totalPages - 1, p + 1))}
                sx={{ borderRadius: 1 }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button onClick={() => setViewAllOpen(false)} size="small" variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Inventory Modal */}
      <Dialog
        open={openEditInv}
        onClose={handleCloseEditInv}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          Edit {editItem?.type} Inventory
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {isBorrowedEdit && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
              Borrowed items are locked to their current location and availability. Update the condition only, or return the item first.
            </Alert>
          )}
          <Stack spacing={1.25}>
            <TextField
              select
              label="Location"
              value={editInv?.location || ""}
              onChange={e => setEditInv({ ...editInv, location: e.target.value })}
              fullWidth
              required
              size="small"
              helperText={
                !storages.length
                  ? 'Add a storage first.'
                  : isBorrowedEdit
                  ? 'Borrowed items must be returned before changing location.'
                  : ' '
              }
              disabled={!storages.length || isBorrowedEdit}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {storages.map(s => (
                <MenuItem key={s.ID} value={String(s.ID)}>{s.Name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Condition"
              value={editInv?.condition || "Good"}
              onChange={e => setEditInv({ ...editInv, condition: e.target.value })}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {/* show current legacy value if not in standard list */}
              {editInv?.condition && !conditionOptions.includes(editInv.condition) && (
                <MenuItem value={editInv.condition} disabled>
                  {`Legacy: ${editInv.condition}`}
                </MenuItem>
              )}
              {conditionOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Availability"
              value={editInv?.availability || "Available"}
              onChange={e => setEditInv({ ...editInv, availability: e.target.value })}
              fullWidth
              size="small"
              helperText={
                isBorrowedEdit
                  ? 'Return this item before changing availability.'
                  : ' '
              }
              disabled={isBorrowedEdit}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {editInv?.availability && !availabilityOptions.includes(editInv.availability) && (
                <MenuItem value={editInv.availability} disabled>
                  {`Legacy: ${editInv.availability}`}
                </MenuItem>
              )}
              {availabilityOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            onClick={handleCloseEditInv}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveInventory}
            variant="contained"
            size="small"
            disabled={!editInv || (!isBorrowedEdit && !editInv.location)}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Storage Modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          {isEdit ? "Edit Storage Location" : "Add Storage Location"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1.25}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              label="Capacity (optional)"
              name="capacity"
              type="number"
              inputProps={{ min: 0, step: 1 }}
              value={form.capacity}
              onChange={handleChange}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              helperText="Leave empty for unlimited capacity"
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            size="small"
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {isEdit ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle sx={{ fontWeight: 800, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          Delete Storage?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmber color="warning" />
            <Typography variant="body2">
              This will permanently remove "{deleteTarget?.Name}". This action cannot be undone.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 1 }}>
          <Button size="small" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }} variant="outlined">Cancel</Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await axios.delete(`${API_BASE}/storages/${deleteTarget.ID}`);
                setToast({ open: true, message: 'Storage deleted.', severity: 'success' });
                setDeleteOpen(false);
                setDeleteTarget(null);
                fetchStorages();
              } catch {
                setToast({ open: true, message: 'Failed to delete storage.', severity: 'error' });
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
          sx={{ borderRadius: 1, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StorageManagementPage;