// lib/domain/origen.ts
//
// Origen público de la app para armar los links que se mandan a terceros
// (portal del alumno, seguimiento de reparaciones).
//
// Por qué no alcanza con `window.location.origin`: el link se arma en el
// navegador del PROFESIONAL, pero lo abre el ALUMNO o el CLIENTE, que están
// en otro dispositivo. Si el profe trabaja en su dev local, el link sale como
// `http://localhost:3000/...` y el destinatario no puede abrirlo (verificado
// 2026-10-26: un link del portal enviado por WhatsApp con localhost).
//
// `NEXT_PUBLIC_APP_URL` es la URL pública del deployment que atiende la MISMA
// base de datos que la app. Si no está definida, se usa el origen de la
// página actual (correcto cuando la app se sirve desde su propio dominio
// público, y el fallback natural en preview).

/**
 * Origen público de la app (sin barra final). "" si no hay ninguno (SSR sin
 * `window` y sin la variable configurada).
 */
export function origenApp(): string {
  const configurado = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configurado) return configurado.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Une el origen público con un path de la app: `origenApp() + "/gym-el-oso"`. */
export function linkDeApp(path: string): string {
  const limpio = path.startsWith("/") ? path : `/${path}`;
  return `${origenApp()}${limpio}`;
}
