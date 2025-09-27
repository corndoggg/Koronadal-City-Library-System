import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, MenuItem, Alert,
  Snackbar, Box, LinearProgress, useTheme, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Typography, Divider, Grid, Paper, Chip, Dialog as MuiDialog
} from "@mui/material";
import {
  Add, Edit as EditIcon, Save, Cancel, Delete, PictureAsPdf,
  WarningAmber, CloudUpload, Close, Preview
} from "@mui/icons-material";
import axios from "axios";
import DocumentPDFViewer from "./DocumentPDFViewer"; // NEW

const initialForm = {
  title: "", author: "", category: "", department: "", classification: "",
  year: "", sensitivity: "", file: null, filePath: ""
};
const initialInventory = { availability: "", condition: "", location: "" };
const categories = ["Thesis", "Research", "Case Study", "Feasibility Study", "Capstone", "N/A"];
const sensitivities = ["Public", "Restricted", "Confidential"];
const availabilityOptions = ["Available", "Borrowed", "Reserved", "Lost"];
// NEW: 6-level condition scale from Good to Lost
const conditionOptions = ["Good", "Fair", "Average", "Poor", "Bad"];

function DocumentFormModal({ open, onClose, onSave, isEdit, documentData, locations = [] }) {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;
  const fileInputRef = useRef();
  // NEW: images → PDF
  const imgInputRef = useRef(null);
  const [imgConverting, setImgConverting] = useState(false);
  const [convertForEdit, setConvertForEdit] = useState(false);

  // NEW: preview state for converted PDF
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [previewSource, setPreviewSource] = useState(null);

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
    const target = inventoryList[idx];
    setInventoryForm({
      ...target,
      availability: target.availability || "",
      condition: target.condition || "",
      location: target.location != null ? String(target.location) : ""
    });
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
      await handleAnalyzePdf(file);
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

  const resolveFileUrl = (path) => {
    if (!path) return "";
    if (typeof path !== "string") return "";
    if (path.startsWith("blob:")) return path;
    if (/^https?:/i.test(path)) return path;

    const base = String(API_BASE || "").replace(/\/+$/, "");
    if (!base) {
      return path.startsWith("/") ? path : `/${path}`;
    }

    let normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (/^\/api\//i.test(normalizedPath)) {
      normalizedPath = normalizedPath.replace(/^\/api/i, "");
    }

    return `${base}${normalizedPath}`;
  };

  const getFileDisplayName = (path) => {
    if (!path) return "No file attached";
    if (path instanceof File) return path.name;
    if (typeof path === "string") {
      const parts = path.split("/");
      return parts[parts.length - 1] || path;
    }
    return "Attachment";
  };

  const renderEmptyValue = (label) => (value) =>
    value ? (
      value
    ) : (
      <Typography component="span" color="text.disabled" sx={{ fontStyle: "italic" }}>
        {`Select ${label.toLowerCase()}`}
      </Typography>
    );

  const handlePreviewCurrentFile = () => {
    if (form.file instanceof File) {
      openPreviewForFile(form.file);
      return;
    }
    if (form.filePath) {
      openPreviewFromPath(form.filePath);
      return;
    }
    if (isEdit && documentData?.File_Path) {
      openPreviewFromPath(documentData.File_Path);
    }
  };

  const invStats = useMemo(() => {
    const total = inventoryList.length;
    const counts = {
      Available: inventoryList.filter(i => i.availability === "Available").length,
      Borrowed: inventoryList.filter(i => i.availability === "Borrowed").length,
      Reserved: inventoryList.filter(i => i.availability === "Reserved").length,
      Lost: inventoryList.filter(i => i.availability === "Lost").length
    };
    return { total, ...counts };
  }, [inventoryList]);

  const baseSelectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        maxHeight: 320,
        minWidth: 260,
        '& .MuiMenuItem-root': {
          whiteSpace: 'normal',
          lineHeight: 1.25,
          alignItems: 'flex-start'
        }
      }
    }
  }), []);

  const wideSelectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        maxHeight: 320,
        minWidth: 320,
        '& .MuiMenuItem-root': {
          whiteSpace: 'normal',
          lineHeight: 1.25,
          alignItems: 'flex-start'
        }
      }
    }
  }), []);

  const formatLocationLabel = (value) => {
    if (!value) {
      return (
        <Typography component="span" color="text.disabled" sx={{ fontStyle: "italic" }}>
          Select a location
        </Typography>
      );
    }
    const label = getLocationName(value);
    return label || `Location #${value}`;
  };

  // NEW: choose images (in-modal)
  const handleChooseImagesToPdf = (forEdit = false) => {
    setConvertForEdit(!!forEdit);
    if (imgInputRef.current) {
      imgInputRef.current.value = "";
      imgInputRef.current.click();
    }
  };

  // NEW: convert selected images to PDF and apply
  const handleImagesSelectedToPdf = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImgConverting(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append("images", f));
      // Ask backend to return the merged PDF as a blob
      const res = await fetch(`${API_BASE}/system/image-to-pdf?inline=1`, { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Image-to-PDF failed");
      }
      const blob = await res.blob();
      const filename = `images_${Date.now()}.pdf`;
      // Create a File for upload compatibility
      const pdfFile = new File([blob], filename, { type: "application/pdf" });

      if (convertForEdit && documentData) {
        // Edit mode: upload immediately via existing replace endpoint
        setFileUploading(true);
        setUploadProgress(0);
        const fd = new FormData();
        fd.append("file", pdfFile);
        const uploadRes = await axios.put(`${API_BASE}/upload/edit/${documentData.Document_ID}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (pe) =>
            setUploadProgress(Math.round((pe.loaded * 100) / (pe.total || 1)))
        });
        const uploadedPath = uploadRes?.data?.filePath || uploadRes?.data?.path || `/uploads/${filename}`;
        setForm(prev => ({ ...prev, filePath: uploadedPath }));
        await handleAnalyzePdf(pdfFile);
        openToast("PDF replaced from images.");
        setUnsaved(true);
        setFileUploading(false);
        setUploadProgress(0);
      } else {
        // Add mode: set as form file; will be sent on Save
        setForm(prev => ({ ...prev, file: pdfFile, filePath: filename }));
        await handleAnalyzePdf(pdfFile);
        openToast("PDF created from images. Ready to save.", "info");
        setUnsaved(true);
      }
      // Allow user to preview on demand
      openPreviewForFile(pdfFile);
    } catch (err) {
      openToast(err?.message || "Failed converting images to PDF", "error");
    } finally {
      setImgConverting(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  // NEW: helper to open/close preview
  const openPreviewForFile = (file) => {
    try {
      if (previewSource === "blob" && pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(file);
      setPreviewSource("blob");
      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch {}
  };

  const openPreviewFromPath = (path) => {
    const resolved = resolveFileUrl(path);
    if (!resolved) return;
    if (previewSource === "blob" && pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPreviewSource("url");
    setPdfPreviewUrl(resolved);
    setPdfPreviewOpen(true);
  };

  const handleClosePreview = () => {
    if (previewSource === "blob" && pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl("");
    setPdfPreviewOpen(false);
    setPreviewSource(null);
  };

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
            <Chip size="small" color="warning" icon={<WarningAmber fontSize="small" />} label="Unsaved" sx={{ fontWeight: 600, borderRadius: 0.75 }} />
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
                <Grid item xs={12}>
                  <Box
                    sx={{
                      borderRadius: 1,
                      border: t => `2px dashed ${t.palette.primary.light}`,
                      bgcolor: t => (t.palette.mode === "dark" ? t.palette.background.default : t.palette.grey[50]),
                      p: 2
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography fontWeight={700} fontSize={14}>
                          Step 1 · Attach PDF for analysis
                        </Typography>
                        <Chip
                          size="small"
                          color={form.file || form.filePath ? "success" : "default"}
                          label={form.file || form.filePath ? "File ready" : "Required"}
                          sx={{ fontWeight: 600, height: 20 }}
                        />
                        {aiLoading && (
                          <Chip
                            size="small"
                            color="info"
                            label="Analyzing…"
                            sx={{ fontWeight: 600, height: 20 }}
                          />
                        )}
                        {imgConverting && (
                          <Chip
                            size="small"
                            color="warning"
                            label="Converting images…"
                            sx={{ fontWeight: 600, height: 20 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Upload a PDF or merge images to PDF. The system will analyze the file and auto-fill the document fields below.
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {!isEdit ? (
                          <Button
                            variant="contained"
                            component="label"
                            size="small"
                            startIcon={<CloudUpload />}
                            sx={{ fontWeight: 600, minHeight: 40 }}
                            disabled={fileUploading || aiLoading}
                          >
                            {form.file ? "Replace PDF" : "Select PDF"}
                            <input
                              type="file"
                              name="file"
                              accept="application/pdf"
                              hidden
                              required={!isEdit}
                              onChange={handleChange}
                            />
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloudUpload />}
                            onClick={handleChangePdfClick}
                            disabled={fileUploading}
                            sx={{ fontWeight: 600, minHeight: 40 }}
                          >
                            {fileUploading ? "Uploading…" : "Replace PDF"}
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdf />}
                          onClick={() => handleChooseImagesToPdf(isEdit)}
                          disabled={imgConverting || fileUploading}
                          sx={{ fontWeight: 600, minHeight: 40 }}
                        >
                          {imgConverting ? "Converting…" : "Images → PDF"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Preview />}
                          onClick={handlePreviewCurrentFile}
                          disabled={!form.file && !form.filePath && !(isEdit && documentData?.File_Path)}
                          sx={{ fontWeight: 600, minHeight: 40 }}
                        >
                          Preview
                        </Button>
                      </Stack>
                      <input
                        ref={imgInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleImagesSelectedToPdf}
                      />
                      {isEdit && (
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          hidden
                          onChange={handleFileChangeEdit}
                        />
                      )}
                      {(form.file || form.filePath || (isEdit && documentData?.File_Path)) && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            size="small"
                            icon={<PictureAsPdf fontSize="small" />}
                            label={getFileDisplayName(form.file || form.filePath || documentData?.File_Path)}
                            sx={{ fontWeight: 600, maxWidth: "100%" }}
                          />
                          {fileUploading && (
                            <Typography variant="caption" fontWeight={600}>
                              Uploading…
                            </Typography>
                          )}
                        </Stack>
                      )}
                      {fileUploading && (
                        <Box>
                          <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1, height: 6 }} />
                          <Typography variant="caption" fontWeight={600} display="block" textAlign="right" mt={0.5}>
                            {uploadProgress}%
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Grid>

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
                      size="medium"
                      fullWidth
                      InputLabelProps={f.select || f.type === "number" ? { shrink: true } : undefined}
                      InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                      SelectProps={f.select ? {
                        MenuProps: baseSelectMenuProps,
                        displayEmpty: true,
                        renderValue: renderEmptyValue(f.label)
                      } : undefined}
                    >
                      {f.select && (
                        <>
                          <MenuItem value="" disabled>
                            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                              {`Select ${f.label.toLowerCase()}`}
                            </Typography>
                          </MenuItem>
                          {f.options.map(opt => (
                            <MenuItem key={opt} value={opt} sx={{ whiteSpace: "normal" }}>
                              {opt}
                            </MenuItem>
                          ))}
                        </>
                      )}
                    </TextField>
                  </Grid>
                ))}

                {/* Inventory */}
                <Grid item xs={12}>
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
                      <Chip
                        size="small"
                        label={`Lost: ${invStats.Lost}`}
                        color="error"
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
                          size="medium"
                          fullWidth
                          required={!!(inventoryForm.availability || inventoryForm.location)}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                          SelectProps={{
                            MenuProps: baseSelectMenuProps,
                            displayEmpty: true,
                            renderValue: renderEmptyValue("Availability")
                          }}
                        >
                          <MenuItem value="" disabled>
                            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                              Select availability
                            </Typography>
                          </MenuItem>
                          {availabilityOptions.map(opt => (
                            <MenuItem key={opt} value={opt} sx={{ whiteSpace: "normal" }}>
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
                          select
                          size="medium"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                          SelectProps={{
                            MenuProps: baseSelectMenuProps,
                            displayEmpty: true,
                            renderValue: renderEmptyValue("Condition")
                          }}
                        >
                          <MenuItem value="" disabled>
                            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                              Select condition
                            </Typography>
                          </MenuItem>
                          {/* If current value is not in options (legacy), show it once to avoid blank */}
                          {inventoryForm.condition && !conditionOptions.includes(inventoryForm.condition) && (
                            <MenuItem value={inventoryForm.condition}>{inventoryForm.condition}</MenuItem>
                          )}
                          {conditionOptions.map(opt => (
                            <MenuItem key={opt} value={opt} sx={{ whiteSpace: "normal" }}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Location"
                          name="location"
                          value={inventoryForm.location}
                          onChange={handleInventoryChange}
                          select
                          size="medium"
                          fullWidth
                          required={!!inventoryForm.availability}
                          helperText={locations.length === 0 ? "Add locations in Storage Management." : ""}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                          SelectProps={{
                            displayEmpty: true,
                            MenuProps: wideSelectMenuProps,
                            renderValue: (value) => formatLocationLabel(value)
                          }}
                        >
                          {locations.length === 0 && <MenuItem value="">No locations available</MenuItem>}
                          {locations.map(loc => (
                            <MenuItem key={loc.ID} value={String(loc.ID)} sx={{ whiteSpace: "normal", alignItems: "flex-start" }}>
                              <Stack spacing={0.25}>
                                <Typography fontWeight={600}>{loc.Name}</Typography>
                                {typeof loc.Capacity !== "undefined" && (
                                  <Typography variant="caption" color="text.secondary">
                                    Capacity: {loc.Capacity || "Unlimited"}
                                  </Typography>
                                )}
                              </Stack>
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            size="medium"
                            startIcon={editInvIndex !== null ? <Save /> : <Add />}
                            onClick={handleAddOrUpdateInventory}
                            sx={{ fontWeight: 700, borderRadius: 1, minHeight: 48 }}
                            disabled={!inventoryForm.availability || !inventoryForm.location}
                          >
                            {editInvIndex !== null ? "Update Inventory" : "Add Inventory"}
                          </Button>
                          {editInvIndex !== null && (
                            <Button
                              variant="text"
                              size="medium"
                              startIcon={<Cancel />}
                              onClick={handleCancelInventoryEdit}
                              sx={{ fontWeight: 600, borderRadius: 1, minHeight: 48 }}
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
                                      : inv.availability === "Lost"
                                      ? "error"
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

      {/* NEW: Converted PDF Preview */}
      <DocumentPDFViewer
        open={pdfPreviewOpen}
        onClose={handleClosePreview}
        fileUrl={pdfPreviewUrl}
        title="Preview: Converted PDF"
        note="Local preview of the converted PDF. Save to attach it to the document."
      />
    </>
  );
}

export default DocumentFormModal;