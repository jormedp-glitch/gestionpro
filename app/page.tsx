import { getOwnNegocios } from "@/lib/auth/dal";
import CrearNegocioForm from "@/components/crear-negocio-form";

const rubroIcon: Record<string, string> = {
  gimnasio: "🏋️",
  peluqueria: "✂️",
  veterinaria: "🐾",
  servicio_tecnico: "🔧",
};

/**
 * Panel de administración: lista los negocios del usuario (membresía vía DAL)
 * y permite crear uno nuevo por RPC (crear_negocio_con_owner). Server
 * Component: la lista sale del servidor; el formulario es un Client Component.
 */
export default async function AdminPanel() {
  const negocios = await getOwnNegocios();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}
        >
          ⚡ GestiónPro
        </h1>
        <p style={{ color: "#555", marginBottom: "2rem" }}>
          Panel de administración
        </p>
        <CrearNegocioForm />
        {negocios.length === 0 && (
          <p style={{ color: "#333", textAlign: "center", padding: "2rem" }}>
            No hay negocios todavía. Crea el primer negocio.
          </p>
        )}
        {negocios.map((n) => (
          <div
            key={n.id}
            style={{
              background: "#13131A",
              border: "1px solid #ffffff08",
              borderRadius: "14px",
              padding: "1.25rem",
              marginBottom: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {rubroIcon[n.rubro]} {n.nombre}
              </div>
              <div style={{ color: "#444", fontSize: "0.8rem" }}>/{n.slug}</div>
            </div>
            <a
              href={"/" + n.slug}
              target="_blank"
              style={{
                background: "#FF6B3520",
                color: "#FF6B35",
                border: "1px solid #FF6B3530",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              Abrir app
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
