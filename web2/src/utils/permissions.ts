// Utilidades de permisos: tipadas, sin JSX, con exports explícitos

export type Rol = 'Administrador' | 'Lic.' | 'Asistente';

export type PermissionOverrides = {
  [modulo: string]: {
    [accion: string]: boolean;
  };
};

export interface HasPermissionUser {
  role?: string | Rol | null;
  overrides?: PermissionOverrides | null;
}

/**
 * Normaliza el nombre del módulo recibido desde el frontend o API.
 * - Insensible a mayúsculas/minúsculas
 * - Reemplaza guiones/espacios por guiones bajos
 * - Aplica alias comunes para mantener consistencia con las claves internas
 */
export function normalizeModuleName(moduloInput: string | null | undefined): string {
  // Normalización base: minúsculas y reemplazo de espacios/guiones por guion bajo
  const rawUnderscored = (moduloInput || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');

  // Mapa de alias ampliado para cubrir variantes usadas en el frontend
  const aliases: Record<string, string> = {
    // Inventario
    inventario: 'inventario',
    inventarios: 'inventario',
    inventory: 'inventario',
    materiales: 'inventario',
    // Pacientes
    pacientes: 'pacientes',
    paciente: 'pacientes',
    patients: 'pacientes',
    // Resultados
    resultados: 'resultados',
    resultado: 'resultados',
    results: 'resultados',
    // Citas y bloqueos
    citas: 'citas',
    cita: 'citas',
    appointments: 'citas',
    'citas_admin': 'citas',
    dias_no_disponibles: 'dias_no_disponibles',
    diasnodisponibles: 'dias_no_disponibles',
    bloqueos: 'dias_no_disponibles',
    // Estudios
    estudios: 'estudios',
    studies: 'estudios',
    // Configuración del sitio
    site_config: 'site_config',
    settings: 'site_config',
    // Blog y testimonios
    publicaciones_blog: 'publicaciones_blog',
    blog: 'publicaciones_blog',
    posts: 'publicaciones_blog',
    testimonios: 'testimonios',
    testimonials: 'testimonios'
  };

  // Intento directo con versión subrayada
  if (aliases[rawUnderscored]) return aliases[rawUnderscored];

  // Intento con versión simplificada sin espacios/guiones/guiones bajos
  const simplified = rawUnderscored.replace(/[_\s-]+/g, '');
  return aliases[simplified] || rawUnderscored;
}

/**
 * Normaliza nombres de acciones a su forma canónica.
 * Mantiene consistencia entre UI y comprobaciones `can()` en cada módulo.
 */
export function normalizeActionName(actionInput: string | null | undefined): string {
  const raw = (actionInput || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    // Acciones CRUD genéricas
    crear: 'crear',
    editar: 'editar',
    eliminar: 'eliminar',
    ver: 'ver',
    imprimir: 'imprimir',

    // Resultados
    enviar: 'enviar_email', // alias genérico mapeado a email
    enviar_whatsapp: 'enviar_whatsapp',
    enviar_email: 'enviar_email',

    // Inventario: aliases de UI históricos
    crear_material: 'crear',
    editar_material: 'editar',
    eliminar_material: 'eliminar',

    // Citas: equivalencias
    gestionar: 'gestionar_disponibilidad',
    gestionar_disponibilidad: 'gestionar_disponibilidad',
    bloquear_dias: 'gestionar_disponibilidad',
    desbloquear_dias: 'gestionar_disponibilidad',
    reagendar: 'reprogramar',
    reprogramar: 'reprogramar',

    // Site config / estudios
    actualizar_tasa_cambio: 'actualizar_tasa_cambio',
  };
  return aliases[raw] || raw;
}

/**
 * Algunas acciones pertenecen conceptualmente a otro módulo (p.ej. tasa de cambio → site_config).
 * Este helper remapea el módulo cuando aplique para que `hasPermission` evalúe correctamente.
 */
function maybeRemapModuleForAction(moduloNorm: string, _accionNorm: string): string {
  return moduloNorm;
}

// Eliminado duplicado de normalizeModuleName; usar la versión exportada arriba

// Normaliza el objeto de overrides proveniente de API (posibles claves en mayúsculas)
function normalizeOverrides(overrides: PermissionOverrides | null | undefined): PermissionOverrides | null {
  if (!overrides) return null;
  const norm: PermissionOverrides = {};
  Object.keys(overrides).forEach((mod) => {
    const modNormBase = normalizeModuleName(mod);
    const actions = overrides[mod] || {};
    Object.keys(actions).forEach((act) => {
      const actNorm = normalizeActionName(act);
      const modNorm = maybeRemapModuleForAction(modNormBase, actNorm);
      if (!norm[modNorm]) norm[modNorm] = {};
      norm[modNorm][actNorm] = Boolean(actions[act]);
    });
  });
  return norm;
}

// Mapa por defecto alineado con la matriz de permisos de frontend
const defaultPermissions: Record<Rol, Record<string, Record<string, boolean>>> = {
  Administrador: new Proxy({}, {
    get: () => new Proxy({}, { get: () => true })
  }) as Record<string, Record<string, boolean>>, // Admin: todo permitido

  'Lic.': {
    // INVENTARIO: ver y eliminar; sin crear ni editar
    inventario: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: true,
    },
    // RESULTADOS: todo menos eliminar
    resultados: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      imprimir: true,
      enviar_whatsapp: true,
      enviar_email: true,
    },
    // PACIENTES: ver, crear y editar
    pacientes: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
    },
    // CITAS: acceso total a gestión
    citas: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    dias_no_disponibles: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    // ESTUDIOS: ver; site_config: actualizar_tasa_cambio
    estudios: { ver: true },
    site_config: { actualizar_tasa_cambio: true, ver: true },
    // BLOG/TESTIMONIOS: permitido por defecto
    publicaciones_blog: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    testimonios: new Proxy({}, { get: () => true }) as Record<string, boolean>,
  },

  Asistente: {
    // INVENTARIO y PACIENTES: solo ver
    inventario: { ver: true },
    // PACIENTES: ver y crear
    pacientes: { ver: true, crear: true },
    // RESULTADOS: ver, imprimir y enviar por WhatsApp/Email
    resultados: { ver: true, imprimir: true, enviar: true, enviar_whatsapp: true, enviar_email: true },
    // CITAS y días no disponibles: acceso total a gestión
    citas: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    dias_no_disponibles: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    // ESTUDIOS: ver; site_config: actualizar_tasa_cambio
    estudios: { ver: true },
    site_config: { actualizar_tasa_cambio: true, ver: true },
    // BLOG/TESTIMONIOS: permitido
    publicaciones_blog: new Proxy({}, { get: () => true }) as Record<string, boolean>,
    testimonios: new Proxy({}, { get: () => true }) as Record<string, boolean>,
  },
};

