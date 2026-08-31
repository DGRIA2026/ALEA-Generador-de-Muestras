import React from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  Container,
  Fab,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome,
  BarChart,
  CheckCircle,
  DeleteOutline,
  Error as ErrorIcon,
  History,
  MenuBook,
  PlayArrow,
  Restore,
  UploadFile,
  Verified,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { AuditPanel } from '../AuditPanel';
import { Footer } from '../Footer';
import { Header } from '../Header';
import { ResultsSection } from '../ResultsSection';
import { UserProfile } from '../UserProfile';
import type { FileData, SamplingColumn, SamplingHistoryItem, SamplingState, SupportContact, User } from '../../types';
import { colorTokens } from '../../src/theme/colors';

interface AuditorWorkspaceProps {
  currentUser: User;
  currentView: 'home' | 'profile';
  usageCount: number;
  supportContact: SupportContact;
  loading: boolean;
  error: string | null;
  isDragging: boolean;
  fileData: FileData | null;
  samplingColumns: SamplingColumn[];
  tabValue: number;
  genState: SamplingState;
  verState: SamplingState;
  history: SamplingHistoryItem[];
  onLogout: () => void;
  onSetCurrentView: (view: 'home' | 'profile') => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onClearError: () => void;
  onSetTabValue: (value: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationListUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFile: () => void;
  onUpdateState: (isVerification: boolean, updates: Partial<SamplingState>) => void;
  onExecuteSampling: (isVerification: boolean) => void;
  onLoadHistoryToVerify: (item: SamplingHistoryItem) => void;
  onOpenManual: () => void;
}

export const AuditorWorkspace: React.FC<AuditorWorkspaceProps> = ({
  currentUser,
  currentView,
  usageCount,
  supportContact,
  loading,
  error,
  isDragging,
  fileData,
  samplingColumns,
  tabValue,
  genState,
  verState,
  history,
  onLogout,
  onSetCurrentView,
  onChangePassword,
  onClearError,
  onSetTabValue,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileUpload,
  onVerificationListUpload,
  onResetFile,
  onUpdateState,
  onExecuteSampling,
  onLoadHistoryToVerify,
  onOpenManual,
}) => {
  const activeState = tabValue === 0 ? genState : verState;
  const columnsLabels = samplingColumns.map((column) => column.label);
  const controlsColumnRef = React.useRef<HTMLDivElement | null>(null);
  const [resultsPanelHeight, setResultsPanelHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (tabValue === 2) {
      setResultsPanelHeight(null);
      return;
    }

    const node = controlsColumnRef.current;
    if (!node) return;

    const updateHeight = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height);
      setResultsPanelHeight(nextHeight > 0 ? nextHeight : null);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [tabValue, activeState.audit, error, loading]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="flex-grow p-4 md:p-6 lg:p-8">
        <Container maxWidth="xl">
          <Header
            user={currentUser}
            usageCount={usageCount}
            supportContact={supportContact}
            onLogout={onLogout}
            onNavigateProfile={() => {
              onSetCurrentView('profile');
              onClearError();
            }}
          />

          {currentView === 'profile' ? (
            <UserProfile
              user={currentUser}
              onBack={() => onSetCurrentView('home')}
              onChangePassword={onChangePassword}
            />
          ) : (
            <>
              <div className="mb-6">
                {!fileData ? (
                  <div className="flex flex-col gap-8 animate-[fadeIn_0.5s]">
                    <Collapse in={!!error}>
                      <Alert
                        severity="error"
                        variant="filled"
                        onClose={onClearError}
                        sx={{ mb: 2, borderRadius: 2, boxShadow: `0 4px 12px ${colorTokens.red20}` }}
                      >
                        <div className="text-sm font-bold">Error de carga</div>
                        <div className="text-xs opacity-90">{error}</div>
                      </Alert>
                    </Collapse>

                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={[
                        'bg-slate-50 border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-in-out',
                        isDragging
                          ? 'border-pdn-coral bg-yellow-50 scale-[1.01] shadow-xl'
                          : 'border-gray-300 hover:border-pdn-bluePrimary hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <UploadFile
                        className={`text-6xl mb-4 transition-colors ${isDragging ? 'text-pdn-coral' : 'text-pdn-bluePrimary opacity-50'}`}
                      />

                      <h2 className="mb-2 text-xl font-bold text-gray-700">Cargar Archivo de Empleados</h2>
                      <p className="mb-6 text-gray-600">
                        Arrastra tu archivo aqui o haz clic para buscar un archivo con las siguientes columnas, en este orden:
                        {' '}
                        {columnsLabels.length > 0 ? (
                          columnsLabels.map((label, index) => (
                            <React.Fragment key={`${label}-${index}`}>
                              <span className="font-semibold text-pdn-bluePrimary">{label}</span>
                              {index < columnsLabels.length - 1 && ', '}
                            </React.Fragment>
                          ))
                        ) : (
                          'configuradas por el administrador'
                        )}
                        .
                      </p>

                      <input
                        accept=".csv, .xlsx, .xls"
                        id="raised-button-file"
                        type="file"
                        onChange={onFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="raised-button-file">
                        <Button
                          variant="contained"
                          component="span"
                          size="large"
                          disabled={loading}
                          sx={{
                            bgcolor: 'var(--color-pdn-bluePrimary)',
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            '&:hover': { bgcolor: 'var(--color-pdn-blueMedium)' },
                          }}
                        >
                          {loading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            'Seleccionar Archivo'
                          )}
                        </Button>
                      </label>
                      <p className="mt-4 text-xs font-medium text-gray-400">Soporta .csv, .xlsx, .xls</p>
                    </div>

                    <div className="mx-auto max-w-4xl">
                      <div className="flex flex-col items-start gap-5 rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-lg backdrop-blur-md md:flex-row md:p-8">
                        <div className="mt-1 shrink-0 rounded-full bg-white/20 p-3">
                          <AutoAwesome sx={{ fontSize: 24 }} />
                        </div>
                        <div>
                          <h3 className="mb-2 text-lg font-bold tracking-tight">Transparencia Institucional</h3>
                          <p className="text-sm font-light leading-relaxed opacity-90 md:text-base">
                            El Sistema de Muestreo Aleatorio Simple de la Plataforma Digital Nacional
                            representa un avance significativo en materia de transparencia y rendición
                            de cuentas para las instituciones. Al implementar un algoritmo estadí­stico
                            robusto y auditable, la herramienta elimina la discrecionalidad en los
                            procesos de selección de personal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-[slideDown_0.3s_ease] flex flex-col items-center justify-between rounded-xl bg-gradient-to-br from-pdn-bluePrimary to-pdn-blueMedium p-6 text-white shadow-lg md:flex-row">
                    <div className="mb-4 flex items-center gap-4 md:mb-0">
                      <div className="shrink-0 rounded-full bg-white/20 p-3">
                        <CheckCircle sx={{ fontSize: 28 }} />
                      </div>
                      <div>
                        <div className="text-lg font-bold leading-tight">{fileData.name}</div>
                        <div className="mt-1 text-sm font-light opacity-90">
                          {fileData.employees.length} empleados cargados ● Hash:{' '}
                          <span className="rounded bg-white/10 px-1 font-mono">
                            {fileData.hash.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onResetFile}
                      className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition-all hover:bg-white/20"
                    >
                      <DeleteOutline fontSize="small" />
                      Cambiar archivo
                    </button>
                  </div>
                )}
              </div>

              {fileData && (
                <div className="mb-16 grid h-full grid-cols-1 gap-6 lg:grid-cols-12">
                  {tabValue !== 2 && (
                    <div ref={controlsColumnRef} className="flex flex-col gap-6 lg:col-span-4 xl:col-span-3">
                      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
                        <Tabs
                          value={tabValue}
                          onChange={(_e, v) => {
                            onSetTabValue(v);
                            onClearError();
                          }}
                          variant="fullWidth"
                          sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: colorTokens.slate50,
                            '& .Mui-selected': { color: colorTokens.pdnBluePrimary },
                            '& .MuiTabs-indicator': { backgroundColor: colorTokens.pdnBluePrimary },
                          }}
                        >
                          <Tab label="Generar" icon={<PlayArrow fontSize="small" />} iconPosition="start" />
                          <Tab
                            label="Verificar"
                            icon={<Verified fontSize="small" />}
                            iconPosition="start"
                          />
                          <Tab label="Historial" icon={<History fontSize="small" />} iconPosition="start" />
                        </Tabs>

                        <div className="flex flex-col gap-6 p-6">
                          {error && (
                            <div className="animate-[fadeIn_0.3s] flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                              <ErrorIcon fontSize="medium" />
                              <span className="text-sm font-medium leading-tight">{error}</span>
                            </div>
                          )}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                              Tamaño de la Muestra
                            </label>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={activeState.sampleSize}
                              onChange={(e) =>
                                onUpdateState(tabValue === 1, { sampleSize: e.target.value })
                              }
                              disabled={loading}
                              placeholder={`Max: ${fileData.employees.length}`}
                              InputProps={{ sx: { borderRadius: 2 } }}
                            />
                          </div>

                          {tabValue === 1 && (
                            <div className="animate-[fadeIn_0.3s]">
                              <div className="mb-4">
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                                  Semilla (Seed)
                                </label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  value={verState.seed}
                                  onChange={(e) => onUpdateState(true, { seed: e.target.value })}
                                  placeholder="Pegar semilla..."
                                  InputProps={{
                                    sx: { borderRadius: 2, fontSize: '0.8rem', fontFamily: 'monospace' },
                                  }}
                                />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                                  Hash Resultado (Opcional)
                                </label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  value={verState.resultHashInput}
                                  onChange={(e) =>
                                    onUpdateState(true, { resultHashInput: e.target.value })
                                  }
                                  placeholder="Para validar..."
                                  InputProps={{
                                    sx: { borderRadius: 2, fontSize: '0.8rem', fontFamily: 'monospace' },
                                  }}
                                />
                              </div>
                              <div className="mt-4">
                                <input
                                  accept=".csv, .xlsx, .xls"
                                  id="verify-list-file"
                                  type="file"
                                  onChange={onVerificationListUpload}
                                  className="hidden"
                                />
                                <label htmlFor="verify-list-file">
                                  <Button
                                    variant="outlined"
                                    component="span"
                                    fullWidth
                                    size="small"
                                    startIcon={<UploadFile fontSize="small" />}
                                    sx={{
                                      borderRadius: 2,
                                      textTransform: 'none',
                                      borderColor: colorTokens.slate200,
                                      color: colorTokens.slate600,
                                    }}
                                  >
                                    Subir Lista Externa (Opcional)
                                  </Button>
                                </label>
                                {verState.externalListFileName && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Lista: {verState.externalListFileName}
                                    {typeof verState.externalListCount === 'number'
                                      ? ` (${verState.externalListCount} IDs)`
                                      : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={() => onExecuteSampling(tabValue === 1)}
                            disabled={loading || (tabValue === 0 && usageCount >= 3)}
                            startIcon={
                              !loading
                                ? tabValue === 0
                                  ? usageCount > 0
                                    ? <Restore />
                                    : <PlayArrow />
                                  : <Verified />
                                : null
                            }
                            sx={{
                              background:
                                tabValue === 0
                                  ? colorTokens.pdnCoralGradient
                                  : colorTokens.pdnBluePrimary,
                              borderRadius: 3,
                              py: 1.5,
                              fontWeight: 'bold',
                              boxShadow: `0 4px 10px ${colorTokens.black10}`,
                            }}
                          >
                            {loading ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : tabValue === 0 ? (
                              usageCount > 0 ? (
                                'Generar Nueva Muestra'
                              ) : (
                                'Ejecutar Muestreo'
                              )
                            ) : (
                              'Verificar Muestra'
                            )}
                          </Button>

                          {tabValue === 1 && verState.matchStatus !== 'idle' && (
                            <div
                              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-bold ${verState.matchStatus === 'match' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                            >
                              {verState.matchStatus === 'match' ? <CheckCircle /> : <ErrorIcon />}
                              {verState.matchStatus === 'match'
                                ? 'LA MUESTRA COINCIDE'
                                : 'LA MUESTRA NO COINCIDE'}
                            </div>
                          )}

                          {tabValue === 1 && verState.externalMatchStatus && verState.externalMatchStatus !== 'idle' && (
                            <div
                              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-bold ${
                                verState.externalMatchStatus === 'exact'
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : verState.externalMatchStatus === 'canonical'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-red-200 bg-red-50 text-red-700'
                              }`}
                            >
                              {verState.externalMatchStatus === 'mismatch' ? <ErrorIcon /> : <CheckCircle />}
                              {verState.externalMatchStatus === 'exact'
                                ? 'LA LISTA EXTERNA COINCIDE EXACTAMENTE'
                                : verState.externalMatchStatus === 'canonical'
                                  ? 'LA LISTA EXTERNA COINCIDE EN CONTENIDO (ORDEN DISTINTO)'
                                  : 'LA LISTA EXTERNA NO COINCIDE'}
                            </div>
                          )}
                        </div>
                      </div>

                      {activeState.audit && (
                        <AuditPanel data={activeState.audit} totalRecords={fileData.employees.length} />
                      )}
                    </div>
                  )}

                  <div className={`${tabValue === 2 ? 'col-span-12' : 'lg:col-span-8 xl:col-span-9'} min-h-[500px]`}>
                    {tabValue === 2 && (
                      <div className="flex flex-col gap-6">
                        <div className="overflow-hidden rounded-2xl bg-white shadow-lg lg:hidden">
                          <Tabs
                            value={tabValue}
                            onChange={(_e, v) => onSetTabValue(v)}
                            variant="fullWidth"
                            sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: colorTokens.slate50 }}
                          >
                            <Tab label="Generar" icon={<PlayArrow fontSize="small" />} iconPosition="start" />
                            <Tab
                              label="Verificar"
                              icon={<Verified fontSize="small" />}
                              iconPosition="start"
                            />
                            <Tab label="Historial" icon={<History fontSize="small" />} iconPosition="start" />
                          </Tabs>
                        </div>

                        <div className="hidden items-center justify-between rounded-2xl bg-white p-2 shadow-md lg:flex">
                          <Tabs
                            value={tabValue}
                            onChange={(_e, v) => onSetTabValue(v)}
                            sx={{
                              '& .MuiTab-root': { minHeight: 48 },
                              '& .Mui-selected': { color: colorTokens.pdnBluePrimary },
                              '& .MuiTabs-indicator': { backgroundColor: colorTokens.pdnBluePrimary },
                            }}
                          >
                            <Tab
                              label="Generar Muestra"
                              icon={<PlayArrow fontSize="small" />}
                              iconPosition="start"
                            />
                            <Tab
                              label="Verificar Muestra"
                              icon={<Verified fontSize="small" />}
                              iconPosition="start"
                            />
                            <Tab
                              label="Historial de Operaciones"
                              icon={<History fontSize="small" />}
                              iconPosition="start"
                            />
                          </Tabs>
                          <div className="px-4 text-sm font-medium text-gray-500">
                            Archivo: <span className="text-gray-800">{fileData.name}</span>
                          </div>
                        </div>

                        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
                            <h3 className="flex items-center gap-2 font-bold text-gray-700">
                              <History className="text-pdn-bluePrimary" />
                              Bitácora de Muestreos
                            </h3>
                            <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
                              {history.length} Registros encontrados
                            </span>
                          </div>
                          <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Fecha y Hora</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Tamaño</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Semilla (Seed)</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Hash Resultado</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Acciones
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {history.length > 0 ? (
                                  [...history]
                                    .sort(
                                      (a, b) =>
                                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                                    )
                                    .map((item, index) => (
                                    <TableRow key={index} hover>
                                      <TableCell>
                                        <div className="text-sm font-medium text-gray-800">
                                          {new Date(item.timestamp).toLocaleDateString('es-MX', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                          })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(item.timestamp).toLocaleTimeString()}
                                        </div>
                                      </TableCell>
                                      <TableCell>{item.sampleSize}</TableCell>
                                      <TableCell>
                                        <code
                                          className="block max-w-[150px] truncate rounded bg-slate-100 px-1 py-0.5 text-xs text-pdn-bluePrimary"
                                          title={item.seed}
                                        >
                                          {item.seed}
                                        </code>
                                      </TableCell>
                                      <TableCell>
                                        <code
                                          className="block max-w-[150px] truncate text-xs text-gray-500"
                                          title={item.resultHash}
                                        >
                                          {item.resultHash}
                                        </code>
                                      </TableCell>
                                      <TableCell align="center">
                                        <Tooltip
                                          title="Cargar en Verificar"
                                          children={
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              startIcon={<VisibilityIcon />}
                                              onClick={() => onLoadHistoryToVerify(item)}
                                              sx={{
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                color: colorTokens.pdnBluePrimary,
                                                borderColor: colorTokens.pdnBluePrimary,
                                                '&:hover': {
                                                  borderColor: colorTokens.pdnBlueMedium,
                                                  bgcolor: colorTokens.bluePrimary04,
                                                },
                                              }}
                                            >
                                              Ver
                                            </Button>
                                          }
                                        />
                                      </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                      <div className="flex flex-col items-center text-gray-400">
                                        <History sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                                        <p>No hay historial registrado para este archivo aún.</p>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      </div>
                    )}

                    {tabValue !== 2 &&
                      (activeState.results.length > 0 ? (
                        <div
                          className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
                          style={resultsPanelHeight ? { maxHeight: resultsPanelHeight } : undefined}
                        >
                          <ResultsSection
                            totalEmployees={fileData.employees.length}
                            sample={activeState.results}
                            columns={fileData.columns}
                            auditData={activeState.audit}
                            heightClass="h-full"
                          />
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/30 bg-white/50 p-12 text-white/60">
                          <div className="mb-4 rounded-full bg-white/10 p-6">
                            {tabValue === 0 ? (
                              <BarChart style={{ fontSize: 60 }} />
                            ) : (
                              <Verified style={{ fontSize: 60 }} />
                            )}
                          </div>
                          <h3 className="text-xl font-medium">
                            {tabValue === 0 ? 'Listo para muestrear' : 'Listo para verificar'}
                          </h3>
                          <p className="mt-2 max-w-xs text-center text-sm opacity-80">
                            {tabValue === 0
                              ? 'Configura el tamaño de la muestra en el panel izquierdo y pulsa Ejecutar.'
                              : 'Introduce la Semilla y el Hash original para validar la integridad de un proceso previo.'}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Container>
      </div>

      <Footer />

      {currentView === 'home' && (
        <Tooltip
          title="Manual de Usuario"
          placement="left"
          arrow
          children={
            <Fab
              color="inherit"
              aria-label="manual"
              onClick={onOpenManual}
              sx={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                backgroundColor: colorTokens.white90,
                color: colorTokens.pdnBluePrimary,
                backdropFilter: 'blur(8px)',
                boxShadow: `0 8px 32px ${colorTokens.black20}`,
                zIndex: 50,
                '&:hover': {
                  backgroundColor: colorTokens.white,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${colorTokens.black25}`,
                },
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <MenuBook />
            </Fab>
          }
        />
      )}
    </div>
  );
};

