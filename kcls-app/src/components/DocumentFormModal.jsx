import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  Alert,
  Snackbar,
  Box,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Typography,
  Divider,
  Grid,
  Paper,
  Chip,
  Dialog as MuiDialog,
  Tabs,
  Tab
} from "@mui/material";
import {
  Add, Edit as EditIcon, Save, Cancel, Delete, PictureAsPdf,
  WarningAmber, CloudUpload, Close, Preview, DocumentScanner, Download
} from "@mui/icons-material";
import axios from "axios";
import DocumentPDFViewer from "./DocumentPDFViewer"; // NEW

const initialForm = {
  title: "", author: "", category: "", department: "", classification: "",
  year: "", sensitivity: "", file: null, filePath: ""
};
const initialInventory = { availability: "", condition: "", location: "", locationName: "", Storage_ID: null };
const categories = ["Thesis", "Research", "Case Study", "Feasibility Study", "Capstone", "N/A"];
const sensitivities = ["Public", "Restricted", "Confidential"];
const classificationOptions = ["Public Resource", "Government Document", "Historical File"];
const availabilityOptions = ["Available", "Borrowed", "Reserved", "Lost"];
// NEW: 6-level condition scale from Good to Lost
const conditionOptions = ["Good", "Fair", "Average", "Poor", "Bad"];

