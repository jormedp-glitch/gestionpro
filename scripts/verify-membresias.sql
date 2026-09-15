-- scripts/verify-membresias.sql — Verificación post-0005 (fase 6, WU-1)
-- ============================================================================
-- Verifica:
--   1. los 4 RPC de membresías existen con su firma exacta, son security
--      definer y tienen sus grants (EXECUTE para authenticated; anon SIN
--      acceso vía PUBLIC)
--   2. autorización (R6): editor del negocio y usuario de OTRO negocio son
--      rechazados por los RPC
--   3. dedupe por email (R7): alta duplicada rechazada y conteo intacto
--   4. último owner (R5): quitar/demotar al único owner rechazado y el rol
--      no cambia
--   5. round-trip (R4): alta y baja de :other_email (neto cero)
--   6. listar_miembros (R2): devuelve emails y roles de owner y editor
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION).
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-UN-solo-owner>' \
--     -v owner='<UUID-del-owner-de-ese-negocio>' \
--     -v editor='<UUID-de-un-editor-de-ese-negocio>' \
--     -v other='<UUID-de-un-usuario-SIN-membresía-en-ese-negocio>' \
--     -v other_email='<email-de-other>' \
--     -f scripts/verify-membresias.sql
--
-- Prerequisitos:
--   - Migración 0005 aplicada (0001..0004 previas).
--   - El negocio elegido debe tener EXACTAMENTE UN owner (el de -v owner);
--     si tiene 2+ owners, la comprobación del último owner (R5) no aplica y
--     el script aborta con un mensaje claro. Elegir otro negocio.
--   - Entorno con el esquema auth de Supabase (auth.uid() + auth.users):
--     proyecto Supabase o supabase-local. En un postgres pelado sin auth,
--     los pasos 2-6 no aplican.
--
-- Nota: cada bloque DO corre en su propia transacción (SET LOCAL ROLE /
-- set_config(..., true) no persisten entre bloques, igual que verify-rls).
-- Única mutación esperada: alta y baja de :other_email en el tenant (neto
-- cero, paso 5). Si el script aborta entre el alta y la baja, la membresía
-- de other queda creada y debe borrarse a mano:
--   delete from public.negocio_miembros
--    where negocio_id = '<tenant>' and user_id = '<other>';
-- ============================================================================

\set ON_ERROR_STOP on

-- 0) Prerequisitos (rol privilegiado): tenant válido, owner ÚNICO owner,
--    editor miembro con rol editor, other SIN membresía, emails consistentes.
do $$
declare
  v_owners        bigint;
  v_owner_id      uuid;
  v_editor_rol    text;
  v_other_count   bigint;
  v_owner_email   text;
  v_editor_email  text;
  v_other_email_id uuid;
begin
  if not exists (select 1 from public.negocios where id = :'tenant'::uuid) then
    raise exception 'FALLO prerequisito: el negocio :tenant no existe';
  end if;

  select count(*) into v_owners
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and rol = 'owner';
  if v_owners <> 1 then
    raise exception 'FALLO prerequisito: el tenant debe tener EXACTAMENTE 1 owner (tiene %) — elegir otro negocio', v_owners;
  end if;

  select user_id into v_owner_id
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and rol = 'owner';
  if v_owner_id <> :'owner'::uuid then
    raise exception 'FALLO prerequisito: -v owner no es el único owner del tenant';
  end if;

  select rol into v_editor_rol
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and user_id = :'editor'::uuid;
  if v_editor_rol is distinct from 'editor' then
    raise exception 'FALLO prerequisito: -v editor debe ser miembro del tenant con rol editor';
  end if;

  select count(*) into v_other_count
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and user_id = :'other'::uuid;
  if v_other_count <> 0 then
    raise exception 'FALLO prerequisito: -v other ya es miembro del tenant (estado sucio)';
  end if;

  select email into v_owner_email from auth.users where id = :'owner'::uuid;
  if v_owner_email is null then
    raise exception 'FALLO prerequisito: -v owner no tiene email en auth.users';
  end if;

  select email into v_editor_email from auth.users where id = :'editor'::uuid;
  if v_editor_email is null then
    raise exception 'FALLO prerequisito: -v editor no tiene email en auth.users';
  end if;

  select id into v_other_email_id
    from auth.users where lower(email) = lower(:'other_email');
  if v_other_email_id is distinct from :'other'::uuid then
    raise exception 'FALLO prerequisito: -v other_email no resuelve a -v other en auth.users';
  end if;

  raise notice 'OK prerequisitos: tenant con 1 owner, editor y other listos';
