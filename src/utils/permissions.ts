type Overrides = Record<string, Record<string, boolean>>;

export type PermissionUser = {
  role: string;
  overrides?: Overrides;
};

// Matriz por defecto minimal para el módulo USERS.
// Se puede expandir con más módulos/acciones según sea necesario.
const DEFAULT_MATRIX: Record<string, Record<string, Record<string, boolean>>> = {
  Administrador: {
    USERS: {
      crear_usuario: true,
      actualizar_perfil: true,
      eliminar_usuario: true,
      editar_permisos: true,
    },
    CITAS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      reprogramar: true,
      confirmar: true,
      cancelar: true,
    },
    INVENTARIO: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      ajustar_stock: true,
      deducir_stock: true,
    },
    ESTUDIOS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },
    BLOG: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      publicar: true,
    },
    TESTIMONIOS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      publicar: true,
    },
    CONFIG: {
      ver: true,
      editar: true,
    },
    PACIENTES: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },
    RESULTADOS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      enviar_whatsapp: true,
      enviar_email: true,
      imprimir: true,
    },
  },
  'Lic.': {
    USERS: {
      crear_usuario: false,
      actualizar_perfil: false,
      eliminar_usuario: false,
      editar_permisos: false,
    },
    CITAS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      reprogramar: true,
      confirmar: true,
      cancelar: true,
    },
    INVENTARIO: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      ajustar_stock: true,
      deducir_stock: true,
    },
    ESTUDIOS: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
    },
    BLOG: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      publicar: true,
    },
    TESTIMONIOS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      publicar: true,
    },
    CONFIG: {
      ver: true,
      editar: false,
    },
    PACIENTES: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
    },
    RESULTADOS: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      enviar_whatsapp: true,
      enviar_email: true,
      imprimir: true,
    },
  },
  Asistente: {
    USERS: {
      crear_usuario: false,
      actualizar_perfil: false,
      eliminar_usuario: false,
      editar_permisos: false,
    },
    CITAS: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      reprogramar: false,
      confirmar: false,
      cancelar: false,
    },
    INVENTARIO: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      ajustar_stock: false,
      deducir_stock: false,
    },
    ESTUDIOS: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
    },
    BLOG: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      publicar: false,
    },
    TESTIMONIOS: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      publicar: false,
    },
    CONFIG: {
      ver: true,
      editar: false,
    },
    PACIENTES: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
    },
    RESULTADOS: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      enviar_whatsapp: true,
      enviar_email: true,
      imprimir: true,
    },
  },
};

export function hasPermission(
  user: PermissionUser,
  module: string,
  action: string
): boolean {
  const role = user.role || 'Asistente';
  const roleDefault = DEFAULT_MATRIX[role]?.[module]?.[action] ?? false;
  const override = user.overrides?.[module]?.[action];
  return typeof override === 'boolean' ? override : roleDefault;
}