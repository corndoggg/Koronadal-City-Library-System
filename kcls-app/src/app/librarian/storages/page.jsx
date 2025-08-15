import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, useTheme, Chip, Stack, CircularProgress, InputAdornment, Divider,
  Skeleton
} from "@mui/material";
import { Add, Edit, Storage, Book, Article, Search, Visibility, Refresh } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

const initialForm = { name: "" };

const StorageManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
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

  useEffect(() => { fetchStorages(); fetchDocsBooks(); }, []);

  const fetchStorages = async () => {
    try { setStorages((await axios.get(`${API_BASE}/storages`)).data || []); }
    catch { setStorages([]); }
  };

  const fetchDocsBooks = async () => {
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
  };

  const handleOpen = () => { setForm(initialForm); setIsEdit(false); setOpen(true); };
  const handleEdit = (storage) => { setForm({ name: storage.Name }); setEditId(storage.ID); setIsEdit(true); setOpen(true); };
  const handleClose = () => { setOpen(false); setForm(initialForm); setIsEdit(false); setEditId(null); };
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const name = form.name?.trim();
    if (!name) return setToast({ open: true, message: "Name is required.", severity: "error" });
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/storages/${editId}`, { name });
        setToast({ open: true, message: "Storage updated.", severity: "success" });
      } else {
        await axios.post(`${API_BASE}/storages`, { name });
        setToast({ open: true, message: "Storage added.", severity: "success" });
      }
      fetchStorages(); handleClose();
    } catch {
      setToast({ open: true, message: "Failed to save storage.", severity: "error" });
    }
  };

  const handleEditInventory = (item, inv) => { setEditItem(item); setEditInv({ ...inv }); setOpenEditInv(true); };
  const handleSaveInventory = async () => {
    if (!editInv) return;
    try {
      if (editItem.type === "Book") {
        await axios.put(
          `${API_BASE}/books/inventory/${editItem.id}/${editInv.Copy_ID || editInv.id || editInv.ID}`,
          {
            accessionNumber: editInv.accessionNumber,
            availability: editInv.availability,
            physicalStatus: editInv.physicalStatus ?? "",
            condition: editInv.condition,
            location: editInv.location
          }
        );
      } else {
        await axios.put(
          `${API_BASE}/documents/inventory/${editItem.id}/${editInv.Storage_ID || editInv.storageId || editInv.location}`,
          {
            availability: editInv.availability,
            condition: editInv.condition,
            location: editInv.location
          }
        );
      }
      setToast({ open: true, message: "Item updated.", severity: "success" });
      setOpenEditInv(false);
      fetchDocsBooks();
    } catch {
      setToast({ open: true, message: "Failed to update item.", severity: "error" });
    }
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
    setViewAllOpen(true);
  };

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: 'background.default', position: 'relative' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Storage color="primary" />
          <Box>
            <Typography fontWeight={800} variant="h6" letterSpacing={0.5}>
              Storage Management
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Organize physical locations for books & documents
            </Typography>
          </Box>
        </Stack>
        <TextField
          size="small"
            placeholder="Search storage / item / accession / availability / condition"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{
              width: { xs: '100%', md: 420 },
              ml: { xs: 0, md: 'auto' },
              '& .MuiOutlinedInput-root': { borderRadius: 1 }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
        />
        <Stack direction="row" gap={1} ml="auto">
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={() => { fetchStorages(); fetchDocsBooks(); }}
              sx={{
                borderRadius: 1,
                border: `1.5px solid ${theme.palette.divider}`,
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleOpen}
            sx={{ fontWeight: 700, borderRadius: 1 }}
          >
            Add Storage
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      {loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
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
          elevation={0}
          sx={{
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
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
                      letterSpacing: .5,
                      bgcolor: theme.palette.background.default,
                      borderBottom: `2px solid ${theme.palette.divider}`
                    }
                  }}
                >
                  <TableCell width="25%">Storage</TableCell>
                  <TableCell>Items (sample up to 5)</TableCell>
                  <TableCell width="12%" align="center">Actions</TableCell>
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
                  const showItems = itemsInStorage.slice(0, 5);
                  const availableCount = itemsInStorage.filter(i => i.availability === 'Available').length;
                  return (
                    <TableRow key={storage.ID}>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={800} fontSize={13} lineHeight={1.1}>
                            {storage.Name}
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={`Items: ${itemsInStorage.length}`}
                              sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                            />
                            <Chip
                              size="small"
                              color="success"
                              label={`Available: ${availableCount}`}
                              sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                            />
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          {showItems.length > 0 ? (
                            showItems.map((item, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                icon={item.type === "Book" ? <Book fontSize="small" /> : <Article fontSize="small" />}
                                label={
                                  item.type === "Book"
                                    ? `${item.title} • Acc# ${item.accessionNumber || '-'} • ${item.availability}`
                                    : `${item.title} • ${item.availability}`
                                }
                                color={item.type === "Book" ? "primary" : "secondary"}
                                variant="outlined"
                                onClick={() => handleEditInventory(
                                  { type: item.type, title: item.title, id: item.id }, item.inv
                                )}
                                sx={{
                                  maxWidth: 280,
                                  '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                  borderRadius: 0.75,
                                  fontSize: 11,
                                  fontWeight: 600
                                }}
                              />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              No items
                            </Typography>
                          )}
                          {itemsInStorage.length > 5 && (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<Visibility fontSize="small" />}
                              onClick={() => handleViewAll(storage.ID)}
                              sx={{ fontWeight: 700, borderRadius: 0.75 }}
                            >
                              View all ({itemsInStorage.length})
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredStorages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
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
          <Stack direction="column" gap={1}>
            {viewAllItems.length === 0 ? (
              <Typography color="text.secondary">No items in this location.</Typography>
            ) : (
              viewAllItems.map((item, idx) => (
                <Chip
                  key={idx}
                  icon={item.type === "Book" ? <Book /> : <Article />}
                  label={
                    item.type === "Book"
                      ? `Book: ${item.title} • Acc# ${item.accessionNumber || '-'} • ${item.availability}${item.condition ? ` • ${item.condition}` : ""}`
                      : `Doc: ${item.title} • ${item.availability}${item.condition ? ` • ${item.condition}` : ""}`
                  }
                  color={item.type === "Book" ? "primary" : "secondary"}
                  variant="outlined"
                  onClick={() => handleEditInventory(
                    { type: item.type, title: item.title, id: item.id }, item.inv
                  )}
                  sx={{
                    borderRadius: 0.75,
                    fontSize: 12,
                    fontWeight: 600
                  }}
                />
              ))
            )}
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
        onClose={() => setOpenEditInv(false)}
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
          <TextField
            label="Location"
            value={editInv?.location || ""}
            onChange={e => setEditInv({ ...editInv, location: e.target.value })}
            fullWidth
            size="small"
            margin="dense"
            select
            SelectProps={{ native: true }}
            sx={{ borderRadius: 1 }}
          >
            <option value="">Select Location</option>
            {storages.map(s => (
              <option key={s.ID} value={s.ID}>{s.Name}</option>
            ))}
          </TextField>
          <TextField
            label="Condition"
            value={editInv?.condition || ""}
            onChange={e => setEditInv({ ...editInv, condition: e.target.value })}
            fullWidth
            size="small"
            margin="dense"
            sx={{ borderRadius: 1 }}
          />
          <TextField
            label="Availability"
            value={editInv?.availability || ""}
            onChange={e => setEditInv({ ...editInv, availability: e.target.value })}
            fullWidth
            size="small"
            margin="dense"
            sx={{ borderRadius: 1 }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            onClick={() => setOpenEditInv(false)}
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
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            required
            size="small"
            autoFocus
            sx={{ borderRadius: 1 }}
          />
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