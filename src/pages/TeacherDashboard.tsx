import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  LogOut,
  Loader2,
  Eye,
  Save,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Salon {
  id: string;
  codigo: string;
  nombre: string;
  nivel: string;
  grado: string;
  seccion: string;
  capacidad: number;
  estudiantes_count?: number;
}

interface Estudiante {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
}

interface Asistencia {
  estudiante_id: string;
  estado: string;
}

interface SalonCurso {
  id: string;
  cursos: {
    id: string;
    codigo: string;
    nombre: string;
  };
}

interface Competencia {
  id: string;
  nombre: string;
  descripcion: string;
  porcentaje: number;
}

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("salones");
  const [salones, setSalones] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  // Estados para ver estudiantes
  const [verEstudiantesOpen, setVerEstudiantesOpen] = useState(false);
  const [estudiantesDelSalon, setEstudiantesDelSalon] = useState<Estudiante[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);

  // Estados para asistencia
  const [selectedSalonAsistencia, setSelectedSalonAsistencia] = useState("");
  const [fechaAsistencia, setFechaAsistencia] = useState<Date>(new Date());
  const [estudiantesAsistencia, setEstudiantesAsistencia] = useState<Estudiante[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // Estados para evaluaciones
  const [salonCursos, setSalonCursos] = useState<SalonCurso[]>([]);
  const [selectedSalonEval, setSelectedSalonEval] = useState("");
  const [selectedCursoEval, setSelectedCursoEval] = useState("");
  const [competenciasEval, setCompetenciasEval] = useState<Competencia[]>([]);
  const [estudiantesEval, setEstudiantesEval] = useState<Estudiante[]>([]);
  const [notas, setNotas] = useState<Record<string, Record<string, string>>>({});
  const [nombreEvaluacion, setNombreEvaluacion] = useState("");
  const [evaluacionesGuardadas, setEvaluacionesGuardadas] = useState<any[]>([]);
  const [editandoEvaluacion, setEditandoEvaluacion] = useState<string | null>(null);
  const [verNotasEstudianteModal, setVerNotasEstudianteModal] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);

  // Estados para estadísticas
  const [selectedSalonStats, setSelectedSalonStats] = useState("");
  const [statsViewType, setStatsViewType] = useState<"general" | "curso">("general");
  const [selectedCursoStats, setSelectedCursoStats] = useState("");
  const [estadisticasData, setEstadisticasData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSalonesProfesor();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSalonAsistencia) {
      loadEstudiantesSalon(selectedSalonAsistencia);
    }
  }, [selectedSalonAsistencia]);

  useEffect(() => {
    if (selectedSalonEval) {
      loadCursosSalon(selectedSalonEval);
    }
  }, [selectedSalonEval]);

  useEffect(() => {
    if (selectedCursoEval) {
      loadCompetenciasCurso(selectedCursoEval);
      loadEstudiantesSalon(selectedSalonEval);
      loadEvaluacionesExistentes();
    }
  }, [selectedCursoEval, estudiantesEval]);

  useEffect(() => {
    if (selectedSalonStats) {
      loadEstadisticas();
      // También cargar los cursos del salón para el selector
      if (statsViewType === "curso") {
        loadCursosSalon(selectedSalonStats);
      }
    }
  }, [selectedSalonStats, statsViewType, selectedCursoStats]);

  const loadSalonesProfesor = async () => {
    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("profesor_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!profile?.profesor_id) {
        toast({
          title: "Error",
          description: "No se encontró perfil de profesor vinculado",
          variant: "destructive",
        });
        return;
      }

      const { data: salonesData, error } = await supabase
        .from("salones")
        .select("*")
        .eq("profesor_id", profile.profesor_id)
        .eq("activo", true);

      if (error) throw error;

      const salonesConEstudiantes = await Promise.all(
        (salonesData || []).map(async (salon) => {
          const { count } = await supabase
            .from("estudiantes_salones")
            .select("*", { count: "exact", head: true })
            .eq("salon_id", salon.id)
            .eq("activo", true);

          return {
            ...salon,
            estudiantes_count: count || 0,
          };
        }),
      );

      setSalones(salonesConEstudiantes);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los salones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerEstudiantes = async (salon: Salon) => {
    try {
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id, estudiantes(id, dni, nombres, apellidos)")
        .eq("salon_id", salon.id)
        .eq("activo", true);

      if (error) throw error;

      const estudiantes = (data?.map((item) => item.estudiantes).filter(Boolean) as Estudiante[]) || [];
      setEstudiantesDelSalon(estudiantes);
      setSelectedSalon(salon);
      setVerEstudiantesOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar estudiantes",
        variant: "destructive",
      });
    }
  };

  const loadEstudiantesSalon = async (salonId: string) => {
    try {
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id, estudiantes(id, dni, nombres, apellidos)")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;

      const estudiantes = (data?.map((item) => item.estudiantes).filter(Boolean) as Estudiante[]) || [];
      // Ordenar alfabéticamente por apellidos
      estudiantes.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
      setEstudiantesAsistencia(estudiantes);
      setEstudiantesEval(estudiantes);

      // Inicializar asistencias como vacío
      const asistenciasInit: Record<string, string> = {};
      estudiantes.forEach((est) => {
        asistenciasInit[est.id] = "";
      });
      setAsistencias(asistenciasInit);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar estudiantes",
        variant: "destructive",
      });
    }
  };

  const handleGuardarAsistencia = async () => {
    if (!selectedSalonAsistencia) {
      toast({
        title: "Error",
        description: "Selecciona un salón",
        variant: "destructive",
      });
      return;
    }

    try {
      // Obtener todas las matrículas activas de los estudiantes en este salón
      const { data: matriculas, error: matriculasError } = await supabase
        .from("matriculas")
        .select("id, estudiante_id")
        .in("estudiante_id", Object.keys(asistencias))
        .eq("estado", "activa");

      if (matriculasError) throw matriculasError;

      const asistenciasToInsert = Object.entries(asistencias)
        .filter(([_, estado]) => estado !== "")
        .map(([estudianteId, estado]) => {
          const matricula = matriculas?.find((m) => m.estudiante_id === estudianteId);
          return {
            matricula_id: matricula?.id,
            fecha: format(fechaAsistencia, "yyyy-MM-dd"),
            presente: estado === "PRESENTE",
            justificacion: estado === "TARDE" ? "Llegó tarde" : estado === "FALTA" ? "Falta sin justificar" : null,
          };
        })
        .filter((a) => a.matricula_id); // Solo insertar si existe matrícula

      if (asistenciasToInsert.length === 0) {
        toast({
          title: "Advertencia",
          description: "No hay asistencias para guardar",
        });
        return;
      }

      const { error } = await supabase.from("asistencias").insert(asistenciasToInsert);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Asistencia guardada correctamente",
      });

      // Limpiar formulario
      const asistenciasInit: Record<string, string> = {};
      estudiantesAsistencia.forEach((est) => {
        asistenciasInit[est.id] = "";
      });
      setAsistencias(asistenciasInit);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar asistencia",
        variant: "destructive",
      });
    }
  };

  const loadCursosSalon = async (salonId: string) => {
    try {
      const { data, error } = await supabase
        .from("salon_cursos")
        .select("id, cursos(id, codigo, nombre)")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;
      setSalonCursos((data as SalonCurso[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar cursos",
        variant: "destructive",
      });
    }
  };

  const loadCompetenciasCurso = async (salonCursoId: string) => {
    try {
      const { data, error } = await supabase
        .from("competencias")
        .select("*")
        .eq("salon_curso_id", salonCursoId)
        .order("nombre");

      if (error) throw error;
      setCompetenciasEval(data || []);

      // Inicializar notas
      const notasInit: Record<string, Record<string, string>> = {};
      estudiantesEval.forEach((est) => {
        notasInit[est.id] = {};
        (data || []).forEach((comp) => {
          notasInit[est.id][comp.id] = "";
        });
      });
      setNotas(notasInit);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar competencias",
        variant: "destructive",
      });
    }
  };

  const loadEstadisticas = async () => {
    if (!selectedSalonStats) return;

    try {
      if (statsViewType === "general") {
        // Estadísticas generales del salón (todos los cursos)
        const { data: salonCursosData } = await supabase
          .from("salon_cursos")
          .select("curso_id, cursos(nombre)")
          .eq("salon_id", selectedSalonStats)
          .eq("activo", true);

        if (!salonCursosData) return;

        const cursosIds = salonCursosData.map((sc: any) => sc.curso_id);

        // Obtener promedios de notas por curso
        const { data: matriculas } = await supabase
          .from("matriculas")
          .select(
            `
            id,
            curso_id,
            cursos(nombre),
            estado_academico(promedio)
          `,
          )
          .in("curso_id", cursosIds)
          .eq("estado", "activa");

        // Calcular distribución de promedios
        const aprobados = matriculas?.filter((m) => Number(m.estado_academico?.[0]?.promedio || 0) >= 10.5).length || 0;
        const reprobados = matriculas?.filter((m) => Number(m.estado_academico?.[0]?.promedio || 0) < 10.5).length || 0;

        // Obtener asistencias
        const { data: asistencias } = await supabase
          .from("asistencias")
          .select(
            `
            presente,
            matriculas!inner(id, curso_id)
          `,
          )
          .in("matriculas.curso_id", cursosIds);

        const presente = asistencias?.filter((a) => a.presente === true).length || 0;
        const ausente = asistencias?.filter((a) => a.presente === false).length || 0;

        setEstadisticasData({
          notasData: [
            { name: "Aprobados", value: aprobados, color: "#10b981" },
            { name: "Reprobados", value: reprobados, color: "#ef4444" },
          ],
          asistenciasData: [
            { name: "Presente", value: presente, color: "#10b981" },
            { name: "Ausente", value: ausente, color: "#ef4444" },
          ],
        });
      } else {
        // Estadísticas por curso específico
        if (!selectedCursoStats) return;

        const { data: matriculas } = await supabase
          .from("matriculas")
          .select(
            `
            id,
            estudiantes(id),
            estado_academico(promedio)
          `,
          )
          .eq("curso_id", selectedCursoStats)
          .eq("estado", "activa");

        const aprobados = matriculas?.filter((m) => Number(m.estado_academico?.[0]?.promedio || 0) >= 10.5).length || 0;
        const reprobados = matriculas?.filter((m) => Number(m.estado_academico?.[0]?.promedio || 0) < 10.5).length || 0;

        const { data: asistencias } = await supabase
          .from("asistencias")
          .select(
            `
            presente,
            matriculas!inner(id, curso_id)
          `,
          )
          .eq("matriculas.curso_id", selectedCursoStats);

        const presente = asistencias?.filter((a) => a.presente === true).length || 0;
        const ausente = asistencias?.filter((a) => a.presente === false).length || 0;

        setEstadisticasData({
          notasData: [
            { name: "Aprobados", value: aprobados, color: "#10b981" },
            { name: "Reprobados", value: reprobados, color: "#ef4444" },
          ],
          asistenciasData: [
            { name: "Presente", value: presente, color: "#10b981" },
            { name: "Ausente", value: ausente, color: "#ef4444" },
          ],
        });
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const loadEvaluacionesExistentes = async () => {
    try {
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select(
          `
          id,
          estudiante_id,
          estudiantes(nombres, apellidos, dni)
        `,
        )
        .in(
          "estudiante_id",
          estudiantesEval.map((e) => e.id),
        )
        .eq("estado", "activa");

      if (!matriculas) return;

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("*")
        .in(
          "matricula_id",
          matriculas.map((m) => m.id),
        );

      // Enriquecer evaluaciones con datos del estudiante
      const evaluacionesConEstudiante = (evaluaciones || []).map((ev) => {
        const matricula = matriculas.find((m) => m.id === ev.matricula_id);
        return {
          ...ev,
          estudiante: matricula?.estudiantes,
        };
      });

      setEvaluacionesGuardadas(evaluacionesConEstudiante);
    } catch (error) {
      console.error("Error cargando evaluaciones:", error);
    }
  };

  const handleVerNotasEstudiante = (estudianteId: string) => {
    const estudiante = estudiantesEval.find((e) => e.id === estudianteId);
    const evaluacionesEstudiante = evaluacionesGuardadas.filter((ev) => ev.estudiante?.dni === estudiante?.dni);

    setEstudianteSeleccionado({
      ...estudiante,
      evaluaciones: evaluacionesEstudiante,
    });
    setVerNotasEstudianteModal(true);
  };

  const handleEditarEvaluacion = async (evaluacionId: string, nuevaNota: number) => {
    try {
      const { error } = await supabase.from("evaluaciones").update({ nota: nuevaNota }).eq("id", evaluacionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evaluación actualizada correctamente",
      });

      loadEvaluacionesExistentes();
      setEditandoEvaluacion(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar evaluación",
        variant: "destructive",
      });
    }
  };

  const handleEliminarEvaluacion = async (evaluacionId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta evaluación?")) return;

    try {
      const { error } = await supabase.from("evaluaciones").delete().eq("id", evaluacionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evaluación eliminada correctamente",
      });

      // Actualizar el estado local inmediatamente
      setEvaluacionesGuardadas((prev) => prev.filter((ev) => ev.id !== evaluacionId));

      // Actualizar estudiante seleccionado si el modal está abierto
      if (estudianteSeleccionado) {
        setEstudianteSeleccionado((prev) => ({
          ...prev,
          evaluaciones: prev.evaluaciones.filter((ev: any) => ev.id !== evaluacionId),
        }));
      }

      await loadEvaluacionesExistentes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar evaluación",
        variant: "destructive",
      });
    }
  };

  const handleGuardarEvaluaciones = async () => {
    if (!selectedSalonEval || !selectedCursoEval) {
      toast({
        title: "Error",
        description: "Selecciona un salón y curso",
        variant: "destructive",
      });
      return;
    }

    if (!nombreEvaluacion.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar un nombre para la evaluación",
        variant: "destructive",
      });
      return;
    }

    try {
      // Obtener matrículas activas
      const { data: matriculas, error: matriculasError } = await supabase
        .from("matriculas")
        .select("id, estudiante_id")
        .in("estudiante_id", Object.keys(notas))
        .eq("estado", "activa");

      if (matriculasError) throw matriculasError;

      const evaluacionesToInsert: any[] = [];

      Object.entries(notas).forEach(([estudianteId, competenciasNotas]) => {
        const matricula = matriculas?.find((m) => m.estudiante_id === estudianteId);
        if (!matricula) return;

        Object.entries(competenciasNotas).forEach(([competenciaId, nota]) => {
          if (nota !== "") {
            const competencia = competenciasEval.find((c) => c.id === competenciaId);
            evaluacionesToInsert.push({
              matricula_id: matricula.id,
              tipo_evaluacion: `${nombreEvaluacion} - ${competencia?.nombre || "Evaluación"}`,
              nota: parseFloat(nota),
              peso: competencia ? competencia.porcentaje / 100 : 1,
              fecha_evaluacion: format(new Date(), "yyyy-MM-dd"),
            });
          }
        });
      });

      if (evaluacionesToInsert.length === 0) {
        toast({
          title: "Advertencia",
          description: "No hay evaluaciones para guardar",
        });
        return;
      }

      const { error } = await supabase.from("evaluaciones").insert(evaluacionesToInsert);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evaluaciones guardadas correctamente",
      });

      loadEvaluacionesExistentes();

      // Limpiar formulario
      setNombreEvaluacion("");
      const notasInit: Record<string, Record<string, string>> = {};
      estudiantesEval.forEach((est) => {
        notasInit[est.id] = {};
        competenciasEval.forEach((comp) => {
          notasInit[est.id][comp.id] = "";
        });
      });
      setNotas(notasInit);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar evaluaciones",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-green-50/30 dark:from-background dark:via-blue-950/20 dark:to-green-950/20">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Panel de Profesor
              </h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión Educativa</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-2 h-auto p-1">
            <TabsTrigger value="salones" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Salones</span>
            </TabsTrigger>
            <TabsTrigger value="asistencia" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Asistencia</span>
            </TabsTrigger>
            <TabsTrigger value="evaluaciones" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Evaluaciones</span>
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estadísticas</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="salones">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Salones Asignados</CardTitle>
                  <CardDescription>Gestiona tus salones y estudiantes</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : salones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tienes salones asignados actualmente
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {salones.map((salon) => (
                        <Card key={salon.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{salon.nombre || `Salón ${salon.codigo}`}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{salon.codigo}</p>
                              </div>
                              <Badge variant="secondary">{salon.nivel}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 mb-4">
                              <p className="text-sm">
                                <span className="text-muted-foreground">Grado:</span> {salon.grado}
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Sección:</span> {salon.seccion}
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Estudiantes:</span> {salon.estudiantes_count} /{" "}
                                {salon.capacidad}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleVerEstudiantes(salon)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Estudiantes
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="asistencia">
              <Card>
                <CardHeader>
                  <CardTitle>Control de Asistencia</CardTitle>
                  <CardDescription>Registra la asistencia de tus estudiantes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Seleccionar Salón</Label>
                      <Select value={selectedSalonAsistencia} onValueChange={setSelectedSalonAsistencia}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar salón" />
                        </SelectTrigger>
                        <SelectContent>
                          {salones.map((salon) => (
                            <SelectItem key={salon.id} value={salon.id}>
                              {salon.codigo} - {salon.nombre || `Salón ${salon.grado}${salon.seccion}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowCalendar(!showCalendar)}
                      >
                        {format(fechaAsistencia, "dd/MM/yyyy")}
                      </Button>
                      {showCalendar && (
                        <div className="absolute z-10 mt-2 bg-background border rounded-lg shadow-lg">
                          <Calendar
                            mode="single"
                            selected={fechaAsistencia}
                            onSelect={(date) => {
                              if (date) {
                                setFechaAsistencia(date);
                                setShowCalendar(false);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSalonAsistencia && estudiantesAsistencia.length > 0 && (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Apellidos y Nombres</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {estudiantesAsistencia.map((estudiante, index) => (
                            <TableRow key={estudiante.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                {estudiante.apellidos}, {estudiante.nombres}
                              </TableCell>
                              <TableCell>{estudiante.dni}</TableCell>
                              <TableCell>
                                <Select
                                  value={asistencias[estudiante.id] || ""}
                                  onValueChange={(value) =>
                                    setAsistencias((prev) => ({ ...prev, [estudiante.id]: value }))
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PRESENTE">PRESENTE</SelectItem>
                                    <SelectItem value="TARDE">TARDE</SelectItem>
                                    <SelectItem value="FALTA">FALTA</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="flex justify-end">
                        <Button onClick={handleGuardarAsistencia}>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Asistencia
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evaluaciones">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluaciones</CardTitle>
                  <CardDescription>Registra las evaluaciones por competencias</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Seleccionar Salón</Label>
                      <Select value={selectedSalonEval} onValueChange={setSelectedSalonEval}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar salón" />
                        </SelectTrigger>
                        <SelectContent>
                          {salones.map((salon) => (
                            <SelectItem key={salon.id} value={salon.id}>
                              {salon.codigo} - {salon.nombre || `Salón ${salon.grado}${salon.seccion}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Seleccionar Curso</Label>
                      <Select
                        value={selectedCursoEval}
                        onValueChange={setSelectedCursoEval}
                        disabled={!selectedSalonEval}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar curso" />
                        </SelectTrigger>
                        <SelectContent>
                          {salonCursos.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>
                              {sc.cursos.codigo} - {sc.cursos.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedCursoEval && competenciasEval.length > 0 && estudiantesEval.length > 0 && (
                    <div className="space-y-8">
                      {/* Evaluaciones Guardadas - Vista por Estudiante - SIEMPRE VISIBLE */}
                      <Card className="border-2">
                        <CardHeader>
                          <CardTitle className="text-xl">Evaluaciones Registradas</CardTitle>
                          <CardDescription>Consulta las evaluaciones guardadas por estudiante</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {evaluacionesGuardadas.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No hay evaluaciones registradas aún
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>N°</TableHead>
                                  <TableHead>Estudiante</TableHead>
                                  <TableHead>DNI</TableHead>
                                  <TableHead>Evaluaciones</TableHead>
                                  <TableHead>Promedio</TableHead>
                                  <TableHead className="text-center">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {estudiantesEval.map((estudiante, index) => {
                                  // Obtener evaluaciones del estudiante
                                  const evaluacionesEstudiante = evaluacionesGuardadas.filter(
                                    (ev) => ev.estudiante?.dni === estudiante.dni,
                                  );

                                  if (evaluacionesEstudiante.length === 0) return null;

                                  // Calcular promedio general correctamente
                                  // 1. Agrupar evaluaciones por nombre
                                  const evaluacionesPorNombre: Record<string, any[]> = {};
                                  evaluacionesEstudiante.forEach((ev: any) => {
                                    const nombreEval = ev.tipo_evaluacion.split(" - ")[0] || ev.tipo_evaluacion;
                                    if (!evaluacionesPorNombre[nombreEval]) {
                                      evaluacionesPorNombre[nombreEval] = [];
                                    }
                                    evaluacionesPorNombre[nombreEval].push(ev);
                                  });

                                  // 2. Calcular promedio por cada evaluación
                                  const promediosPorEvaluacion = Object.values(evaluacionesPorNombre).map((evals) => {
                                    return evals.reduce((acc, ev) => acc + Number(ev.nota) * Number(ev.peso), 0);
                                  });

                                  // 3. Calcular promedio general (promedio de los promedios)
                                  const promedio =
                                    promediosPorEvaluacion.length > 0
                                      ? promediosPorEvaluacion.reduce((acc, p) => acc + p, 0) /
                                        promediosPorEvaluacion.length
                                      : 0;

                                  return (
                                    <TableRow key={estudiante.id}>
                                      <TableCell className="font-medium">{index + 1}</TableCell>
                                      <TableCell>
                                        {estudiante.apellidos}, {estudiante.nombres}
                                      </TableCell>
                                      <TableCell>{estudiante.dni}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">
                                          {evaluacionesEstudiante.length} nota
                                          {evaluacionesEstudiante.length !== 1 ? "s" : ""}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <span
                                          className={`text-lg font-bold ${
                                            promedio >= 10.5 ? "text-green-600" : "text-red-600"
                                          }`}
                                        >
                                          {promedio.toFixed(2)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center justify-center">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleVerNotasEstudiante(estudiante.id)}
                                          >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver Notas
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>

                      {/* Formulario de Nueva Evaluación */}
                      <Card className="border-2 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-xl">Registrar Nuevas Evaluaciones</CardTitle>
                          <CardDescription>Ingresa las notas de los estudiantes por competencia</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Campo para nombre de evaluación */}
                          <div className="bg-muted p-4 rounded-lg">
                            <Label htmlFor="nombreEvaluacion" className="text-base font-semibold">
                              Nombre de la Evaluación *
                            </Label>
                            <Input
                              id="nombreEvaluacion"
                              type="text"
                              placeholder="Ej: Examen Parcial 1, Práctica Calificada, etc."
                              value={nombreEvaluacion}
                              onChange={(e) => setNombreEvaluacion(e.target.value)}
                              className="mt-2"
                            />
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>Estudiante</TableHead>
                                  {competenciasEval.map((comp) => (
                                    <TableHead key={comp.id}>
                                      <div>
                                        <div className="font-semibold">{comp.nombre}</div>
                                        <div className="text-xs text-muted-foreground">{comp.porcentaje}%</div>
                                      </div>
                                    </TableHead>
                                  ))}
                                  <TableHead>
                                    <div className="font-semibold text-primary">Promedio</div>
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {estudiantesEval.map((estudiante, index) => {
                                  // Calcular promedio ponderado
                                  const calcularPromedio = () => {
                                    const notasEstudiante = notas[estudiante.id] || {};
                                    let sumaNotas = 0;
                                    let sumaPorcentajes = 0;

                                    competenciasEval.forEach((comp) => {
                                      const nota = parseFloat(notasEstudiante[comp.id] || "0");
                                      const porcentaje = parseFloat(comp.porcentaje.toString());
                                      if (!isNaN(nota) && !isNaN(porcentaje)) {
                                        sumaNotas += (nota * porcentaje) / 100;
                                        sumaPorcentajes += porcentaje;
                                      }
                                    });

                                    return sumaPorcentajes > 0 ? sumaNotas : 0;
                                  };

                                  const promedio = calcularPromedio();

                                  return (
                                    <TableRow key={estudiante.id}>
                                      <TableCell>{index + 1}</TableCell>
                                      <TableCell>
                                        {estudiante.apellidos}, {estudiante.nombres}
                                      </TableCell>
                                      {competenciasEval.map((comp) => (
                                        <TableCell key={comp.id}>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="20"
                                            className="w-20"
                                            value={notas[estudiante.id]?.[comp.id] || ""}
                                            onChange={(e) =>
                                              setNotas((prev) => ({
                                                ...prev,
                                                [estudiante.id]: { ...prev[estudiante.id], [comp.id]: e.target.value },
                                              }))
                                            }
                                            placeholder="0-20"
                                          />
                                        </TableCell>
                                      ))}
                                      <TableCell>
                                        <span
                                          className={`text-lg font-bold ${
                                            promedio >= 10.5 ? "text-green-600" : "text-red-600"
                                          }`}
                                        >
                                          {promedio.toFixed(2)}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setNombreEvaluacion("");
                                const notasInit: Record<string, Record<string, string>> = {};
                                estudiantesEval.forEach((est) => {
                                  notasInit[est.id] = {};
                                  competenciasEval.forEach((comp) => {
                                    notasInit[est.id][comp.id] = "";
                                  });
                                });
                                setNotas(notasInit);
                              }}
                            >
                              Limpiar
                            </Button>
                            <Button onClick={handleGuardarEvaluaciones}>
                              <Save className="h-4 w-4 mr-2" />
                              Guardar Evaluaciones
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {selectedCursoEval && competenciasEval.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay competencias configuradas para este curso
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="estadisticas">
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas del Aula</CardTitle>
                  <CardDescription>Visualiza el rendimiento general de tus clases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Selector de Salón */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Seleccionar Salón</Label>
                      <Select
                        value={selectedSalonStats}
                        onValueChange={(value) => {
                          setSelectedSalonStats(value);
                          setStatsViewType("general");
                          setSelectedCursoStats("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un salón" />
                        </SelectTrigger>
                        <SelectContent>
                          {salones.map((salon) => (
                            <SelectItem key={salon.id} value={salon.id}>
                              {salon.codigo} - {salon.grado} {salon.seccion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSalonStats && (
                      <div>
                        <Label>Tipo de Vista</Label>
                        <Select
                          value={statsViewType}
                          onValueChange={(value: "general" | "curso") => {
                            setStatsViewType(value);
                            if (value === "general") {
                              setSelectedCursoStats("");
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General del Salón</SelectItem>
                            <SelectItem value="curso">Por Curso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Selector de Curso (solo si es por curso) */}
                  {statsViewType === "curso" && selectedSalonStats && (
                    <div>
                      <Label>Seleccionar Curso</Label>
                      <Select value={selectedCursoStats} onValueChange={setSelectedCursoStats}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un curso" />
                        </SelectTrigger>
                        <SelectContent>
                          {salonCursos
                            .filter((sc) => {
                              const salon = salones.find((s) => s.id === selectedSalonStats);
                              return salon;
                            })
                            .map((sc) => (
                              <SelectItem key={sc.id} value={sc.cursos.id}>
                                {sc.cursos.nombre} ({sc.cursos.codigo})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Gráficos */}
                  {estadisticasData && (statsViewType === "general" || selectedCursoStats) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Gráfico de Notas */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Rendimiento por Notas</CardTitle>
                          <CardDescription>Distribución de aprobados y reprobados</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={estadisticasData.notasData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value, percent }) =>
                                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {estadisticasData.notasData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Gráfico de Asistencias */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Asistencias</CardTitle>
                          <CardDescription>Distribución de asistencias registradas</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={estadisticasData.asistenciasData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value, percent }) =>
                                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {estadisticasData.asistenciasData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {!selectedSalonStats && (
                    <div className="text-center py-12 text-muted-foreground">
                      Selecciona un salón para ver las estadísticas
                    </div>
                  )}

                  {statsViewType === "curso" && !selectedCursoStats && selectedSalonStats && (
                    <div className="text-center py-8 text-muted-foreground">
                      Selecciona un curso para ver sus estadísticas
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={verEstudiantesOpen} onOpenChange={setVerEstudiantesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estudiantes del Salón {selectedSalon?.codigo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {estudiantesDelSalon.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DNI</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantesDelSalon.map((estudiante) => (
                    <TableRow key={estudiante.id}>
                      <TableCell>{estudiante.dni}</TableCell>
                      <TableCell>{estudiante.nombres}</TableCell>
                      <TableCell>{estudiante.apellidos}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No hay estudiantes asignados a este salón</div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setVerEstudiantesOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para ver notas del estudiante */}
      <Dialog open={verNotasEstudianteModal} onOpenChange={setVerNotasEstudianteModal}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Notas de {estudianteSeleccionado?.apellidos}, {estudianteSeleccionado?.nombres}
            </DialogTitle>
          </DialogHeader>
          {estudianteSeleccionado && (
            <div className="space-y-6">
              {/* Agrupar evaluaciones por nombre */}
              {(() => {
                const evaluacionesPorNombre: Record<string, any[]> = {};

                // Agrupar por el nombre de la evaluación (extraer el nombre antes del " - ")
                estudianteSeleccionado.evaluaciones?.forEach((ev: any) => {
                  const nombreEval = ev.tipo_evaluacion.split(" - ")[0] || ev.tipo_evaluacion;
                  if (!evaluacionesPorNombre[nombreEval]) {
                    evaluacionesPorNombre[nombreEval] = [];
                  }
                  evaluacionesPorNombre[nombreEval].push(ev);
                });

                // Calcular promedios por evaluación
                const promediosPorEvaluacion = Object.entries(evaluacionesPorNombre).map(([nombre, evals]) => {
                  const promedio = evals.reduce((acc, ev) => {
                    return acc + Number(ev.nota) * Number(ev.peso);
                  }, 0);
                  return { nombre, promedio, evaluaciones: evals };
                });

                // Calcular promedio general (promedio de los promedios)
                const promedioGeneral =
                  promediosPorEvaluacion.length > 0
                    ? promediosPorEvaluacion.reduce((acc, item) => acc + item.promedio, 0) /
                      promediosPorEvaluacion.length
                    : 0;

                return (
                  <>
                    {/* Resumen del estudiante */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">DNI</p>
                        <p className="font-semibold">{estudianteSeleccionado.dni}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Evaluaciones</p>
                        <p className="font-semibold">{promediosPorEvaluacion.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Promedio General</p>
                        <p
                          className={`text-2xl font-bold ${
                            promedioGeneral >= 10.5 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {promedioGeneral.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Mostrar cada evaluación con su promedio */}
                    {promediosPorEvaluacion.map(({ nombre, promedio, evaluaciones }) => (
                      <Card key={nombre} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{nombre}</CardTitle>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Promedio de esta evaluación</p>
                              <p
                                className={`text-xl font-bold ${promedio >= 10.5 ? "text-green-600" : "text-red-600"}`}
                              >
                                {promedio.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Competencia</TableHead>
                                <TableHead>Nota</TableHead>
                                <TableHead>Peso</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {evaluaciones.map((evaluacion: any) => (
                                <TableRow key={evaluacion.id}>
                                  <TableCell>
                                    {evaluacion.tipo_evaluacion.split(" - ")[1] || evaluacion.tipo_evaluacion}
                                  </TableCell>
                                  <TableCell>
                                    {editandoEvaluacion === evaluacion.id ? (
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="20"
                                        defaultValue={evaluacion.nota}
                                        className="w-20"
                                        onBlur={(e) =>
                                          handleEditarEvaluacion(evaluacion.id, parseFloat(e.target.value))
                                        }
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        className={`text-lg font-bold ${
                                          evaluacion.nota >= 10.5 ? "text-green-600" : "text-red-600"
                                        }`}
                                      >
                                        {evaluacion.nota}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>{(evaluacion.peso * 100).toFixed(0)}%</TableCell>
                                  <TableCell>
                                    {evaluacion.fecha_evaluacion
                                      ? format(new Date(evaluacion.fecha_evaluacion), "dd/MM/yyyy")
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditandoEvaluacion(evaluacion.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEliminarEvaluacion(evaluacion.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                );
              })()}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setVerNotasEstudianteModal(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
