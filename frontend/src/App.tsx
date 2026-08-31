import React, { useState, useEffect, useMemo } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { Login } from '../components/Login';
import { AdminDashboard } from '../components/AdminDashboard';
import { ActivateAccount } from '../components/ActivateAccount';
import { AuditorWorkspace } from '../components/auditor/AuditorWorkspace';
import { WelcomeDisclaimerModal } from '../components/WelcomeDisclaimerModal';
import { LEGAL_LINKS } from './legalLinks';
import { parseFile, parseResultListIds } from '../utils/fileParsers';
import { computeFileHashSHA256, generateSeed, deriveUint32Seed, mulberry32, fisherYatesShuffle, computeResultHash, computeCanonicalResultHash } from '../utils/cryptoUtils';
import type { Employee, FileData, InviteUserInput, MailStatus, SamplingHistoryItem, SamplingState, SamplingColumn, SupportContact, User } from '../types';
import { DEFAULT_SAMPLING_COLUMNS } from '../types';
import { ApiUnavailableError, login as apiLogin, logout as apiLogout, usersMe, listUsers, getMailStatus as apiGetMailStatus, inviteUser as apiInviteUser, resendInvite as apiResendInvite, activateAccount as apiActivateAccount, updateUser as apiUpdateUser, deleteUser as apiDeleteUser, requestPasswordReset as apiRequestPasswordReset, resetPassword as apiResetPassword, changePassword as apiChangePassword, getSamplingUsage, saveSamplingHistoryItem, getSamplingColumns as apiGetSamplingColumns, updateSamplingColumns as apiUpdateSamplingColumns, getFileUploadEligibility, reactivateUserUpload as apiReactivateUserUpload, getSupportContact as apiGetSupportContact, updateSupportContact as apiUpdateSupportContact } from './api';
import { session } from './auth/session';
import { colorTokens } from './theme/colors';

const VALID_UPLOAD_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const DEFAULT_SUPPORT_CONTACT: SupportContact = {
    phone: '555-000-0000',
    email: 'soporte@institucion.gob',
    address: 'Oficina de Sistemas - Edificio Principal',
    hours: 'Lunes a Viernes, 09:00 a 18:00',
    notes: 'Contacta al administrador para reactivar la carga de archivo.',
};

const resolveExternalMatchStatus = (
    externalOrderHash?: string,
    externalCanonicalHash?: string,
    expectedOrderHash?: string,
    expectedCanonicalHash?: string,
): 'idle' | 'exact' | 'canonical' | 'mismatch' => {
    if (!externalOrderHash || !externalCanonicalHash || !expectedOrderHash || !expectedCanonicalHash) {
        return 'idle';
    }

    if (externalOrderHash === expectedOrderHash) return 'exact';
    if (externalCanonicalHash === expectedCanonicalHash) return 'canonical';
    return 'mismatch';
};

