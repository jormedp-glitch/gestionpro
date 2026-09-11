import { getOwnNegocios } from "@/lib/auth/dal";
import CrearNegocioForm from "@/components/crear-negocio-form";
import { Card, CardContent } from "@/lib/ui/card";

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
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-[800px]">
        <h1 className="mb-2 text-[2rem] font-bold">⚡ GestiónPro</h1>
        <p className="mb-8 text-muted-foreground">Panel de administración</p>
        <CrearNegocioForm />
        {negocios.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No hay negocios todavía. Crea el primer negocio.
          </p>
        )}
        {negocios.map((n) => (
          <Card key={n.id} className="mb-3">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="font-semibold">
                  {rubroIcon[n.rubro]} {n.nombre}
                </div>
                <div className="text-xs text-muted-foreground">/{n.slug}</div>
              </div>
              <a
                href={"/" + n.slug}
                target="_blank"
                className="inline-flex items-center rounded-lg border border-accent/25 bg-accent/10 px-4 py-2 text-sm text-accent no-underline transition-colors hover:bg-accent/20"
              >
                Abrir app
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