function DocumentFormModal({ open, onClose, onSave, isEdit, documentData, locations = [] }) {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const SCANNER_BASE = (import.meta.env.VITE_SCANNER_BASE || "http://localhost:7070").replace(/\/$/, "");
  const scannerClientDownloadUrl = useMemo(() => {
    const base = String(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    return `${base}/scanner-client.exe`;
  }, []);
  const fileInputRef = useRef();
  const [scanning, setScanning] = useState(false);
  const isMountedRef = useRef(false);
  const [scannerStatus, setScannerStatus] = useState({
    checking: false,
    checked: false,
    available: false,
    message: ""
  });
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanPageCount, setScanPageCount] = useState("1");
  const [scanDialogError, setScanDialogError] = useState("");
  const [scanRequestPages, setScanRequestPages] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkScannerAvailability = useCallback(async () => {
    if (!SCANNER_BASE) {
      const result = {
        checking: false,
        checked: true,
        available: false,
        message: "Scanner client URL is not configured."
      };
      if (isMountedRef.current) setScannerStatus(result);
      return result;
    }

    if (isMountedRef.current) {
      setScannerStatus(prev => ({ ...prev, checking: true, checked: false }));
    }

    try {
      const res = await fetch(`${SCANNER_BASE}/devices`, { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Scanner client error (${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      const devices = Array.isArray(data?.devices) ? data.devices : [];
      let message;
      let available = false;
      if (devices.length > 0) {
        available = true;
        const primary = devices[0] || {};
        const extra = devices.length > 1 ? ` (+${devices.length - 1} more)` : "";
        message = `${primary?.name || "Scanner"} connected${extra}.`;
      } else {
        message = "Scanner client online but no scanners detected.";
      }
      const result = { checking: false, checked: true, available, message };
      if (isMountedRef.current) setScannerStatus(result);
      return result;
    } catch (err) {
      const result = {
        checking: false,
        checked: true,
        available: false,
        message: err?.message || "Unable to reach scanner client."
      };
      if (isMountedRef.current) setScannerStatus(result);
      return result;
    }
  }, [SCANNER_BASE]);

  const openScanDialog = () => {
    setScanDialogError("");
    setScanPageCount(prev => {
      const parsed = Number.parseInt(prev, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return String(Math.min(parsed, 30));
      }
      return "1";
    });
    setScanDialogOpen(true);
  };

  const closeScanDialog = () => {
    setScanDialogOpen(false);
  };

  const handleScanDialogConfirm = () => {
    const parsed = Number.parseInt(scanPageCount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setScanDialogError("Enter at least 1 page.");
      return;
    }
    if (parsed > 30) {
      setScanDialogError("Maximum is 30 pages per batch.");
      return;
    }
    setScanDialogOpen(false);
    handleScanToPdf(parsed);
  };

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
  const [activeTab, setActiveTab] = useState(0);
  const editingInventory = editInvIndex !== null ? inventoryList[editInvIndex] : null;
  const editingInventoryAvailability = editingInventory?.availability || "";
  const inventoryIsBorrowed = editingInventoryAvailability === "Borrowed";
  const inventoryAvailabilityOptions = useMemo(() => {
    let options;
    if (editInvIndex === null) {
      options = availabilityOptions.filter(option => option !== "Borrowed" && option !== "Lost");
    } else if (inventoryIsBorrowed) {
      options = ["Borrowed"];
    } else {
      options = ["Available", "Reserved", "Lost"];
      if (editingInventoryAvailability && !options.includes(editingInventoryAvailability)) {
        options = [...options, editingInventoryAvailability];
      }
    }
    if (inventoryForm.availability && !options.includes(inventoryForm.availability)) {
      options = [...options, inventoryForm.availability];
    }
    return options;
  }, [editInvIndex, inventoryIsBorrowed, editingInventoryAvailability, inventoryForm.availability]);

  const getLocationName = useCallback((id, fallback) => {
    if (id === null || id === undefined || id === "") {
      return fallback || "-";
    }
    const found = locations.find(loc => String(loc.ID) === String(id));
    if (found) return found.Name;
    if (fallback) return fallback;
    return `Location #${id}`;
  }, [locations]);

  const initializeState = useCallback(() => {
    if (!open) return;
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

      const normalizedInventory = (documentData.inventory || []).map(inv => {
        const storageId =
          inv.Storage_ID ?? inv.storage_id ?? inv.Location_ID ?? inv.location_id ??
          inv.LocationID ?? inv.storageId ?? inv.StorageId ?? null;
        const storageLocation =
          inv.location ?? inv.Location ?? inv.StorageLocation ?? inv.storageLocation ?? storageId;
        const locationId =
          storageLocation != null && storageLocation !== "" ? String(storageLocation) : "";
        const locationName = getLocationName(locationId, inv.locationName || inv.Location || inv.LocationName);

        return {
          availability: inv.availability || inv.Availability || "",
          condition: inv.condition || inv.Condition || "",
          location: locationId,
          locationName: locationName || "",
          Storage_ID: storageId ?? null
        };
      });
      setInventoryList(normalizedInventory);
      setDeletedInventory([]);
    } else {
      setForm(initialForm);
      setInventoryList([]);
      setDeletedInventory([]);
    }
    setInventoryForm({ ...initialInventory });
    setEditInvIndex(null);
    setUploadProgress(0);
    setUnsaved(false);
    setConfirmClose(false);
    setActiveTab(0);
  }, [open, isEdit, documentData, getLocationName]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  useEffect(() => {
    if (!open) return;
    checkScannerAvailability();
  }, [open, checkScannerAvailability]);

  const openToast = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const handleTabChange = (_, value) => {
    setActiveTab(value);
  };

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
    const { name, value } = e.target;
    if (name === "location") {
      const selected = locations.find(loc => String(loc.ID) === String(value));
      setInventoryForm(prev => ({
        ...prev,
        location: value,
        locationName: selected?.Name || "",
        Storage_ID: prev.Storage_ID ?? null
      }));
      return;
    }
    setInventoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrUpdateInventory = () => {
    if (editInvIndex !== null) {
      const current = inventoryList[editInvIndex];
      if (current?.availability === "Borrowed") {
        openToast("Borrowed copies can't be modified from this form.", "warning");
        return;
      }
    }
    if (!inventoryForm.availability || !inventoryForm.location) {
      openToast("Availability & Location required.", "error");
      return;
    }

    const normalizedLocation = String(inventoryForm.location);
    const locationName = inventoryForm.locationName || getLocationName(normalizedLocation);
    const preparedEntry = {
      availability: inventoryForm.availability,
      condition: inventoryForm.condition,
      location: normalizedLocation,
      locationName,
      Storage_ID: inventoryForm.Storage_ID ?? null
    };

    if (editInvIndex !== null) {
      setInventoryList(prev => prev.map((inv, idx) => (idx === editInvIndex ? { ...inv, ...preparedEntry } : inv)));
      setEditInvIndex(null);
      openToast("Inventory updated.");
    } else {
      setInventoryList(prev => [...prev, preparedEntry]);
      openToast("Inventory added.");
    }
    setInventoryForm({ ...initialInventory });
    setUnsaved(true);
  };

  const handleEditInventory = (idx) => {
    const target = inventoryList[idx];
    setInventoryForm({
      ...initialInventory,
      ...target,
      availability: target?.availability || "",
      condition: target?.condition || "",
      location: target?.location != null && target.location !== "" ? String(target.location) : "",
      locationName: target?.locationName || target?.LocationName || getLocationName(target?.location),
      Storage_ID: target?.Storage_ID ?? null
    });
    setEditInvIndex(idx);
  };

  const handleDeleteInventory = (idx) => {
    const inv = inventoryList[idx];
    if (inv?.availability === "Borrowed") {
      openToast("Borrowed copies can't be removed.", "error");
      return;
    }
    if (inv.Storage_ID) setDeletedInventory(prev => [...prev, inv]);
    setInventoryList(prev => prev.filter((_, i) => i !== idx));
    if (editInvIndex === idx) {
      setInventoryForm({ ...initialInventory });
      setEditInvIndex(null);
    }
    setUnsaved(true);
  };

  const handleCancelInventoryEdit = () => {
    setInventoryForm({ ...initialInventory });
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
      console.error(err);
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
    const label = getLocationName(value, inventoryForm.locationName);
    return label || `Location #${value}`;
  };

  const handleScanToPdf = async (requestedPages) => {
    if (!SCANNER_BASE) {
      openToast("Scanner client URL is not configured.", "error");
      return;
    }

    let statusInfo = scannerStatus;
    if (!statusInfo.available) {
      statusInfo = await checkScannerAvailability();
    }
    if (!statusInfo.available) {
      openToast(statusInfo.message || "Scanner is not available.", "warning");
      return;
    }

    let pages = Number.parseInt(requestedPages, 10);
    if (!Number.isFinite(pages) || pages <= 0) pages = 1;
    if (pages > 30) pages = 30;

    setScanRequestPages(pages);
    setScanning(true);
    try {
      const res = await fetch(`${SCANNER_BASE}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages, dpi: 300, colorMode: "Color" })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = text;
        if (text) {
          try {
            const data = JSON.parse(text);
            message = data?.error || data?.message || text;
          } catch {
            message = text;
          }
        }
        if (!message) message = `Scanner service error (${res.status})`;
        throw new Error(message);
      }
      const blob = await res.blob();
      const headerName = res.headers.get("X-Scan-Filename");
      const filename = headerName || `scan_${Date.now()}.pdf`;
      const pdfFile = new File([blob], filename, { type: "application/pdf" });
      const scannedPages = parseInt(res.headers.get("X-Scan-Pages") || `${pages}`, 10) || pages;

      if (isEdit && documentData) {
        setFileUploading(true);
        setUploadProgress(0);
        try {
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
          openToast(`Replaced PDF with ${scannedPages} scanned page${scannedPages > 1 ? "s" : ""}.`);
          setUnsaved(true);
        } finally {
          setFileUploading(false);
          setUploadProgress(0);
        }
      } else {
        setForm(prev => ({ ...prev, file: pdfFile, filePath: filename }));
        await handleAnalyzePdf(pdfFile);
        openToast(`Scanned ${scannedPages} page${scannedPages > 1 ? "s" : ""}. Ready to save.`, "info");
        setUnsaved(true);
      }

      openPreviewForFile(pdfFile);
    } catch (err) {
      openToast(err?.message || "Failed to scan document", "error");
    } finally {
      setScanRequestPages(null);
      setScanning(false);
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
    } catch {
      // fallback to path-based if blob creation fails
    }
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
              p: 0
            }}
          >
            <Stack spacing={2.5} sx={{ p: { xs: 2, md: 2.75 } }}>
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  p: { xs: 2, md: 3 },
                  backgroundImage: theme => `linear-gradient(135deg, ${theme.palette.mode === "dark" ? theme.palette.primary.dark : theme.palette.primary.light} 0%, ${theme.palette.mode === "dark" ? theme.palette.primary.main : theme.palette.primary.dark} 100%)`,
                  color: theme => theme.palette.common.white,
                  border: theme => `1px solid ${theme.palette.primary.main}`,
                  boxShadow: theme => `0 18px 36px ${theme.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(47, 128, 237, 0.25)"}`
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 0.6 }}>
                      {isEdit ? "Update document" : "New document"}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} letterSpacing={0.45}>
                      Library document configuration
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 520, opacity: 0.88 }}>
                      Attach the latest PDF, verify catalog metadata, and manage physical copies with a structured, Devias-inspired workspace.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Chip
                      size="small"
                      label={validate() ? "Form complete" : "Action needed"}
                      color={validate() ? "success" : "warning"}
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                    />
                    <Chip
                      size="small"
                      label={`Copies: ${invStats.total}`}
                      color={invStats.total ? "primary" : "default"}
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                    />
                    {aiLoading && (
                      <Chip size="small" color="info" label="Analyzing PDF…" sx={{ fontWeight: 700, borderRadius: 1 }} />
                    )}
                  </Stack>
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  border: theme => `1.5px solid ${theme.palette.divider}`,
                  overflow: "hidden",
                  bgcolor: "background.paper"
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ px: { xs: 1, md: 2 }, pt: 1 }}
                >
                  <Tab label="Details" value={0} sx={{ textTransform: "none", fontWeight: 700 }} />
                  <Tab label="Copies" value={1} sx={{ textTransform: "none", fontWeight: 700 }} />
                </Tabs>
                <Divider />

                <Box sx={{ display: activeTab === 0 ? "block" : "none", p: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>
                  <Stack spacing={2.5}>
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: theme => `1.5px dashed ${theme.palette.primary.light}`,
                        bgcolor: theme => theme.palette.mode === "dark" ? theme.palette.background.default : theme.palette.grey[50],
                        p: { xs: 2, md: 2.5 }
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                          <Typography fontWeight={700} fontSize={15}>
                            Step 1 · Attach PDF for analysis
                          </Typography>
                          <Chip
                            size="small"
                            color={form.file || form.filePath ? "success" : "default"}
                            label={form.file || form.filePath ? "File ready" : "Required"}
                            sx={{ fontWeight: 600, borderRadius: 1 }}
                          />
                          {aiLoading && (
                            <Chip size="small" color="info" label="Analyzing…" sx={{ fontWeight: 600, borderRadius: 1 }} />
                          )}
                          {scanning && (
                            <Chip size="small" color="secondary" label="Scanning…" sx={{ fontWeight: 600, borderRadius: 1 }} />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Upload an existing PDF or merge multiple images. We’ll extract metadata automatically so you can fine-tune the catalog values in seconds.
                        </Typography>
                        {(scannerStatus.checking || scannerStatus.checked) && (
                          <Alert
                            severity={scannerStatus.available ? "success" : scannerStatus.checking ? "info" : "warning"}
                            icon={<DocumentScanner fontSize="inherit" />}
                            action={
                              !scannerStatus.available ? (
                                <Button
                                  color="inherit"
                                  size="small"
                                  onClick={checkScannerAvailability}
                                  disabled={scannerStatus.checking}
                                >
                                  Retry
                                </Button>
                              ) : null
                            }
                            sx={{ borderRadius: 1.5, alignItems: "center" }}
                          >
                            {scannerStatus.checking
                              ? "Checking scanner client…"
                              : scannerStatus.message || "Scanner status unavailable."}
                          </Alert>
                        )}
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
                            startIcon={<DocumentScanner />}
                            onClick={openScanDialog}
                            disabled={scanning || fileUploading || scannerStatus.checking}
                            sx={{ fontWeight: 600, minHeight: 40 }}
                          >
                            {scanning ? "Scanning…" : "Scan to PDF"}
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
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<Download />}
                            component="a"
                            href={scannerClientDownloadUrl}
                            download
                            sx={{ fontWeight: 600, minHeight: 40 }}
                          >
                            Download Scanner Client
                          </Button>
                        </Stack>
                        {scanning && (scanRequestPages || 1) > 1 && (
                          <Alert
                            severity="info"
                            icon={<DocumentScanner fontSize="inherit" />}
                            sx={{ borderRadius: 1.5, alignItems: "center" }}
                          >
                            Put the next page into the scanner.
                          </Alert>
                        )}
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
                              sx={{ fontWeight: 600, maxWidth: "100%", borderRadius: 1 }}
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

                    <Grid container spacing={2.25}>
                      {[
                        { label: "Title", name: "title" },
                        { label: "Author", name: "author" },
                        { label: "Category", name: "category", select: true, options: categories },
                        { label: "Department", name: "department" },
                        { label: "Classification", name: "classification", select: true, options: classificationOptions },
                        { label: "Year", name: "year", type: "number" },
                        { label: "Sensitivity", name: "sensitivity", select: true, options: sensitivities }
                      ].map(field => (
                        <Grid item xs={12} sm={6} key={field.name}>
                          <TextField
                            label={field.label}
                            name={field.name}
                            value={form[field.name]}
                            onChange={handleChange}
                            required
                            select={Boolean(field.select)}
                            type={field.type || "text"}
                            size="medium"
                            fullWidth
                            InputLabelProps={field.select || field.type === "number" ? { shrink: true } : undefined}
                            InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                            SelectProps={field.select ? {
                              MenuProps: baseSelectMenuProps,
                              displayEmpty: true,
                              renderValue: renderEmptyValue(field.label)
                            } : undefined}
                          >
                            {field.select && [
                              <MenuItem key={`${field.name}-placeholder`} value="" disabled>
                                <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                                  {`Select ${field.label.toLowerCase()}`}
                                </Typography>
                              </MenuItem>,
                              ...field.options.map(option => (
                                <MenuItem key={option} value={option} sx={{ whiteSpace: "normal" }}>
                                  {option}
                                </MenuItem>
                              ))
                            ]}
                          </TextField>
                        </Grid>
                      ))}
                    </Grid>

                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Ensure metadata mirrors the document’s cover page and classification.
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ display: activeTab === 1 ? "block" : "none", p: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                      <Typography fontWeight={700} fontSize={15}>
                        Physical copy ledger
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip size="small" label={`Total ${invStats.total}`} color="primary" sx={{ fontWeight: 600, borderRadius: 1 }} />
                        <Chip size="small" label={`${invStats.Available} available`} color="success" sx={{ fontWeight: 600, borderRadius: 1 }} />
                        <Chip size="small" label={`${invStats.Borrowed} borrowed`} color="warning" sx={{ fontWeight: 600, borderRadius: 1 }} />
                        <Chip size="small" label={`${invStats.Reserved} reserved`} color="info" sx={{ fontWeight: 600, borderRadius: 1 }} />
                        <Chip size="small" label={`${invStats.Lost} lost`} color="error" sx={{ fontWeight: 600, borderRadius: 1 }} />
                      </Stack>
                    </Stack>

                    <Grid container spacing={2.25}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Availability"
                          name="availability"
                          value={inventoryForm.availability}
                          onChange={handleInventoryChange}
                          select
                          size="medium"
                          fullWidth
                          required={Boolean(inventoryForm.availability || inventoryForm.location)}
                          disabled={inventoryIsBorrowed}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                          SelectProps={{
                            MenuProps: baseSelectMenuProps,
                            displayEmpty: true,
                            renderValue: renderEmptyValue("Availability")
                          }}
                        >
                          {[<MenuItem key="availability-placeholder" value="" disabled>
                            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                              Select availability
                            </Typography>
                          </MenuItem>,
                          ...inventoryAvailabilityOptions.map(option => (
                            <MenuItem key={option} value={option} sx={{ whiteSpace: "normal" }}>
                              {option}
                            </MenuItem>
                          ))]}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Condition"
                          name="condition"
                          value={inventoryForm.condition}
                          onChange={handleInventoryChange}
                          select
                          size="medium"
                          fullWidth
                          disabled={inventoryIsBorrowed}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                          SelectProps={{
                            MenuProps: baseSelectMenuProps,
                            displayEmpty: true,
                            renderValue: renderEmptyValue("Condition")
                          }}
                        >
                          {[
                            <MenuItem key="condition-placeholder" value="" disabled>
                              <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                                Select condition
                              </Typography>
                            </MenuItem>,
                            ...(inventoryForm.condition && !conditionOptions.includes(inventoryForm.condition)
                              ? [
                                  <MenuItem key="condition-existing" value={inventoryForm.condition}>
                                    {inventoryForm.condition}
                                  </MenuItem>
                                ]
                              : []),
                            ...conditionOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ whiteSpace: "normal" }}>
                                {option}
                              </MenuItem>
                            ))
                          ]}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Location"
                          name="location"
                          value={inventoryForm.location}
                          onChange={handleInventoryChange}
                          select
                          size="medium"
                          fullWidth
                          required={Boolean(inventoryForm.availability)}
                          helperText={locations.length === 0 ? "Add locations in Storage Management." : ""}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                          disabled={locations.length === 0 || inventoryIsBorrowed}
                          SelectProps={{
                            displayEmpty: true,
                            MenuProps: wideSelectMenuProps,
                            renderValue: (value) => formatLocationLabel(value)
                          }}
                        >
                          {[<MenuItem key="location-placeholder" value="" disabled={locations.length > 0}>
                            {locations.length === 0 ? "No locations available" : "Select a location"}
                          </MenuItem>,
                          ...locations.map(loc => (
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
                          ))]}
                        </TextField>
                      </Grid>
                    </Grid>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <Button
                        variant="contained"
                        size="medium"
                        startIcon={editInvIndex !== null ? <Save /> : <Add />}
                        onClick={handleAddOrUpdateInventory}
                        sx={{ fontWeight: 700, borderRadius: 1, minHeight: 48 }}
                        disabled={
                          inventoryIsBorrowed ||
                          !inventoryForm.availability ||
                          !inventoryForm.location
                        }
                      >
                        {editInvIndex !== null ? "Update inventory" : "Add inventory"}
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

                    <Divider />

                    <Box
                      sx={{
                        border: theme => `1.5px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
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
                                borderBottom: theme => `2px solid ${theme.palette.divider}`,
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
                            "& td": { borderBottom: theme => `1px solid ${theme.palette.divider}` },
                            "& tr:hover": { background: theme => theme.palette.action.hover }
                          }}
                        >
                          {inventoryList.map((inv, idx) => (
                            <TableRow key={idx} hover>
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
                                  sx={{ fontWeight: 600, borderRadius: 1 }}
                                />
                              </TableCell>
                              <TableCell>{inv.condition || "-"}</TableCell>
                              <TableCell>{getLocationName(inv.location, inv.locationName)}</TableCell>
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
                                <Tooltip
                                  title={
                                    inv.availability === "Borrowed"
                                      ? "Borrowed copies cannot be removed"
                                      : "Delete"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteInventory(idx)}
                                      sx={{ borderRadius: 0.75 }}
                                      disabled={inv.availability === "Borrowed"}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {inventoryList.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                  No physical copies recorded yet.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Track each shelf or storage location to keep availability dashboards accurate.
                    </Typography>
                  </Stack>
                </Box>
              </Paper>
            </Stack>
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

      {/* Scan Page Count */}
      <MuiDialog
        open={scanDialogOpen}
        onClose={closeScanDialog}
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
          Scan Documents
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Enter how many pages you want to scan in this batch. Put the next page into the scanner between scans.
            </Typography>
            <TextField
              label="Pages to Scan"
              type="number"
              size="small"
              value={scanPageCount}
              onChange={e => {
                setScanDialogError("");
                setScanPageCount(e.target.value.replace(/[^0-9]/g, ""));
              }}
              inputProps={{ min: 1, max: 30 }}
              error={!!scanDialogError}
              helperText={scanDialogError || "Maximum 30 pages per batch."}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanDialogConfirm();
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: t => `1px solid ${t.palette.divider}`,
            py: 1
          }}
        >
          <Button variant="outlined" size="small" onClick={closeScanDialog}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleScanDialogConfirm}
            startIcon={<DocumentScanner />}
          >
            Start Scan
          </Button>
        </DialogActions>
      </MuiDialog>

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