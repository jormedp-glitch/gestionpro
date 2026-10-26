# scripts/bootstrap-sandbox.ps1 — Crea (o reconstruye) el entorno de pruebas
# ============================================================================
# Qué hace:
#   1. Crea un proyecto Supabase nuevo (plan free) o reutiliza uno existente.
#   2. Aplica el schema base (supabase/base-schema.sql) — DDL puro, sin datos.
#   3. Aplica la semilla (supabase/seed-sandbox.sql) — datos de QA.
#   4. Crea los usuarios de Auth y las membresías.
#   5. Escribe el bloque de variables de entorno para correr la app contra el
#      sandbox (no toca el .env.local de producción: escribe .env.sandbox).
#
# Requisitos:
#   - $env:SUPABASE_ACCESS_TOKEN con un token personal de Supabase
#     (https://supabase.com/dashboard/account/tokens).
#   - PowerShell 5.1+.
#
# Uso:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   pwsh -File scripts/bootstrap-sandbox.ps1
#   pwsh -File scripts/bootstrap-sandbox.ps1 -ProjectRef hnhldrqxsfivaeaqcrjf  # reutilizar
#
# Notas:
#   - El proyecto free se PAUSA por inactividad: si el sandbox deja de
#     responder, restauralo con POST /v1/projects/{ref}/restore (ver docs/sandbox.md).
#   - La CLI `supabase db query --linked` no funciona desde redes IPv4-only
#     (conexión directa IPv6): este script usa la Management API
#     (POST /v1/projects/{ref}/database/query), que sí va por HTTP.
#   - El DDL del sandbox es el MISMO que el de producción (paridad total:
#     19 tablas, 11 funciones, 62 policies, 19 con RLS, 64 constraints).
# ============================================================================
param(
  [string]$ProjectRef = "",
  [string]$ProjectName = "GestionPro Sandbox",
  [string]$Region = "sa-east-1",
  [string]$OrgId = "xdxkaxvfvapownjfjbvo",
  [string]$MainEmail = "jormedp@gmail.com"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Say($msg) { Write-Host $msg }

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Say "Falta `$env:SUPABASE_ACCESS_TOKEN (token personal de Supabase)."
  Say "Exportalo y volve a correr: `$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'"
  exit 1
}

$headers = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" }
$jsonHeaders = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"; "Content-Type" = "application/json" }

function Invoke-Sql($ref, $sql) {
  $body = @{ query = $sql } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method Post `
    -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"; "Content-Type" = "application/json" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 300 | Out-Null
}

# --- 1) proyecto ---
if (-not $ProjectRef) {
  Say "Creando el proyecto $ProjectName en $Region..."
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $dbPass = "Sb" + [Convert]::ToBase64String($bytes).Replace("+","a").Replace("/","b").Replace("=","") + "!7"
  $p = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects" -Method Post -Headers $jsonHeaders `
    -Body ([System.Text.Encoding]::UTF8.GetBytes((@{ organization_id = $OrgId; name = $ProjectName; region = $Region; db_pass = $dbPass; plan = "free" } | ConvertTo-Json -Compress))) -TimeoutSec 120
  $ProjectRef = $p.ref
  Say "  proyecto creado: $ProjectRef"
} else {
  Say "Reutilizando el proyecto $ProjectRef"
}

# --- 2) keys + espera a que esté HEALTHY ---
for ($i = 1; $i -le 30; $i++) {
  $st = (Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef" -Headers $headers).status
  if ($st -eq "ACTIVE_HEALTHY") { break }
  Say "  estado=$st (esperando ACTIVE_HEALTHY)"
  Start-Sleep -Seconds 10
}
$keys = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef/api-keys" -Headers $headers
$svc  = ($keys | Where-Object { $_.type -eq "legacy" -and $_.name -eq "service_role" }).api_key
$anon = ($keys | Where-Object { $_.type -eq "legacy" -and $_.name -eq "anon" }).api_key
$sbUrl = "https://$ProjectRef.supabase.co"

# --- 3) schema base ---
Say "Aplicando el schema base..."
Invoke-Sql $ProjectRef @"
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to anon;
grant all on schema public to authenticated;
grant all on schema public to service_role;
"@
Invoke-Sql $ProjectRef (Get-Content "$repoRoot\supabase\base-schema.sql" -Raw)

# --- 4) semilla ---
Say "Aplicando la semilla..."
Invoke-Sql $ProjectRef (Get-Content "$repoRoot\supabase\seed-sandbox.sql" -Raw)

# --- 5) usuarios de auth + membresías ---
Say "Creando usuarios de Auth..."
function New-SandboxUser($email, $pass) {
  $body = @{ email = $email; password = $pass; email_confirm = $true } | ConvertTo-Json -Compress
  try {
    $u = Invoke-RestMethod -Uri "$sbUrl/auth/v1/admin/users" -Method Post `
      -Headers @{ apikey = $svc; Authorization = "Bearer $svc" } -ContentType "application/json" `
      -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
    return $u.id
  } catch {
    if ($_.ErrorDetails.Message -match '"id":"([^"]+)"') { return $matches[1] }
    throw
  }
}
$qaPass = "Sandbox-QA-2026!"
$mainPass = "Sandbox-GestionPro-2026!"
$mainId  = New-SandboxUser $MainEmail $mainPass
$editorId = New-SandboxUser "qa.editor@gestionpro.test" $qaPass
$owner2Id = New-SandboxUser "qa.owner2@gestionpro.test" $qaPass

Invoke-Sql $ProjectRef @"
insert into public.negocio_miembros (negocio_id, user_id, rol)
values
  ('9a000000-0000-4000-8000-000000000001', '$mainId',   'owner'),
  ('9a000000-0000-4000-8000-000000000002', '$mainId',   'owner'),
  ('9a000000-0000-4000-8000-000000000005', '$mainId',   'owner'),
  ('9a000000-0000-4000-8000-000000000001', '$editorId', 'editor'),
  ('9a000000-0000-4000-8000-000000000001', '$owner2Id', 'owner')
on conflict (negocio_id, user_id) do nothing;
"@

# --- 6) env local ---
$envFile = "$repoRoot\.env.sandbox"
@(
  "# Sandbox de QA — generado por scripts/bootstrap-sandbox.ps1",
  "NEXT_PUBLIC_SUPABASE_URL=$sbUrl",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon",
  "SUPABASE_SERVICE_ROLE_KEY=$svc"
) | Set-Content -Path $envFile -Encoding UTF8

Say ""
Say "Sandbox listo."
Say "  proyecto : $ProjectRef"
Say "  url      : $sbUrl"
Say "  env      : $envFile (copialo a .env.local para correr la app contra el sandbox)"
Say "  usuarios : $MainEmail / $mainPass   (owner de 3 negocios)"
Say "             qa.editor@gestionpro.test / $qaPass  (editor)"
Say "             qa.owner2@gestionpro.test / $qaPass  (2do owner)"
Say "  negocios : gym-el-oso, qa-ana-profe, taller-eme (tuyos) + pepe-gym, peluqueria-lum, veterinaria-patas"