end $$;

-- 1) RPCs existen con firma exacta, security definer y grants correctos
do $$
declare
  sigs text[] := array[
    'public.listar_miembros(uuid)',
    'public.agregar_miembro(uuid, text, text)',
    'public.cambiar_rol_miembro(uuid, uuid, text)',
    'public.quitar_miembro(uuid, uuid)'
  ];
  v_sig text;
begin
  foreach v_sig in array sigs loop
    if to_regprocedure(v_sig) is null then
      raise exception 'FALLO: la función % no existe', v_sig;
    end if;
    if not exists (
      select 1 from pg_proc
       where oid = to_regprocedure(v_sig) and prosecdef
    ) then
      raise exception 'FALLO: % no es security definer', v_sig;
    end if;
    if not has_function_privilege('authenticated', v_sig, 'EXECUTE') then
      raise exception 'FALLO: authenticated sin EXECUTE en %', v_sig;
    end if;
    if has_function_privilege('anon', v_sig, 'EXECUTE') then
      raise exception 'FALLO: anon aún tiene EXECUTE en % (revoke all from public no aplicado)', v_sig;
    end if;
    raise notice 'OK: % existe, security definer, EXECUTE para authenticated, sin acceso anon', v_sig;
  end loop;
end $$;

-- 2) Autorización (R6): editor y usuario de otro negocio son rechazados
do $$
declare
  v_ok  boolean := false;
  v_msg text;
begin
  -- editor: no puede listar (vería emails ajenos)
  perform set_config('request.jwt.claim.sub', :'editor', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'editor', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  begin
    perform public.listar_miembros(:'tenant'::uuid);
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO authz: editor pudo listar miembros';
  end if;
  raise notice 'OK authz: editor rechazado en listar_miembros (%)', v_msg;

  -- editor: no puede mutar roles
  v_ok := false;
  begin
    perform public.cambiar_rol_miembro(:'tenant'::uuid, :'editor'::uuid, 'owner');
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO authz: editor pudo cambiar roles';
  end if;
  raise notice 'OK authz: editor rechazado en cambiar_rol_miembro (%)', v_msg;
end $$;

do $$
declare
  v_ok  boolean := false;
  v_msg text;
begin
  -- other: no puede listar un negocio ajeno
  perform set_config('request.jwt.claim.sub', :'other', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'other', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  begin
    perform public.listar_miembros(:'tenant'::uuid);
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO authz: usuario de otro negocio pudo listar miembros del tenant';
  end if;
  raise notice 'OK authz: other rechazado en listar_miembros (%)', v_msg;

  -- other: no puede mutar un negocio ajeno
  v_ok := false;
  begin
    perform public.agregar_miembro(:'tenant'::uuid, :'other_email', 'editor');
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO authz: usuario de otro negocio pudo agregar miembros al tenant';
  end if;
  raise notice 'OK authz: other rechazado en agregar_miembro (%)', v_msg;
end $$;

-- 3) Dedupe (R7): alta de un email ya miembro → exception y conteo intacto
do $$
declare
  v_editor_email text;
  v_before       bigint;
  v_after        bigint;
  v_ok           boolean := false;
  v_msg          text;
begin
  select email into v_editor_email from auth.users where id = :'editor'::uuid;

  select count(*) into v_before
    from public.negocio_miembros where negocio_id = :'tenant'::uuid;

  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  begin
    perform public.agregar_miembro(:'tenant'::uuid, v_editor_email, 'owner');
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO dedupe: alta de un email ya miembro no fue rechazada';
  end if;

  reset role;

  select count(*) into v_after
    from public.negocio_miembros where negocio_id = :'tenant'::uuid;
  if v_after <> v_before then
    raise exception 'FALLO dedupe: conteo cambió (% → %)', v_before, v_after;
  end if;

  raise notice 'OK dedupe: rechazado (%) y conteo intacto (%)', v_msg, v_after;
end $$;

-- 4) Último owner (R5): quitar o demotar al único owner → exception, sin
--    cambios (cubre auto-remoción y auto-democión).
do $$
declare
  v_ok   boolean := false;
  v_msg  text;
  v_rol  text;