function App() {
    const TOAST_AUTOHIDE_MS = 5000;

    // --- AUTH STATE ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [mailStatus, setMailStatus] = useState<MailStatus | null>(null);
    const [samplingColumns, setSamplingColumns] = useState<SamplingColumn[]>(DEFAULT_SAMPLING_COLUMNS);
    const [supportContact, setSupportContact] = useState<SupportContact>(DEFAULT_SUPPORT_CONTACT);

    // Activation State (simulated from URL)
    const [activationEmail, setActivationEmail] = useState<string | null>(null);
    const [activationToken, setActivationToken] = useState<string | null>(null);
    const [resetEmail, setResetEmail] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string | null>(null);

    // --- VIEW STATE ---
    const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');

    // --- APP STATE ---
    const [tabValue, setTabValue] = useState(0);
    const [fileData, setFileData] = useState<FileData | null>(null);
    const [usageCount, setUsageCount] = useState(0);
    const [history, setHistory] = useState<SamplingHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [confirmFirstSamplingOpen, setConfirmFirstSamplingOpen] = useState(false);
    const [, setKonamiIndex] = useState(0);
    const [openEasterEgg, setOpenEasterEgg] = useState(false);

    // Aviso de bienvenida: se muestra una vez por sesión del navegador.
    const [disclaimerOpen, setDisclaimerOpen] = useState(
        () => sessionStorage.getItem('alea_disclaimer_ack') !== '1',
    );
    const handleAcceptDisclaimer = () => {
        sessionStorage.setItem('alea_disclaimer_ack', '1');
        setDisclaimerOpen(false);
    };

    // Toast State
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
        open: false,
        message: '',
        severity: 'error'
    });

    // --- PERSISTENT STATE ---
    const [genState, setGenState] = useState<SamplingState>({
        results: [],
        sampleSize: '50',
        matchStatus: 'idle'
    });

    const [verState, setVerState] = useState<SamplingState>({
        results: [],
        sampleSize: '50',
        seed: '',
        resultHashInput: '',
        matchStatus: 'idle',
        externalMatchStatus: 'idle',
    });

    const konamiCode = useMemo(
        () => [
            'ArrowUp',
            'ArrowUp',
            'ArrowDown',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowLeft',
            'ArrowRight',
            'b',
            'a',
        ],
        [],
    );


    // --- INITIALIZATION ---
    useEffect(() => {
        // Check for URL parameters (Simulating Email Link Click)
        const params = new URLSearchParams(window.location.search);
        let action = params.get('action');
        let email = params.get('email');
        let token = params.get('token');

        // Fallback: Check for simulated link click from Login screen (for sandbox environments where pushState fails)
        const simulated = localStorage.getItem('simulated_email_link');
        if (simulated) {
            try {
                const data = JSON.parse(simulated);
                action = data.action;
                email = data.email;
                token = data.token;
                // Clear it so it doesn't persist on next legitimate reload
                localStorage.removeItem('simulated_email_link');
            } catch (e) {
                console.error(e);
            }
        }

        if (action === 'activate' && token) {
            setActivationEmail(email);
            setActivationToken(token);
            setResetEmail(null);
            setResetToken(null);
        } else if (action === 'reset' && token) {
            setResetEmail(email);
            setResetToken(token);
            setActivationEmail(null);
            setActivationToken(null);
        } else {
            setActivationEmail(null);
            setActivationToken(null);
            setResetEmail(null);
            setResetToken(null);
        }
        setUsers([]);
    }, []);

    useEffect(() => {
      const run = async () => {
        if (!currentUser || currentUser.role !== 'admin') return;
        const data = await listUsers();
        setUsers(data);
      };
      run();
    }, [currentUser]);

    useEffect(() => {
        let cancelled = false;

        const loadMailStatus = async () => {
            if (!currentUser || currentUser.role !== 'admin') {
                setMailStatus(null);
                return;
            }

            try {
                const status = await apiGetMailStatus();
                if (!cancelled) setMailStatus(status);
            } catch (err) {
                if (!cancelled) {
                    setMailStatus({
                        configured: false,
                        available: false,
                        message: err instanceof Error ? err.message : 'No se pudo verificar el servicio de correo.',
                    });
                }
            }
        };

        loadMailStatus();
        return () => { cancelled = true; };
    }, [currentUser]);

    useEffect(() => {
        let cancelled = false;

        const loadSamplingColumns = async () => {
            if (!currentUser) return;

            try {
                const response = await apiGetSamplingColumns();
                if (!cancelled && response?.columns?.length) {
                    setSamplingColumns(response.columns);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setSamplingColumns(DEFAULT_SAMPLING_COLUMNS);
                }
            }
        };

        loadSamplingColumns();
        return () => { cancelled = true; };
    }, [currentUser?.id]);

    useEffect(() => {
        let cancelled = false;

        const loadSupportContact = async () => {
            if (!currentUser) return;

            try {
                const response = await apiGetSupportContact();
                if (!cancelled && response?.contact) {
                    setSupportContact(response.contact);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setSupportContact(DEFAULT_SUPPORT_CONTACT);
                }
            }
        };

        loadSupportContact();
        return () => { cancelled = true; };
    }, [currentUser?.id]);

    useEffect(() => {
        const handleKonami = (event: KeyboardEvent) => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

            setKonamiIndex((prev) => {
                const expected = konamiCode[prev];

                if (key === expected) {
                    const nextIndex = prev + 1;
                    if (nextIndex === konamiCode.length) {
                        setOpenEasterEgg(true);
                        return 0;
                    }
                    return nextIndex;
                }

                return key === konamiCode[0] ? 1 : 0;
            });
        };

        window.addEventListener('keydown', handleKonami);
        return () => window.removeEventListener('keydown', handleKonami);
    }, [konamiCode]);

    // Save Users when updated
    // useEffect(() => {
    //     if (users.length > 0) {
    //         localStorage.setItem('appUsers', JSON.stringify(users));
    //     }
    // }, [users]);

    // Load usage history
    useEffect(() => {
        let cancelled = false;

        const loadUsage = async () => {
            if (!fileData || !currentUser) {
                if (!cancelled) {
                    setUsageCount(0);
                    setHistory([]);
                }
                return;
            }

            try {
                const usage = await getSamplingUsage(fileData.hash);
                if (cancelled) return;
                setUsageCount(usage.count);
                setHistory(usage.history || []);
            } catch (err) {
                console.error(err);
                if (cancelled) return;
                setUsageCount(0);
                setHistory([]);
            }
        };

        loadUsage();
        return () => { cancelled = true; };
    }, [fileData?.hash, currentUser?.id]);

    // --- HELPER FUNCTIONS ---
    const showToast = (message: string, severity: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ open: true, message, severity });
    };
    const handleCloseToast = () => setToast(prev => ({ ...prev, open: false }));
    const renderToastAlert = () => (
        <Alert
            key={`${toast.severity}-${toast.message}`}
            onClose={handleCloseToast}
            severity={toast.severity}
            variant="filled"
            sx={{
                width: '100%',
                boxShadow: 6,
                position: 'relative',
                overflow: 'hidden',
                '@keyframes toastCountdown': {
                    from: { transform: 'scaleX(1)' },
                    to: { transform: 'scaleX(0)' }
                }
            }}
        >
            {toast.message}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    height: '3px',
                    background: colorTokens.white75,
                    transformOrigin: 'left center',
                    animation: `toastCountdown ${TOAST_AUTOHIDE_MS}ms linear forwards`
                }}
            />
        </Alert>
    );

    // --- AUTH ACTIONS ---
    const handleLogin = async (email: string, pass: string) => {
        try {
            const { user, accessToken } = await apiLogin(email, pass);

            // âœ… guardar sesión (simple)
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('user', JSON.stringify(user));

            setCurrentUser(user as any);
            showToast(`Bienvenido, ${user.fullName}`, 'success');
            return { success: true };
        } catch (e: unknown) {
            if (e instanceof ApiUnavailableError) {
                return {
                    success: false,
                    retryable: true,
                    msg: `${e.message} Puedes volver a intentarlo sin recargar la pagina.`,
                };
            }
            return {
                success: false,
                retryable: false,
                msg: e instanceof Error ? e.message : 'No se pudo iniciar sesion.',
            };
        }
    };

    useEffect(() => {
    const initAuth = async () => {
        const token = session.getToken();
        if (!token) return;

        try {
        const freshUser = await usersMe();
        setCurrentUser(freshUser);
        session.setUser(freshUser);
        } catch {
        session.clear();
        setCurrentUser(null);
        }
    };

    initAuth();
}, []);

    const clearAuthenticatedState = () => {
        session.clear();
        setCurrentUser(null);
        setFileData(null);
        setHistory([]);
        setUsageCount(0);
        setSamplingColumns(DEFAULT_SAMPLING_COLUMNS);
        setSupportContact(DEFAULT_SUPPORT_CONTACT);
        setCurrentView('home');
        setTabValue(0);
    };

    const handleLogout = () => {
        void apiLogout().catch(() => undefined);
        clearAuthenticatedState();
    };

        const handleActivateAccount = async (password: string) => {
        if (!activationToken) throw new Error("No hay token de activación en contexto");
        await apiActivateAccount(activationToken, password);
        showToast("Cuenta activada. Ahora puedes iniciar sesion.", "success");
    };

    const handleResetPasswordRequest = async (email: string) => {
        await apiRequestPasswordReset(email);
        showToast("Si el correo existe, se envio un enlace de recuperación.", "success");
    };

    const handleResetPassword = async (password: string) => {
        if (!resetToken) throw new Error("No hay token de recuperación en contexto");
        await apiResetPassword(resetToken, password);
        showToast("Contraseña actualizada. Ahora puedes iniciar sesión.", "success");
    };

    const handleChangePassword = async (
        currentPassword: string,
        newPassword: string,
    ) => {
        if (!currentUser) throw new Error('No hay una sesión activa.');

        const result = await apiChangePassword({
            currentPassword,
            newPassword,
        });

        await apiLogout().catch(() => undefined);
        clearAuthenticatedState();
        showToast(
            result.emailSent
                ? 'Contraseña actualizada. Inicia sesión nuevamente.'
                : `${result.message} Inicia sesión nuevamente.`,
            result.emailSent ? 'success' : 'warning',
        );
    };

    // --- ADMIN ACTIONS ---
    const handleAddUser = async (userData: InviteUserInput) => {
        try {
            const res = await apiInviteUser({
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role,
                institution: userData.institution,
                institutionAcronym: userData.institutionAcronym,
                position: userData.position,
            });
            setUsers(prev => [res.user, ...prev]);
            setMailStatus(res.mailStatus);
            showToast(res.message, res.emailSent ? "success" : "warning");
        } catch (e: any) {
            showToast(e?.message || "No se pudo enviar la invitación.", "error");
            throw e;
        }
    };

    const handleUpdateUser = async (updatedUser: User) => {
        try {
            const res = await apiUpdateUser(updatedUser.id, {
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role,
                institution: updatedUser.institution,
                institutionAcronym: updatedUser.institutionAcronym,
                position: updatedUser.position,
            });
            const nextUser = res.user as User;
            setUsers(prev => prev.map(u => u.id === nextUser.id ? nextUser : u));

            if (currentUser && currentUser.id === nextUser.id) {
                setCurrentUser(nextUser);
                session.setUser(nextUser);
            }

            showToast("Usuario actualizado correctamente.", "success");
        } catch (e: any) {
            showToast(e?.message || "No se pudo actualizar el usuario.", "error");
            throw e;
        }
    };

    const handleDeleteUser = async (id: string) => {
        try {
            await apiDeleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            showToast("Usuario eliminado.", "warning");
        } catch (e: any) {
            showToast(e?.message || "No se pudo eliminar el usuario.", "error");
        }
    };

    const handleResendInvite = async (email: string) => {
        try {
            const res = await apiResendInvite(email);
            setMailStatus(res.mailStatus);
            showToast(`Invitación reenviada a ${email}`, "success");
        } catch (e: any) {
            const message = e?.message || "No se pudo reenviar la invitación.";
            setMailStatus(prev => ({
                configured: prev?.configured ?? true,
                available: false,
                message,
            }));
            showToast(message, "error");
            throw e;
        }
    };

    const handleReactivateUserUpload = async (userId: string) => {
        try {
            const res = await apiReactivateUserUpload(userId);
            const nextUser = res.user as User;
            setUsers(prev => prev.map(u => u.id === nextUser.id ? nextUser : u));

            if (currentUser && currentUser.id === nextUser.id) {
                setCurrentUser(nextUser);
                session.setUser(nextUser);
            }

            showToast("Carga de archivo reactivada correctamente.", "success");
        } catch (e: any) {
            showToast(e?.message || "No se pudo reactivar la carga de archivo.", "error");
        }
    };

    const handleUpdateSamplingColumns = async (labels: string[]) => {
        try {
            const payload = labels.map((label) => ({ label }));
            const response = await apiUpdateSamplingColumns(payload);
            if (response.columns.length > 0) {
                setSamplingColumns(response.columns);
                showToast('Columnas actualizadas correctamente.', 'success');
            }
        } catch (e: any) {
            showToast(e?.message || 'No se pudieron actualizar las columnas.', 'error');
            throw e;
        }
    };

    const handleUpdateSupportContact = async (contact: SupportContact) => {
        try {
            const response = await apiUpdateSupportContact(contact);
            if (response?.contact) {
                setSupportContact(response.contact);
                showToast('Datos de ayuda actualizados correctamente.', 'success');
            }
        } catch (e: any) {
            showToast(e?.message || 'No se pudo actualizar la informacion de ayuda.', 'error');
            throw e;
        }
    };

    // --- FILE HANDLING ---

    const processFile = async (file: File) => {
        setError(null);
        const fileName = file.name.toLowerCase();
        if (!VALID_UPLOAD_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
            setError("Formato de archivo no válido. Por favor sube un archivo .CSV o Excel (.xlsx).");
            return;
        }
        if (!samplingColumns.length) {
            setError('No hay columnas configuradas. Contacta al administrador.');
            return;
        }

        setLoading(true);
        setGenState({ results: [], sampleSize: '50', matchStatus: 'idle' });
        setVerState({ results: [], sampleSize: '50', seed: '', resultHashInput: '', matchStatus: 'idle', externalMatchStatus: 'idle' });

        try {
            const hash = await computeFileHashSHA256(file);
            const eligibility = await getFileUploadEligibility(hash);
            if (!eligibility.canUpload) {
                const blockedUntil = eligibility.uploadWindowEndsAt
                    ? new Date(eligibility.uploadWindowEndsAt).toLocaleString()
                    : '';
                const message = blockedUntil
                    ? `Solo puedes subir 1 archivo cada 30 dias. Podras subir otro despues de ${blockedUntil}.`
                    : (eligibility.message || 'No tienes disponible la carga de un nuevo archivo.');
                setError(message);
                showToast(message, 'warning');
                return;
            }

            const { data, error: parseErr } = await parseFile(file, samplingColumns);

            if (parseErr) {
                setError(parseErr.message);
                setLoading(false);
                return;
            }

            const dynamicSampleSize = Math.max(1, Math.round(data.length * 0.2)).toString();
            setGenState({ results: [], sampleSize: dynamicSampleSize, matchStatus: 'idle' });
            setVerState({ results: [], sampleSize: dynamicSampleSize, seed: '', resultHashInput: '', matchStatus: 'idle', externalMatchStatus: 'idle' });
            setFileData({ name: file.name, hash, employees: data, columns: samplingColumns });
            showToast("Archivo cargado correctamente.", "success");
        } catch (err) {
            console.log(err)
            setError("Error leyendo el archivo.");
            showToast("Ocurrió un error al procesar el archivo.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
        e.target.value = ''; // Reset input
    };

    const handleVerificationListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !fileData) return;
        setError(null);

        const fileName = file.name.toLowerCase();
        if (!VALID_UPLOAD_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
            setError('Formato de lista no válido. Por favor sube un archivo .CSV o Excel (.xlsx).');
            return;
        }

        const firstColumn = samplingColumns[0];
        const firstColumnTerms = [firstColumn?.label || '', ...(firstColumn?.aliases || [])].filter(Boolean);
        const { ids, error: parseErr } = await parseResultListIds(file, firstColumnTerms);

        if (parseErr) {
            setError(parseErr.message);
            showToast(parseErr.message, 'error');
            return;
        }

        const externalOrderHash = await computeResultHash(ids);
        const externalCanonicalHash = await computeCanonicalResultHash(ids);
        const externalStatus = resolveExternalMatchStatus(
            externalOrderHash,
            externalCanonicalHash,
            verState.audit?.resultHash,
            verState.audit?.canonicalResultHash,
        );

        setVerState((prev) => ({
            ...prev,
            externalListFileName: file.name,
            externalListCount: ids.length,
            externalOrderHash,
            externalCanonicalHash,
            externalMatchStatus: externalStatus,
        }));
        setError(null);

        if (externalStatus === 'exact') {
            showToast('La lista externa coincide exactamente con la muestra verificada.', 'success');
        } else if (externalStatus === 'canonical') {
            showToast('La lista externa coincide en contenido, pero con orden distinto.', 'warning');
        } else if (externalStatus === 'mismatch') {
            showToast('La lista externa no coincide con la muestra verificada.', 'warning');
        } else {
            showToast("Lista externa cargada. Ejecuta 'Verificar Muestra' para compararla.", 'success');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleResetFile = () => {
        setFileData(null);
        setGenState({ results: [], sampleSize: '50', matchStatus: 'idle' });
        setVerState({ results: [], sampleSize: '50', seed: '', resultHashInput: '', matchStatus: 'idle', externalMatchStatus: 'idle' });
        setUsageCount(0);
        setHistory([]);
        setError(null);
    };

    const updateState = (isVerification: boolean, updates: Partial<SamplingState>) => {
        if (isVerification) {
            setVerState(prev => ({ ...prev, ...updates }));
        } else {
            setGenState(prev => ({ ...prev, ...updates }));
        }
    };

    const executeSampling = async (isVerification: boolean, overrides?: Partial<SamplingState>) => {
        if (!fileData || !currentUser) return;

        const currentState = isVerification ? verState : genState;
        const stateToUse = overrides ? { ...currentState, ...overrides } : currentState;
        const size = parseInt(stateToUse.sampleSize);

        if (isNaN(size) || size <= 0 || size > fileData.employees.length) {
            setError(`El tamaño debe ser entre 1 y ${fileData.employees.length}`);
            return;
        }
        if (!isVerification && usageCount >= 3) {
            setError("Límite de muestreos alcanzado para este archivo.");
            return;
        }

        setLoading(true);
        setError(null);
        updateState(isVerification, { matchStatus: 'idle' });

        const seed = isVerification ? (stateToUse.seed?.trim() || '') : generateSeed();
        if (isVerification && !seed) {
            setError("Ingresa una semilla para verificar.");
            setLoading(false);
            return;
        }

        try {
            const seedUint32 = await deriveUint32Seed(seed, fileData.hash, size);
            const prng = mulberry32(seedUint32);
            const shuffled = fisherYatesShuffle<Employee>(fileData.employees, prng);
            const selected = shuffled.slice(0, size);
            const selectedIds = selected.map((e) => e.recordId);
            const resHash = await computeResultHash(selectedIds);
            const canonicalResHash = await computeCanonicalResultHash(selectedIds);

            const auditRecord: SamplingHistoryItem = {
                timestamp: new Date().toISOString(),
                sampleSize: size,
                seed: seed,
                fileHash: fileData.hash,
                resultHash: resHash,
                canonicalResultHash: canonicalResHash,
                method: 'FisherYates+PRNG(SHA256)'
            };

            if (!isVerification) {
                const usage = await saveSamplingHistoryItem(auditRecord);
                setUsageCount(usage.count);
                setHistory(usage.history || []);

                updateState(false, { results: selected, audit: auditRecord });
                showToast("Muestreo generado exitosamente.", "success");
            } else {
                const inputHash = stateToUse.resultHashInput?.trim() || '';
                const isMatch = inputHash ? (inputHash === resHash ? 'match' : 'mismatch') : 'idle';
                const externalStatus = resolveExternalMatchStatus(
                    stateToUse.externalOrderHash,
                    stateToUse.externalCanonicalHash,
                    resHash,
                    canonicalResHash,
                );
                updateState(true, { results: selected, audit: auditRecord, matchStatus: isMatch, externalMatchStatus: externalStatus });

                if (isMatch === 'match') showToast("Verificación exitosa: La muestra es auténtica.", "success");
                else if (isMatch === 'mismatch') showToast("Alerta: La muestra no coincide con el hash proporcionado.", "warning");
            }
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Error crítico en el proceso de muestreo.";
            setError(message);
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteSampling = (isVerification: boolean) => {
        if (!isVerification && usageCount === 0 && fileData) {
            setConfirmFirstSamplingOpen(true);
            return;
        }
        executeSampling(isVerification);
    };

    const loadHistoryToVerify = (item: SamplingHistoryItem) => {
        const overrides = {
            seed: item.seed,
            resultHashInput: item.resultHash,
            sampleSize: item.sampleSize.toString(),
            matchStatus: 'idle' as const,
            externalMatchStatus: 'idle' as const,
            externalListFileName: undefined,
            externalListCount: undefined,
            externalOrderHash: undefined,
            externalCanonicalHash: undefined,
            results: []
        };
        setError(null);
        setVerState(prev => ({ ...prev, ...overrides }));
        setTabValue(1);
        showToast("Verificando datos históricos...", "success");
        executeSampling(true, overrides);
    };

    const handleOpenManual = () => window.open(LEGAL_LINKS.manual, '_blank', 'noopener,noreferrer');

    const welcomeModal = (
        <WelcomeDisclaimerModal open={disclaimerOpen} onAccept={handleAcceptDisclaimer} />
    );
    
    const easterEggDialog = (
        <Dialog open={openEasterEgg} onClose={() => setOpenEasterEgg(false)}>
            <DialogTitle>Konami Code activado</DialogTitle>
            <DialogContent>Este sistema fue programado por MTV - P/D/N</DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenEasterEgg(false)}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );

    // --- RENDER ---

    // 1. Activation View (simulating landing from email)
    if (activationToken && !currentUser) {
        return (
            <>
                <ActivateAccount
                    email={activationEmail || 'usuario'}
                    onActivate={handleActivateAccount}
                    onGoToLogin={() => {
                        setActivationEmail(null);
                        setActivationToken(null);
                    }}
                />
                {welcomeModal}
                {easterEggDialog}
            </>
        );
    }

    if (resetToken && !currentUser) {
        return (
            <>
                <ActivateAccount
                    mode="reset"
                    email={resetEmail || 'usuario'}
                    onActivate={handleResetPassword}
                    onGoToLogin={() => {
                        setResetEmail(null);
                        setResetToken(null);
                    }}
                />
                {welcomeModal}
                {easterEggDialog}
            </>
        );
    }

    // 2. Login View
    if (!currentUser) {
        return (
            <>
                <Login
                    onLogin={handleLogin}
                    onResetRequest={handleResetPasswordRequest}
                />
                <Snackbar open={toast.open} autoHideDuration={TOAST_AUTOHIDE_MS} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    {renderToastAlert()}
                </Snackbar>
                {welcomeModal}
                {easterEggDialog}
            </>
        );
    }

    // 3. Admin View
    if (currentUser.role === 'admin') {
        return (
            <>
                <AdminDashboard
                    currentUser={currentUser}
                    users={users}
                    mailStatus={mailStatus}
                    samplingColumns={samplingColumns}
                    supportContact={supportContact}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onResendInvite={handleResendInvite}
                    onReactivateUserUpload={handleReactivateUserUpload}
                    onUpdateSamplingColumns={handleUpdateSamplingColumns}
                    onUpdateSupportContact={handleUpdateSupportContact}
                    onChangePassword={handleChangePassword}
                    onLogout={handleLogout}
                />
                <Snackbar open={toast.open} autoHideDuration={TOAST_AUTOHIDE_MS} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    {renderToastAlert()}
                </Snackbar>
                {welcomeModal}
                {easterEggDialog}
            </>
        );
    }

    // 4. Auditor View (Main App)
    return (
        <>
            <AuditorWorkspace
                currentUser={currentUser}
                currentView={currentView}
                usageCount={usageCount}
                supportContact={supportContact}
                loading={loading}
                error={error}
                isDragging={isDragging}
                fileData={fileData}
                samplingColumns={samplingColumns}
                tabValue={tabValue}
                genState={genState}
                verState={verState}
                history={history}
                onLogout={handleLogout}
                onSetCurrentView={setCurrentView}
                onChangePassword={handleChangePassword}
                onClearError={() => setError(null)}
                onSetTabValue={setTabValue}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileUpload={handleFileUpload}
                onVerificationListUpload={handleVerificationListUpload}
                onResetFile={handleResetFile}
                onUpdateState={updateState}
                onExecuteSampling={handleExecuteSampling}
                onLoadHistoryToVerify={loadHistoryToVerify}
                onOpenManual={handleOpenManual}
            />
            <Dialog
                open={confirmFirstSamplingOpen}
                onClose={() => setConfirmFirstSamplingOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        border: `1px solid ${colorTokens.slate200}`,
                        background: `linear-gradient(145deg, ${colorTokens.white} 0%, ${colorTokens.slate50} 100%)`,
                    },
                }}
            >
                <DialogTitle sx={{ color: colorTokens.pdnBluePrimary, fontWeight: 800, pb: 1 }}>
                    Aviso antes de generar
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: colorTokens.slate600 }}>
                        Al generar la primera muestra de este archivo, la carga de un archivo diferente quedara bloqueada para este usuario durante 30 dias.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 1, color: colorTokens.slate600 }}>
                        Podras seguir usando este mismo archivo y conservaras el limite actual de 3 muestreos por archivo.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 1, color: colorTokens.slate600 }}>
                        Si necesitas apoyo, contacta a un administrador desde el menu superior: Mi Perfil &gt; Ayuda y Contacto.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setConfirmFirstSamplingOpen(false)}
                        variant="outlined"
                        sx={{
                            borderColor: colorTokens.slate400,
                            color: colorTokens.slate600,
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        sx={{
                            bgcolor: colorTokens.pdnBluePrimary,
                            '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
                        }}
                        onClick={() => {
                            setConfirmFirstSamplingOpen(false);
                            executeSampling(false);
                        }}
                    >
                        Continuar y generar
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={toast.open}
                autoHideDuration={TOAST_AUTOHIDE_MS}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ zIndex: 99999 }}
            >
                {renderToastAlert()}
            </Snackbar>
            {welcomeModal}
            {easterEggDialog}
        </>
    );
}

export default App;
