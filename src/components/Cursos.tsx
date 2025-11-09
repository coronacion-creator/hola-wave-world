import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Users, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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
                      <SelectItem value="INICIAL">INICIAL</SelectItem>
                      <SelectItem value="PRIMARIA">PRIMARIA</SelectItem>
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
    </Card>
  );
};

export default Cursos;
