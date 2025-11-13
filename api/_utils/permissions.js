// Normalización de permisos en backend, idéntica a src/utils/permissions.ts
// Módulo ESM en JavaScript para que dev.ts pueda importarlo como .js

export function normalizeModuleName(moduloInput) {
  const rawUnderscored = (moduloInput || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
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
    testimonials: 'testimonios',
  };
  if (aliases[rawUnderscored]) return aliases[rawUnderscored];
  const simplified = rawUnderscored.replace(/[_\s-]+/g, '');
  return aliases[simplified] || rawUnderscored;
}

export function normalizeActionName(actionInput) {
  const raw = (actionInput || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    // Acciones CRUD genéricas
    crear: 'crear',
    editar: 'editar',
    eliminar: 'eliminar',
    ver: 'ver',
    imprimir: 'imprimir',

    // Resultados
    enviar: 'enviar_email',
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

export function maybeRemapModuleForAction(moduloNorm, accionNorm) {
  return moduloNorm;
}
