import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { emailService } from './server/emailService';
import { getPanamaWeather } from './server/weatherService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Carpeta de almacenamiento para archivos cargados (POH, comprobantes, documentos)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'AeroAcademia API', timestamp: new Date().toISOString() });
  });

  // --- BUSCADOR UNIVERSAL (GLOBAL SEARCH FOR ADMIN & CONTABILIDAD) ---
  app.get('/api/search', (req, res) => {
    const { q, category } = req.query;
    const query = typeof q === 'string' ? q : '';
    const cat = typeof category === 'string' ? category : 'all';
    const searchResponse = db.globalSearch(query, cat);
    res.json(searchResponse);
  });

  // --- AUTENTICACIÓN OFICIAL SKYOPs ---
  app.post('/api/auth/login', (req, res) => {
    const rawIdentifier = String(req.body.identifier || req.body.email || req.body.cedula || req.body.usuario || '').trim();
    const cleanPassword = String(req.body.password || '').trim();

    if (!rawIdentifier || !cleanPassword) {
      return res.status(400).json({ error: 'Ingresa tu usuario, correo o número de cédula y tu contraseña.' });
    }

    const cleanId = rawIdentifier.toLowerCase();
    const cleanDoc = rawIdentifier.replace(/[\s.-]/g, '').toLowerCase();

    // Verificación de credenciales maestras de Jefatura de Operaciones e Instrucción / Dirección Master
    const isMasterCredential =
      (cleanId === 'amunoz4100@gmail.com' ||
       cleanId === 'amunoz410@gmail.com' ||
       cleanId === 'amunoz4100' ||
       cleanId === 'amunoz410' ||
       cleanId === 'antpilot26@skyops.com' ||
       cleanDoc === '87421980' ||
       cleanId === '8-742-1980') &&
      (cleanPassword === 'Antpilot26' || cleanPassword === 'Antpilot26.');

    if (isMasterCredential) {
      let masterUser = db.getUsers().find(u =>
        u.correo.toLowerCase() === 'amunoz4100@gmail.com' ||
        u.correo.toLowerCase() === 'amunoz410@gmail.com' ||
        u.correo.toLowerCase() === 'antpilot26@skyops.com' ||
        (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87421980')
      );
      if (!masterUser) {
        masterUser = db.createUser({
          id: 'usr_amunoz_admin',
          nombre: 'Cap. Anthony Muñoz - Jefatura de Operaciones e Instrucción',
          rol: 'admin',
          telefono: '+507 6890-1122',
          correo: 'amunoz4100@gmail.com',
          password: 'Antpilot26',
          documento_identidad: '8-742-1980',
          direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Panamá',
          fecha_ingreso: '2024-01-01',
          licencia: 'AAC-ATPL-09412',
          vencimiento_medico: '2028-12-31',
          vencimiento_licencia: '2028-12-31',
          numero_medico: 'MED-CL1-09412-AAC',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado'
        });
      }
      return res.json({
        success: true,
        user: masterUser,
        token: `skyops_session_${Date.now()}`
      });
    }

    // Verificación de credenciales oficiales de Contabilidad & Finanzas
    const isContaCredential =
      (cleanId === 'contabilidad@skyops.com' ||
       cleanId === 'conta@skyops.com' ||
       cleanId === 'contabilidad' ||
       cleanId === 'conta' ||
       cleanDoc === '88002020' ||
       cleanId === '8-800-2020') &&
      (cleanPassword === 'Conta2026.' ||
       cleanPassword === 'Conta2026' ||
       cleanPassword === 'SkyOpsConta26.' ||
       cleanPassword === 'SkyOpsConta26' ||
       cleanPassword === 'Conta26.' ||
       cleanPassword === 'Conta26');

    if (isContaCredential) {
      let contaUser = db.getUsers().find(u =>
        u.correo.toLowerCase() === 'contabilidad@skyops.com' ||
        (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '88002020') ||
        u.rol === 'contabilidad'
      );
      if (!contaUser) {
        contaUser = db.createUser({
          id: 'usr_conta_1',
          nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
          rol: 'contabilidad',
          telefono: '+507 6233-7711',
          correo: 'contabilidad@skyops.com',
          password: 'Conta2026.',
          documento_identidad: '8-800-2020',
          direccion_residencial: 'Bella Vista, Calle 45, PH Torres del Mar, Ciudad de Panamá',
          fecha_ingreso: '2024-01-01',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado'
        });
      }
      return res.json({
        success: true,
        user: contaUser,
        token: `skyops_session_${Date.now()}`
      });
    }

    // Verificación de credenciales oficiales de Estudiante / Alumno
    const isStudentCredential =
      (cleanId === 'alumno@skyops.com' ||
       cleanId === 'estudiante@skyops.com' ||
       cleanId === 'daniel.alvarado@skyops.com' ||
       cleanId === 'alumno' ||
       cleanId === 'estudiante' ||
       cleanDoc === '89201140' ||
       cleanId === '8-920-1140') &&
      (cleanPassword === 'Alumno2026.' ||
       cleanPassword === 'Alumno2026' ||
       cleanPassword === 'Estudiante2026.' ||
       cleanPassword === 'Estudiante2026' ||
       cleanPassword === 'SkyOpsDaniel26.' ||
       cleanPassword === 'SkyOpsDaniel26');

    if (isStudentCredential) {
      let estUser = db.getUsers().find(u =>
        (u.correo && (u.correo.toLowerCase() === 'alumno@skyops.com' || u.correo.toLowerCase() === 'daniel.alvarado@skyops.com')) ||
        (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '89201140') ||
        u.id === 'usr_est_daniel'
      );
      if (!estUser) {
        estUser = db.createUser({
          id: 'usr_est_daniel',
          nombre: 'Daniel Alvarado - Alumno Piloto CPL-A',
          rol: 'estudiante',
          telefono: '+507 6412-8899',
          correo: 'alumno@skyops.com',
          password: 'Alumno2026.',
          documento_identidad: '8-920-1140',
          direccion_residencial: 'San Francisco, Calle 73, PH Oasis, Panamá',
          fecha_ingreso: '2025-01-15',
          curso_actual: 'Piloto Comercial de Avión (CPL-A)',
          licencia: 'AAC-SPL-11420',
          vencimiento_medico: '2027-05-31',
          vencimiento_licencia: '2027-06-30',
          numero_medico: 'MED-CL2-11420-AAC',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado'
        });
      }
      return res.json({
        success: true,
        user: estUser,
        token: `skyops_session_${Date.now()}`
      });
    }

    // Verificación de credenciales oficiales de Instructor de Vuelo (CFI-A)
    const isInstructorCredential =
      (cleanId === 'instructor@skyops.com' ||
       cleanId === 'instructor' ||
       cleanId === 'valeria.benitez@skyops.com' ||
       cleanId === 'valeria' ||
       cleanDoc === '87901420' ||
       cleanId === '8-790-1420') &&
      (cleanPassword === 'Instructor2026.' ||
       cleanPassword === 'Instructor2026' ||
       cleanPassword === 'SkyOpsValeria26.' ||
       cleanPassword === 'SkyOpsInstructor26.' ||
       cleanPassword === 'Instructor26.' ||
       cleanPassword === 'Instructor26');

    if (isInstructorCredential) {
      let instUser = db.getUsers().find(u =>
        (u.correo && (u.correo.toLowerCase() === 'instructor@skyops.com' || u.correo.toLowerCase() === 'valeria.benitez@skyops.com')) ||
        (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87901420') ||
        u.id === 'usr_inst_valeria'
      );
      if (!instUser) {
        instUser = db.createUser({
          id: 'usr_inst_valeria',
          nombre: 'Cap. Valeria Benítez - Instructora de Vuelo (CFI-A)',
          rol: 'instructor',
          telefono: '+507 6711-2233',
          correo: 'instructor@skyops.com',
          password: 'Instructor2026.',
          documento_identidad: '8-790-1420',
          direccion_residencial: 'Clayton, Calle Las Acacias, Casa 45, Panamá',
          fecha_ingreso: '2024-02-01',
          licencia: 'AAC-CFI-08812',
          vencimiento_medico: '2027-10-31',
          vencimiento_licencia: '2027-11-30',
          numero_medico: 'MED-CL1-08812-AAC',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado'
        });
      }
      return res.json({
        success: true,
        user: instUser,
        token: `skyops_session_${Date.now()}`
      });
    }

    // Verificación de credenciales oficiales de Taller & Mantenimiento Aeronáutico (TMA / OMA)
    const isTallerCredential =
      (cleanId === 'taller@skyops.com' ||
       cleanId === 'taller' ||
       cleanId === 'mantenimiento@skyops.com' ||
       cleanId === 'mantenimiento' ||
       cleanId === 'carlos.mendoza@skyops.com' ||
       cleanId === 'carlos' ||
       cleanDoc === '87654321' ||
       cleanId === '8-765-4321') &&
      (cleanPassword === 'Taller2026.' ||
       cleanPassword === 'Taller2026' ||
       cleanPassword === 'SkyOpsTaller26.' ||
       cleanPassword === 'SkyOpsTaller26' ||
       cleanPassword === 'Taller26.' ||
       cleanPassword === 'Taller26');

    if (isTallerCredential) {
      let tallerUser = db.getUsers().find(u =>
        (u.correo && (u.correo.toLowerCase() === 'taller@skyops.com' || u.correo.toLowerCase() === 'carlos.mendoza@skyops.com')) ||
        (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87654321') ||
        u.id === 'usr_taller_carlos' ||
        u.rol === 'mantenimiento'
      );
      if (!tallerUser) {
        tallerUser = db.createUser({
          id: 'usr_taller_carlos',
          nombre: 'Ing. Carlos Mendoza - Jefe de Taller & TMA',
          rol: 'mantenimiento',
          telefono: '+507 6890-4411',
          correo: 'taller@skyops.com',
          password: 'Taller2026.',
          documento_identidad: '8-765-4321',
          direccion_residencial: 'Albrook, Hangar 3B, Ciudad de Panamá',
          fecha_ingreso: '2023-08-01',
          licencia: 'AAC-TMA-04521',
          vencimiento_licencia: '2027-12-31',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado'
        });
      }
      return res.json({
        success: true,
        user: tallerUser,
        token: `skyops_session_${Date.now()}`
      });
    }

    // Búsqueda en catálogo de usuarios por correo, cédula/documento de identidad o ID
    const user = db.getUsers().find(u => {
      // Coincidencia por correo
      if (u.correo && u.correo.trim().toLowerCase() === cleanId) return true;
      // Coincidencia por cédula / documento de identidad (exacto o sin guiones)
      if (u.documento_identidad) {
        const userDoc = u.documento_identidad.trim().toLowerCase();
        const userDocClean = userDoc.replace(/[\s.-]/g, '');
        if (userDoc === cleanId || userDocClean === cleanDoc) return true;
      }
      // Coincidencia por ID de usuario
      if (u.id && u.id.trim().toLowerCase() === cleanId) return true;
      return false;
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario, correo o número de cédula no encontrado en SkyOps.' });
    }

    const isPasswordValid =
      user.password === cleanPassword ||
      ((cleanPassword === 'Antpilot26' || cleanPassword === 'Antpilot26.') &&
       (user.password === 'Antpilot26' || user.password === 'Antpilot26.' || user.rol === 'admin')) ||
      ((cleanPassword === 'Conta2026.' || cleanPassword === 'Conta2026' || cleanPassword === 'SkyOpsConta26.' || cleanPassword === 'SkyOpsConta26' || cleanPassword === 'Conta26.' || cleanPassword === 'Conta26') &&
       user.rol === 'contabilidad') ||
      ((cleanPassword === 'Alumno2026.' || cleanPassword === 'Alumno2026' || cleanPassword === 'Estudiante2026.' || cleanPassword === 'Estudiante2026' || cleanPassword === 'SkyOpsDaniel26.' || cleanPassword === 'SkyOpsDaniel26') &&
       user.rol === 'estudiante') ||
      ((cleanPassword === 'Instructor2026.' || cleanPassword === 'Instructor2026' || cleanPassword === 'SkyOpsValeria26.' || cleanPassword === 'SkyOpsInstructor26.' || cleanPassword === 'Instructor26.' || cleanPassword === 'Instructor26') &&
       user.rol === 'instructor') ||
      ((cleanPassword === 'Taller2026.' || cleanPassword === 'Taller2026' || cleanPassword === 'SkyOpsTaller26.' || cleanPassword === 'SkyOpsTaller26' || cleanPassword === 'Taller26.' || cleanPassword === 'Taller26') &&
       user.rol === 'mantenimiento');

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta. Por favor verifica tus credenciales.' });
    }

    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta inactiva o suspendida administrativamente.' });
    }

    res.json({
      success: true,
      user,
      token: `skyops_session_${Date.now()}`
    });
  });

  // --- USUARIOS & RBAC ---
  app.get('/api/users', (req, res) => {
    const { rol } = req.query;
    let users = db.getUsers();
    if (rol && typeof rol === 'string') {
      users = users.filter(u => u.rol === rol);
    }
    res.json(users);
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  });

  app.post('/api/users', (req, res) => {
    const { nombre, rol, telefono, correo } = req.body;
    if (!nombre || !rol || !telefono || !correo) {
      return res.status(400).json({ error: 'Nombre, rol, teléfono y correo son campos obligatorios.' });
    }

    const existingUsers = db.getUsers();
    // Validar correo duplicado
    if (existingUsers.some(u => u.correo.toLowerCase() === correo.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo institucional.' });
    }

    // Validar documento de identidad duplicado
    if (req.body.documento_identidad && req.body.documento_identidad.trim()) {
      const cleanDoc = req.body.documento_identidad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const duplicateDoc = existingUsers.find(u => {
        if (!u.documento_identidad) return false;
        return u.documento_identidad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanDoc;
      });
      if (duplicateDoc) {
        return res.status(400).json({
          error: `Ya existe un usuario registrado (${duplicateDoc.nombre}) con el documento de identidad "${req.body.documento_identidad}".`
        });
      }
    }

    const newUser = db.createUser({
      ...req.body,
      password: req.body.password || 'SkyOps2026.'
    });

    // Si es estudiante y se ingresó un saldo inicial, registrar abono de apertura
    if (newUser.rol === 'estudiante' && req.body.saldo_inicial && Number(req.body.saldo_inicial) > 0) {
      try {
        db.addTransaction({
          fecha: new Date().toISOString().split('T')[0],
          estudiante_id: newUser.id,
          estudiante_nombre: newUser.nombre,
          tipo: 'abono',
          monto: Number(req.body.saldo_inicial),
          concepto: 'Matrícula',
          referencia_ach: `INIT-${Date.now().toString().slice(-6)}`,
          creado_por: req.body.creado_por || 'Jefatura de Operaciones',
          estado_aprobacion: 'aprobado',
          comprobado_banco: true,
          notas: 'Abono inicial de matrícula / saldo de apertura de cuenta de alumno'
        });
      } catch (err) {
        console.warn('Error al registrar saldo inicial:', err);
      }
    }

    res.status(201).json(newUser);
  });

  // Delegación de permisos de creación de usuario por Jefatura RAC 141
  app.post('/api/admin/delegate-user-creation', (req, res) => {
    const { userId, allowed, authorizedBy } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId es requerido.' });
    const targetUser = db.getUserById(userId);
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const updated = db.updateUser(userId, {
      puede_crear_usuarios: Boolean(allowed),
      permisos_delegados: {
        ...(targetUser.permisos_delegados || {}),
        crear_usuarios: Boolean(allowed),
        asignado_por: authorizedBy || 'Jefatura de Operaciones',
        fecha_asignacion: new Date().toISOString()
      }
    });

    db.addAuditLog({
      usuario_id: 'usr_jefatura_1',
      usuario_nombre: authorizedBy || 'Jefatura de Operaciones',
      usuario_rol: 'admin',
      modulo: 'usuarios',
      accion: 'MODIFICAR',
      entidad_tipo: 'Privilegio Administrativo RAC 141',
      entidad_id: userId,
      descripcion: `${allowed ? 'OTORGADO' : 'REVOCADO'} permiso de creación de usuarios para ${targetUser.nombre} (${targetUser.rol}).`,
      detalles_cambio: [
        {
          campo: 'puede_crear_usuarios',
          etiqueta: 'Permiso de Creación de Usuarios',
          valor_anterior: Boolean(targetUser.puede_crear_usuarios),
          valor_nuevo: Boolean(allowed)
        }
      ],
      referencia_normativa_aac: 'Manual de Procedimientos y Delegación de Autoridad SkyOps RAC 141',
      severidad: 'regulatoria'
    });

    res.json({ success: true, user: updated });
  });

  app.put('/api/users/:id', (req, res) => {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(updated);
  });

  app.delete('/api/users/:id', (req, res) => {
    const ok = db.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true });
  });

  // --- PORTAL INSTRUCTOR (VIGENCIAS & DUAL GIVEN) ---
  app.get('/api/instructors/:id/check-lock', (req, res) => {
    const result = db.isInstructorLocked(req.params.id);
    res.json(result);
  });

  app.get('/api/instructors/:id/dual-given', (req, res) => {
    const { month } = req.query;
    const stats = db.getInstructorDualGivenStats(req.params.id, month as string);
    res.json(stats);
  });

  const isInstructorOrChiefRole = (role?: unknown): boolean =>
    typeof role === 'string' && ['instructor', 'instructor_en_jefe'].includes(role.trim().toLowerCase());

  // --- HONORARIOS DE INSTRUCTORES (LIQUIDACIONES Y BITÁCORAS) ---
  app.get('/api/instructor-fees', (req, res) => {
    try {
      const { instructorId, status, search } = req.query;
      const actorRole = req.query.role || req.headers['x-user-role'];
      let statements = db.getInstructorFeeStatements({
        instructorId: instructorId as string,
        status: status as any,
        search: search as string
      });
      if (isInstructorOrChiefRole(actorRole)) {
        statements = statements.map(st => ({
          ...st,
          estudiante_saldo_resultante: undefined
        }));
      }
      res.json(statements);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- EXCEL INDIVIDUAL DE HONORARIOS POR INSTRUCTOR (RBAC ESTRICTO) ---
  const isFeeExcelEditor = (role: string) =>
    role === 'escuela' || role === 'admin' || role === 'contabilidad';

  app.get('/api/instructor-fees/excel/directory', (req, res) => {
    try {
      const userRole = String(req.headers['x-user-role'] || req.query.role || '');
      const userId = String(req.headers['x-user-id'] || req.query.userId || '');
      if (!isFeeExcelEditor(userRole) && userRole !== 'instructor') {
        return res.status(403).json({ error: 'Acceso denegado a archivos Excel de honorarios.' });
      }
      let directory = db.getInstructorFeeExcelDirectory();
      if (userRole === 'instructor') {
        directory = directory.filter(item => item.instructor_id === userId);
      }
      res.json({ success: true, directory });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al listar archivos Excel de honorarios' });
    }
  });

  app.get('/api/instructor-fees/excel/:instructorId', (req, res) => {
    try {
      const userRole = String(req.headers['x-user-role'] || req.query.role || '');
      const userId = String(req.headers['x-user-id'] || req.query.userId || '');
      const { instructorId } = req.params;

      if (!isFeeExcelEditor(userRole) && userRole !== 'instructor') {
        return res.status(403).json({ error: 'Acceso denegado al archivo Excel de honorarios.' });
      }
      if (userRole === 'instructor' && userId !== instructorId) {
        return res.status(403).json({ error: 'Un instructor solo puede consultar su propio archivo Excel individual.' });
      }

      const data = db.getInstructorFeeExcelWorkbook(instructorId);
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al cargar Excel individual de honorarios' });
    }
  });

  app.put('/api/instructor-fees/excel/:instructorId', (req, res) => {
    try {
      const userRole = String(req.headers['x-user-role'] || req.body?.actorRole || '');
      const actorName = String(req.headers['x-user-name'] || req.body?.actorName || '');
      const { instructorId } = req.params;
      if (!isFeeExcelEditor(userRole)) {
        return res.status(403).json({
          error: 'Solo Director, Administración y Contabilidad pueden editar los honorarios en formato Excel.'
        });
      }
      const workbook = req.body?.workbook || req.body;
      if (!workbook || !Array.isArray(workbook.sheets)) {
        return res.status(400).json({ error: 'Estructura de archivo Excel inválida.' });
      }
      const saved = db.saveInstructorFeeExcelWorkbook(instructorId, workbook, userRole, actorName);
      res.json({ success: true, ...saved });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      res.status(status).json({ error: err.message || 'Error al guardar archivo Excel de honorarios' });
    }
  });

  app.post('/api/instructor-fees/excel/:instructorId/sync', (req, res) => {
    try {
      const userRole = String(req.headers['x-user-role'] || req.body?.actorRole || '');
      const { instructorId } = req.params;
      if (!isFeeExcelEditor(userRole)) {
        return res.status(403).json({
          error: 'Solo Director, Administración y Contabilidad pueden sincronizar la hoja Excel de honorarios.'
        });
      }
      const synced = db.syncInstructorFeeExcelWorkbook(instructorId, userRole);
      res.json({ success: true, ...synced });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      res.status(status).json({ error: err.message || 'Error al sincronizar archivo Excel de honorarios' });
    }
  });

  app.get('/api/instructor-fees/:id', (req, res) => {
    try {
      const actorRole = req.query.role || req.headers['x-user-role'];
      const statement = db.getInstructorFeeStatementById(req.params.id);
      if (!statement) {
        return res.status(404).json({ error: 'Liquidación de honorarios no encontrada' });
      }
      if (isInstructorOrChiefRole(actorRole)) {
        return res.json({ ...statement, estudiante_saldo_resultante: undefined });
      }
      res.json(statement);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/instructor-fees/register-from-bitacora', (req, res) => {
    try {
      const statement = db.registerBitacoraHonorario(req.body);
      res.status(201).json(statement);
    } catch (err: any) {
      const status = err?.statusCode || 400;
      console.error('Error registrando honorario desde bitácora:', err);
      res.status(status).json({ error: err.message || 'Error al registrar bitácora y crear honorario' });
    }
  });

  app.post('/api/instructor-fees/generate', (req, res) => {
    try {
      const statement = db.generateInstructorFeeStatement(req.body);
      res.json(statement);
    } catch (err: any) {
      const status = err?.statusCode || 400;
      console.error('Error generando honorarios de instructor:', err);
      res.status(status).json({ error: err.message || 'Error al generar honorarios' });
    }
  });

  app.post('/api/instructor-fees', (req, res) => {
    try {
      const saved = db.saveInstructorFeeStatement(req.body);
      res.json(saved);
    } catch (err: any) {
      const status = err?.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  });

  app.put('/api/instructor-fees/:id/status', (req, res) => {
    try {
      const updated = db.updateInstructorFeeStatementStatus(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Liquidación no encontrada' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/instructor-fees/:id', (req, res) => {
    try {
      const ok = db.deleteInstructorFeeStatement(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: 'Liquidación no encontrada' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ELEGIBILIDAD OPERATIVA DE VUELO (SIN EXPONER SALDO NUMÉRICO) ---
  app.get('/api/students/flight-eligibility', (req, res) => {
    res.json(db.getStudentFlightEligibilityMap());
  });

  // --- CONTABILIDAD Y CONCILIACIÓN BANCARIA ---
  app.get('/api/transactions', (req, res) => {
    const { studentId, status } = req.query;
    const actorRole = req.query.role || req.headers['x-user-role'];
    let txs = db.getTransactions(studentId as string, status as any);
    if (isInstructorOrChiefRole(actorRole)) {
      txs = txs
        .filter(t => t.tipo === 'cargo')
        .map(t => ({
          ...t,
          saldo_anterior: undefined,
          saldo_resultante: 0
        }));
    }
    res.json(txs);
  });

  app.get('/api/transactions/pending', (req, res) => {
    const actorRole = req.query.role || req.headers['x-user-role'];
    if (isInstructorOrChiefRole(actorRole)) {
      return res.status(403).json({ error: 'Los instructores y el jefe de instructores no tienen acceso a saldos ni transacciones pendientes.' });
    }
    const pending = db.getPendingTransactions();
    res.json(pending);
  });

  app.get('/api/transactions/balance/:studentId', (req, res) => {
    const actorRole = req.query.role || req.headers['x-user-role'];
    if (isInstructorOrChiefRole(actorRole)) {
      return res.status(403).json({ error: 'Los instructores y el jefe de instructores no tienen permiso para consultar saldos de estudiantes.' });
    }
    const balance = db.getStudentBalance(req.params.studentId);
    const pendingInfo = db.getStudentPendingAmount(req.params.studentId);
    res.json({ studentId: req.params.studentId, balance, ...pendingInfo });
  });

  app.post('/api/transactions', (req, res) => {
    const {
      estudiante_id,
      fecha,
      tipo,
      concepto,
      monto,
      referencia_ach,
      banco_origen,
      archivo_adjunto,
      archivo_nombre,
      creado_por,
      notas,
      estado_aprobacion,
      comprobado_banco,
      referencia_bancaria_confirmada,
      verificado_por,
      notas_bancarias,
      horas_vuelo,
      horas_hobbs,
      factor_cobro_estudiante,
      tarifa_hora,
      matricula_avion,
      modelo_avion,
      instructor_nombre,
      leccion_num,
      tipo_mision,
      hoja_vuelo_id,
      saldo_anterior
    } = req.body;

    if (!estudiante_id || !fecha || !tipo || !concepto || monto === undefined || !referencia_ach) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la transacción contable' });
    }

    const tx = db.addTransaction({
      estudiante_id,
      fecha,
      tipo,
      concepto,
      monto: Number(monto),
      referencia_ach,
      banco_origen,
      archivo_adjunto,
      archivo_nombre,
      creado_por: creado_por || 'Contabilidad',
      notas,
      estado_aprobacion,
      comprobado_banco,
      referencia_bancaria_confirmada,
      verificado_por,
      notas_bancarias,
      horas_vuelo: horas_vuelo !== undefined ? Number(horas_vuelo) : undefined,
      horas_hobbs: horas_hobbs !== undefined ? Number(horas_hobbs) : undefined,
      factor_cobro_estudiante: factor_cobro_estudiante !== undefined ? Number(factor_cobro_estudiante) : undefined,
      tarifa_hora: tarifa_hora !== undefined ? Number(tarifa_hora) : undefined,
      matricula_avion,
      modelo_avion,
      instructor_nombre,
      leccion_num: leccion_num !== undefined ? Number(leccion_num) : undefined,
      tipo_mision,
      hoja_vuelo_id,
      saldo_anterior: saldo_anterior !== undefined ? Number(saldo_anterior) : undefined
    });

    res.status(201).json(tx);
  });

  app.post('/api/transactions/:id/approve', (req, res) => {
    const { verificado_por, notas_bancarias, referencia_confirmada, monto_confirmado } = req.body;
    if (!verificado_por) {
      return res.status(400).json({ error: 'El nombre del oficial de contabilidad que verifica es obligatorio' });
    }

    const parsedMonto = monto_confirmado !== undefined && monto_confirmado !== null && monto_confirmado !== ''
      ? Number(monto_confirmado)
      : undefined;

    const approved = db.approveTransaction(
      req.params.id,
      verificado_por,
      notas_bancarias,
      referencia_confirmada,
      parsedMonto
    );
    if (!approved) {
      return res.status(404).json({ error: 'Transacción no encontrada para aprobar' });
    }

    res.json(approved);
  });

  app.post('/api/transactions/:id/reject', (req, res) => {
    const { verificado_por, motivo } = req.body;
    if (!verificado_por || !motivo) {
      return res.status(400).json({ error: 'El oficial de contabilidad y el motivo de rechazo son obligatorios' });
    }

    const rejected = db.rejectTransaction(req.params.id, verificado_por, motivo);
    if (!rejected) {
      return res.status(404).json({ error: 'Transacción no encontrada para rechazar' });
    }

    res.json(rejected);
  });

  // --- PAGOS CON TARJETA DE DÉBITO / CRÉDITO Y LINKS DE PAGO ---
  app.post('/api/payments/process-card', (req, res) => {
    try {
      const { studentId, amount, concept, cardholderName, cardNumber, expiry, cvv, cardType, billingZip, hoursEstimated, paymentLinkId } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'El monto a pagar debe ser mayor a 0 USD.' });
      }
      if (!cardholderName || !cardNumber || !expiry || !cvv) {
        return res.status(400).json({ error: 'Los datos de la tarjeta (titular, número, fecha y CVV) son obligatorios.' });
      }

      const result = db.processCardPayment({
        studentId: studentId || 'usr_est_daniel',
        amount: Number(amount),
        concept,
        cardholderName,
        cardNumber,
        expiry,
        cvv,
        cardType: cardType === 'credito' ? 'credito' : 'debito',
        billingZip,
        hoursEstimated: hoursEstimated ? Number(hoursEstimated) : undefined,
        paymentLinkId
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error('Error procesando pago con tarjeta:', err);
      res.status(400).json({ error: err.message || 'Error al procesar el pago con tarjeta' });
    }
  });

  app.get('/api/payments/links', (req, res) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const links = db.getPaymentLinks(studentId);
      res.json({ success: true, links });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener enlaces de pago', details: err.message });
    }
  });

  app.post('/api/payments/links', (req, res) => {
    try {
      const { studentId, amount, concept, hoursEstimated, expiresInDays, createdBy } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'El monto debe ser superior a 0 USD.' });
      }

      const link = db.createPaymentLink({
        studentId: studentId || 'usr_est_daniel',
        amount: Number(amount),
        concept: concept || 'Abono de Horas de Vuelo',
        hoursEstimated: hoursEstimated ? Number(hoursEstimated) : undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : 7,
        createdBy
      });

      res.status(201).json({ success: true, link });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al crear el link de pago' });
    }
  });

  app.get('/api/payments/links/:token', (req, res) => {
    try {
      const link = db.getPaymentLinkByToken(req.params.token);
      if (!link) {
        return res.status(404).json({ error: 'Enlace de pago no encontrado o caducado.' });
      }
      res.json({ success: true, link });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar el enlace de pago', details: err.message });
    }
  });

  app.post('/api/payments/links/:token/pay', (req, res) => {
    try {
      const result = db.payPaymentLink(req.params.token, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al pagar el enlace de cobro' });
    }
  });

  app.delete('/api/payments/links/:id', (req, res) => {
    try {
      const success = db.cancelPaymentLink(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al cancelar enlace de pago', details: err.message });
    }
  });

  app.post('/api/logbook/batch', (req, res) => {
    const { entries, uploadedBy } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Formato inválido. Se espera un arreglo de entradas de bitácora.' });
    }
    const result = db.processAircraftLogbookBatch(entries, uploadedBy || 'Administración SkyOps');
    res.json(result);
  });

  // Procesamiento por lote de bitácoras de aeronaves y débito automático de saldos
  app.post('/api/aircraft-logbooks/process-batch', (req, res) => {
    const { entries, uploaded_by } = req.body;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista válida de entradas de bitácora para procesar' });
    }

    try {
      const summary = db.processAircraftLogbookBatch(entries, uploaded_by || 'Contabilidad');
      res.status(200).json(summary);
    } catch (err: any) {
      console.error('Error al procesar lote de bitácoras de aeronaves:', err);
      res.status(500).json({ error: err.message || 'Error interno al procesar lote de bitácoras de aeronaves' });
    }
  });

  // Registro unificado de vuelo desde bitácora (cobro estudiante + honorario instructor + tacómetro Taller OMA)
  app.post('/api/aircraft-logbooks/record-flight', (req, res) => {
    try {
      const actorRole = req.body?.registrado_por_rol || req.headers['x-user-role'];
      const result = db.recordFlightLog(req.body);
      if (isInstructorOrChiefRole(actorRole)) {
        return res.status(201).json({
          ...result,
          transaction: result.transaction
            ? { ...result.transaction, saldo_anterior: undefined, saldo_resultante: 0 }
            : result.transaction,
          feeStatement: result.feeStatement
            ? { ...result.feeStatement, estudiante_saldo_resultante: undefined }
            : result.feeStatement,
          studentIdentified: result.studentIdentified
            ? {
                id: result.studentIdentified.id,
                nombre: result.studentIdentified.nombre,
                saldo_anterior: 0,
                saldo_resultante: 0
              }
            : null
        });
      }
      res.status(201).json(result);
    } catch (err: any) {
      const status = typeof err?.statusCode === 'number' ? err.statusCode : 400;
      if (status >= 500) {
        console.error('Error al registrar vuelo en bitácora:', err);
      } else {
        console.warn('Validación al registrar vuelo en bitácora:', err?.message || err);
      }
      res.status(status).json({ error: err?.message || 'Error al registrar el vuelo en bitácora' });
    }
  });

  app.get('/api/accounting/morosidad', (req, res) => {
    const actorRole = req.query.role || req.headers['x-user-role'];
    if (isInstructorOrChiefRole(actorRole)) {
      return res.status(403).json({ error: 'Los instructores y el jefe de instructores no tienen acceso a saldos de estudiantes.' });
    }
    const report = db.getMorosidadReport();
    res.json(report);
  });

  // --- MENSAJERÍA INTERNA DE CONTABILIDAD ---
  app.get('/api/accounting-messages', (req, res) => {
    const { userId } = req.query;
    const msgs = db.getAccountingMessages(userId as string);
    res.json(msgs);
  });

  app.post('/api/accounting-messages', (req, res) => {
    const {
      remitente_id,
      remitente_nombre,
      destinatario_id,
      destinatario_nombre,
      asunto,
      mensaje,
      prioridad,
      transaccion_id,
      transaccion_resumen,
      imagen_adjunta,
      imagen_nombre
    } = req.body;

    if (!remitente_id || !destinatario_id || !asunto || !mensaje) {
      return res.status(400).json({ error: 'Remitente, destinatario, asunto y mensaje son obligatorios' });
    }

    const msg = db.createAccountingMessage({
      remitente_id,
      remitente_nombre: remitente_nombre || 'Contabilidad',
      destinatario_id,
      destinatario_nombre: destinatario_nombre || 'Destinatario',
      asunto,
      mensaje,
      prioridad,
      transaccion_id,
      transaccion_resumen,
      imagen_adjunta,
      imagen_nombre
    });

    res.status(201).json(msg);
  });

  app.post('/api/accounting-messages/:id/reply', (req, res) => {
    const {
      remitente_id,
      remitente_nombre,
      mensaje,
      imagen_adjunta,
      imagen_nombre
    } = req.body;

    if (!remitente_id || !mensaje) {
      return res.status(400).json({ error: 'Remitente y mensaje son requeridos para responder' });
    }

    const updated = db.replyAccountingMessage(req.params.id, {
      remitente_id,
      remitente_nombre: remitente_nombre || 'Contabilidad',
      mensaje,
      imagen_adjunta,
      imagen_nombre
    });

    if (!updated) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.status(200).json(updated);
  });

  app.put('/api/accounting-messages/:id/read', (req, res) => {
    const ok = db.markAccountingMessageRead(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json({ success: true });
  });

  app.delete('/api/accounting-messages/:id', (req, res) => {
    const ok = db.deleteAccountingMessage(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json({ success: true });
  });

  // --- SUBIDA DE ARCHIVOS (POH, COMPROBANTES ACH, DOCUMENTOS) ---
  app.post('/api/upload', (req, res) => {
    try {
      const { filename, base64, mimeType } = req.body;
      if (!filename || !base64) {
        return res.status(400).json({ error: 'filename y base64 son requeridos' });
      }
      const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const sanitizedName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadsDir, sanitizedName);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${sanitizedName}`;
      console.log(`[Upload] Archivo almacenado exitosamente: ${sanitizedName} (${buffer.length} bytes)`);
      res.json({
        success: true,
        url: fileUrl,
        filename: sanitizedName,
        size: buffer.length,
        mimeType: mimeType || 'application/octet-stream'
      });
    } catch (err: any) {
      console.error('Error al guardar archivo subido:', err);
      res.status(500).json({ error: 'Error al almacenar el archivo en servidor' });
    }
  });

  // --- MANUALES POH (PILOT OPERATING HANDBOOKS) ---
  app.get('/api/poh', (req, res) => {
    try {
      const docs = db.getPOHDocuments();
      res.json(docs);
    } catch (err) {
      console.error('Error al consultar POHs:', err);
      res.status(500).json({ error: 'Error al consultar biblioteca POH' });
    }
  });

  app.post('/api/poh', (req, res) => {
    try {
      const doc = req.body;
      if (!doc || !doc.titulo) {
        return res.status(400).json({ error: 'Título del documento es requerido' });
      }
      const saved = db.savePOHDocument(doc);
      res.status(201).json(saved);
    } catch (err) {
      console.error('Error al guardar POH:', err);
      res.status(500).json({ error: 'Error al guardar manual POH' });
    }
  });

  app.put('/api/poh/:id', (req, res) => {
    try {
      const saved = db.savePOHDocument({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      console.error('Error al actualizar POH:', err);
      res.status(500).json({ error: 'Error al actualizar manual POH' });
    }
  });

  app.delete('/api/poh/:id', (req, res) => {
    try {
      const ok = db.deletePOHDocument(req.params.id);
      res.json({ success: ok });
    } catch (err) {
      console.error('Error al eliminar POH:', err);
      res.status(500).json({ error: 'Error al eliminar manual POH' });
    }
  });

  // --- HOJA DE TRABAJO DE BITÁCORA DE AERONAVES (DRAFT SHEETS) ---
  app.get('/api/aircraft-logbooks/sheet', (req, res) => {
    try {
      const rows = db.getLogbookDraftSheet();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar hoja de bitácora' });
    }
  });

  app.post('/api/aircraft-logbooks/sheet', (req, res) => {
    try {
      const { rows } = req.body;
      const saved = db.saveLogbookDraftSheet(rows);
      res.json({ success: true, count: saved.length });
    } catch (err) {
      res.status(500).json({ error: 'Error al guardar hoja de bitácora' });
    }
  });

  // --- HOJAS DE PROGRESO DE VUELO (32 MANIOBRAS & CASCADA) ---
  app.get('/api/flight-progress', (req, res) => {
    const { studentId } = req.query;
    const sheets = db.getFlightProgress(studentId as string);
    res.json(sheets);
  });

  app.get('/api/flight-progress/:id', (req, res) => {
    const sheet = db.getFlightProgressById(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Hoja de progreso no encontrada' });
    res.json(sheet);
  });

  app.post('/api/flight-progress', (req, res) => {
    const data = req.body;
    if (!data.estudiante_id || !data.instructor_id || !data.fecha || !data.matricula) {
      return res.status(400).json({ error: 'Datos incompletos para la Hoja de Progreso' });
    }

    const saved = db.saveOrUpdateFlightProgress(data);
    res.status(200).json(saved);
  });

  app.post('/api/flight-progress/:id/validate', (req, res) => {
    const { instructor_id } = req.body;
    const sheet = db.getFlightProgressById(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Hoja de progreso no encontrada' });

    // Validar Hard Lock del instructor
    const lock = db.isInstructorLocked(instructor_id || sheet.instructor_id);
    if (lock.locked) {
      return res.status(403).json({ error: `No puede firmar/validar hojas de vuelo. ${lock.reason}` });
    }

    const updated = db.saveOrUpdateFlightProgress({
      ...sheet,
      estado: 'aprobado',
      firma_instructor: true,
      fecha_validacion: new Date().toISOString()
    });

    res.json(updated);
  });

  // Endpoint explícito de recalculación en cascada
  app.post('/api/flight-progress/recalculate-cascade', (req, res) => {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId es obligatorio' });

    const result = db.recalculateFlightCascade(studentId);
    res.json({
      message: `Recalculación en cascada ejecutada exitosamente para ${result.recalculatedCount} vuelos.`,
      records: result.records
    });
  });

  app.delete('/api/flight-progress/:id', (req, res) => {
    const ok = db.deleteFlightProgress(req.params.id);
    if (!ok) return res.status(404).json({ error: 'No se pudo eliminar el registro' });
    res.json({ success: true, message: 'Hoja eliminada y horas recalculadas en cascada.' });
  });

  // --- ITINERARIOS & DESPACHO ---
  app.get('/api/itineraries', (req, res) => {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const itineraries = db.getItineraries(role, userId);
    res.json(itineraries);
  });

  app.post('/api/itineraries', (req, res) => {
    const result = db.createItinerary(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.itinerary);
  });

  app.post('/api/itineraries/:id/accept', (req, res) => {
    const target = db.getItineraries().find(i => i.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Itinerario no encontrado' });
    if (target.publicado_8pm || target.solo_lectura) {
      return res.status(403).json({ error: 'El itinerario oficial publicado a las 8:00 PM es de solo lectura.' });
    }
    const { estudiante_nombre } = req.body;
    const updated = db.acceptItinerary(req.params.id, estudiante_nombre);
    if (!updated) return res.status(404).json({ error: 'Itinerario no encontrado' });
    res.json(updated);
  });

  app.post('/api/itineraries/:id/cancel', (req, res) => {
    const target = db.getItineraries().find(i => i.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Itinerario no encontrado' });
    if (target.publicado_8pm || target.solo_lectura) {
      return res.status(403).json({ error: 'El itinerario oficial publicado a las 8:00 PM es de solo lectura.' });
    }
    const { motivo, cancelado_por } = req.body;
    if (!motivo) return res.status(400).json({ error: 'El motivo de cancelación es obligatorio' });

    const updated = db.cancelItinerary(req.params.id, motivo, cancelado_por);
    if (!updated) return res.status(404).json({ error: 'Itinerario no encontrado' });
    res.json(updated);
  });

  app.post('/api/itineraries/:id/noshow', (req, res) => {
    const target = db.getItineraries().find(i => i.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Itinerario no encontrado' });
    if (target.publicado_8pm || target.solo_lectura) {
      return res.status(403).json({ error: 'El itinerario oficial publicado a las 8:00 PM es de solo lectura.' });
    }
    const { instructor_nombre } = req.body;
    const updated = db.markNoShow(req.params.id, instructor_nombre || 'Instructor CFI');
    if (!updated) return res.status(404).json({ error: 'Itinerario no encontrado' });
    res.json(updated);
  });

  app.post('/api/itineraries/:id/send-reminder', (req, res) => {
    const result = db.sendItineraryReminder(req.params.id);
    if (!result.itinerary) return res.status(404).json({ error: 'Itinerario no encontrado' });
    res.json(result);
  });

  app.patch('/api/itineraries/:id/status', (req, res) => {
    const target = db.getItineraries().find(i => i.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Itinerario no encontrado' });
    if (target.publicado_8pm || target.solo_lectura) {
      return res.status(403).json({ error: 'El itinerario oficial publicado a las 8:00 PM es de solo lectura.' });
    }
    const { estado, motivo } = req.body;
    if (!estado) return res.status(400).json({ error: 'Estado es obligatorio' });

    const updated = db.updateItineraryStatus(req.params.id, estado, motivo);
    if (!updated) return res.status(404).json({ error: 'Itinerario no encontrado' });

    res.json(updated);
  });

  app.patch('/api/itineraries/:id', (req, res) => {
    const { role, userId, userName, ...updates } = req.body || {};
    if (!role || !['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director de Escuela o el Instructor en Jefe pueden editar vuelos aceptados.' });
    }
    const result = db.updateItinerary(req.params.id, updates, { id: userId, nombre: userName, rol: role });
    if (result.error) {
      return res.status(result.error.includes('no encontrado') ? 404 : 400).json({ error: result.error });
    }
    res.json(result.itinerary);
  });

  app.delete('/api/itineraries/:id', (req, res) => {
    const role = (req.body?.role || req.query.role) as any;
    const userId = (req.body?.userId || req.query.userId) as string | undefined;
    const userName = (req.body?.userName || req.query.userName) as string | undefined;
    if (!role || !['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director de Escuela o el Instructor en Jefe pueden eliminar vuelos aceptados.' });
    }
    const result = db.deleteItinerary(req.params.id, { id: userId, nombre: userName, rol: role });
    if (!result.deleted) {
      return res.status(404).json({ error: result.error || 'No se pudo eliminar el vuelo' });
    }
    res.json({ success: true });
  });

  // --- SOLICITUDES DE VUELO (11 AM - 6 PM), DECISIÓN INSTRUCTOR EN JEFE (6 PM) & PUBLICACIÓN (8 PM) ---
  app.get('/api/flight-requests/schedule-status', (req, res) => {
    db.checkAndRunFlightRequestCutoffs();
    res.json(db.getFlightRequestScheduleStatus());
  });

  app.post('/api/flight-requests/simulated-time', (req, res) => {
    const { simulatedTime, role } = req.body;
    if (!['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director o Instructor en Jefe pueden ajustar la hora operativa de prueba.' });
    }
    try {
      const status = db.setFlightRequestSimulatedTime(simulatedTime ? String(simulatedTime) : null);
      res.json(status);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al configurar hora simulada' });
    }
  });

  app.get('/api/flight-requests', (req, res) => {
    db.checkAndRunFlightRequestCutoffs();
    const { instructorId, status, cycleDate, role, userId } = req.query;

    // Estudiantes no ven solicitudes crudas; solo acceden al itinerario oficial publicado a las 8:00 PM
    if (role === 'estudiante') {
      return res.json([]);
    }

    const effectiveInstructorId =
      role === 'instructor' && typeof userId === 'string' && userId
        ? userId
        : (typeof instructorId === 'string' && instructorId ? instructorId : undefined);

    const requests = db.getFlightRequests({
      instructorId: effectiveInstructorId,
      status: typeof status === 'string' && status ? (status as any) : undefined,
      cycleDate: typeof cycleDate === 'string' && cycleDate ? cycleDate : undefined
    });

    res.json(requests);
  });

  app.post('/api/flight-requests', (req, res) => {
    db.checkAndRunFlightRequestCutoffs();
    const {
      instructor_id,
      estudiante_id,
      fecha_vuelo,
      hora_inicio,
      hora_fin,
      duracion_horas,
      avion_matricula,
      avion_modelo,
      ruta,
      mision,
      notas_instructor,
      solicitado_por_rol
    } = req.body;

    if (!instructor_id || !estudiante_id || !fecha_vuelo || !hora_inicio || !hora_fin || !avion_matricula || !mision) {
      return res.status(400).json({
        error: 'Instructor, estudiante, fecha, horario, matrícula de aeronave y misión son campos obligatorios.'
      });
    }

    const result = db.createFlightRequest({
      instructor_id,
      estudiante_id,
      fecha_vuelo,
      hora_inicio,
      hora_fin,
      duracion_horas: Number(duracion_horas) || 1.5,
      avion_matricula,
      avion_modelo,
      ruta,
      mision,
      notas_instructor,
      solicitado_por_rol
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result.request);
  });

  app.post('/api/flight-requests/:id/decision', (req, res) => {
    const { decision, chiefId, chiefName, chiefRole, motivo_rechazo } = req.body;
    if (decision !== 'aprobada' && decision !== 'rechazada') {
      return res.status(400).json({ error: 'La decisión debe ser "aprobada" o "rechazada".' });
    }

    const chiefUser = chiefId ? db.getUserById(chiefId) : null;
    const effectiveChief = chiefUser
      ? { id: chiefUser.id, nombre: chiefUser.nombre, rol: chiefUser.rol }
      : { id: chiefId || 'usr_chief_bustamante', nombre: chiefName || 'Cap. A. Bustamante', rol: chiefRole };

    const result = db.decideFlightRequest(req.params.id, decision, effectiveChief, motivo_rechazo);
    if (result.error) {
      return res.status(403).json({ error: result.error });
    }

    res.json(result.request);
  });

  app.patch('/api/flight-requests/:id', (req, res) => {
    const { role, userId, userName, ...updates } = req.body || {};
    if (!role || !['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director de Escuela o el Instructor en Jefe pueden editar vuelos aceptados.' });
    }
    const result = db.updateFlightRequest(req.params.id, updates, { id: userId, nombre: userName, rol: role });
    if (result.error) {
      return res.status(result.error.includes('no encontrada') ? 404 : 400).json({ error: result.error });
    }
    res.json(result.request);
  });

  app.delete('/api/flight-requests/:id', (req, res) => {
    const role = (req.body?.role || req.query.role) as any;
    const userId = (req.body?.userId || req.query.userId) as string | undefined;
    const userName = (req.body?.userName || req.query.userName) as string | undefined;
    if (!role || !['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director de Escuela o el Instructor en Jefe pueden eliminar vuelos aceptados.' });
    }
    const result = db.deleteFlightRequest(req.params.id, { id: userId, nombre: userName, rol: role });
    if (!result.deleted) {
      return res.status(404).json({ error: result.error || 'No se pudo eliminar la solicitud' });
    }
    res.json({ success: true });
  });

  app.post('/api/flight-requests/dispatch-6pm', (req, res) => {
    const { role } = req.body || {};
    if (!['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director o Instructor en Jefe pueden ejecutar el corte de las 6:00 PM.' });
    }
    const result = db.runSixPmDispatchBatch(true);
    res.json(result);
  });

  app.post('/api/flight-requests/publish-8pm', (req, res) => {
    const { role, publishedBy } = req.body || {};
    if (!['instructor_en_jefe', 'escuela', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Solo el Director o Instructor en Jefe pueden publicar el itinerario oficial de las 8:00 PM.' });
    }
    const result = db.runEightPmPublishBatch(true, publishedBy || 'Cap. A. Bustamante - Instructor en Jefe');
    res.json(result);
  });

  app.get('/api/published-itineraries', (req, res) => {
    db.checkAndRunFlightRequestCutoffs();
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    const allowedRoles = ['estudiante', 'instructor', 'instructor_en_jefe', 'escuela', 'admin'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(403).json({
        restricted: true,
        error: 'El itinerario diario publicado a las 8:00 PM es visible únicamente para instructores, estudiantes y dirección.',
        publications: [],
        itineraries: []
      });
    }
    res.json(db.getPublishedDailyItineraries());
  });

  // --- METEOROLOGÍA AERONÁUTICA (METAR & TAF EN TIEMPO REAL PANAMÁ & LOOKUP) ---
  app.get('/api/weather/panama', async (req, res) => {
    try {
      const data = await getPanamaWeather();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar meteorología de Panamá', details: err?.message });
    }
  });

  app.get('/api/weather/lookup', async (req, res) => {
    try {
      const { icao } = req.query;
      if (!icao || typeof icao !== 'string') {
        return res.status(400).json({ error: 'El parámetro icao es requerido' });
      }
      const icaoList = icao.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const data = await getPanamaWeather(icaoList);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar aeropuerto', details: err?.message });
    }
  });

  // ==========================================
  // EMAIL NOTIFICATION API ROUTES
  // ==========================================
  
  // Obtener logs de correos electrónicos con filtrado de seguridad por rol
  app.get('/api/email/logs', (req, res) => {
    let logs = db.getEmailLogs();
    const role = (req.query.role as string || '').toLowerCase().trim();

    // El rol taller (mantenimiento) y los instructores NO pueden ver notificaciones de cobros, depósitos o pagos de estudiantes
    if (role === 'mantenimiento' || role === 'instructor' || role === 'instructor_en_jefe') {
      const financialEvents = [
        'pago_reportado',
        'pago_confirmado',
        'pago_rechazado',
        'pago_tarjeta',
        'link_pago_creado',
        'link_pago_completado',
        'alerta_saldo_bajo'
      ];

      logs = logs.filter(log => {
        if (financialEvents.includes(log.evento)) return false;
        const textToScan = `${log.evento || ''} ${log.asunto || ''} ${log.cuerpo_texto || ''} ${log.destinatario_tipo || ''}`.toLowerCase();
        if (/\b(pago|pagos|cobro|cobros|deposito|depósito|depositos|depósitos|saldo|saldos|ach|recibo|arancel|tarjeta de crédito)\b/i.test(textToScan)) {
          return false;
        }
        return true;
      });
    }

    res.json(logs);
  });

  // Obtener configuración del servicio de email
  app.get('/api/email/config', (req, res) => {
    const config = emailService.getConfig();
    res.json({
      success: true,
      config,
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasSendgridKey: Boolean(process.env.SENDGRID_API_KEY),
      hasSmtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
    });
  });

  // Actualizar configuración del servicio de email
  app.post('/api/email/config', (req, res) => {
    emailService.updateConfig(req.body);
    res.json({
      success: true,
      message: 'Configuración de correo electrónico actualizada exitosamente',
      config: emailService.getConfig()
    });
  });

  // --- BRANDING Y PLANTILLAS HTML DE CORREO PERSONALIZABLES ---
  app.get('/api/email/brand-config', (req, res) => {
    res.json({
      success: true,
      brandConfig: emailService.getBrandConfig()
    });
  });

  app.post('/api/email/brand-config', (req, res) => {
    const updated = emailService.updateBrandConfig(req.body);
    res.json({
      success: true,
      message: 'Identidad de marca actualizada exitosamente',
      brandConfig: updated
    });
  });

  app.post('/api/email/brand-config/reset', (req, res) => {
    const reset = emailService.resetBrandConfig();
    res.json({
      success: true,
      message: 'Identidad de marca restablecida a los valores por defecto',
      brandConfig: reset
    });
  });

  app.get('/api/email/templates', (req, res) => {
    res.json({
      success: true,
      templates: emailService.getTemplates()
    });
  });

  app.get('/api/email/templates/:key', (req, res) => {
    const template = emailService.getTemplate(req.params.key as any);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json({ success: true, template });
  });

  app.post('/api/email/templates/:key', (req, res) => {
    const { name, subject, subjectTemplate, html, htmlTemplate, description } = req.body;
    const updated = emailService.updateTemplate(req.params.key as any, {
      name,
      description,
      subjectTemplate: subjectTemplate || subject,
      htmlTemplate: htmlTemplate || html
    });
    if (!updated) {
      return res.status(404).json({ error: 'Plantilla no encontrada para actualizar' });
    }
    res.json({
      success: true,
      message: 'Plantilla de correo actualizada correctamente',
      template: updated
    });
  });

  app.post('/api/email/templates/:key/reset', (req, res) => {
    const reset = emailService.resetTemplate(req.params.key as any);
    if (!reset) {
      return res.status(404).json({ error: 'Plantilla no encontrada para restablecer' });
    }
    res.json({
      success: true,
      message: 'Plantilla restablecida a la versión original de fábrica',
      template: reset
    });
  });

  app.post('/api/email/preview-render', (req, res) => {
    const { key, customHtml, customSubject, customBrand, sampleVariables } = req.body;
    const rendered = emailService.renderFlightEmail(
      key || 'flight_created',
      sampleVariables || {
        student_name: 'Alex Montoya',
        instructor_name: 'Cap. Gabriel Ramos',
        instructor_phone: '+507 6890-1234',
        airplane_reg: 'HP-1842XP',
        airplane_model: 'Cessna 172SP Skyhawk G1000',
        flight_date: '2025-05-18',
        start_time: '08:00',
        end_time: '10:00',
        mission: 'Navegación VFR y Maniobras de Precisión',
        deadline_hour: '11:00 AM',
        cancellation_reason: 'Meteorología adversa (baja visibilidad en ruta)',
        cancelled_by: 'Cap. Gabriel Ramos',
        reminder_count: '2',
        minutes_remaining: '45'
      },
      {
        customHtml,
        customSubject,
        customBrand
      }
    );
    res.json({
      success: true,
      rendered
    });
  });

  // Probar envío de correo electrónico en vivo
  app.post('/api/email/test-connection', async (req, res) => {
    const { toEmail, recipientName } = req.body;
    const targetEmail = toEmail || 'estudiante@skyopsacademy.com';
    const targetName = recipientName || 'Administrador de SkyOps';

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-top: 0;">✈️ SkyOps Flight Academy - Prueba de Conexión de Correo</h2>
        <p>Hola <strong>${targetName}</strong>,</p>
        <p>Este es un correo de prueba en vivo para verificar la conectividad del sistema de despacho automático de vuelos.</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
          <p style="margin: 0; color: #34d399; font-weight: 700;">🟢 Estado del Sistema: Operativo</p>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Fecha y Hora: ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">SkyOps Aviation • Centro de Despacho y Operaciones de Vuelo</p>
      </div>
    `;

    const result = await emailService.sendEmail({
      toEmail: targetEmail,
      recipientName: targetName,
      subject: '✈️ Prueba de Conexión de Correo - SkyOps Flight Academy',
      htmlContent: testHtml,
      textContent: `SkyOps Flight Academy - Prueba de Conexión. Sistema operativo a las ${new Date().toLocaleString()}`,
      eventType: 'notificacion_general'
    });

    // Registrar en logs
    db.sendEmailNotification({
      destinatario_tipo: 'admin',
      destinatario_nombre: targetName,
      destinatario_email: targetEmail,
      evento: 'notificacion_general',
      asunto: '✈️ Prueba de Conexión de Correo - SkyOps Flight Academy',
      cuerpo_html: testHtml,
      cuerpo_texto: `Prueba de conectividad a ${targetEmail}`
    });

    res.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      status: result.status,
      error: result.error
    });
  });

  // Enviar correo directo / manual
  app.post('/api/email/send-direct', async (req, res) => {
    const { toEmail, recipientName, subject, message, recipientType } = req.body;
    if (!toEmail || !subject || !message) {
      return res.status(400).json({ error: 'Correo de destino, asunto y mensaje son obligatorios.' });
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #ffffff; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="background: #0284c7; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">SkyOps Flight Academy</h2>
          <p style="color: #e0f2fe; margin: 4px 0 0 0; font-size: 13px;">Comunicación Oficial de Operaciones</p>
        </div>
        <p>Estimado/a <strong>${recipientName || 'Piloto'}</strong>,</p>
        <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 16px 0; white-space: pre-wrap;">${message}</div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">SkyOps Aviation • Este correo fue enviado desde el portal de despacho.</p>
      </div>
    `;

    const notif = db.sendEmailNotification({
      destinatario_tipo: recipientType || 'estudiante',
      destinatario_nombre: recipientName || 'Destinatario',
      destinatario_email: toEmail,
      evento: 'notificacion_general',
      asunto: subject,
      cuerpo_html: htmlContent,
      cuerpo_texto: message
    });

    res.status(201).json({ success: true, notification: notif });
  });

  // --- REGLAS DE NOTIFICACIÓN POR ROL ---
  app.get('/api/email/rules', (req, res) => {
    try {
      const rules = db.getRoleNotificationRules();
      res.json({ success: true, rules });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reglas de notificación', details: err.message });
    }
  });

  app.patch('/api/email/rules/:id', (req, res) => {
    try {
      const updated = db.updateRoleNotificationRule(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Regla no encontrada' });
      res.json({ success: true, rule: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar regla', details: err.message });
    }
  });

  app.post('/api/email/rules/reset', (req, res) => {
    try {
      const rules = db.resetRoleNotificationRules();
      res.json({ success: true, message: 'Reglas restauradas a valores predeterminados', rules });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al reiniciar reglas', details: err.message });
    }
  });

  // Marcar correo como leído
  app.post('/api/email/mark-read', (req, res) => {
    try {
      const { id } = req.body;
      const success = db.markEmailAsRead(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al marcar correo como leído', details: err.message });
    }
  });

  // Marcar todos los correos como leídos
  app.post('/api/email/mark-all-read', (req, res) => {
    try {
      const { recipientEmail } = req.body;
      const count = db.markAllEmailsAsRead(recipientEmail);
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al marcar correos como leídos', details: err.message });
    }
  });

  // Disparo manual/prueba de alertas operacionales a los roles correspondientes
  app.post('/api/email/dispatch-alert', (req, res) => {
    try {
      const { alertType, targetId, aircraftReg, details, studentId, userId } = req.body;

      if (alertType === 'low_balance') {
        const notifs = db.sendLowBalanceEmailAlert(studentId || targetId || 'usr_est_daniel');
        return res.json({ success: true, count: notifs.length, notifications: notifs });
      }

      if (alertType === 'medical') {
        const notifs = db.sendMedicalExpirationEmailAlert(userId || targetId || 'usr_est_daniel');
        return res.json({ success: true, count: notifs.length, notifications: notifs });
      }

      if (alertType === 'license') {
        const notifs = db.sendLicenseExpirationEmailAlert(userId || targetId || 'usr_inst_valeria');
        return res.json({ success: true, count: notifs.length, notifications: notifs });
      }

      if (alertType === 'maintenance') {
        const notifs = db.sendAircraftMaintenanceEmailAlert(aircraftReg || 'HP-1721SP', details);
        return res.json({ success: true, count: notifs.length, notifications: notifs });
      }

      if (alertType === 'test_payment') {
        const student = db.getUserById(studentId || 'usr_est_daniel');
        db.sendStudentPaymentSubmittedNotice({
          id: 'tx_test_' + Date.now(),
          estudiante_id: student?.id || 'usr_est_daniel',
          estudiante_nombre: student?.nombre || 'Daniel Alvarado',
          tipo: 'abono',
          monto: 350.00,
          saldo_resultante: 350.00,
          fecha: new Date().toISOString(),
          concepto: 'Abono ACH',
          referencia_ach: 'ACH-BG-' + Math.floor(100000 + Math.random() * 900000),
          estado_aprobacion: 'pendiente_revision_bancaria',
          comprobado_banco: false,
          banco_origen: 'Banco General',
          creado_por: 'Estudiante'
        });
        return res.json({ success: true, message: 'Notificación de pago reportado enviada a Contabilidad, Alumno y Admin.' });
      }

      if (alertType === 'test_approval') {
        const student = db.getUserById(studentId || 'usr_est_daniel');
        db.sendPaymentApprovedNotice({
          id: 'tx_test_appr_' + Date.now(),
          estudiante_id: student?.id || 'usr_est_daniel',
          estudiante_nombre: student?.nombre || 'Daniel Alvarado',
          tipo: 'abono',
          monto: 450.00,
          saldo_resultante: 720.00,
          fecha: new Date().toISOString(),
          concepto: 'Abono ACH',
          referencia_ach: 'BG-CONF-88912',
          referencia_bancaria_confirmada: 'BG-CONF-88912',
          estado_aprobacion: 'aprobado',
          comprobado_banco: true,
          banco_origen: 'Banco General',
          creado_por: 'Lic. Carlos Mendoza (Contabilidad)'
        }, 'Lic. Carlos Mendoza (Contabilidad)', 720.00);
        return res.json({ success: true, message: 'Confirmación de pago acreditado enviada al Estudiante y Contabilidad.' });
      }

      if (alertType === 'test_flight') {
        const student = db.getUserById('usr_est_daniel');
        const instructor = db.getUserById('usr_inst_valeria');
        db.createItinerary({
          estudiante_id: student?.id || 'usr_est_daniel',
          estudiante_nombre: student?.nombre || 'Daniel Alvarado',
          estudiante_telefono: student?.telefono || '+507 6899-1234',
          instructor_id: instructor?.id || 'usr_inst_valeria',
          instructor_nombre: instructor?.nombre || 'Cap. Valeria Benítez',
          instructor_telefono: instructor?.telefono || '+507 6711-2233',
          avion_matricula: 'HP-1721SP',
          avion_modelo: 'Cessna 172SP',
          fecha: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          hora_inicio: '10:00',
          hora_fin: '12:00',
          mision: 'Fase IV: Navegación de Vuelo por Instrumentos & Radioayudas VOR',
          estado: 'pendiente_confirmacion'
        });
        return res.json({ success: true, message: 'Asignación de vuelo despachada a Estudiante, Instructor y Despacho.' });
      }

      return res.status(400).json({ error: 'Tipo de alerta no reconocido.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al despachar alerta', details: err.message });
    }
  });

  // Escaneo total de alertas del sistema
  app.post('/api/email/scan-and-alert', (req, res) => {
    try {
      const stats = db.scanAndDispatchAllAlerts();
      res.json({
        success: true,
        message: `Escaneo completado. Se despacharon ${stats.totalSent} notificaciones a los roles correspondientes.`,
        stats
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error durante el escaneo de alertas', details: err.message });
    }
  });

  // ==========================================
  // REPORTE DE HORAS - MOTOR HOJA DE CÁLCULO (EXCEL / GOOGLE SHEETS)
  // ==========================================
  app.get('/api/spreadsheet/hours', (req, res) => {
    try {
      const userRole = (req.headers['x-user-role'] || req.query.role || req.query.user_role) as string;
      if (userRole === 'mantenimiento' || userRole === 'instructor' || userRole === 'estudiante') {
        return res.status(403).json({ error: 'Acceso denegado: El rol de Taller de Aeronaves no tiene autorización para acceder a reportes de horas de contabilidad.' });
      }
      const workbook = db.getHoursSpreadsheet();
      res.json({ success: true, workbook });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener hoja de cálculo', details: err.message });
    }
  });

  app.put('/api/spreadsheet/hours', (req, res) => {
    try {
      const workbook = req.body;
      if (!workbook || !workbook.sheets) {
        return res.status(400).json({ error: 'Estructura de libro de cálculo inválida' });
      }
      const saved = db.saveHoursSpreadsheet(workbook);
      res.json({ success: true, message: 'Hoja de cálculo guardada correctamente', workbook: saved });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al guardar hoja de cálculo', details: err.message });
    }
  });

  app.post('/api/spreadsheet/hours/sync', (req, res) => {
    try {
      const synced = db.syncHoursSpreadsheetFromFlights();
      res.json({ success: true, message: 'Hoja de cálculo sincronizada con los vuelos de la base de datos', workbook: synced });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al sincronizar hoja de cálculo', details: err.message });
    }
  });

  app.post('/api/spreadsheet/hours/reset', (req, res) => {
    try {
      const reset = db.resetHoursSpreadsheet();
      res.json({ success: true, message: 'Plantilla de hoja de cálculo restablecida', workbook: reset });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al restablecer hoja de cálculo', details: err.message });
    }
  });

  // ==========================================
  // DASHBOARD FINANCIERO Y RENTABILIDAD
  // ==========================================
  app.get('/api/finances/summary', (req, res) => {
    try {
      const anio = req.query.anio ? Number(req.query.anio) : 2026;
      const summary = db.getFinancialDashboardSummary(anio);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener resumen financiero', details: err.message });
    }
  });

  app.get('/api/finances/expenses', (req, res) => {
    try {
      const { categoria, anio, mes, matricula } = req.query;
      const expenses = db.getOperatingExpenses({
        categoria: typeof categoria === 'string' ? categoria : undefined,
        anio: anio ? Number(anio) : undefined,
        mes: typeof mes === 'string' ? mes : undefined,
        matricula: typeof matricula === 'string' ? matricula : undefined
      });
      res.json(expenses);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener gastos operativos', details: err.message });
    }
  });

  app.get('/api/finances/expenses/:id', (req, res) => {
    const expense = db.getOperatingExpenseById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Gasto operativo no encontrado' });
    res.json(expense);
  });

  app.post('/api/finances/expenses', (req, res) => {
    try {
      const { fecha, categoria, concepto, monto, proveedor, metodo_pago } = req.body;
      if (!fecha || !categoria || !concepto || monto === undefined || !proveedor || !metodo_pago) {
        return res.status(400).json({ error: 'Fecha, categoría, concepto, monto, proveedor y método de pago son requeridos.' });
      }

      const created = db.addOperatingExpense({
        ...req.body,
        monto: Number(monto)
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al registrar gasto operativo', details: err.message });
    }
  });

  app.put('/api/finances/expenses/:id', (req, res) => {
    try {
      const updated = db.updateOperatingExpense(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar gasto operativo', details: err.message });
    }
  });

  app.delete('/api/finances/expenses/:id', (req, res) => {
    try {
      const deleted = db.deleteOperatingExpense(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json({ success: true, message: 'Gasto operativo eliminado exitosamente' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al eliminar gasto operativo', details: err.message });
    }
  });

  // ==========================================
  // RUTAS API: WHATSAPP BUSINESS & AUTOMATIZACIÓN DE DISPARADORES
  // ==========================================
  app.get('/api/whatsapp/config', (req, res) => {
    try {
      const config = db.getWhatsAppConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener configuración de WhatsApp', details: err.message });
    }
  });

  app.put('/api/whatsapp/config', (req, res) => {
    try {
      const updated = db.updateWhatsAppConfig(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar configuración de WhatsApp', details: err.message });
    }
  });

  app.post('/api/whatsapp/verify-connection', (req, res) => {
    try {
      const result = db.verifyWhatsAppConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al verificar conexión de WhatsApp', details: err.message });
    }
  });

  app.post('/api/whatsapp/generate-qr', (req, res) => {
    try {
      const result = db.generateWhatsAppQR();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al generar código QR de WhatsApp', details: err.message });
    }
  });

  app.get('/api/whatsapp/triggers', (req, res) => {
    try {
      const triggers = db.getWhatsAppTriggers();
      res.json(triggers);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener disparadores de WhatsApp', details: err.message });
    }
  });

  app.get('/api/whatsapp/triggers/:id', (req, res) => {
    try {
      const trigger = db.getWhatsAppTriggerById(req.params.id);
      if (!trigger) return res.status(404).json({ error: 'Disparador no encontrado' });
      res.json(trigger);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener disparador', details: err.message });
    }
  });

  app.put('/api/whatsapp/triggers/:id', (req, res) => {
    try {
      const updated = db.updateWhatsAppTrigger(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar disparador', details: err.message });
    }
  });

  app.post('/api/whatsapp/triggers/:id/toggle', (req, res) => {
    try {
      const { activo } = req.body;
      const updated = db.toggleWhatsAppTrigger(req.params.id, activo);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al cambiar estado del disparador', details: err.message });
    }
  });

  app.post('/api/whatsapp/test-message', (req, res) => {
    try {
      const { destinatario_nombre, destinatario_telefono, mensaje, trigger_id } = req.body;
      if (!destinatario_telefono || !mensaje) {
        return res.status(400).json({ error: 'Teléfono de destino y mensaje son obligatorios' });
      }

      const log = db.sendTestWhatsAppMessage({
        destinatario_nombre: destinatario_nombre || 'Destinatario de Prueba',
        destinatario_telefono,
        mensaje,
        trigger_id
      });
      res.status(201).json(log);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al enviar mensaje de prueba', details: err.message });
    }
  });

  app.get('/api/whatsapp/logs', (req, res) => {
    try {
      const { trigger_id, estado, search } = req.query;
      const logs = db.getWhatsAppLogs({
        trigger_id: trigger_id as string,
        estado: estado as string,
        search: search as string
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener logs de WhatsApp', details: err.message });
    }
  });

  app.post('/api/whatsapp/execute-triggers', (req, res) => {
    try {
      const result = db.executeScheduledTriggers();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al ejecutar disparadores automáticos', details: err.message });
    }
  });

  // ==========================================
  // AUDITORÍA Y TRAZABILIDAD REGULATORIA (AAC)
  // ==========================================

  // Obtener logs de auditoría con filtros avanzados
  app.get('/api/audit-logs', (req, res) => {
    try {
      const userRole = (req.headers['x-user-role'] || req.query.role || req.query.user_role) as string;
      if (userRole === 'mantenimiento' || userRole === 'instructor') {
        return res.status(403).json({ error: 'Acceso denegado: El rol de Taller de Aeronaves no tiene autorización para acceder a la sección de auditoría.' });
      }

      const {
        modulo,
        accion,
        rol,
        usuario_id,
        studentId,
        instructor_id,
        tipo_entidad,
        severidad,
        fecha_desde,
        fecha_hasta,
        busqueda
      } = req.query;

      const logs = db.getAuditLogs({
        modulo: modulo as any,
        accion: accion as any,
        rol: rol as any,
        usuario_id: usuario_id as string,
        studentId: studentId as string,
        instructor_id: instructor_id as string,
        tipo_entidad: tipo_entidad as any,
        severidad: severidad as any,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        busqueda: busqueda as string
      });

      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar logs de auditoría', details: err.message });
    }
  });

  // Estadísticas del subsistema de auditoría
  app.get('/api/audit-logs/stats', (req, res) => {
    try {
      const userRole = (req.headers['x-user-role'] || req.query.role || req.query.user_role) as string;
      if (userRole === 'mantenimiento' || userRole === 'instructor') {
        return res.status(403).json({ error: 'Acceso denegado: El rol de Taller de Aeronaves no tiene autorización para acceder a estadísticas de auditoría.' });
      }

      const stats = db.getAuditStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener estadísticas de auditoría', details: err.message });
    }
  });

  // Verificación de integridad criptográfica SHA-256
  app.get('/api/audit-logs/verify', (req, res) => {
    try {
      const userRole = (req.headers['x-user-role'] || req.query.role || req.query.user_role) as string;
      if (userRole === 'mantenimiento' || userRole === 'instructor') {
        return res.status(403).json({ error: 'Acceso denegado: El rol de Taller de Aeronaves no tiene autorización para acceder a verificación de auditoría.' });
      }

      const verification = db.verifyAuditTrailIntegrity();
      res.json(verification);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al verificar integridad de la bitácora', details: err.message });
    }
  });

  // Exportar reporte oficial para Inspectores AAC Panamá
  app.get('/api/audit-logs/export', (req, res) => {
    try {
      const {
        modulo,
        accion,
        rol,
        usuario_id,
        studentId,
        instructor_id,
        tipo_entidad,
        severidad,
        fecha_desde,
        fecha_hasta,
        busqueda
      } = req.query;

      const report = db.exportAuditReport({
        modulo: modulo as any,
        accion: accion as any,
        rol: rol as any,
        usuario_id: usuario_id as string,
        studentId: studentId as string,
        instructor_id: instructor_id as string,
        tipo_entidad: tipo_entidad as any,
        severidad: severidad as any,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        busqueda: busqueda as string
      });

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al exportar informe oficial de auditoría', details: err.message });
    }
  });

  // Obtener log individual por ID
  app.get('/api/audit-logs/:id', (req, res) => {
    try {
      const log = db.getAuditLogById(req.params.id);
      if (!log) return res.status(404).json({ error: 'Registro de auditoría no encontrado' });
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar registro de auditoría', details: err.message });
    }
  });

  // Crear registro de auditoría explícito
  app.post('/api/audit-logs', (req, res) => {
    try {
      const {
        usuario_id,
        usuario_nombre,
        usuario_rol,
        usuario_correo,
        modulo,
        accion,
        entidad_tipo,
        entidad_id,
        descripcion,
        detalles_cambio,
        estudiante_afectado_nombre,
        estudiante_afectado_id,
        instructor_afectado_nombre,
        referencia_normativa_aac,
        severidad,
        ip_origen,
        dispositivo
      } = req.body;

      if (!usuario_id || !usuario_nombre || !modulo || !accion || !entidad_tipo || !entidad_id || !descripcion) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios para el registro de auditoría (usuario_id, usuario_nombre, modulo, accion, entidad_tipo, entidad_id, descripcion).'
        });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '190.140.88.10';
      const userAgent = req.headers['user-agent'] || 'SkyOps Web Terminal';

      const newLog = db.addAuditLog({
        usuario_id,
        usuario_nombre,
        usuario_rol: usuario_rol || 'admin',
        usuario_correo,
        modulo,
        accion,
        entidad_tipo,
        entidad_id,
        descripcion,
        detalles_cambio: detalles_cambio || [],
        estudiante_afectado_nombre,
        estudiante_afectado_id,
        instructor_afectado_nombre,
        referencia_normativa_aac: referencia_normativa_aac || 'RAC 141 / AAC Panamá',
        severidad: severidad || 'info',
        ip_origen: ip_origen || clientIp,
        dispositivo: dispositivo || userAgent
      });

      res.status(201).json(newLog);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al registrar evento de auditoría', details: err.message });
    }
  });

  // ==========================================
  // TALLER AERONÁUTICO & MANTENIMIENTO DE FLOTA (OMA / TMA)
  // ==========================================

  // Obtener lista completa de aeronaves y condición técnica
  app.get('/api/maintenance/aircraft', (req, res) => {
    try {
      const records = db.getAircraftMaintenanceRecords();
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar récords de mantenimiento de flota', details: err.message });
    }
  });

  // Obtener récord de mantenimiento individual por matrícula
  app.get('/api/maintenance/aircraft/:matricula', (req, res) => {
    try {
      const record = db.getAircraftMaintenanceRecord(req.params.matricula);
      if (!record) {
        return res.status(404).json({ error: 'Récord de mantenimiento no encontrado para esta matrícula' });
      }
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar récord de aeronave', details: err.message });
    }
  });

  // Actualizar récord de aeronave (horas, vencimientos, etc.)
  app.put('/api/maintenance/aircraft/:matricula', (req, res) => {
    try {
      const updated = db.updateAircraftMaintenanceRecord(req.params.matricula, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Aeronave no encontrada' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar récord de mantenimiento', details: err.message });
    }
  });

  // Activar o desactivar Hard Lock AOG de despacho
  app.post('/api/maintenance/aircraft/:matricula/ground-lock', (req, res) => {
    try {
      const {
        locked,
        reason,
        authorizedBy,
        licenciaTMA,
        resetOverdueCounters,
        resolveAogSquawks,
        nextCondition,
        ubicacion_hangar
      } = req.body;
      const updated = db.toggleAircraftGroundLock(
        req.params.matricula,
        Boolean(locked),
        reason,
        authorizedBy,
        licenciaTMA,
        {
          resetOverdueCounters,
          resolveAogSquawks,
          nextCondition,
          ubicacion_hangar
        }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Aeronave no encontrada' });
      }
      res.json({
        success: true,
        aircraft: updated,
        message: locked
          ? `Aeronave ${req.params.matricula} bloqueada en tierra (AOG) por Taller.`
          : `Aeronave ${req.params.matricula} desbloqueada y habilitada para despacho operacional.`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al modificar bloqueo de despacho', details: err.message });
    }
  });

  // Órdenes de Trabajo (Work Orders)
  app.get('/api/maintenance/work-orders', (req, res) => {
    try {
      const { matricula, estado, tipo } = req.query;
      const orders = db.getMaintenanceWorkOrders({
        matricula: matricula ? String(matricula) : undefined,
        estado: estado as any,
        tipo: tipo as any
      });
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar órdenes de trabajo', details: err.message });
    }
  });

  app.get('/api/maintenance/work-orders/:id', (req, res) => {
    try {
      const order = db.getMaintenanceWorkOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener orden de trabajo', details: err.message });
    }
  });

  app.post('/api/maintenance/work-orders', (req, res) => {
    try {
      const newOrder = db.createMaintenanceWorkOrder(req.body);
      res.status(201).json(newOrder);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al emitir orden de trabajo', details: err.message });
    }
  });

  app.put('/api/maintenance/work-orders/:id', (req, res) => {
    try {
      const updated = db.updateMaintenanceWorkOrder(req.params.id, req.body, req.body.updatedBy);
      if (!updated) {
        return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar orden de trabajo', details: err.message });
    }
  });

  // Certificación y Retorno al Servicio (RTS - RAC 43 / RAC 145)
  app.post('/api/maintenance/work-orders/:id/return-to-service', (req, res) => {
    try {
      const { firmado_por, licencia_firmante, declaracion, horas_salida, reset50h, reset100h, resolveAogSquawks } = req.body;
      if (!firmado_por || !licencia_firmante) {
        return res.status(400).json({ error: 'El nombre del técnico certificador y su licencia TMA son obligatorios según RAC 43.' });
      }
      const result = db.returnAircraftToService(req.params.id, {
        firmado_por,
        licencia_firmante,
        declaracion,
        horas_salida: horas_salida ? Number(horas_salida) : undefined,
        reset50h: typeof reset50h === 'boolean' ? reset50h : undefined,
        reset100h: typeof reset100h === 'boolean' ? reset100h : undefined,
        resolveAogSquawks: typeof resolveAogSquawks === 'boolean' ? resolveAogSquawks : undefined
      });
      res.json({
        success: true,
        workOrder: result.workOrder,
        aircraft: result.aircraft,
        message: `Certificación RTS aprobada con éxito para ${result.workOrder.matricula}. Aeronave retornada al servicio.`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al certificar retorno al servicio', details: err.message });
    }
  });

  // Discrepancias / Novedades Mecánicas (Squawks)
  app.get('/api/maintenance/squawks', (req, res) => {
    try {
      const { matricula, estado, severidad } = req.query;
      const squawks = db.getMaintenanceSquawks({
        matricula: matricula ? String(matricula) : undefined,
        estado: estado as any,
        severidad: severidad as any
      });
      res.json(squawks);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar novedades de mantenimiento', details: err.message });
    }
  });

  app.post('/api/maintenance/squawks', (req, res) => {
    try {
      const newSquawk = db.createMaintenanceSquawk(req.body);
      res.status(201).json(newSquawk);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al registrar novedad técnica', details: err.message });
    }
  });

  app.put('/api/maintenance/squawks/:id/resolve', (req, res) => {
    try {
      const { accion_correctiva, resuelto_por, resuelto_por_licencia, estado } = req.body;
      if (!accion_correctiva || !resuelto_por) {
        return res.status(400).json({ error: 'Acción correctiva y responsable son requeridos' });
      }
      const resolved = db.resolveMaintenanceSquawk(req.params.id, {
        accion_correctiva,
        resuelto_por,
        resuelto_por_licencia: resuelto_por_licencia || 'TMA Habilitado',
        estado: estado || 'resuelto'
      });
      if (!resolved) {
        return res.status(404).json({ error: 'Discrepancia técnica no encontrada' });
      }
      res.json(resolved);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al resolver novedad', details: err.message });
    }
  });

  // Inventario de Repuestos & Consumibles de Hangar
  app.get('/api/maintenance/parts', (req, res) => {
    try {
      const parts = db.getMaintenanceParts();
      res.json(parts);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar almacén de repuestos', details: err.message });
    }
  });

  app.post('/api/maintenance/parts/:id/adjust', (req, res) => {
    try {
      const { delta, motivo, updatedBy } = req.body;
      const numDelta = Number(delta);
      if (isNaN(numDelta)) {
        return res.status(400).json({ error: 'El valor de ajuste debe ser un número válido' });
      }
      const updated = db.updateMaintenancePartStock(req.params.id, numDelta, motivo, updatedBy);
      if (!updated) {
        return res.status(404).json({ error: 'Parte no encontrada en almacén' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al ajustar inventario', details: err.message });
    }
  });

  // Directivas de Aeronavegabilidad (ADs) & Boletines de Servicio
  app.get('/api/maintenance/directives', (req, res) => {
    try {
      const { modelo } = req.query;
      const ads = db.getAirworthinessDirectives(modelo as string);
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar directivas ADs', details: err.message });
    }
  });

  app.put('/api/maintenance/directives/:id', (req, res) => {
    try {
      const updated = db.updateAirworthinessDirective(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Directiva no encontrada' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar directiva', details: err.message });
    }
  });

  // --- HISTORIAL DE ENTRADA Y SALIDA DE AERONAVES (TRAZABILIDAD DE BITÁCORAS) ---
  app.get('/api/maintenance/movements', (req, res) => {
    try {
      const { matricula, tipo, search } = req.query;
      const movements = db.getAircraftMovements({
        matricula: matricula ? String(matricula) : undefined,
        tipo: tipo as any,
        search: search ? String(search) : undefined
      });
      res.json(movements);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar historial de movimientos de aeronaves', details: err.message });
    }
  });

  app.get('/api/maintenance/movements/:id', (req, res) => {
    try {
      const mov = db.getAircraftMovementById(req.params.id);
      if (!mov) {
        return res.status(404).json({ error: 'Registro de movimiento no encontrado' });
      }
      res.json(mov);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar movimiento de aeronave', details: err.message });
    }
  });

  app.post('/api/maintenance/movements', (req, res) => {
    try {
      const { matricula, tipo, fecha, tach_hobbs, motivo_principal, tecnico_responsable, licencia_tma } = req.body;
      if (!matricula || !tipo || !fecha || tach_hobbs === undefined || !motivo_principal) {
        return res.status(400).json({
          error: 'Matrícula, tipo (entrada/salida), fecha, tacómetro/hobbs y motivo principal son obligatorios.'
        });
      }

      const newMovement = db.createAircraftMovement(req.body, req.body.createdBy);
      res.status(201).json(newMovement);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al registrar movimiento de aeronave', details: err.message });
    }
  });

  app.put('/api/maintenance/movements/:id', (req, res) => {
    try {
      const updated = db.updateAircraftMovement(req.params.id, req.body, req.body.updatedBy);
      if (!updated) {
        return res.status(404).json({ error: 'Registro de movimiento no encontrado' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al actualizar movimiento de aeronave', details: err.message });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE / PRODUCTION STATIC
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Temporizador automático para cortes diarios: 6:00 PM envío a Instructor en Jefe y 8:00 PM publicación
  setInterval(() => {
    try {
      db.checkAndRunFlightRequestCutoffs();
    } catch (err) {
      console.warn('[FlightRequest Scheduler] Error en verificación automática de cortes:', err);
    }
  }, 30000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✈️ AeroAcademia Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
