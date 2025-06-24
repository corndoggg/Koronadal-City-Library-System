import React, { useEffect, useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, MenuItem, Alert, Snackbar, Box, LinearProgress, useTheme,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Typography, Divider, Grid
} from "@mui/material";
import { Add, Edit as EditIcon, Save, Cancel, Delete } from "@mui/icons-material";
import axios from "axios";

const initialForm = { title: "", author: "", category: "", department: "", classification: "", year: "", sensitivity: "", file: null, filePath: "" };
const initialInventory = { availability: "", condition: "", location: "" };
const categories = ["Thesis", "Research", "Case Study", "Feasibility Study", "Capstone", "Other"];
const sensitivities = ["Public", "Restricted", "Confidential"];

function DocumentFormModal({ open, onClose, onSave, isEdit, documentData }) {
  const theme = useTheme();
  const [form, setForm] = useState(initialForm);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryForm, setInventoryForm] = useState(initialInventory);
  const [editInvIndex, setEditInvIndex] = useState(null);
  const [deletedInventory, setDeletedInventory] = useState([]);
  const API_BASE = import.meta.env.VITE_API_BASE;
  const fileInputRef = useRef();

  useEffect(() => {
    if (isEdit && documentData) {
      setForm({
        title: documentData.Title || "",
        author: documentData.Author || "",
        category: documentData.Category || "",
        department: documentData.Department || "",
        classification: documentData.Classification || "",
        year: documentData.Year || "",
        sensitivity: documentData.Sensitivity || "",
        file: null,
        filePath: documentData.File_Path || "",
      });
      // Normalize inventory keys to lowercase for consistency
      setInventoryList(
        (documentData.inventory || []).map(inv => ({
          availability: inv.availability || inv.Availability || "",
          condition: inv.condition || inv.Condition || "",
          location: inv.location || inv.Location || "",
          Storage_ID: inv.Storage_ID
        }))
      );
    } else {
      setForm(initialForm);
      setInventoryList([]);
    }
    setInventoryForm(initialInventory);
    setEditInvIndex(null);
    setDeletedInventory([]);
    setUploadProgress(0);
  }, [isEdit, documentData, open]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file" && files && files[0]) setForm((prev) => ({ ...prev, file: files[0], filePath: files[0].name }));
    else setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleInventoryChange = (e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAddOrUpdateInventory = () => {
    if (!inventoryForm.availability || !inventoryForm.location) return setSnackbar({ open: true, message: "Availability and Location are required.", severity: "error" });
    if (editInvIndex !== null) {
      const updated = [...inventoryList]; updated[editInvIndex] = { ...updated[editInvIndex], ...inventoryForm };
      setInventoryList(updated); setEditInvIndex(null);
    } else setInventoryList([...inventoryList, { ...inventoryForm }]);
    setInventoryForm(initialInventory);
  };
  const handleEditInventory = (idx) => { setInventoryForm(inventoryList[idx]); setEditInvIndex(idx); };
  const handleDeleteInventory = (idx) => {
    const inv = inventoryList[idx];
    if (inv.Storage_ID) setDeletedInventory((prev) => [...prev, inv]);
    setInventoryList(inventoryList.filter((_, i) => i !== idx));
    setInventoryForm(initialInventory); setEditInvIndex(null);
  };
  const handleCancelInventoryEdit = () => { setInventoryForm(initialInventory); setEditInvIndex(null); };
  const handleFileChangeEdit = async (e) => {
    const file = e.target.files[0];
    if (!file || !documentData) return;
    setFileUploading(true); setUploadProgress(0);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await axios.put(`${API_BASE}/upload/edit/${documentData.Document_ID}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => setUploadProgress(Math.round((pe.loaded * 100) / pe.total)),
      });
      setForm((prev) => ({ ...prev, filePath: res.data.filePath }));
      setSnackbar({ open: true, message: "PDF file updated!", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to update PDF file", severity: "error" });
    }
    setFileUploading(false); setUploadProgress(0);
  };
  const handleChangePdfClick = () => { if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); } };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.category || !form.department || !form.classification || !form.year || !form.sensitivity)
      return setSnackbar({ open: true, message: "Please fill in all required fields.", severity: "error" });
    // Only allow if at least one inventory entry has required fields
    if (!inventoryList.some(inv => inv.availability && inv.location))
      return setSnackbar({ open: true, message: "Please add at least one inventory entry.", severity: "error" });
    if (isEdit) {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, v));
      onSave(payload, inventoryList, deletedInventory);
    } else {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k === "file" && !v) return; fd.append(k, v); });
      onSave(fd, inventoryList, []);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1, background: theme.palette.background.default, color: theme.palette.text.primary }}>
        {isEdit ? "Edit Document" : "Add Document"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f9f9fb', color: theme.palette.text.primary }}>
          <Stack spacing={2}>
            {/* Document Fields */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Document Details</Typography>
              <Grid container spacing={2}>
                {[
                  { label: "Title", name: "title" }, { label: "Author", name: "author" },
                  { label: "Category", name: "category", select: true, options: categories },
                  { label: "Department", name: "department" }, { label: "Classification", name: "classification" },
                  { label: "Year", name: "year", type: "number" }, { label: "Sensitivity", name: "sensitivity", select: true, options: sensitivities }
                ].map((f, i) => (
                  <Grid item xs={12} sm={6} key={f.name}>
                    <TextField
                      label={f.label}
                      name={f.name}
                      value={form[f.name]}
                      onChange={handleChange}
                      required
                      fullWidth
                      size="small"
                      type={f.type || "text"}
                      select={!!f.select}
                      sx={{ background: theme.palette.background.paper, borderRadius: 1 }}
                    >
                      {f.select && f.options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Grid>
                ))}
                <Grid item xs={12} sm={6}>
                  {!isEdit && (
                    <Button variant="outlined" component="label" fullWidth>
                      Upload PDF
                      <input type="file" name="file" accept="application/pdf" hidden onChange={handleChange} required />
                    </Button>
                  )}
                  {isEdit && (
                    <Box>
                      <TextField label="File Path" name="filePath" value={form.filePath} fullWidth disabled helperText="To change the file, click 'Change PDF File'." sx={{ mb: 1 }} />
                      <Button variant="outlined" onClick={handleChangePdfClick} disabled={fileUploading} fullWidth>
                        {fileUploading ? "Uploading..." : "Change PDF File"}
                      </Button>
                      <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={handleFileChangeEdit} />
                      {fileUploading && (
                        <Box sx={{ width: '100%', mt: 2 }}>
                          <LinearProgress variant="determinate" value={uploadProgress} />
                          <Box sx={{ textAlign: 'center', mt: 1 }}>{uploadProgress}%</Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  {!isEdit && form.filePath && (
                    <Box sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
                      Selected file: {form.filePath}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Inventory Section */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Document Inventory</Typography>
              <Grid container spacing={2}>
                {[
                  { label: "Availability", name: "availability", select: true, options: ["Available", "Borrowed", "Reserved"] },
                  { label: "Condition", name: "condition" },
                  { label: "Location", name: "location" }
                ].map((f, i) => (
                  <Grid item xs={12} sm={4} key={f.name}>
                    <TextField
                      label={f.label}
                      name={f.name}
                      value={inventoryForm[f.name]}
                      onChange={handleInventoryChange}
                      required={f.name !== "condition" && (inventoryForm.availability || inventoryForm.condition || inventoryForm.location)}
                      fullWidth
                      size="small"
                      select={!!f.select}
                      sx={{ background: theme.palette.background.paper, borderRadius: 1 }}
                    >
                      {f.select && f.options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Button variant={editInvIndex !== null ? 'contained' : 'outlined'} onClick={handleAddOrUpdateInventory} size="small" startIcon={editInvIndex !== null ? <Save /> : <Add />}>
                    {editInvIndex !== null ? 'Update Inventory' : 'Add Inventory'}
                  </Button>
                  {editInvIndex !== null && (
                    <Button variant="text" color="secondary" size="small" sx={{ ml: 1 }} onClick={handleCancelInventoryEdit} startIcon={<Cancel />}>
                      Cancel
                    </Button>
                  )}
                </Grid>
              </Grid>
              {inventoryList.length > 0 && (
                <Box mt={3}>
                  <Table size="small" sx={{ background: theme.palette.background.paper, borderRadius: 2 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Availability</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventoryList.map((inv, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{inv.availability}</TableCell>
                          <TableCell>{inv.condition}</TableCell>
                          <TableCell>{inv.location}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEditInventory(idx)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteInventory(idx)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <b>Tip:</b> Add all physical inventory/copies for this document here.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ background: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={onClose} size="small" variant="outlined" color="secondary">Cancel</Button>
          <Button type="submit" variant="contained" disabled={fileUploading} size="small" color="primary">{isEdit ? "Update" : "Add"}</Button>
        </DialogActions>
      </form>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default DocumentFormModal;
