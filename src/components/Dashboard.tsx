import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, DollarSign, Package } from "lucide-react";

const Dashboard = () => {
  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("estudiantes")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: matriculas } = useQuery({
    queryKey: ["matriculas-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("matriculas")
        .select("*", { count: "exact", head: true })
        .eq("estado", "activa");
      return count || 0;
    },
  });

  const { data: pagosTotal } = useQuery({
    queryKey: ["pagos-total"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pagos")
        .select("monto")
        .eq("estado", "completado");
      return data?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
    },
  });

  const { data: inventarioItems } = useQuery({
    queryKey: ["inventario-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inventario")
        .select("*", { count: "exact", head: true })
        .eq("activo", true);
      return count || 0;
    },
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sedes")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const stats = [
    {
      title: "Total Estudiantes",
      value: estudiantes,
      icon: Users,
      description: "Estudiantes activos",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Matrículas Activas",
      value: matriculas,
      icon: BookOpen,
      description: "En el periodo actual",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Ingresos Totales",
      value: `S/ ${pagosTotal?.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      description: "Pagos completados",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    },
    {
      title: "Items Inventario",
      value: inventarioItems,
      icon: Package,
      description: "Materiales disponibles",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Sedes Activas</CardTitle>
          <CardDescription>
            Red distribuida de EduGlobal en todo el Perú
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {sedes?.map((sede) => (
              <div
                key={sede.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <h3 className="font-semibold text-lg">{sede.nombre}</h3>
                <p className="text-sm text-muted-foreground">{sede.ciudad}</p>
                <p className="text-xs text-muted-foreground mt-1">{sede.direccion}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Sobre el Sistema Distribuido</CardTitle>
          <CardDescription>
            Características y beneficios de la arquitectura distribuida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Control de Concurrencia</h4>
            <p className="text-sm text-muted-foreground">
              Implementación de bloqueos (FOR UPDATE) para evitar conflictos en operaciones simultáneas
              de múltiples sedes, especialmente en inventario y pagos.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-secondary">Transacciones ACID</h4>
            <p className="text-sm text-muted-foreground">
              Garantía de atomicidad, consistencia, aislamiento y durabilidad en todas las operaciones
              críticas del sistema educativo.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-accent">Sincronización en Tiempo Real</h4>
            <p className="text-sm text-muted-foreground">
              Cada sede mantiene sus datos localmente con sincronización automática a la base central,
              mejorando el rendimiento y disponibilidad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