/**
 * Normaliza el rol recibido desde `app_metadata.role` o cadenas libres.
 */
export function normalizeRole(roleInput: string | Rol | null | undefined): Rol {
  const raw = (roleInput || '').toString().trim().toLowerCase();
  if (raw.startsWith('admin')) return 'Administrador';
  if (raw.startsWith('lic')) return 'Lic.';
  if (raw.startsWith('asis')) return 'Asistente';
  // Por defecto, el rol más restrictivo
  return 'Asistente';
}

/**
 * Obtiene permisos por defecto del rol indicado.
 */
export function getDefaultAllowed(roleInput: string | Rol | null | undefined) {
  const role = normalizeRole(roleInput);
  return defaultPermissions[role];
}

/**
 * Determina si el usuario tiene permiso para `accion` en `modulo`.
 * Usa overrides del usuario si existen; de lo contrario, recurre a permisos por defecto del rol.
 */
export function hasPermission(
  user: HasPermissionUser | null | undefined,
  modulo: string,
  accion: string
): boolean {
  const role = normalizeRole(user?.role || null);
  const userOverrides = normalizeOverrides(user?.overrides || null);
  let moduloNorm = normalizeModuleName(modulo);
  const accionNorm = normalizeActionName(accion);
  moduloNorm = maybeRemapModuleForAction(moduloNorm, accionNorm);

  // 1) Overrides explícitos del usuario tienen prioridad
  if (userOverrides && userOverrides[moduloNorm] && typeof userOverrides[moduloNorm][accionNorm] === 'boolean') {
    return Boolean(userOverrides[moduloNorm][accionNorm]);
  }

  // 2) Permisos por defecto del rol
  const defaults = defaultPermissions[role] || {};
  const mod = defaults[moduloNorm];

  if (!mod) {
    // Módulo no definido para el rol: por defecto false, excepto Admin que permite todo
    if (role === 'Administrador') return true;
    return false;
  }

  // Acciones: si no está definida, se asume false excepto Admin
  const allowed = (mod as Record<string, boolean>)[accionNorm];
  if (typeof allowed === 'boolean') return allowed;
  return role === 'Administrador';
}

// Nota: normalizeRole ya existe más arriba en este archivo. Se evita duplicado.

export default hasPermission;
