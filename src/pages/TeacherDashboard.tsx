import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, ClipboardCheck, BarChart3, LogOut, Loader2, Eye, Save } from "lucide-react";
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
    }
  }, [selectedCursoEval]);

  const loadSalonesProfesor = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('profesor_id')
        .eq('user_id', user?.id)
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
        .from('salones')
        .select('*')
        .eq('profesor_id', profile.profesor_id)
        .eq('activo', true);

      if (error) throw error;

      const salonesConEstudiantes = await Promise.all(
        (salonesData || []).map(async (salon) => {
          const { count } = await supabase
            .from('estudiantes_salones')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salon.id)
            .eq('activo', true);

          return {
            ...salon,
            estudiantes_count: count || 0
          };
        })
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
      
      const estudiantes = data?.map(item => item.estudiantes).filter(Boolean) as Estudiante[] || [];
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
      
      const estudiantes = data?.map(item => item.estudiantes).filter(Boolean) as Estudiante[] || [];
      // Ordenar alfabéticamente por apellidos
      estudiantes.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
      setEstudiantesAsistencia(estudiantes);
      setEstudiantesEval(estudiantes);

      // Inicializar asistencias como vacío
      const asistenciasInit: Record<string, string> = {};
      estudiantes.forEach(est => {
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
          const matricula = matriculas?.find(m => m.estudiante_id === estudianteId);
          return {
            matricula_id: matricula?.id,
            fecha: format(fechaAsistencia, "yyyy-MM-dd"),
            presente: estado === "PRESENTE",
            justificacion: estado === "TARDE" ? "Llegó tarde" : (estado === "FALTA" ? "Falta sin justificar" : null)
          };
        })
        .filter(a => a.matricula_id); // Solo insertar si existe matrícula

      if (asistenciasToInsert.length === 0) {
        toast({
          title: "Advertencia",
          description: "No hay asistencias para guardar",
        });
        return;
      }

      const { error } = await supabase
        .from("asistencias")
        .insert(asistenciasToInsert);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Asistencia guardada correctamente",
      });

      // Limpiar formulario
      const asistenciasInit: Record<string, string> = {};
      estudiantesAsistencia.forEach(est => {
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
      setSalonCursos(data as SalonCurso[] || []);
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
      estudiantesEval.forEach(est => {
        notasInit[est.id] = {};
        (data || []).forEach(comp => {
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

  const handleGuardarEvaluaciones = async () => {
    if (!selectedSalonEval || !selectedCursoEval) {
      toast({
        title: "Error",
        description: "Selecciona un salón y curso",
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
        const matricula = matriculas?.find(m => m.estudiante_id === estudianteId);
        if (!matricula) return;

        Object.entries(competenciasNotas).forEach(([competenciaId, nota]) => {
          if (nota !== "") {
            const competencia = competenciasEval.find(c => c.id === competenciaId);
            evaluacionesToInsert.push({
              matricula_id: matricula.id,
              tipo_evaluacion: competencia?.nombre || "Evaluación",
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

      const { error } = await supabase
        .from("evaluaciones")
        .insert(evaluacionesToInsert);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evaluaciones guardadas correctamente",
      });

      // Limpiar formulario
      const notasInit: Record<string, Record<string, string>> = {};
      estudiantesEval.forEach(est => {
        notasInit[est.id] = {};
        competenciasEval.forEach(comp => {
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
                  <CardDescription>
                    Gestiona tus salones y estudiantes
                  </CardDescription>
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
                                <p className="text-sm text-muted-foreground mt-1">
                                  {salon.codigo}
                                </p>
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
                                <span className="text-muted-foreground">Estudiantes:</span>{" "}
                                {salon.estudiantes_count} / {salon.capacidad}
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
                  <CardDescription>
                    Registra la asistencia de tus estudiantes
                  </CardDescription>
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
                                    setAsistencias(prev => ({ ...prev, [estudiante.id]: value }))
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
                  <CardDescription>
                    Registra las evaluaciones por competencias
                  </CardDescription>
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
                    <>
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
                                    <div className="text-xs text-muted-foreground">
                                      {comp.porcentaje}%
                                    </div>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {estudiantesEval.map((estudiante, index) => (
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
                                        setNotas(prev => ({
                                          ...prev,
                                          [estudiante.id]: {
                                            ...prev[estudiante.id],
                                            [comp.id]: e.target.value
                                          }
                                        }))
                                      }
                                      placeholder="0-20"
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleGuardarEvaluaciones}>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Evaluaciones
                        </Button>
                      </div>
                    </>
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
                  <CardDescription>
                    Visualiza el rendimiento general de tus clases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={verEstudiantesOpen} onOpenChange={setVerEstudiantesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Estudiantes del Salón {selectedSalon?.codigo}
            </DialogTitle>
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
              <div className="text-center py-8 text-muted-foreground">
                No hay estudiantes asignados a este salón
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setVerEstudiantesOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;