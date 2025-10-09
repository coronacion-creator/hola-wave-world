import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

const Evaluaciones = () => {
  const { data: evaluaciones, isLoading } = useQuery({
    queryKey: ["evaluaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluaciones")
        .select(`
          *,
          matriculas(
            estudiantes(nombres, apellidos),
            cursos(nombre)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Evaluaciones Académicas</CardTitle>
            <CardDescription>Registro de notas con actualización automática de promedios</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando evaluaciones...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluaciones?.map((evaluacion) => (
                <TableRow key={evaluacion.id}>
                  <TableCell>
                    {evaluacion.matriculas?.estudiantes?.nombres} {evaluacion.matriculas?.estudiantes?.apellidos}
                  </TableCell>
                  <TableCell>{evaluacion.matriculas?.cursos?.nombre}</TableCell>
                  <TableCell className="capitalize">{evaluacion.tipo_evaluacion}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      Number(evaluacion.nota) >= 10.5
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {Number(evaluacion.nota).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{Number(evaluacion.peso).toFixed(2)}</TableCell>
                  <TableCell>
                    {evaluacion.fecha_evaluacion ? new Date(evaluacion.fecha_evaluacion).toLocaleDateString("es-PE") : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Evaluaciones;
