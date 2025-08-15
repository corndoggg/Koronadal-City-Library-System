import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, MenuItem, Alert,
  Snackbar, Box, LinearProgress, useTheme, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Typography, Divider, Grid, Paper, Chip, Dialog as MuiDialog
} from "@mui/material";
import {
  Add, Edit as EditIcon, Save, Cancel, Delete, PictureAsPdf,
  WarningAmber, CloudUpload, Close
} from "@mui/icons-material";
import axios from "axios";

const initialForm = {
  title: "", author: "", category: "", department: "", classification: "",
  year: "", sensitivity: "", file: null, filePath: ""
};
const initialInventory = { availability: "", condition: "", location: "" };
const categories = ["Thesis", "Research", "Case Study", "Feasibility Study", "Capstone", "Other"];
const sensitivities = ["Public", "Restricted", "Confidential"];
const availabilityOptions = ["Available", "Borrowed", "Reserved"];

function DocumentFormModal({ open, onClose, onSave, isEdit, documentData, locations = [] }) {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;
  const fileInputRef = useRef();

  // form state
  const [form, setForm] = useState(initialForm);
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryForm, setInventoryForm] = useState(initialInventory);
  const [editInvIndex, setEditInvIndex] = useState(null);
  const [deletedInventory, setDeletedInventory] = useState([]);

  // ui state
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [unsaved, setUnsaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Add: AI extraction loading state
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (open) {
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
            filePath: documentData.File_Path || ""
        });
        setInventoryList((documentData.inventory || []).map(inv => ({
          availability: inv.availability || inv.Availability || "",
          condition: inv.condition || inv.Condition || "",
          location: inv.location || inv.Location || "",
          Storage_ID: inv.Storage_ID
        })));
      } else {
        setForm(initialForm);
        setInventoryList([]);
      }
      setInventoryForm(initialInventory);
      setEditInvIndex(null);
      setDeletedInventory([]);
      setUploadProgress(0);
      setUnsaved(false);
      setConfirmClose(false);
    }
  }, [open, isEdit, documentData]);

  const openToast = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  // --- MODIFIED: handleChange for file upload ---
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file" && files && files[0]) {
      setForm(prev => ({ ...prev, file: files[0], filePath: files[0].name }));
      setUnsaved(true);
      handleAnalyzePdf(files[0]); // <-- Analyze and autofill
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
      setUnsaved(true);
    }
  };

  const handleInventoryChange = (e) => {
    setInventoryForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddOrUpdateInventory = () => {
    if (!inventoryForm.availability || !inventoryForm.location) {
      openToast("Availability & Location required.", "error");
      return;
    }
    if (editInvIndex !== null) {
      const updated = [...inventoryList];
      updated[editInvIndex] = { ...updated[editInvIndex], ...inventoryForm };
      setInventoryList(updated);
      setEditInvIndex(null);
      openToast("Inventory updated.");
    } else {
      setInventoryList(prev => [...prev, { ...inventoryForm }]);
      openToast("Inventory added.");
    }
    setInventoryForm(initialInventory);
    setUnsaved(true);
  };

  const handleEditInventory = (idx) => {
    setInventoryForm(inventoryList[idx]);
    setEditInvIndex(idx);
  };

  const handleDeleteInventory = (idx) => {
    const inv = inventoryList[idx];
    if (inv.Storage_ID) setDeletedInventory(prev => [...prev, inv]);
    setInventoryList(inventoryList.filter((_, i) => i !== idx));
    if (editInvIndex === idx) {
      setInventoryForm(initialInventory);
      setEditInvIndex(null);
    }
    setUnsaved(true);
  };

  const handleCancelInventoryEdit = () => {
    setInventoryForm(initialInventory);
    setEditInvIndex(null);
  };

  const handleChangePdfClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChangeEdit = async (e) => {
    const file = e.target.files[0];
    if (!file || !documentData) return;
    setFileUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.put(`${API_BASE}/upload/edit/${documentData.Document_ID}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) =>
          setUploadProgress(Math.round((pe.loaded * 100) / (pe.total || 1)))
      });
      setForm(prev => ({ ...prev, filePath: res.data.filePath }));
      openToast("PDF updated.");
      setUnsaved(true);
    } catch {
      openToast("Failed updating PDF.", "error");
    }
    setFileUploading(false);
    setUploadProgress(0);
  };

  // --- NEW: Analyze PDF and autofill fields ---
  const handleAnalyzePdf = async (file) => {
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API_BASE}/analyze`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const record = res.data?.record || {};
      setForm(prev => ({
        ...prev,
        title: record.Title || prev.title,
        author: record.Author || prev.author,
        category: record.Category || prev.category,
        department: record.Department || prev.department,
        classification: record.Classification || prev.classification,
        year: record.Year || prev.year,
        sensitivity: record.Sensitivity || prev.sensitivity,
      }));
      openToast("Fields auto-filled from PDF.", "info");
    } catch (err) {
      openToast("Auto-extract failed.", "warning");
    }
    setAiLoading(false);
  };

  const validate = () => {
    const needed = ["title","author","category","department","classification","year","sensitivity"];
    for (const k of needed) if (!form[k]) return false;
    if (!/^\d{4}$/.test(String(form.year))) return false;
    if (!inventoryList.some(inv => inv.availability && inv.location)) return false;
    if (!isEdit && !form.file) return false;
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      openToast("Complete required fields.", "error");
      return;
    }
    const normalizedInventory = inventoryList.map(inv => ({
      ...inv,
      location: inv.location ? parseInt(inv.location, 10) : null
    }));
    if (isEdit) {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, v));
      onSave(payload, normalizedInventory, deletedInventory);
    } else {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "file" && !v) return;
        fd.append(k, v);
      });
      onSave(fd, normalizedInventory, []);
    }
    setUnsaved(false);
  };

  const guardedClose = () => {
    if (unsaved) setConfirmClose(true);
    else onClose();
  };

  const confirmDiscard = () => {
    setConfirmClose(false);
    setUnsaved(false);
    onClose();
  };

  const getLocationName = (id) => {
    const found = locations.find(loc => String(loc.ID) === String(id));
    return found ? found.Name : id || "-";
  };

  const invStats = useMemo(() => {
    const total = inventoryList.length;
    const counts = {
      Available: inventoryList.filter(i => i.availability === "Available").length,
      Borrowed: inventoryList.filter(i => i.availability === "Borrowed").length,
      Reserved: inventoryList.filter(i => i.availability === "Reserved").length
    };
    return { total, ...counts };
  }, [inventoryList]);

  return (
    <>
      <Dialog open={open} onClose={guardedClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: t => `2px solid ${t.palette.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 1
          }}
        >
          <PictureAsPdf color="primary" />
          {isEdit ? "Edit Document" : "Add Document"}
          <Box ml="auto" />
          {unsaved && (
            <Chip
              size="small"
              color="warning"
              icon={<WarningAmber fontSize="small" />}
              label="Unsaved"
              sx={{ fontWeight: 600, borderRadius: 0.75 }}
            />
          )}
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent
            dividers
            sx={{
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
              gap: 2.25,
              p: 2.25
            }}
          >
            {/* Document Details */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                border: t => `2px solid ${t.palette.divider}`,
                bgcolor: "background.paper"
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={700} fontSize={14}>
                  Document Details
                </Typography>
                <Chip
                  size="small"
                  label={validate() ? "Valid" : "Incomplete"}
                  color={validate() ? "success" : "default"}
                  sx={{ fontWeight: 600, height: 20 }}
                />
                {aiLoading && (
                  <Chip
                    size="small"
                    color="info"
                    label="Analyzing PDF..."
                    sx={{ fontWeight: 600, height: 20 }}
                  />
                )}
              </Stack>
              <Grid container spacing={2}>
                {[
                  { label: "Title", name: "title" },
                  { label: "Author", name: "author" },
                  { label: "Category", name: "category", select: true, options: categories },
                  { label: "Department", name: "department" },
                  { label: "Classification", name: "classification" },
                  { label: "Year", name: "year", type: "number" },
                  { label: "Sensitivity", name: "sensitivity", select: true, options: sensitivities }
                ].map(f => (
                  <Grid item xs={12} sm={6} key={f.name}>
                    <TextField
                      label={f.label}
                      name={f.name}
                      value={form[f.name]}
                      onChange={handleChange}
                      required
                      select={!!f.select}
                      type={f.type || "text"}
                      size="small"
                      fullWidth
                      InputProps={{ sx: { borderRadius: 1 } }}
                    >
                      {f.select &&
                        f.options.map(opt => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                ))}

                {/* File Section */}
                <Grid item xs={12} sm={6}>
                  {!isEdit && (
                    <Box
                      sx={{
                        border: t => `2px dashed ${t.palette.divider}`,
                        borderRadius: 1,
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        bgcolor: "background.paper",
                        height: "100%"
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        Upload PDF (required)
                      </Typography>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUpload />}
                        size="small"
                        sx={{ fontWeight: 600 }}
                        disabled={aiLoading}
                      >
                        {form.filePath ? "Change File" : "Select File"}
                        <input
                          type="file"
                          name="file"
                          accept="application/pdf"
                          hidden
                          required={!isEdit}
                          onChange={handleChange}
                        />
                      </Button>
                      {form.filePath && (
                        <Chip
                          size="small"
                          label={form.filePath}
                          icon={<PictureAsPdf fontSize="small" />}
                          sx={{ maxWidth: "100%" }}
                        />
                      )}
                      {aiLoading && (
                        <Typography variant="caption" color="info.main" sx={{ mt: 1 }}>
                          Extracting fields from PDF...
                        </Typography>
                      )}
                    </Box>
                  )}

                  {isEdit && (
                    <Box
                      sx={{
                        border: t => `2px solid ${t.palette.divider}`,
                        borderRadius: 1,
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        bgcolor: "background.paper",
                        height: "100%"
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        Attached PDF
                      </Typography>
                      <TextField
                        size="small"
                        label="Current File"
                        value={form.filePath}
                        disabled
                        fullWidth
                        InputProps={{ sx: { borderRadius: 1 } }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleChangePdfClick}
                        disabled={fileUploading}
                        startIcon={<CloudUpload />}
                        sx={{ fontWeight: 600 }}
                      >
                        {fileUploading ? "Uploading…" : "Replace PDF"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={handleFileChangeEdit}
                      />
                      {fileUploading && (
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={uploadProgress}
                            sx={{ borderRadius: 1, height: 6, mt: 1 }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            display="block"
                            textAlign="right"
                            mt={0.5}
                          >
                            {uploadProgress}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Grid>
              </Grid>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1.5, display: "block" }}
              >
                Ensure metadata matches the front page of the document.
              </Typography>
            </Paper>

            {/* Inventory */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                border: t => `2px solid ${t.palette.divider}`,
                bgcolor: "background.paper"
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={700} fontSize={14}>
                  Document Inventory (Physical Copies)
                </Typography>
                <Chip
                  size="small"
                  label={`Total: ${invStats.total}`}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Avail: ${invStats.Available}`}
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Borrowed: ${invStats.Borrowed}`}
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Reserved: ${invStats.Reserved}`}
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Availability"
                    name="availability"
                    value={inventoryForm.availability}
                    onChange={handleInventoryChange}
                    select
                    size="small"
                    fullWidth
                    required={!!(inventoryForm.availability || inventoryForm.location)}
                    InputProps={{ sx: { borderRadius: 1 } }}
                  >
                    {availabilityOptions.map(opt => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Condition"
                    name="condition"
                    value={inventoryForm.condition}
                    onChange={handleInventoryChange}
                    size="small"
                    fullWidth
                    InputProps={{ sx: { borderRadius: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Location"
                    name="location"
                    value={inventoryForm.location}
                    onChange={handleInventoryChange}
                    select
                    size="small"
                    fullWidth
                    required={!!inventoryForm.availability}
                    InputProps={{ sx: { borderRadius: 1 } }}
                  >
                    {locations.map(loc => (
                      <MenuItem key={loc.ID} value={loc.ID}>
                        {loc.Name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={editInvIndex !== null ? <Save /> : <Add />}
                      onClick={handleAddOrUpdateInventory}
                      sx={{ fontWeight: 700 }}
                      disabled={!inventoryForm.availability || !inventoryForm.location}
                    >
                      {editInvIndex !== null ? "Update Inventory" : "Add Inventory"}
                    </Button>
                    {editInvIndex !== null && (
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<Cancel />}
                        onClick={handleCancelInventoryEdit}
                        sx={{ fontWeight: 600 }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  border: t => `1.5px solid ${t.palette.divider}`,
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "background.default"
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
                        "& th": {
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: 0.4,
                          borderBottom: t => `2px solid ${t.palette.divider}`,
                          bgcolor: "background.paper"
                        }
                      }}
                    >
                      <TableCell>Availability</TableCell>
                      <TableCell>Condition</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& td": { borderBottom: t => `1px solid ${t.palette.divider}` },
                      "& tr:hover": { background: t => t.palette.action.hover }
                    }}
                  >
                    {inventoryList.map((inv, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Chip
                            size="small"
                            label={inv.availability}
                            color={
                              inv.availability === "Available"
                                ? "success"
                                : inv.availability === "Borrowed"
                                ? "warning"
                                : "info"
                            }
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>{inv.condition || "-"}</TableCell>
                        <TableCell>{getLocationName(inv.location)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditInventory(idx)}
                              sx={{ borderRadius: 0.75 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteInventory(idx)}
                              sx={{ borderRadius: 0.75 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inventoryList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                          >
                            No inventory added.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1.25, display: "block" }}
              >
                Add every physical storage / location combination for this document.
              </Typography>
            </Paper>
          </DialogContent>

          <DialogActions
            sx={{
              borderTop: t => `2px solid ${t.palette.divider}`,
              py: 1,
              bgcolor: "background.paper"
            }}
          >
            <Button
              onClick={guardedClose}
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<Close />}
              sx={{ fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="small"
              variant="contained"
              startIcon={isEdit ? <Save /> : <Add />}
              disabled={fileUploading || !validate()}
              sx={{ fontWeight: 700 }}
            >
              {isEdit ? "Update Document" : "Save Document"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Discard */}
      <MuiDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: t => `2px solid ${t.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1,
            borderBottom: t => `1px solid ${t.palette.divider}`
          }}
        >
          Discard changes?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2">
            You have unsaved modifications. Close without saving?
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: t => `1px solid ${t.palette.divider}`,
            py: 1
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirmClose(false)}
          >
            Keep Editing
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={confirmDiscard}
          >
            Discard
          </Button>
        </DialogActions>
      </MuiDialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3200}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ fontWeight: 600, borderRadius: 1 }}
        >
          {snackbar.message}
       </Alert>
      </Snackbar>
    </>
  );
}

export default DocumentFormModal;