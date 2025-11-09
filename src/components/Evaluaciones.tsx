import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CursoEstudiante {
  estudiante_id: string;
  nombres: string;
  apellidos: string;
  promedio: number;
  notas: Array<{
    competencia: string;
    nota: number;
    porcentaje: number;
  }>;
}

const Evaluaciones = () => {
  const [selectedSalon, setSelectedSalon] = useState<string>("all");
  const [viewCursoModal, setViewCursoModal] = useState(false);
  const [selectedCursoData, setSelectedCursoData] = useState<{
    curso_nombre: string;
    estudiantes: CursoEstudiante[];
    competencias: Array<{ nombre: string; porcentaje: number }>;
  } | null>(null);

  const { data: salones } = useQuery({
    queryKey: ["salones-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salones")
        .select("id, codigo, nombre, grado, seccion, nivel")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: cursosPorSalon, isLoading } = useQuery({
    queryKey: ["cursos-por-salon", selectedSalon],
    queryFn: async () => {
      if (selectedSalon === "all") return [];

      // Obtener los cursos del salón
      const { data: salonCursos, error: errorSalonCursos } = await supabase
        .from("salon_cursos")
        .select(`
          id,
          curso_id,
          cursos(id, nombre, codigo)
        `)
        .eq("salon_id", selectedSalon)
        .eq("activo", true);

      if (errorSalonCursos) throw errorSalonCursos;

      // Para cada curso, obtener estudiantes y promedios
      const cursosConDatos = await Promise.all(
        (salonCursos || []).map(async (sc: any) => {
          const cursoId = sc.cursos.id;

          // Obtener estudiantes matriculados en este curso
          const { data: matriculas, error: errorMatriculas } = await supabase
            .from("matriculas")
            .select(`
              id,
              estudiante_id,
              estudiantes(nombres, apellidos),
              estado_academico(promedio)
            `)
            .eq("curso_id", cursoId)
            .eq("estado", "activa");

          if (errorMatriculas) throw errorMatriculas;

          // Calcular promedio general de todos los estudiantes
          const promedios = matriculas?.map((m: any) => 
            Number(m.estado_academico?.[0]?.promedio || 0)
          ) || [];
          
          const promedioGeneral = promedios.length > 0
            ? promedios.reduce((a, b) => a + b, 0) / promedios.length
            : 0;

          return {
            salon_curso_id: sc.id,
            curso_id: cursoId,
            curso_nombre: sc.cursos.nombre,
            curso_codigo: sc.cursos.codigo,
            total_estudiantes: matriculas?.length || 0,
            promedio_general: promedioGeneral,
            matriculas: matriculas || [],
          };
        })
      );

      return cursosConDatos;
    },
    enabled: selectedSalon !== "all",
  });

  const handleVerEstudiantes = async (curso: any) => {
    try {
      // Obtener competencias del curso
      const { data: competencias, error: errorComp } = await supabase
        .from("competencias")
        .select("id, nombre, porcentaje")
        .eq("salon_curso_id", curso.salon_curso_id);

      if (errorComp) throw errorComp;

      // Procesar cada estudiante con sus notas por competencia
      const estudiantesConNotas = await Promise.all(
        curso.matriculas.map(async (matricula: any) => {
          const notasPorCompetencia = await Promise.all(
            (competencias || []).map(async (comp: any) => {
              // Buscar evaluaciones del estudiante en esta competencia
              const { data: evaluaciones } = await supabase
                .from("evaluaciones")
                .select("nota")
                .eq("matricula_id", matricula.id)
                .eq("tipo_evaluacion", comp.nombre);

              const nota = evaluaciones && evaluaciones.length > 0
                ? Number(evaluaciones[0].nota)
                : 0;

              return {
                competencia: comp.nombre,
                nota: nota,
                porcentaje: Number(comp.porcentaje),
              };
            })
          );

          return {
            estudiante_id: matricula.estudiante_id,
            nombres: matricula.estudiantes.nombres,
            apellidos: matricula.estudiantes.apellidos,
            promedio: Number(matricula.estado_academico?.[0]?.promedio || 0),
            notas: notasPorCompetencia,
          };
        })
      );

      setSelectedCursoData({
        curso_nombre: curso.curso_nombre,
        estudiantes: estudiantesConNotas,
        competencias: competencias || [],
      });
      setViewCursoModal(true);
    } catch (error) {
      console.error("Error al cargar datos del curso:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Académico - Rendimiento por Salón</CardTitle>
                <CardDescription>Selecciona un salón para ver el rendimiento de sus cursos</CardDescription>
              </div>
            </div>
            <div className="w-64">
              <Select value={selectedSalon} onValueChange={setSelectedSalon}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un salón" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seleccionar salón</SelectItem>
                  {salones?.map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      {salon.codigo} - {salon.grado} {salon.seccion} ({salon.nivel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSalon === "all" ? (
            <div className="text-center py-12 text-muted-foreground">
              Seleccione un salón para ver el rendimiento académico de sus cursos
            </div>
          ) : isLoading ? (
            <p>Cargando cursos...</p>
          ) : cursosPorSalon && cursosPorSalon.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Estudiantes</TableHead>
                  <TableHead>Promedio General</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursosPorSalon.map((curso: any) => (
                  <TableRow key={curso.curso_id}>
                    <TableCell className="font-medium">{curso.curso_codigo}</TableCell>
                    <TableCell>{curso.curso_nombre}</TableCell>
                    <TableCell>{curso.total_estudiantes}</TableCell>
                    <TableCell>
                      <span className={`text-lg font-bold ${
                        curso.promedio_general >= 10.5 ? "text-green-600" : "text-red-600"
                      }`}>
                        {curso.promedio_general.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerEstudiantes(curso)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Estudiantes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay cursos asignados a este salón
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para ver estudiantes del curso */}
      <Dialog open={viewCursoModal} onOpenChange={setViewCursoModal}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCursoData?.curso_nombre} - Estudiantes y Notas
            </DialogTitle>
          </DialogHeader>
          
          {selectedCursoData && (
            <div className="space-y-4">
              {selectedCursoData.competencias.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Competencias:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCursoData.competencias.map((comp, idx) => (
                      <Badge key={idx} variant="secondary">
                        {comp.nombre} - {comp.porcentaje}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    {selectedCursoData.competencias.map((comp, idx) => (
                      <TableHead key={idx}>
                        {comp.nombre}
                        <br />
                        <span className="text-xs text-muted-foreground">({comp.porcentaje}%)</span>
                      </TableHead>
                    ))}
                    <TableHead>Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCursoData.estudiantes.map((estudiante) => (
                    <TableRow key={estudiante.estudiante_id}>
                      <TableCell>
                        {estudiante.apellidos}, {estudiante.nombres}
                      </TableCell>
                      {estudiante.notas.map((nota, idx) => (
                        <TableCell key={idx}>
                          <span className={`font-semibold ${
                            nota.nota >= 10.5 ? "text-green-600" : "text-red-600"
                          }`}>
                            {nota.nota.toFixed(2)}
                          </span>
                        </TableCell>
                      ))}
                      <TableCell>
                        <span className={`text-lg font-bold ${
                          estudiante.promedio >= 10.5 ? "text-green-600" : "text-red-600"
                        }`}>
                          {estudiante.promedio.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Evaluaciones;
