import { normalizeModuleName, normalizeActionName } from '@/utils/permissions'

export type PermissionSchema = Record<string, string[]>

const base: PermissionSchema = {
  inventario: ['ver', 'crear', 'editar', 'eliminar'],
  pacientes: ['ver', 'crear', 'editar'],
  resultados: ['ver', 'crear', 'editar', 'eliminar', 'imprimir', 'enviar_email', 'enviar_whatsapp'],
  citas: ['ver', 'gestionar_disponibilidad', 'reprogramar', 'confirmar', 'cancelar'],
  dias_no_disponibles: ['gestionar_disponibilidad', 'ver'],
  estudios: ['ver', 'crear', 'editar', 'eliminar', 'actualizar_tasa_cambio'],
  site_config: ['ver', 'editar'],
  publicaciones_blog: ['ver', 'crear', 'editar', 'eliminar'],
  testimonios: ['ver', 'crear', 'editar', 'eliminar'],
}

export const PERMISSIONS_SCHEMA: PermissionSchema = Object.fromEntries(
  Object.entries(base).map(([m, actions]) => [
    normalizeModuleName(m),
    Array.from(new Set(actions.map(a => normalizeActionName(a))))
  ])
)
