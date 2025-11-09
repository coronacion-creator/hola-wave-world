import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Users, Award, Pencil, Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const Cursos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    nivel: "",
  });

  // Estados para gestión de competencias
  const [competenciasDialogOpen, setCompetenciasDialogOpen] = useState(false);
  const [selectedCursoForComp, setSelectedCursoForComp] = useState<any>(null);
  const [salonCursosForCurso, setSalonCursosForCurso] = useState<any[]>([]);
  const [selectedSalonCurso, setSelectedSalonCurso] = useState<any>(null);
  const [competencias, setCompetencias] = useState<any[]>([]);
  const [competenciaForm, setCompetenciaForm] = useState({ nombre: "", descripcion: "", porcentaje: "" });
  const [editingCompetencia, setEditingCompetencia] = useState<any>(null);

  const { data: cursos, isLoading } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select(`
          *,
          profesores(nombres, apellidos, especialidad)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Generar código automático cuando se abre el diálogo
  useEffect(() => {
    if (open && cursos) {
      const generarCodigo = () => {
        if (cursos.length === 0) return "001";
        
        // Obtener todos los códigos numéricos
        const codigos = cursos
          .map(c => parseInt(c.codigo))
          .filter(num => !isNaN(num))
          .sort((a, b) => b - a);
        
        const ultimoCodigo = codigos[0] || 0;
        const nuevoCodigo = (ultimoCodigo + 1).toString().padStart(3, "0");
        return nuevoCodigo;
      };
      
      setFormData(prev => ({ ...prev, codigo: generarCodigo(), nombre: "", descripcion: "", nivel: "" }));
    }
  }, [open, cursos]);

  const { data: matriculas } = useQuery({
    queryKey: ["matriculas-por-curso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni),
          cursos(nombre)
        `)
        .eq("estado", "activa");
      if (error) throw error;
      return data;
    },
  });

  const { data: estadisticas } = useQuery({
    queryKey: ["estadisticas-cursos"],
    queryFn: async () => {
      const stats: Record<string, { total_estudiantes: number }> = {};
      if (!cursos) return stats;

      for (const curso of cursos) {
        const { data, error } = await supabase.rpc("obtener_estadisticas_curso", {
          p_curso_id: curso.id,
        });
        if (!error && data) {
          stats[curso.id] = data as { total_estudiantes: number };
        }
      }
      return stats;
    },
    enabled: !!cursos,
  });

  const { data: competenciasPorCurso } = useQuery({
    queryKey: ["competencias-por-curso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_cursos")
        .select(`
          curso_id,
          competencias(
            id,
            nombre,
            descripcion,
            porcentaje
          )
        `)
        .eq("activo", true);
      
      if (error) throw error;

      // Agrupar competencias por curso_id
      const competenciasByCurso: Record<string, any[]> = {};
      data?.forEach((sc: any) => {
        if (sc.competencias && sc.curso_id) {
          if (!competenciasByCurso[sc.curso_id]) {
            competenciasByCurso[sc.curso_id] = [];
          }
          if (Array.isArray(sc.competencias)) {
            competenciasByCurso[sc.curso_id].push(...sc.competencias);
          } else {
            competenciasByCurso[sc.curso_id].push(sc.competencias);
          }
        }
      });
      
      return competenciasByCurso;
    },
  });

  const createCurso = useMutation({
    mutationFn: async (newCurso: typeof formData) => {
      const { data, error } = await supabase.from("cursos").insert([newCurso]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      toast({ title: "Curso registrado exitosamente" });
      setOpen(false);
      setFormData({ codigo: "", nombre: "", descripcion: "", nivel: "" });
    },
    onError: (error) => {
      toast({ title: "Error al registrar curso", description: error.message, variant: "destructive" });
    },
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCurso.mutate(formData);
  };

  // Funciones para gestión de competencias
  const handleOpenGestionCompetencias = async (curso: any) => {
    setSelectedCursoForComp(curso);
    await loadSalonCursosForCurso(curso.id);
    setCompetenciasDialogOpen(true);
  };

  const loadSalonCursosForCurso = async (cursoId: string) => {
    try {
      const { data, error } = await supabase
        .from("salon_cursos")
        .select("*, salones(codigo, nombre, grado, seccion)")
        .eq("curso_id", cursoId)
        .eq("activo", true);

      if (error) throw error;
      setSalonCursosForCurso(data || []);
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al cargar salones del curso");
    }
  };

  const loadCompetencias = async (salonCursoId: string) => {
    try {
      const { data, error } = await supabase
        .from("competencias")
        .select("*")
        .eq("salon_curso_id", salonCursoId)
        .order("nombre");

      if (error) throw error;
      setCompetencias(data || []);
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al cargar competencias");
    }
  };

  const handleSelectSalonCurso = async (salonCurso: any) => {
    setSelectedSalonCurso(salonCurso);
    await loadCompetencias(salonCurso.id);
  };

  const handleAddCompetencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalonCurso) return;

    try {
      const porcentaje = parseFloat(competenciaForm.porcentaje);
      if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        sonnerToast.error("El porcentaje debe ser entre 0 y 100");
        return;
      }

      // Verificar que la suma de porcentajes no exceda 100
      const sumaActual = competencias
        .filter(c => c.id !== editingCompetencia?.id)
        .reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);
      
      if (sumaActual + porcentaje > 100) {
        sonnerToast.error(`La suma de porcentajes no puede exceder 100%. Actual: ${sumaActual}%`);
        return;
      }

      if (editingCompetencia) {
        const { error } = await supabase
          .from("competencias")
          .update({
            nombre: competenciaForm.nombre,
            descripcion: competenciaForm.descripcion,
            porcentaje: porcentaje,
          })
          .eq("id", editingCompetencia.id);

        if (error) throw error;
        sonnerToast.success("Competencia actualizada");
        setEditingCompetencia(null);
      } else {
        const { error } = await supabase
          .from("competencias")
          .insert({
            salon_curso_id: selectedSalonCurso.id,
            nombre: competenciaForm.nombre,
            descripcion: competenciaForm.descripcion,
            porcentaje: porcentaje,
          });

        if (error) throw error;
        sonnerToast.success("Competencia agregada");
      }
      
      setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
      loadCompetencias(selectedSalonCurso.id);
      queryClient.invalidateQueries({ queryKey: ["competencias-por-curso"] });
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error(editingCompetencia ? "Error al actualizar competencia" : "Error al agregar competencia");
    }
  };

  const handleEditCompetencia = (competencia: any) => {
    setEditingCompetencia(competencia);
    setCompetenciaForm({
      nombre: competencia.nombre,
      descripcion: competencia.descripcion || "",
      porcentaje: competencia.porcentaje.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingCompetencia(null);
    setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
  };

  const validateCompetenciasSuma = () => {
    const sumaTotal = competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);
    return Math.abs(sumaTotal - 100) < 0.01;
  };

  const handleDeleteCompetencia = async (competenciaId: string) => {
    if (!confirm("¿Eliminar esta competencia?")) return;

    try {
      const { error } = await supabase
        .from("competencias")
        .delete()
        .eq("id", competenciaId);

      if (error) throw error;
      sonnerToast.success("Competencia eliminada");
      if (selectedSalonCurso) {
        loadCompetencias(selectedSalonCurso.id);
      }
      queryClient.invalidateQueries({ queryKey: ["competencias-por-curso"] });
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al eliminar competencia");
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Cursos</CardTitle>
              <CardDescription>Gestión de cursos, profesores asignados y estudiantes matriculados</CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Curso</DialogTitle>
                <DialogDescription>Complete los datos del curso</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código (Generado automáticamente)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    readOnly
                    className="bg-muted"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Curso</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel">Nivel</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial">INICIAL</SelectItem>
                      <SelectItem value="primaria">PRIMARIA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Registrar Curso
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando cursos...</p>
        ) : (
          <div className="space-y-4">
            {cursos?.map((curso) => {
              const estudiantesCurso = matriculas?.filter((m) => m.curso_id === curso.id) || [];
              const stats = estadisticas?.[curso.id];
              const competencias = competenciasPorCurso?.[curso.id] || [];
              
              // Eliminar duplicados de competencias por id
              const competenciasUnicas = Array.from(
                new Map(competencias.map((c: any) => [c.id, c])).values()
              );
              
              return (
                <Collapsible key={curso.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                            <CardTitle className="text-lg">{curso.nombre}</CardTitle>
                            <span className="text-sm text-muted-foreground">({curso.codigo})</span>
                          </CollapsibleTrigger>
                          <CardDescription className="mt-1">{curso.descripcion}</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenGestionCompetencias(curso)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Gestionar Competencias
                        </Button>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span>Estudiantes: {stats?.total_estudiantes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-primary" />
                          <span>Competencias: {competenciasUnicas.length}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3">Competencias Asignadas:</h4>
                          {competenciasUnicas.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Competencia</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead>Porcentaje</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {competenciasUnicas.map((comp: any) => (
                                  <TableRow key={comp.id}>
                                    <TableCell className="font-medium">{comp.nombre}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {comp.descripcion || "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary">{comp.porcentaje}%</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">No hay competencias asignadas a este curso</p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Estudiantes Matriculados:</h4>
                          {estudiantesCurso.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>DNI</TableHead>
                                  <TableHead>Nombres</TableHead>
                                  <TableHead>Apellidos</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {estudiantesCurso.map((matricula) => (
                                  <TableRow key={matricula.id}>
                                    <TableCell>{matricula.estudiantes?.dni}</TableCell>
                                    <TableCell>{matricula.estudiantes?.nombres}</TableCell>
                                    <TableCell>{matricula.estudiantes?.apellidos}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">No hay estudiantes matriculados</p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog para gestión de competencias */}
      <Dialog open={competenciasDialogOpen} onOpenChange={(open) => {
        setCompetenciasDialogOpen(open);
        if (!open) {
          setSelectedCursoForComp(null);
          setSalonCursosForCurso([]);
          setSelectedSalonCurso(null);
          setCompetencias([]);
          setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
          setEditingCompetencia(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Competencias - {selectedCursoForComp?.nombre}
            </DialogTitle>
            <DialogDescription>
              Selecciona un salón y gestiona las competencias del curso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selector de Salón */}
            <div>
              <Label>Seleccionar Salón</Label>
              <Select
                value={selectedSalonCurso?.id}
                onValueChange={(value) => {
                  const sc = salonCursosForCurso.find(s => s.id === value);
                  if (sc) handleSelectSalonCurso(sc);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un salón" />
                </SelectTrigger>
                <SelectContent>
                  {salonCursosForCurso.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.salones?.codigo} - {sc.salones?.grado} {sc.salones?.seccion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSalonCurso && (
              <>
                {/* Formulario para agregar/editar competencia */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {editingCompetencia ? "Editar Competencia" : "Agregar Nueva Competencia"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddCompetencia} className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="comp-nombre">Nombre</Label>
                          <Input
                            id="comp-nombre"
                            value={competenciaForm.nombre}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, nombre: e.target.value })}
                            placeholder="Ej: Examen Parcial"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="comp-descripcion">Descripción</Label>
                          <Input
                            id="comp-descripcion"
                            value={competenciaForm.descripcion}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, descripcion: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <Label htmlFor="comp-porcentaje">Porcentaje (%)</Label>
                          <Input
                            id="comp-porcentaje"
                            type="number"
                            step="0.01"
                            value={competenciaForm.porcentaje}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, porcentaje: e.target.value })}
                            placeholder="0-100"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          {editingCompetencia ? "Actualizar" : "Agregar"}
                        </Button>
                        {editingCompetencia && (
                          <Button type="button" variant="outline" onClick={handleCancelEdit}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Lista de competencias */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">
                      Competencias Configuradas
                      {competencias.length > 0 && (
                        <span className={`ml-2 text-sm ${validateCompetenciasSuma() ? 'text-green-600' : 'text-red-600'}`}>
                          (Suma: {competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0).toFixed(2)}%)
                        </span>
                      )}
                    </h4>
                  </div>
                  
                  {competencias.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Porcentaje</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competencias.map((comp) => (
                          <TableRow key={comp.id}>
                            <TableCell className="font-medium">{comp.nombre}</TableCell>
                            <TableCell>{comp.descripcion || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{parseFloat(comp.porcentaje).toFixed(2)}%</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCompetencia(comp)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCompetencia(comp.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No hay competencias configuradas para este salón
                    </p>
                  )}
                </div>

                {competencias.length > 0 && !validateCompetenciasSuma() && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    ⚠️ La suma de los porcentajes debe ser exactamente 100%
                  </div>
                )}
              </>
            )}

            {!selectedSalonCurso && salonCursosForCurso.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Este curso no está asignado a ningún salón
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Cursos;
