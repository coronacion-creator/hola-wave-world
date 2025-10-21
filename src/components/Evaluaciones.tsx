import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { useState } from "react";

const Evaluaciones = () => {
  const [selectedCurso, setSelectedCurso] = useState<string>("all");

  const { data: cursos } = useQuery({
    queryKey: ["cursos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("id, nombre, codigo").eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: evaluaciones, isLoading } = useQuery({
    queryKey: ["evaluaciones", selectedCurso],
    queryFn: async () => {
      let query = supabase
        .from("evaluaciones")
        .select(`
          *,
          matriculas(
            id,
            curso_id,
            estudiantes(nombres, apellidos),
            cursos(id, nombre)
          )
        `)
        .order("created_at", { ascending: false });

      if (selectedCurso !== "all") {
        query = query.eq("matriculas.curso_id", selectedCurso);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: promediosPorEstudiante } = useQuery({
    queryKey: ["promedios-estudiantes", selectedCurso],
    queryFn: async () => {
      let query = supabase
        .from("estado_academico")
        .select(`
          promedio,
          estado,
          matriculas(
            id,
            curso_id,
            estudiantes(nombres, apellidos),
            cursos(nombre)
          )
        `);

      if (selectedCurso !== "all") {
        query = query.eq("matriculas.curso_id", selectedCurso);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Evaluaciones por Curso</CardTitle>
                <CardDescription>Registro de notas y promedios por curso</CardDescription>
              </div>
            </div>
            <div className="w-64">
              <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {cursos?.map((curso) => (
                    <SelectItem key={curso.id} value={curso.id}>
                      {curso.nombre} ({curso.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Promedios Generales por Estudiante</CardTitle>
              <CardDescription>Promedio general de cada estudiante en el curso seleccionado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Promedio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promediosPorEstudiante?.map((estado) => (
                <TableRow key={estado.matriculas?.id}>
                  <TableCell>
                    {estado.matriculas?.estudiantes?.nombres} {estado.matriculas?.estudiantes?.apellidos}
                  </TableCell>
                  <TableCell>{estado.matriculas?.cursos?.nombre}</TableCell>
                  <TableCell>
                    <span className={`text-lg font-bold ${
                      Number(estado.promedio) >= 10.5 ? "text-green-600" : "text-red-600"
                    }`}>
                      {Number(estado.promedio).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                      estado.estado === "aprobado"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : estado.estado === "reprobado"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {estado.estado}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Evaluaciones;
