-- 0010_rubro_profesor.sql — Rubro Profesor / Entrenador (SDD rubro-profesor)
-- ============================================================================
-- MIGRACIÓN ADITIVA (D1/D2): incorpora el rubro `profesor` reutilizando el
-- core de gym sin tablas ni RLS nuevas. Solo:
--   1) columna `negocios.disciplina text` (nullable, sin migración de datos:
--      los negocios existentes quedan válidos con disciplina null);
--   2) RPC `crear_negocio_con_owner` con firma nueva de 4 params
--      (`p_disciplina text default null`).
--
-- SIN OVERLOAD: con firma distinta, `create or replace` dejaría VIVA la firma
-- de 3 params con sus grants (0009:43) — dos funciones con el mismo nombre.
-- Por eso: DROP de la firma vieja antes de CREATE (D1).
--
-- NOTA (D2): la normalización de `disciplina` es SOLO server-side en el RPC
-- (`nullif(btrim(p_disciplina), '')`): vacío/whitespace → null. Fuente única
-- para cualquier caller; el form solo trimea para UI.
--
-- Sin ejecutar contra ninguna DB desde el repo: la aplicación en entornos es
-- del operador (scripts/backup-bootstrap.md → aplicar con rollback abajo).
-- ============================================================================

-- 1) Columna de disciplina (spec carga-datos-gym: sin tablas ni policies nuevas)
alter table public.negocios add column disciplina text;

-- 2) RPC con firma nueva (D1): drop de la firma de 3 params + create de 4.
drop function public.crear_negocio_con_owner(text, text, text);

create function public.crear_negocio_con_owner(
  p_nombre     text,
  p_slug       text,
  p_rubro      text,
  p_disciplina text default null
)
returns public.negocios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_negocio public.negocios;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  insert into public.negocios (nombre, slug, rubro, disciplina)
  values (
    p_nombre,
    p_slug,
    p_rubro,
    nullif(btrim(p_disciplina), '')
  )
  returning * into v_negocio;

  insert into public.negocio_miembros (negocio_id, user_id, rol)
  values (v_negocio.id, auth.uid(), 'owner');

  return v_negocio;
end;
$$;

-- 3) Grants espejando 0001:70-71 + 0009:43: Supabase reotorga EXECUTE a
--    anon/authenticated vía default privileges al crear la función en
--    `public` (lección 0004/0009:17-21) → el revoke tiene que nombrarlos.
revoke all on function public.crear_negocio_con_owner(text, text, text, text) from public;
revoke execute on function public.crear_negocio_con_owner(text, text, text, text) from anon;
grant execute on function public.crear_negocio_con_owner(text, text, text, text) to authenticated;

-- ============================================================================
-- ROLLBACK (comentado a propósito — ejecutarlo SOLO manualmente, con un rol
-- privilegiado, tras verificar backup; spec alta-negocio "Validez de
-- negocios sin disciplina" → la columna es nullable y no hay datos que migrar):
--
-- drop function public.crear_negocio_con_owner(text, text, text, text);
--
-- recreate function public.crear_negocio_con_owner(
--   p_nombre text,
--   p_slug   text,
--   p_rubro  text
-- )
-- returns public.negocios
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   v_negocio public.negocios;
-- begin
--   if auth.uid() is null then
--     raise exception 'Se requiere una sesión iniciada';
--   end if;
--
--   insert into public.negocios (nombre, slug, rubro)
--   values (p_nombre, p_slug, p_rubro)
--   returning * into v_negocio;
--
--   insert into public.negocio_miembros (negocio_id, user_id, rol)
--   values (v_negocio.id, auth.uid(), 'owner');
--
--   return v_negocio;
-- end;
-- $$;
--
-- revoke all on function public.crear_negocio_con_owner(text, text, text) from public;
-- grant execute on function public.crear_negocio_con_owner(text, text, text) to authenticated;
--
-- alter table public.negocios drop column if exists disciplina;
-- ============================================================================
