import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, CircularProgress, IconButton, Tooltip, Snackbar, Alert, Stack,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import UsersFormModal from '../../../components/UsersFormModal';
import UserDetailsModal from '../../../components/UserDetailsModal';

const API_BASE = import.meta.env.VITE_API_BASE;

const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const surfacePaper = (extra = {}) => (theme) => ({
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  background: theme.palette.background.paper,
  overflow: 'hidden',
  ...extra
});

const UserManagementPage = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);
  // Confirm approve/reject
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState(''); // 'approve' | 'reject'
  const [confirmUser, setConfirmUser] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Snackbar state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Search state
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAdd = () => {
    setIsEdit(false);
    setEditUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setIsEdit(true);
    setEditUser(user);
    setModalOpen(true);
  };

  const handleView = (user) => {
    setDetailsUser(user);
    setDetailsOpen(true);
  };

  const handleSave = async (payload) => {
    try {
      let res;
      if (isEdit && editUser) {
        res = await fetch(`${API_BASE}/users/${editUser.UserID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Failed to save user');
      setToast({ open: true, message: isEdit ? 'User updated!' : 'User added!', severity: 'success' });
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleBorrowerStatus = useCallback(async (userId, intent) => {
    const action = intent === 'approve' ? 'approve' : 'reject';
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/${action}`, { method: 'PUT' });
      if (!res.ok) throw new Error('Request failed');
      setToast({
        open: true,
        message: intent === 'approve' ? 'User approved!' : 'User rejected!',
        severity: 'success'
      });
      loadUsers();
    } catch (err) {
      const fallback = intent === 'approve' ? 'Approve failed' : 'Reject failed';
      setToast({
        open: true,
        message: err instanceof Error && err.message ? err.message : fallback,
        severity: 'error'
      });
    }
  }, [loadUsers]);

  const openConfirm = (user, intent) => {
    setConfirmUser(user);
    setConfirmIntent(intent);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmUser || !confirmIntent) return;
    setConfirmLoading(true);
    try {
      await handleBorrowerStatus(confirmUser.UserID, confirmIntent);
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmUser(null);
      setConfirmIntent('');
    }
  };

  const { staff, borrowers, metrics } = useMemo(() => {
    const staffList = (users || []).filter(u => u.Role === 'Staff');
    const borrowerList = (users || []).filter(u => u.Role === 'Borrower');
    const pendingBorrowers = borrowerList.filter(u => u.borrower?.AccountStatus === 'Pending').length;
    const approvedBorrowers = borrowerList.filter(u => u.borrower?.AccountStatus === 'Approved' || 'Registered').length;
    const rejectedBorrowers = borrowerList.filter(u => u.borrower?.AccountStatus === 'Rejected').length;
    return {
      staff: staffList,
      borrowers: borrowerList,
      metrics: {
        total: users.length,
        staff: staffList.length,
        borrowers: borrowerList.length,
        pendingBorrowers,
        approvedBorrowers,
        rejectedBorrowers
      }
    };
  }, [users]);

  const norm = v => (v || '').toString().toLowerCase();
  const matchesSearch = u => {
    if (!search) return true;
    const q = norm(search);
    return [
      u.Username, u.Firstname, u.Lastname, u.Email, u.Role,
      u?.borrower?.Type, u?.borrower?.Department, u?.borrower?.AccountStatus,
      u?.staff?.Position
    ].some(field => norm(field).includes(q));
  };

  const filteredStaff = staff.filter(matchesSearch);
  const filteredBorrowers = borrowers.filter(matchesSearch).sort((a, b) => {
    const statusOrder = { Pending: 0, Registered: 1, Approved: 1, Rejected: 2 };
    const aStatus = a.borrower?.AccountStatus || 'Unknown';
    const bStatus = b.borrower?.AccountStatus || 'Unknown';
    const aOrder = statusOrder[aStatus] ?? 3;
    const bOrder = statusOrder[bStatus] ?? 3;
    return aOrder - bOrder;
  });

  return (
    <Box
      p={{ xs: 2, md: 3 }}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: theme.palette.background.default
      }}
    >
      <Paper
        sx={surfacePaper({
          mb: 3,
          px: { xs: 2, md: 2.5 },
          py: { xs: 2, md: 2.5 },
          borderRadius: 2
        })}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <GroupIcon />
                <Typography variant="subtitle1" fontWeight={700}>User Management</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage staff and borrower accounts.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={loadUsers}
                disabled={loading}
                startIcon={<RefreshIcon fontSize="small" />}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAdd}
                startIcon={<AddIcon fontSize="small" />}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                New User
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`Total: ${metrics.total}`} sx={{ fontWeight: 600 }} />
            <Chip size="small" variant="outlined" label={`Staff: ${metrics.staff}`} sx={{ fontWeight: 600 }} />
            <Chip size="small" variant="outlined" label={`Borrowers: ${metrics.borrowers}`} sx={{ fontWeight: 600 }} />
            <Chip size="small" color={metrics.pendingBorrowers ? 'warning' : 'default'} variant={metrics.pendingBorrowers ? 'filled' : 'outlined'} label={`Pending: ${metrics.pendingBorrowers}`} sx={{ fontWeight: 600 }} />
            <Chip size="small" color={metrics.approvedBorrowers ? 'success' : 'default'} variant={metrics.approvedBorrowers ? 'filled' : 'outlined'} label={`Approved: ${metrics.approvedBorrowers}`} sx={{ fontWeight: 600 }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
                sx={{
                '& .MuiTab-root': {
                  minHeight: 38,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1,
                  px: 2,
                  mr: 1,
                  color: theme.palette.text.secondary,
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  transition: 'all .2s ease-in-out'
                },
                '& .Mui-selected': {
                  color: `${theme.palette.primary.main} !important`,
                  borderColor: alpha(theme.palette.primary.main, 0.8),
                  backgroundColor: alpha(theme.palette.primary.main, 0.08)
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 8,
                  backgroundColor: theme.palette.primary.main
                  },
                  // allow tabs to take available space so search can align to the right
                  flex: '1 1 auto',
                  minWidth: 0
              }}
            >
              <Tab
                label={`Staff (${filteredStaff.length}/${staff.length})`}
                icon={<SupervisorAccountIcon fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                label={`Borrowers (${filteredBorrowers.length}/${borrowers.length})`}
                icon={<PersonIcon fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>
            <TextField
              size="small"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 260, md: 320 },
                ml: { md: 'auto' },
                '& .MuiOutlinedInput-root': { borderRadius: 1 }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 2, borderRadius: 1.25, fontWeight: 600 }}
        >
          {error}
        </Alert>
      )}

      <Paper sx={surfacePaper({ p: 0 })}>
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={6}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <TableContainer
            sx={{
              maxHeight: '65vh',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': {
                background: alpha(theme.palette.divider, 0.6),
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
                      letterSpacing: 0.4,
                      bgcolor: alpha(theme.palette.background.paper, 0.9),
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`
                    }
                  }}
                >
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="center" width={180}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  '& tr': {
                    transition: 'background 0.2s ease-in-out'
                  },
                  '& tr:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  },
                  '& td': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`
                  }
                }}
              >
                {(tab === 0 ? filteredStaff : filteredBorrowers).map(user => (
                  <TableRow key={user.UserID} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: alpha(theme.palette.primary.main, 0.18),
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            borderRadius: 1.25,
                            fontSize: 15
                          }}
                        >
                          {(user.Firstname?.[0] || '') + (user.Lastname?.[0] || '')}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} fontSize={13.5} lineHeight={1.2}>
                            {(user.Firstname || '').trim()} {(user.Lastname || '').trim()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.Username}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13}>{user.Email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.Role}
                        size="small"
                        color={user.Role === 'Staff' ? 'primary' : 'secondary'}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 0.75
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.Role === 'Staff' && user.staff ? (
                        <Typography variant="caption" color="text.secondary">
                          Position: <b>{user.staff.Position || '—'}</b>
                        </Typography>
                      ) : null}
                      {user.Role === 'Borrower' && user.borrower ? (
                        <Stack spacing={0.35}>
                          <Typography variant="caption" color="text.secondary">
                            Type: <b>{user.borrower.Type || '—'}</b>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Dept: <b>{user.borrower.Department || '—'}</b>
                          </Typography>
                          <Chip
                            size="small"
                            label={user.borrower.AccountStatus || 'Unknown'}
                            color={
                              user.borrower.AccountStatus === 'Approved'
                                ? 'success'
                                : user.borrower.AccountStatus === 'Rejected'
                                ? 'error'
                                : 'warning'
                            }
                            sx={{ width: 'fit-content', borderRadius: 0.75, fontSize: 10, fontWeight: 700 }}
                          />
                        </Stack>
                      ) : null}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.75} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleView(user)}
                            sx={{
                              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              borderRadius: 0.75,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleEdit(user)}
                            sx={{
                              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              borderRadius: 0.75,
                              '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.1) }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tab === 1 && user.borrower?.AccountStatus === 'Pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                onClick={() => openConfirm(user, 'approve')}
                                sx={{
                                  border: `1px solid ${theme.palette.success.main}`,
                                  borderRadius: 0.75,
                                  color: theme.palette.success.main,
                                  '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.15) }
                                }}
                              >
                                <Typography fontSize={11} fontWeight={700}>Approve</Typography>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                onClick={() => openConfirm(user, 'reject')}
                                sx={{
                                  border: `1px solid ${theme.palette.error.main}`,
                                  borderRadius: 0.75,
                                  color: theme.palette.error.main,
                                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) }
                                }}
                              >
                                <Typography fontSize={11} fontWeight={700}>X</Typography>
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {(tab === 0 ? filteredStaff : filteredBorrowers).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Stack spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>No users found</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {search ? 'Adjust your search terms or filters.' : 'Invite new users to populate this view.'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Users Form Modal */}
      <UsersFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        isEdit={isEdit}
        userData={editUser}
      />

      <UserDetailsModal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetailsUser(null); }}
        user={detailsUser}
        onEdit={(u) => handleEdit(u)}
      />

      {/* Confirm Approve/Reject Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          {confirmIntent === 'approve' ? 'Approve Borrower' : 'Reject Borrower'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmUser ? (`Are you sure you want to ${confirmIntent} ${confirmUser.Firstname} ${confirmUser.Lastname}?`) : 'Are you sure?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>Cancel</Button>
          <Button onClick={handleConfirm} color={confirmIntent === 'approve' ? 'success' : 'error'} disabled={confirmLoading} variant="contained">
            {confirmIntent === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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

export default UserManagementPage;