import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  Badge,
  Delete,
  Edit,
  InfoOutlined,
  Logout,
  Mail,
  PeopleAlt,
  PersonAdd,
  Refresh,
  Search,
  Security,
  SettingsBackupRestore,
  SettingsApplications,
  SupportAgent,
  SupervisorAccount,
  VerifiedUser,
} from '@mui/icons-material';
import type {
  InviteUserInput,
  MailStatus,
  SamplingColumn,
  SupportContact,
  User,
} from '../types';
import { Footer } from './Footer';
import { colorTokens } from '../src/theme/colors';
import { UserFormDialog, type UserFormData } from './admin/UserFormDialog';
import { normalizeText } from '../utils/normalizeText';
import { PasswordDialog } from './PasswordDialog';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  mailStatus: MailStatus | null;
  samplingColumns: SamplingColumn[];
  onAddUser: (user: InviteUserInput) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onResendInvite: (email: string) => Promise<void>;
  onReactivateUserUpload: (id: string) => Promise<void>;
  onUpdateSamplingColumns: (labels: string[]) => Promise<void>;
  supportContact: SupportContact;
  onUpdateSupportContact: (contact: SupportContact) => Promise<void>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onLogout: () => void;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof Pick<User, 'fullName' | 'institutionAcronym' | 'email' | 'status'>;

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  const valA = String(a[orderBy] || '').toLowerCase();
  const valB = String(b[orderBy] || '').toLowerCase();
  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  mailStatus,
  samplingColumns,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResendInvite,
  onReactivateUserUpload,
  onUpdateSamplingColumns,
  supportContact,
  onUpdateSupportContact,
  onChangePassword,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [userRoleTab, setUserRoleTab] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('fullName');
  const [editId, setEditId] = useState<string | null>(null);
  const [columnsInput, setColumnsInput] = useState('');
  const [savingColumns, setSavingColumns] = useState(false);
  const [supportForm, setSupportForm] = useState<SupportContact>(supportContact);
  const [savingSupport, setSavingSupport] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [openPassDialog, setOpenPassDialog] = useState(false);

  useEffect(() => {
    setColumnsInput(samplingColumns.map((column) => column.label).join('\n'));
  }, [samplingColumns]);

  useEffect(() => {
    setSupportForm(supportContact);
  }, [supportContact]);

  const handleResendInvite = async (email: string) => {
    if (resendingEmail) return;
    setResendingEmail(email);
    try {
      await onResendInvite(email);
    } catch {
      // El contenedor muestra el detalle mediante toast y actualiza el estado SMTP.
    } finally {
      setResendingEmail(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const targetRole = userRoleTab === 0 ? 'auditor' : 'admin';
    let result = users.filter((user) => user.role === targetRole);

    if (searchText) {
      const searchTerms = normalizeText(searchText).split(' ').filter(Boolean);
      result = result.filter((user) => {
        const rowString = normalizeText(
          `${user.fullName} ${user.email} ${user.institution} ${user.institutionAcronym} ${user.position}`,
        );
        return searchTerms.every((term) => rowString.includes(term));
      });
    }

    return result;
  }, [users, userRoleTab, searchText]);

  const visibleUsers = useMemo(() => {
    return [...filteredUsers].sort(getComparator(order, orderBy));
  }, [filteredUsers, order, orderBy]);

  const paginatedUsers = useMemo(() => {
    return visibleUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [visibleUsers, page, rowsPerPage]);

  const editingUser = useMemo(() => users.find((user) => user.id === editId) ?? null, [users, editId]);

  const handleSaveUser = async (formData: UserFormData) => {
    if (editingUser) {
      await onUpdateUser({
        id: editingUser.id,
        status: editingUser.status,
        lastLogin: editingUser.lastLogin,
        lastUploadedFileHash: editingUser.lastUploadedFileHash,
        uploadWindowStartedAt: editingUser.uploadWindowStartedAt,
        uploadWindowEndsAt: editingUser.uploadWindowEndsAt,
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        institution: formData.institution,
        institutionAcronym: formData.institutionAcronym,
        position: formData.position,
      });
      return;
    }

    await onAddUser({
      email: formData.email,
      fullName: formData.fullName,
      role: formData.role,
      institution: formData.institution,
      institutionAcronym: formData.institutionAcronym,
      position: formData.position,
    });
  };

  const handleSaveColumns = async () => {
    const labels = columnsInput
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (labels.length === 0) return;

    setSavingColumns(true);
    try {
      await onUpdateSamplingColumns(labels);
    } finally {
      setSavingColumns(false);
    }
  };

  const handleSaveSupportContact = async () => {
    setSavingSupport(true);
    try {
      await onUpdateSupportContact({
        phone: supportForm.phone.trim(),
        email: supportForm.email.trim(),
        address: supportForm.address.trim(),
        hours: supportForm.hours.trim(),
        notes: supportForm.notes.trim(),
      });
    } finally {
      setSavingSupport(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip label="Activo" color="success" size="small" variant="outlined" icon={<VerifiedUser />} />;
      case 'pending':
        return <Chip label="Pendiente" color="warning" size="small" variant="outlined" icon={<Mail />} />;
      case 'inactive':
        return <Chip label="Inactivo" color="default" size="small" variant="outlined" />;
      default:
        return null;
    }
  };

  const isUploadWindowActive = (user: User) => {
    if (!user.uploadWindowEndsAt) return false;
    const endsAtMs = new Date(user.uploadWindowEndsAt).getTime();
    return Number.isFinite(endsAtMs) && endsAtMs > Date.now();
  };

  const SortableHeader = ({ id, label }: { id: OrderBy; label: string }) => (
    <TableCell
      sx={{ fontWeight: 'bold', color: colorTokens.slate500, py: 2 }}
      sortDirection={orderBy === id ? order : false}
    >
      <TableSortLabel
        active={orderBy === id}
        direction={orderBy === id ? order : 'asc'}
        onClick={() => {
          const isAsc = orderBy === id && order === 'asc';
          setOrder(isAsc ? 'desc' : 'asc');
          setOrderBy(id);
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-pdn-blueMedium text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
              <AdminPanelSettings />
            </div>
            <div>
              <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
                Panel de Administración
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, letterSpacing: '0.5px' }}>
                {currentUser.institution?.toUpperCase()}
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/20 pl-4 pr-2 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold leading-tight">{currentUser.fullName}</div>
              <div className="text-[10px] opacity-70 font-mono">{currentUser.email}</div>
            </div>
            <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />
            <Tooltip title="Cambiar contraseña">
              <IconButton
                onClick={() => setOpenPassDialog(true)}
                size="small"
                sx={{
                  color: 'white',
                  bgcolor: colorTokens.white10,
                  '&:hover': { bgcolor: colorTokens.pdnBluePrimary, transform: 'scale(1.05)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <Security fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar Sesion">
              <IconButton
                onClick={onLogout}
                size="small"
                sx={{
                  color: 'white',
                  bgcolor: colorTokens.white10,
                  '&:hover': { bgcolor: colorTokens.pdnBluePrimary, transform: 'scale(1.05)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 lg:p-8 flex-grow max-w-7xl animate-[fadeIn_0.5s_ease]">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, gap: 1 },
              '& .Mui-selected': { color: colorTokens.pdnBluePrimary },
              '& .MuiTabs-indicator': { backgroundColor: colorTokens.pdnBluePrimary },
            }}
          >
            <Tab icon={<PeopleAlt fontSize="small" />} iconPosition="start" label="Gestion de Usuarios" />
            <Tab icon={<SettingsApplications fontSize="small" />} iconPosition="start" label="Configuracion del Archivo" />
            <Tab icon={<SupportAgent fontSize="small" />} iconPosition="start" label="Ayuda y Contacto" />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <Fade in={activeTab === 0}>
            <div>
              {mailStatus && !mailStatus.available && (
                <Alert severity={mailStatus.configured ? 'warning' : 'error'} sx={{ mb: 3 }}>
                  <strong>Envio de correos no disponible.</strong> {mailStatus.message} Los usuarios
                  nuevos quedaran pendientes y podras reenviar la invitacion cuando se restablezca
                  el servicio.
                </Alert>
              )}
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Directorio de Usuarios</h2>
                  <p className="text-gray-500 mt-1">Gestiona los accesos y roles del personal institucional.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <TextField
                    size="small"
                    placeholder="Buscar por nombre, correo..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setPage(0);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: { bgcolor: 'white', borderRadius: 2 },
                    }}
                    sx={{ minWidth: 280 }}
                  />

                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    sx={{
                      bgcolor: colorTokens.pdnBluePrimary,
                      px: 3,
                      py: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
                    }}
                    onClick={() => {
                      setEditId(null);
                      setOpenModal(true);
                    }}
                  >
                    Nuevo Usuario
                  </Button>
                </div>
              </div>

              <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${colorTokens.slate200}`, overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: colorTokens.slate50, px: 2 }}>
                  <Tabs
                    value={userRoleTab}
                    onChange={(_event, newValue) => {
                      setUserRoleTab(newValue);
                      setPage(0);
                    }}
                    sx={{
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', minHeight: 56 },
                      '& .Mui-selected': { color: colorTokens.pdnBluePrimary },
                      '& .MuiTabs-indicator': { backgroundColor: colorTokens.pdnBluePrimary, height: 2 },
                    }}
                  >
                    <Tab icon={<Badge sx={{ fontSize: 18 }} />} iconPosition="start" label={`Auditores (${users.filter((u) => u.role === 'auditor').length})`} />
                    <Tab icon={<SupervisorAccount sx={{ fontSize: 18 }} />} iconPosition="start" label={`Administradores (${users.filter((u) => u.role === 'admin').length})`} />
                  </Tabs>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: 'white' }}>
                      <TableRow>
                        <SortableHeader id="fullName" label="USUARIO" />
                        <SortableHeader id="institutionAcronym" label="INSTITUCION" />
                        <SortableHeader id="email" label="CONTACTO" />
                        <SortableHeader id="status" label="ESTADO" />
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: colorTokens.slate500, py: 2 }}>
                          ACCIONES
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                          <TableRow key={user.id} hover>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: user.role === 'admin' ? colorTokens.pdnCoral : colorTokens.pdnBluePrimary,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {user.fullName.charAt(0)}
                                </Avatar>
                                <div>
                                  <div className="font-bold text-gray-800 leading-tight">{user.fullName}</div>
                                  <div className="text-[11px] text-gray-500">{user.position}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-700">{user.institutionAcronym}</div>
                              <div className="text-[10px] text-gray-400 max-w-[180px] truncate" title={user.institution}>
                                {user.institution}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-600">{user.email}</TableCell>
                            <TableCell>
                              {getStatusChip(user.status)}
                              {user.role === 'auditor' && (
                                <div className="mt-1 text-[10px] text-gray-500">
                                  {isUploadWindowActive(user)
                                    ? `Carga bloqueada hasta ${new Date(user.uploadWindowEndsAt as string).toLocaleDateString('es-MX', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
                                    : 'Carga habilitada'}
                                </div>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <div className="flex justify-end gap-1">
                                <Tooltip title="Editar Perfil">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditId(user.id);
                                      setOpenModal(true);
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {user.status === 'pending' && (
                                  <Tooltip title="Reenviar invitacion">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      disabled={resendingEmail !== null}
                                      onClick={() => handleResendInvite(user.email)}
                                    >
                                      {resendingEmail === user.email ? (
                                        <CircularProgress size={18} />
                                      ) : (
                                        <Refresh fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {user.role === 'auditor' && isUploadWindowActive(user) && (
                                  <Tooltip title="Reactivar carga de archivo">
                                    <IconButton size="small" color="primary" onClick={() => onReactivateUserUpload(user.id)}>
                                      <SettingsBackupRestore fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {(user.role !== 'admin' || visibleUsers.length > 1) && (
                                  <Tooltip title="Eliminar / Desactivar">
                                    <IconButton size="small" sx={{ color: colorTokens.red500 }} onClick={() => onDeleteUser(user.id)}>
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <div className="flex flex-col items-center text-gray-400">
                              <Search sx={{ fontSize: 48, mb: 1, opacity: 0.2 }} />
                              <Typography>No se encontraron resultados.</Typography>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50]}
                  component="div"
                  count={visibleUsers.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_event, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setRowsPerPage(+event.target.value);
                    setPage(0);
                  }}
                  labelRowsPerPage="Filas:"
                />
              </Paper>
            </div>
          </Fade>
        ) : activeTab === 1 ? (
          <Fade in={activeTab === 1}>
            <div className="max-w-3xl mx-auto">
              <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${colorTokens.slate200}`, p: 4 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-pdn-bluePrimary/10 p-2 rounded-lg">
                    <SettingsApplications sx={{ color: colorTokens.pdnBluePrimary }} />
                  </div>
                  <div>
                    <Typography variant="h6" fontWeight="bold">Columnas del Archivo</Typography>
                    <Typography variant="body2" color="text.secondary">Define la estructura que el sistema reconocera al cargar empleados.</Typography>
                  </div>
                </div>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Columnas (una por linea o separadas por comas)</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  value={columnsInput}
                  onChange={(e) => setColumnsInput(e.target.value)}
                  placeholder={'ID\nNombre Completo\nPuesto\nArea'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outlined" onClick={() => setColumnsInput(samplingColumns.map((column) => column.label).join('\n'))}>
                    Restablecer
                  </Button>
                  <Button
                    variant="contained"
                    disabled={savingColumns}
                    onClick={handleSaveColumns}
                    sx={{
                      bgcolor: colorTokens.pdnBluePrimary,
                      '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
                      px: 4,
                    }}
                  >
                    {savingColumns ? 'Guardando...' : 'Guardar Estructura'}
                  </Button>
                </div>
                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'start' }}>
                  <InfoOutlined fontSize="small" />
                  <Typography variant="caption">
                    El sistema utiliza la primera columna para calcular la huella digital (hash) de los resultados. Asegurese de que sea un identificador unico si es posible.
                  </Typography>
                </Box>
              </Paper>
            </div>
          </Fade>
        ) : (
          <Fade in={activeTab === 2}>
            <div className="max-w-3xl mx-auto">
              <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${colorTokens.slate200}`, p: 4 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-pdn-bluePrimary/10 p-2 rounded-lg">
                    <SupportAgent sx={{ color: colorTokens.pdnBluePrimary }} />
                  </div>
                  <div>
                    <Typography variant="h6" fontWeight="bold">Informacion de Ayuda y Contacto</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configura los datos que vera el auditor en el menu Ayuda y Contacto.
                    </Typography>
                  </div>
                </div>
                <Divider sx={{ my: 3 }} />
                <div className="grid grid-cols-1 gap-4">
                  <TextField
                    fullWidth
                    label="Telefono"
                    value={supportForm.phone}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, phone: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                  />
                  <TextField
                    fullWidth
                    label="Correo electronico"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, email: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                  />
                  <TextField
                    fullWidth
                    label="Direccion"
                    value={supportForm.address}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, address: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                  />
                  <TextField
                    fullWidth
                    label="Horario de atencion"
                    value={supportForm.hours}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, hours: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Notas"
                    value={supportForm.notes}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, notes: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: colorTokens.slate50 } }}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outlined" onClick={() => setSupportForm(supportContact)}>
                    Restablecer
                  </Button>
                  <Button
                    variant="contained"
                    disabled={savingSupport}
                    onClick={handleSaveSupportContact}
                    sx={{
                      bgcolor: colorTokens.pdnBluePrimary,
                      '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
                      px: 4,
                    }}
                  >
                    {savingSupport ? 'Guardando...' : 'Guardar Contacto'}
                  </Button>
                </div>
              </Paper>
            </div>
          </Fade>
        )}
      </div>

      <UserFormDialog
        open={openModal}
        editingUser={editingUser}
        onClose={() => {
          setOpenModal(false);
          setEditId(null);
        }}
        onSave={handleSaveUser}
      />
      <PasswordDialog
        open={openPassDialog}
        onClose={() => setOpenPassDialog(false)}
        mode="change"
        onSubmit={async ({ currentPassword, newPassword }) => {
          await onChangePassword(currentPassword, newPassword);
        }}
      />
      <Footer />
    </div>
  );
};
