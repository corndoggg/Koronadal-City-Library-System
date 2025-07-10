import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Grid, Card, CardContent, CardActions, IconButton, Tooltip, useTheme, Chip, Divider, Stack
} from "@mui/material";
import { Add, Edit, Storage, Book, Article, Warning, Error, CheckCircle, AssignmentLate } from "@mui/icons-material";

const initialForm = { name: "" };

const StorageManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const [storages, setStorages] = useState([]), [open, setOpen] = useState(false), [isEdit, setIsEdit] = useState(false),
    [form, setForm] = useState(initialForm), [editId, setEditId] = useState(null), [toast, setToast] = useState({ open: false, message: "", severity: "success" }),
    [loading, setLoading] = useState(false), [docsBooks, setDocsBooks] = useState([]),
    [editItem, setEditItem] = useState(null), [editInv, setEditInv] = useState(null), [openEditInv, setOpenEditInv] = useState(false);

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
    console.log("Saving storage:", { name });
    if (!name) {
      setToast({ open: true, message: "Name is required.", severity: "error" });
      return;
    }
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/storages/${editId}`, { name: name });
        setToast({ open: true, message: "Storage updated.", severity: "success" });
      } else {
        await axios.post(`${API_BASE}/storages`, { name: name });
        setToast({ open: true, message: "Storage added.", severity: "success" });
      }
      fetchStorages();
      handleClose();
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

  const getItemsAtLocation = (storageId) =>
    docsBooks.flatMap(item =>
      (item.inventory || [])
        .filter(inv => String(inv.location) === String(storageId))
        .map(inv => ({
          type: item.type, title: item.title, id: item.id,
          accessionNumber: inv.accessionNumber, availability: inv.availability, condition: inv.condition, inv
        }))
    );

  const getReports = () => {
    const allItems = docsBooks.flatMap(item =>
      (item.inventory || []).map(inv => ({
        type: item.type, title: item.title, id: item.id,
        storageId: inv.Storage_ID, copyId: inv.Copy_ID,
        accessionNumber: inv.accessionNumber, availability: inv.availability,
        condition: inv.condition, location: inv.location,
      }))
    );
    const badCondition = allItems.filter(inv =>
      inv.condition && ["bad", "poor", "damaged", "needs repair", "lost"].some(bad =>
        String(inv.condition).toLowerCase().includes(bad)
      )
    );
    const missingStorage = allItems.filter(inv =>
      inv.type === "Book" ? !inv.location : !inv.storageId
    );
    const unavailable = allItems.filter(inv =>
      inv.availability && String(inv.availability).toLowerCase() !== "available"
    );
    return { badCondition, missingStorage, unavailable };
  };

  const { badCondition, missingStorage, unavailable } = getReports();

  const ReportChips = ({ items, color, findInv }) => (
    <>
      {items.map((inv, idx) => (
        <Chip
          key={idx}
          icon={inv.type === "Book" ? <Book /> : <Article />}
          label={
            <>
              {inv.type}: {inv.title}
              {inv.accessionNumber && ` | Accession #: ${inv.accessionNumber}`}
              {inv.condition && color !== "info" && ` | Condition: ${inv.condition}`}
              {inv.availability && color === "info" && ` | Availability: ${inv.availability}`}
              {inv.storageId && color === "error" && ` | Storage ID: ${inv.storageId}`}
            </>
          }
          color={color}
          variant="outlined"
          sx={{ mr: 1, mb: 1, cursor: "pointer" }}
          onClick={() => handleEditInventory(
            { type: inv.type, title: inv.title, id: inv.id },
            docsBooks
              .find(d => d.type === inv.type && d.id === inv.id)
              ?.inventory?.find(i => findInv(inv, i)) || {}
          )}
        />
      ))}
    </>
  );

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
      <Box mb={4}>
        <Typography variant="h6" color="primary" gutterBottom>
          <AssignmentLate sx={{ verticalAlign: "middle", mr: 1 }} />
          Storage & Physical Reports
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <Error color="error" />
              <Typography variant="subtitle2" color="error" fontWeight={700}>
                {badCondition.length > 0 ? `Needs Attention (Bad Condition):` : "No items in bad condition."}
              </Typography>
            </Stack>
            <ReportChips
              items={badCondition}
              color="error"
              findInv={(inv, i) => inv.type === "Book" ? i.Copy_ID === inv.copyId : i.Storage_ID === inv.storageId}
            />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <Warning color="warning" />
              <Typography variant="subtitle2" color="warning.main" fontWeight={700}>
                {missingStorage.length > 0 ? `Missing Storage Assignment:` : "All items have storage assigned."}
              </Typography>
            </Stack>
            <ReportChips
              items={missingStorage}
              color="warning"
              findInv={(inv, i) => inv.type === "Book"
                ? (i.Copy_ID === inv.copyId)
                : (!i.location)}
            />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <CheckCircle color="info" />
              <Typography variant="subtitle2" color="info.main" fontWeight={700}>
                {unavailable.length > 0 ? `Unavailable Items:` : "All items are available."}
              </Typography>
            </Stack>
            <ReportChips
              items={unavailable}
              color="info"
              findInv={(inv, i) => inv.type === "Book"
                ? (i.Copy_ID === inv.copyId)
                : (i.availability === inv.availability)}
            />
          </Box>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        {storages.map(storage => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={storage.ID}>
            <Card sx={{
              borderRadius: 4, boxShadow: 6, background: theme.palette.background.paper,
              border: `2px solid ${theme.palette.primary.light}`,
              transition: "box-shadow 0.2s",
              "&:hover": { boxShadow: 12, borderColor: theme.palette.primary.main }
            }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                  {storage.Name}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box mt={2}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Items at this Location:</Typography>
                  {getItemsAtLocation(storage.ID).length > 0 ? (
                    getItemsAtLocation(storage.ID).map((item, idx) => (
                      <Chip
                        key={idx}
                        icon={item.type === "Book" ? <Book /> : <Article />}
                        label={
                          item.type === "Book"
                            ? `Book: ${item.title} | Accession #: ${item.accessionNumber} | Availability: ${item.availability}${item.condition ? ` | Condition: ${item.condition}` : ""}`
                            : `Document: ${item.title} | Availability: ${item.availability}${item.condition ? ` | Condition: ${item.condition}` : ""}`
                        }
                        color={item.type === "Book" ? "primary" : "secondary"}
                        variant="outlined"
                        sx={{ mr: 1, mb: 1, cursor: "pointer" }}
                        onClick={() => handleEditInventory(
                          { type: item.type, title: item.title, id: item.id }, item.inv
                        )}
                      />
                    ))
                  ) : (
                    <Typography variant="caption" color="text.disabled">No items at this location</Typography>
                  )}
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end" }}>
                <Tooltip title="Edit Storage">
                  <IconButton color="primary" onClick={() => handleEdit(storage)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {storages.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="body2" color="text.secondary">No storage locations found.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
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