import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Users, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Cursos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    creditos: 0,
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
      
      setFormData(prev => ({ ...prev, codigo: generarCodigo() }));
    }
  }, [open, cursos]);

  const { data: profesores } = useQuery({
    queryKey: ["profesores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profesores")
        .select("*")
        .eq("estado", "activo");
      if (error) throw error;
      return data;
    },
  });

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
      const stats: Record<string, { total_estudiantes: number; promedio_general: number }> = {};
      if (!cursos) return stats;

      for (const curso of cursos) {
        const { data, error } = await supabase.rpc("obtener_estadisticas_curso", {
          p_curso_id: curso.id,
        });
        if (!error && data) {
          stats[curso.id] = data as { total_estudiantes: number; promedio_general: number };
        }
      }
      return stats;
    },
    enabled: !!cursos,
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
      setFormData({ codigo: "", nombre: "", descripcion: "", creditos: 0, nivel: "" });
    },
    onError: (error) => {
      toast({ title: "Error al registrar curso", description: error.message, variant: "destructive" });
    },
  });

  const assignProfesor = useMutation({
    mutationFn: async ({ cursoId, profesorId }: { cursoId: string; profesorId: string }) => {
      const { data, error } = await supabase.rpc("asignar_profesor_a_curso", {
        p_curso_id: cursoId,
        p_profesor_id: profesorId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      toast({ title: "Profesor asignado exitosamente" });
      setAssignOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error al asignar profesor", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCurso.mutate(formData);
  };

  const handleAssign = (profesorId: string) => {
    if (selectedCurso && profesorId) {
      assignProfesor.mutate({ cursoId: selectedCurso, profesorId });
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
                  <Label htmlFor="creditos">Créditos</Label>
                  <Input
                    id="creditos"
                    type="number"
                    value={formData.creditos}
                    onChange={(e) => setFormData({ ...formData, creditos: parseInt(e.target.value) })}
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
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCurso(curso.id);
                            setAssignOpen(true);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Asignar Profesor
                        </Button>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <span>
                            Profesor: {curso.profesores ? `${curso.profesores.nombres} ${curso.profesores.apellidos}` : "Sin asignar"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span>Estudiantes: {stats?.total_estudiantes || 0}</span>
                        </div>
                        {stats?.promedio_general !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>Promedio General: </span>
                            <span className={`font-semibold ${
                              stats.promedio_general >= 10.5 ? "text-green-600" : "text-red-600"
                            }`}>
                              {stats.promedio_general.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <h4 className="font-semibold mb-2">Estudiantes Matriculados:</h4>
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
                          <p className="text-muted-foreground">No hay estudiantes matriculados</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}

        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Profesor al Curso</DialogTitle>
              <DialogDescription>Seleccione un profesor para asignar a este curso</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select onValueChange={handleAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores?.map((profesor) => (
                    <SelectItem key={profesor.id} value={profesor.id}>
                      {profesor.nombres} {profesor.apellidos} - {profesor.especialidad || "Sin especialidad"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default Cursos;
