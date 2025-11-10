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

// Mapa por defecto alineado con la matriz de permisos de frontend
const defaultPermissions: Record<Rol, Record<string, Record<string, boolean>>> = {
  Administrador: new Proxy({}, {
    get: () => new Proxy({}, { get: () => true })
  }) as Record<string, Record<string, boolean>>, // Admin: todo permitido

  'Lic.': {
    // INVENTARIO: ver y eliminar_material
    inventario: {
      ver: true,
      eliminar_material: true,
      crear: false,
      editar: false,
    },
    // RESULTADOS: todo menos eliminar
    resultados: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      imprimir: true,
      enviar: true,
    },
    // PACIENTES: ver y editar
    pacientes: {
      ver: true,
      crear: false,
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
    pacientes: { ver: true },
    // RESULTADOS: ver/imprimir/enviar
    resultados: { ver: true, imprimir: true, enviar: true },
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
  const userOverrides = user?.overrides || null;

  // 1) Overrides explícitos del usuario tienen prioridad
  if (userOverrides && userOverrides[modulo] && typeof userOverrides[modulo][accion] === 'boolean') {
    return Boolean(userOverrides[modulo][accion]);
  }

  // 2) Permisos por defecto del rol
  const defaults = defaultPermissions[role] || {};
  const mod = defaults[modulo];

  if (!mod) {
    // Módulo no definido para el rol: por defecto false, excepto Admin que permite todo
    if (role === 'Administrador') return true;
    return false;
  }

  // Acciones: si no está definida, se asume false excepto Admin
  const allowed = (mod as Record<string, boolean>)[accion];
  if (typeof allowed === 'boolean') return allowed;
  return role === 'Administrador';
}

export default hasPermission;