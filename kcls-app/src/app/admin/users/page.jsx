import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, CircularProgress, IconButton, Tooltip, Snackbar, Alert, Fab, Stack,
  TextField, InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import UsersFormModal from '../../../components/UsersFormModal';
import UserDetailsModal from '../../../components/UserDetailsModal';

const API_BASE = import.meta.env.VITE_API_BASE;

const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const UserManagementPage = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);

  // Snackbar state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Search state
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

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

  const staff = users.filter(u => u.Role === 'Staff');
  const borrowers = users.filter(u => u.Role === 'Borrower');

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
  const filteredBorrowers = borrowers.filter(matchesSearch);

  return (
    <Box
      p={3}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: theme.palette.background.default
      }}
    >
      {/* Header + Search / Actions */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'background.paper'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon color="primary" />
          <Typography variant="h6" fontWeight={800} letterSpacing={0.5}>
            User Management
          </Typography>
        </Box>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            ml: { xs: 0, md: 2 },
            '& .MuiTab-root': {
              minHeight: 40,
              fontWeight: 600,
              border: `1.5px solid ${theme.palette.divider}`,
              borderRadius: 1,
              textTransform: 'none',
              px: 2,
              mr: 1
            },
            '& .Mui-selected': {
              color: `${theme.palette.primary.main} !important`,
              borderColor: theme.palette.primary.main,
              bgcolor: theme.palette.background.default
            }
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
            ml: 'auto',
            width: { xs: '100%', sm: 280, md: 320 },
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
        <Tooltip title="Add User">
          <Fab
            color="primary"
            size="small"
            onClick={handleAdd}
            sx={{
              ml: { xs: 0, md: 1 },
              borderRadius: 1,
              width: 42,
              height: 42,
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 0 0 2px ' + theme.palette.primary.main }
            }}
          >
            <AddIcon fontSize="small" />
          </Fab>
        </Tooltip>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress color="primary" />
        </Box>
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
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="center" width={160}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  '& tr:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  '& td': {
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }
                }}
              >
                {(tab === 0 ? filteredStaff : filteredBorrowers).map(user => (
                  <TableRow key={user.UserID} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            fontWeight: 600,
                            borderRadius: 1
                          }}
                        >
                          {(user.Firstname?.[0] || '') + (user.Lastname?.[0] || '')}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} fontSize={13} lineHeight={1.15}>
                            {user.Firstname} {user.Lastname}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.Username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13}>{user.Email}</Typography>
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
                      {user.Role === 'Staff' && user.staff && (
                        <Typography variant="caption" color="text.secondary">
                          Position: <b>{user.staff.Position}</b>
                        </Typography>
                      )}
                      {user.Role === 'Borrower' && user.borrower && (
                        <Stack spacing={0.25}>
                          <Typography variant="caption" color="text.secondary">
                            Type: <b>{user.borrower.Type}</b>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Dept: <b>{user.borrower.Department || '-'}</b>
                          </Typography>
                          <Chip
                            size="small"
                            label={user.borrower.AccountStatus}
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
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.75} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleView(user)}
                            sx={{
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 0.75,
                              '&:hover': { bgcolor: theme.palette.action.hover }
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
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 0.75,
                              '&:hover': { bgcolor: theme.palette.action.hover }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tab === 1 && user.borrower?.AccountStatus === "Pending" && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE}/users/${user.UserID}/approve`, { method: "PUT" });
                                    setToast({ open: true, message: "User approved!", severity: "success" });
                                    loadUsers();
                                  } catch {
                                    setToast({ open: true, message: "Approve failed", severity: "error" });
                                  }
                                }}
                                sx={{
                                  border: `1px solid ${theme.palette.success.main}`,
                                  borderRadius: 0.75,
                                  color: theme.palette.success.main,
                                  '&:hover': { bgcolor: theme.palette.success.light }
                                }}
                              >
                                <Typography fontSize={11} fontWeight={700}>OK</Typography>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE}/users/${user.UserID}/reject`, { method: "PUT" });
                                    setToast({ open: true, message: "User rejected!", severity: "success" });
                                    loadUsers();
                                  } catch {
                                    setToast({ open: true, message: "Reject failed", severity: "error" });
                                  }
                                }}
                                sx={{
                                  border: `1px solid ${theme.palette.error.main}`,
                                  borderRadius: 0.75,
                                  color: theme.palette.error.main,
                                  '&:hover': { bgcolor: theme.palette.error.light }
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
                      <Typography variant="body2" color="text.secondary">
                        No users found{search ? ' for this search.' : '.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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