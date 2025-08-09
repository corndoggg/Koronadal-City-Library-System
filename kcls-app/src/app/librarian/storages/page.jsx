import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, useTheme, Chip, Stack, CircularProgress
} from "@mui/material";
import { Add, Edit, Storage, Book, Article, Search, Visibility } from "@mui/icons-material";

const initialForm = { name: "" };

const StorageManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const [storages, setStorages] = useState([]), [open, setOpen] = useState(false), [isEdit, setIsEdit] = useState(false),
    [form, setForm] = useState(initialForm), [editId, setEditId] = useState(null), [toast, setToast] = useState({ open: false, message: "", severity: "success" }),
    [loading, setLoading] = useState(false), [docsBooks, setDocsBooks] = useState([]), [search, setSearch] = useState(""),
    [editItem, setEditItem] = useState(null), [editInv, setEditInv] = useState(null), [openEditInv, setOpenEditInv] = useState(false),
    [viewAllOpen, setViewAllOpen] = useState(false), [viewAllItems, setViewAllItems] = useState([]);

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

  // Table data: flatten all items with storage info
  const allItems = docsBooks.flatMap(item =>
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
  );

  // Search filter
  const filteredStorages = storages.filter(s =>
    s.Name.toLowerCase().includes(search.toLowerCase()) ||
    allItems.some(i => String(i.storageId) === String(s.ID) &&
      (
        (i.title && i.title.toLowerCase().includes(search.toLowerCase())) ||
        (i.accessionNumber && i.accessionNumber.toLowerCase().includes(search.toLowerCase())) ||
        (i.availability && i.availability.toLowerCase().includes(search.toLowerCase())) ||
        (i.condition && i.condition.toLowerCase().includes(search.toLowerCase()))
      )
    )
  );

  // View all items modal for a storage
  const handleViewAll = (storageId) => {
    setViewAllItems(allItems.filter(i => String(i.storageId) === String(storageId)));
    setViewAllOpen(true);
  };

  return (
    <Box p={3} sx={{ minHeight: "100vh", background: theme.palette.background.default }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Storage fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>Storage Management</Typography>
        </Stack>
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpen} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Add Storage
        </Button>
      </Box>
      <Box mb={2} display="flex" alignItems="center" gap={1}>
        <Search color="action" />
        <TextField
          size="small"
          placeholder="Search by storage, item, accession, availability, or condition"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Box>
      {loading ? (
        <Box py={8} textAlign="center"><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Storage Name</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStorages.map(storage => {
                const itemsInStorage = allItems.filter(i => String(i.storageId) === String(storage.ID));
                const showItems = itemsInStorage.slice(0, 5);
                return (
                  <TableRow key={storage.ID}>
                    <TableCell>
                      <Typography fontWeight={700} color="primary">{storage.Name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {showItems.length > 0 ? (
                          showItems.map((item, idx) => (
                            <Chip
                              key={idx}
                              icon={item.type === "Book" ? <Book /> : <Article />}
                              label={
                                item.type === "Book"
                                  ? `Book: ${item.title} | Acc#: ${item.accessionNumber} | Avail: ${item.availability}${item.condition ? ` | Cond: ${item.condition}` : ""}`
                                  : `Doc: ${item.title} | Avail: ${item.availability}${item.condition ? ` | Cond: ${item.condition}` : ""}`
                              }
                              color={item.type === "Book" ? "primary" : "secondary"}
                              variant="outlined"
                              sx={{ cursor: "pointer" }}
                              onClick={() => handleEditInventory(
                                { type: item.type, title: item.title, id: item.id }, item.inv
                              )}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">No items</Typography>
                        )}
                        {itemsInStorage.length > 5 && (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<Visibility />}
                            onClick={() => handleViewAll(storage.ID)}
                          >
                            View all ({itemsInStorage.length})
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Storage">
                        <IconButton color="primary" onClick={() => handleEdit(storage)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStorages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="text.secondary">No storage locations found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* View All Items Modal */}
      <Dialog open={viewAllOpen} onClose={() => setViewAllOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>All Items in this Location</DialogTitle>
        <DialogContent>
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
                      ? `Book: ${item.title} | Acc#: ${item.accessionNumber} | Avail: ${item.availability}${item.condition ? ` | Cond: ${item.condition}` : ""}`
                      : `Doc: ${item.title} | Avail: ${item.availability}${item.condition ? ` | Cond: ${item.condition}` : ""}`
                  }
                  color={item.type === "Book" ? "primary" : "secondary"}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleEditInventory(
                    { type: item.type, title: item.title, id: item.id }, item.inv
                  )}
                />
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewAllOpen(false)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Inventory Modal */}
      <Dialog open={openEditInv} onClose={() => setOpenEditInv(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit {editItem?.type} Inventory</DialogTitle>
        <DialogContent>
          <TextField
            label="Location"
            value={editInv?.location || ""}
            onChange={e => setEditInv({ ...editInv, location: e.target.value })}
            fullWidth margin="normal" select SelectProps={{ native: true }}>
            <option value="">Select Location</option>
            {storages.map(s => (
              <option key={s.ID} value={s.ID}>{s.Name}</option>
            ))}
          </TextField>
          <TextField
            label="Condition"
            value={editInv?.condition || ""}
            onChange={e => setEditInv({ ...editInv, condition: e.target.value })}
            fullWidth margin="normal"
          />
          <TextField
            label="Availability"
            value={editInv?.availability || ""}
            onChange={e => setEditInv({ ...editInv, availability: e.target.value })}
            fullWidth margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditInv(false)} color="secondary" variant="outlined">Cancel</Button>
          <Button onClick={handleSaveInventory} color="primary" variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: theme.palette.background.default, color: theme.palette.text.primary, fontWeight: 700 }}>
          {isEdit ? "Edit Storage Location" : "Add Storage Location"}
        </DialogTitle>
        <DialogContent sx={{ background: theme.palette.background.paper }}>
          <TextField
            label="Name" name="name" value={form.name} onChange={handleChange} fullWidth required
            sx={{ mb: 2, background: theme.palette.background.default, borderRadius: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ background: theme.palette.background.paper }}>
          <Button onClick={handleClose} variant="outlined" color="secondary">Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">{isEdit ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StorageManagementPage;