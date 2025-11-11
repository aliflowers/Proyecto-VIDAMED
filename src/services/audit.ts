import { supabase } from '@/services/supabaseClient';

type AuditAction =
  | 'Crear'
  | 'Actualizar'
  | 'Eliminar'
  | 'Aprobar'
  | 'Enviar'
  | 'Rechazar'
  | 'Editar'
  // Acciones adicionales usadas en el proyecto
  | 'Editar permisos'
  | 'Bloquear día'
  | 'Desbloquear día'
  | 'Actualizar estado'
  | 'Reagendar'
  | 'Bloquear horario'
  | 'Desbloquear horario';

export async function logAudit(params: {
  action: AuditAction;
  module: string;
  entity?: string;
  entityId?: string | number | null;
  metadata?: Record<string, any> | null;
  success?: boolean;
}) {
  try {
    const { action, module, entity, entityId, metadata = null, success = true } = params;
    const { data: auth } = await supabase.auth.getUser();
    const email = (auth?.user?.email || '').toLowerCase();

    // Excluir usuarios cuyo comportamiento no debe auditarse
    if (email === 'anamariaprieto@labvidamed.com' || email === 'alijesusflores@gmail.com') {
      return;
    }

    const userId = auth?.user?.id || null;
    const path = typeof window !== 'undefined' ? window.location.pathname : undefined;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

    await supabase.from('user_audit_logs').insert({
      user_id: userId,
      email,
      action,
      module,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      metadata,
      success,
      path,
      user_agent: userAgent,
    });
  } catch (e) {
    // No interrumpir el flujo de la app por fallas de auditoría
    console.warn('[AUDIT] Falló el registro de auditoría:', e);
  }
}

export function auditActionLabel(isUpdate: boolean): AuditAction {
  return isUpdate ? 'Actualizar' : 'Crear';
}