begin
  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  -- auto-remoción del único owner
  begin
    perform public.quitar_miembro(:'tenant'::uuid, :'owner'::uuid);
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO R5: el único owner pudo quitarse a sí mismo';
  end if;
  raise notice 'OK R5: auto-remoción del único owner rechazada (%)', v_msg;

  -- auto-democión del único owner
  v_ok := false;
  begin
    perform public.cambiar_rol_miembro(:'tenant'::uuid, :'owner'::uuid, 'editor');
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO R5: el único owner pudo demotarse a editor';
  end if;

  reset role;

  select rol into v_rol
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and user_id = :'owner'::uuid;
  if v_rol is distinct from 'owner' then
    raise exception 'FALLO R5: el rol del owner cambió (%)', v_rol;
  end if;

  raise notice 'OK R5: auto-democión rechazada (%) y rol sigue owner', v_msg;
end $$;

-- 5) Round-trip (R4): alta y baja de :other_email como owner → neto cero
do $$
declare
  v_ok    boolean := false;
  v_msg   text;
  v_mid   bigint;
  v_after bigint;
begin
  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  -- alta
  perform public.agregar_miembro(:'tenant'::uuid, :'other_email', 'editor');

  -- el segundo alta debe rechazarse por dedupe (prueba de que el insert
  -- realmente se materializó, R7)
  begin
    perform public.agregar_miembro(:'tenant'::uuid, :'other_email', 'editor');
  exception when others then
    v_ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  if not v_ok then
    raise exception 'FALLO round-trip: el alta no fue seguida de rechazo por duplicado';
  end if;

  reset role;

  -- verificación intermedia (rol privilegiado): la membresía existe
  select count(*) into v_mid
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and user_id = :'other'::uuid;
  if v_mid <> 1 then
    raise exception 'FALLO round-trip: tras el alta, other tiene % membresía(s) (esperaba 1)', v_mid;
  end if;

  -- baja
  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  perform public.quitar_miembro(:'tenant'::uuid, :'other'::uuid);

  reset role;

  -- verificación final: neto cero
  select count(*) into v_after
    from public.negocio_miembros
   where negocio_id = :'tenant'::uuid and user_id = :'other'::uuid;
  if v_after <> 0 then
    raise exception 'FALLO round-trip: tras la baja, other sigue con % membresía(s) (esperaba 0)', v_after;
  end if;

  raise notice 'OK round-trip: alta → dedupe → baja, neto cero (%)', v_msg;
end $$;

-- 6) Listar (R2): el owner ve emails y roles de owner y editor
do $$
declare
  v_owner_email  text;
  v_editor_email text;
  v_total        bigint;
  v_n            bigint;
begin
  select email into v_owner_email  from auth.users where id = :'owner'::uuid;
  select email into v_editor_email from auth.users where id = :'editor'::uuid;

  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  select count(*) into v_total
    from public.listar_miembros(:'tenant'::uuid);
  if v_total < 2 then
    raise exception 'FALLO listar: % fila(s) (esperaba al menos 2: owner + editor)', v_total;
  end if;

  select count(*) into v_n
    from public.listar_miembros(:'tenant'::uuid)
   where email = v_owner_email and rol = 'owner';
  if v_n <> 1 then
    raise exception 'FALLO listar: el email del owner no aparece con rol owner';
  end if;

  select count(*) into v_n
    from public.listar_miembros(:'tenant'::uuid)
   where email = v_editor_email and rol = 'editor';
  if v_n <> 1 then
    raise exception 'FALLO listar: el email del editor no aparece con rol editor';
  end if;

  raise notice 'OK listar: % miembro(s), owner y editor con email y rol correctos', v_total;
end $$;

select 'verify-membresias: TODAS LAS COMPROBACIONES OK' as resultado;