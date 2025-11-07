-- Migración: Gestión de Usuarios (perfiles y permisos granulares)
-- Fecha: 2025-11-07

-- Tabla de perfiles de usuario vinculada a auth.users
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  cedula text not null unique,
  email text not null,
  sede text not null,
  rol text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is 'Perfil de usuario enlazado a auth.users con sede y rol.';

-- Tabla de permisos granulares por usuario (overrides)
create table if not exists public.user_permissions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  action text not null,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, module, action)
);

comment on table public.user_permissions is 'Permisos granulares por usuario (overrides de las reglas por rol).';

-- Índices útiles
create index if not exists idx_user_permissions_user on public.user_permissions(user_id);

-- RLS (opcional): permitir que el propio usuario lea su perfil; el service role evita las restricciones.
alter table public.user_profiles enable row level security;
alter table public.user_permissions enable row level security;

-- Políticas básicas: el dueño puede leer su perfil y permisos; sólo el service role puede insertar/actualizar/eliminar.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'user_profiles_select_own'
  ) then
    create policy user_profiles_select_own on public.user_profiles
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_permissions' and policyname = 'user_permissions_select_own'
  ) then
    create policy user_permissions_select_own on public.user_permissions
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Nota: Inserción/actualización/eliminación se realizará mediante el service role desde el backend.