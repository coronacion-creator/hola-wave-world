import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, UserCheck, DoorOpen, Eye, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Salon {
  id: string;
  codigo: string;
  nombre: string;
  nivel: string;
  grado: string;
  seccion: string;
  sede_id: string;
  profesor_id: string | null;
  capacidad: number;
  activo: boolean;
  sedes?: { nombre: string };
  profesores?: { nombres: string; apellidos: string };
}

export function Salones() {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [estudiantesDialogOpen, setEstudiantesDialogOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [estudiantesSalon, setEstudiantesSalon] = useState<string[]>([]);
  const [verEstudiantesDialogOpen, setVerEstudiantesDialogOpen] = useState(false);
  const [estudiantesDelSalon, setEstudiantesDelSalon] = useState<any[]>([]);
  const [estudiantesPorSalon, setEstudiantesPorSalon] = useState<Record<string, number>>({});
  const [cursosDialogOpen, setCursosDialogOpen] = useState(false);
  const [cursosSalon, setCursosSalon] = useState<any[]>([]);
  const [competenciasDialogOpen, setCompetenciasDialogOpen] = useState(false);
  const [selectedSalonCurso, setSelectedSalonCurso] = useState<any>(null);
  const [competencias, setCompetencias] = useState<any[]>([]);
  const [competenciaForm, setCompetenciaForm] = useState({ nombre: "", descripcion: "", porcentaje: "" });
  
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    nivel: "INICIAL",
    grado: "3 años",
    seccion: "A",
    sede_id: "",
    profesor_id: "",
    capacidad: 30,
    activo: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (salones.length > 0) {
      loadEstudiantesCounts();
    }
  }, [salones]);

  useEffect(() => {
    if (dialogOpen && !editingSalon && salones) {
      const generarCodigo = () => {
        if (salones.length === 0) return "S-001";
        
        const codigos = salones
          .map(s => parseInt(s.codigo.replace("S-", "")))
          .filter(num => !isNaN(num))
          .sort((a, b) => b - a);
        
        const ultimoCodigo = codigos[0] || 0;
        const nuevoCodigo = `S-${(ultimoCodigo + 1).toString().padStart(3, "0")}`;
        return nuevoCodigo;
      };
      
      setFormData(prev => ({ ...prev, codigo: generarCodigo() }));
    }
  }, [dialogOpen, salones, editingSalon]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [{ data: sedesData }, { data: salonesData }, { data: profesoresData }, { data: estudiantesData }, { data: cursosData }] = await Promise.all([
        supabase.from("sedes").select("*").eq("nombre", "Huancayo"),
        supabase.from("salones").select("*, sedes(nombre), profesores(nombres, apellidos)").order("codigo"),
        supabase.from("profesores").select("*").eq("estado", "activo"),
        supabase.from("estudiantes").select("*").eq("estado", "activo"),
        supabase.from("cursos").select("*").eq("activo", true),
      ]);

      if (sedesData) {
        setSedes(sedesData);
        if (sedesData.length > 0 && !formData.sede_id) {
          setFormData(prev => ({ ...prev, sede_id: sedesData[0].id }));
        }
      }
      if (salonesData) setSalones(salonesData);
      if (profesoresData) setProfesores(profesoresData);
      if (estudiantesData) setEstudiantes(estudiantesData);
      if (cursosData) setCursos(cursosData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadEstudiantesCounts = async () => {
    const counts: Record<string, number> = {};
    for (const salon of salones) {
      const { count } = await supabase
        .from("estudiantes_salones")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salon.id)
        .eq("activo", true);
      counts[salon.id] = count || 0;
    }
    setEstudiantesPorSalon(counts);
  };

  const loadEstudiantesSalon = async (salonId: string) => {
    try {
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;
      setEstudiantesSalon(data?.map(e => e.estudiante_id) || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estudiantes del salón");
    }
  };

  const handleVerEstudiantes = async (salon: Salon) => {
    try {
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id, estudiantes(dni, nombres, apellidos, email)")
        .eq("salon_id", salon.id)
        .eq("activo", true);

      if (error) throw error;
      
      const estudiantesConInfo = data?.map(item => item.estudiantes).filter(Boolean) || [];
      setEstudiantesDelSalon(estudiantesConInfo);
      setSelectedSalon(salon);
      setVerEstudiantesDialogOpen(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estudiantes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSalon) {
        const { error } = await supabase
          .from("salones")
          .update(formData)
          .eq("id", editingSalon.id);

        if (error) throw error;
        toast.success("Salón actualizado exitosamente");
      } else {
        const { error } = await supabase.from("salones").insert([formData]);

        if (error) throw error;
        toast.success("Salón creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar");
    }
  };

  const handleEdit = (salon: Salon) => {
    setEditingSalon(salon);
    setFormData({
      codigo: salon.codigo,
      nombre: salon.nombre,
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
      sede_id: salon.sede_id,
      profesor_id: salon.profesor_id || "",
      capacidad: salon.capacidad,
      activo: salon.activo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este salón?")) return;

    try {
      const { error } = await supabase.from("salones").delete().eq("id", id);

      if (error) throw error;
      toast.success("Salón eliminado exitosamente");
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar");
    }
  };

  const resetForm = () => {
    setFormData({ 
      codigo: "",
      nombre: "",
      nivel: "INICIAL", 
      grado: "3 años", 
      seccion: "A", 
      sede_id: sedes[0]?.id || "", 
      profesor_id: "",
      capacidad: 30,
      activo: true 
    });
    setEditingSalon(null);
  };

  const getGradoOptions = () => {
    if (formData.nivel === "INICIAL") {
      return ["3 años", "4 años", "5 años"];
    }
    return ["1°", "2°", "3°", "4°", "5°", "6°"];
  };

  const handleOpenEstudiantes = async (salon: Salon) => {
    setSelectedSalon(salon);
    await loadEstudiantesSalon(salon.id);
    setEstudiantesDialogOpen(true);
  };

  const handleToggleEstudiante = (estudianteId: string) => {
    setEstudiantesSalon(prev => {
      if (prev.includes(estudianteId)) {
        return prev.filter(id => id !== estudianteId);
      }
      return [...prev, estudianteId];
    });
  };

  const handleSaveEstudiantes = async () => {
    if (!selectedSalon) return;

    try {
      // Eliminar asignaciones anteriores
      await supabase
        .from("estudiantes_salones")
        .delete()
        .eq("salon_id", selectedSalon.id);

      // Insertar nuevas asignaciones
      if (estudiantesSalon.length > 0) {
        const inserts = estudiantesSalon.map(estudianteId => ({
          estudiante_id: estudianteId,
          salon_id: selectedSalon.id,
          periodo_academico: new Date().getFullYear().toString(),
          activo: true,
        }));

        const { error } = await supabase
          .from("estudiantes_salones")
          .insert(inserts);

        if (error) throw error;
      }

      toast.success("Estudiantes asignados exitosamente");
      setEstudiantesDialogOpen(false);
      loadEstudiantesCounts();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al asignar estudiantes");
    }
  };

  const handleOpenCursos = async (salon: Salon) => {
    setSelectedSalon(salon);
    await loadCursosSalon(salon.id);
    setCursosDialogOpen(true);
  };

  const loadCursosSalon = async (salonId: string) => {
    try {
      const { data, error } = await supabase
        .from("salon_cursos")
        .select("*, cursos(id, codigo, nombre)")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;
      setCursosSalon(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar cursos del salón");
    }
  };

  const handleAddCursoToSalon = async (cursoId: string) => {
    if (!selectedSalon) return;

    try {
      const { error } = await supabase
        .from("salon_cursos")
        .insert({
          salon_id: selectedSalon.id,
          curso_id: cursoId,
          activo: true,
        });

      if (error) throw error;
      toast.success("Curso agregado al salón");
      loadCursosSalon(selectedSalon.id);
    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === "23505") {
        toast.error("Este curso ya está asignado al salón");
      } else {
        toast.error("Error al agregar curso");
      }
    }
  };

  const handleRemoveCursoFromSalon = async (salonCursoId: string) => {
    try {
      const { error } = await supabase
        .from("salon_cursos")
        .delete()
        .eq("id", salonCursoId);

      if (error) throw error;
      toast.success("Curso eliminado del salón");
      if (selectedSalon) {
        loadCursosSalon(selectedSalon.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar curso");
    }
  };

  const handleOpenCompetencias = async (salonCurso: any) => {
    setSelectedSalonCurso(salonCurso);
    await loadCompetencias(salonCurso.id);
    setCompetenciasDialogOpen(true);
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
      toast.error("Error al cargar competencias");
    }
  };

  const handleAddCompetencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalonCurso) return;

    try {
      const porcentaje = parseFloat(competenciaForm.porcentaje);
      if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        toast.error("El porcentaje debe ser entre 0 y 100");
        return;
      }

      // Verificar que la suma de porcentajes no exceda 100
      const sumaActual = competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);
      if (sumaActual + porcentaje > 100) {
        toast.error(`La suma de porcentajes no puede exceder 100%. Actual: ${sumaActual}%`);
        return;
      }

      const { error } = await supabase
        .from("competencias")
        .insert({
          salon_curso_id: selectedSalonCurso.id,
          nombre: competenciaForm.nombre,
          descripcion: competenciaForm.descripcion,
          porcentaje: porcentaje,
        });

      if (error) throw error;
      toast.success("Competencia agregada");
      setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
      loadCompetencias(selectedSalonCurso.id);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al agregar competencia");
    }
  };

  const handleDeleteCompetencia = async (competenciaId: string) => {
    if (!confirm("¿Eliminar esta competencia?")) return;

    try {
      const { error } = await supabase
        .from("competencias")
        .delete()
        .eq("id", competenciaId);

      if (error) throw error;
      toast.success("Competencia eliminada");
      if (selectedSalonCurso) {
        loadCompetencias(selectedSalonCurso.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar competencia");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gestión de Salones</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Salón
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSalon ? "Editar Salón" : "Crear Nuevo Salón"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo">Código (Generado automáticamente)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    readOnly
                    className="bg-muted"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nombre">Nombre del Salón</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Salón A"
                  />
                </div>

                <div>
                  <Label htmlFor="nivel">Nivel</Label>
                  <Select value={formData.nivel} onValueChange={(value) => {
                    const newGrado = value === "INICIAL" ? "3 años" : "1°";
                    setFormData({ ...formData, nivel: value, grado: newGrado });
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INICIAL">INICIAL</SelectItem>
                      <SelectItem value="PRIMARIA">PRIMARIA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grado">Grado</Label>
                  <Select value={formData.grado} onValueChange={(value) => setFormData({ ...formData, grado: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getGradoOptions().map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="seccion">Sección</Label>
                  <Input
                    id="seccion"
                    value={formData.seccion}
                    onChange={(e) => setFormData({ ...formData, seccion: e.target.value.toUpperCase() })}
                    maxLength={1}
                    pattern="[A-Z]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sede">Sede</Label>
                  <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })} required disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>{sede.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="profesor">Profesor Asignado (Opcional)</Label>
                  <Select value={formData.profesor_id || undefined} onValueChange={(value) => setFormData({ ...formData, profesor_id: value || "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {profesores.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.nombres} {prof.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="capacidad">Capacidad</Label>
                  <Input
                    id="capacidad"
                    type="number"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="activo">Activo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingSalon ? "Actualizar" : "Crear"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Salones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Grado</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Estudiantes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salones.map((salon) => (
                <TableRow key={salon.id}>
                  <TableCell className="font-medium">{salon.codigo}</TableCell>
                  <TableCell>{salon.nombre || "-"}</TableCell>
                  <TableCell>{salon.nivel}</TableCell>
                  <TableCell>{salon.grado}</TableCell>
                  <TableCell>{salon.seccion}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {estudiantesPorSalon[salon.id] || 0} / {salon.capacidad}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {salon.profesores 
                      ? `${salon.profesores.nombres} ${salon.profesores.apellidos}`
                      : "Sin asignar"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={salon.activo ? "default" : "secondary"}>
                      {salon.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleVerEstudiantes(salon)}
                        title="Ver estudiantes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleOpenEstudiantes(salon)}
                        title="Asignar estudiantes"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleOpenCursos(salon)}
                        title="Gestionar cursos"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleEdit(salon)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(salon.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {salones.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay salones registrados
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={estudiantesDialogOpen} onOpenChange={setEstudiantesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Asignar Estudiantes - {selectedSalon?.codigo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              {estudiantes.map((estudiante) => (
                <div key={estudiante.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={estudiantesSalon.includes(estudiante.id)}
                    onCheckedChange={() => handleToggleEstudiante(estudiante.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {estudiante.nombres} {estudiante.apellidos}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      DNI: {estudiante.dni}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEstudiantesDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEstudiantes}>
                Guardar Asignaciones
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={verEstudiantesDialogOpen} onOpenChange={setVerEstudiantesDialogOpen}>
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
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantesDelSalon.map((estudiante: any, index) => (
                    <TableRow key={index}>
                      <TableCell>{estudiante.dni}</TableCell>
                      <TableCell>{estudiante.nombres}</TableCell>
                      <TableCell>{estudiante.apellidos}</TableCell>
                      <TableCell>{estudiante.email || "-"}</TableCell>
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
              <Button variant="outline" onClick={() => setVerEstudiantesDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cursosDialogOpen} onOpenChange={setCursosDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Cursos - {selectedSalon?.codigo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Agregar Curso</Label>
              <Select onValueChange={handleAddCursoToSalon}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.id} value={curso.id}>
                      {curso.codigo} - {curso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Cursos Asignados</h3>
              {cursosSalon.length > 0 ? (
                <div className="space-y-3">
                  {cursosSalon.map((sc) => (
                    <Card key={sc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{sc.cursos?.nombre}</p>
                            <p className="text-sm text-muted-foreground">{sc.cursos?.codigo}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCompetencias(sc)}
                            >
                              <BookOpen className="h-4 w-4 mr-2" />
                              Competencias
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveCursoFromSalon(sc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay cursos asignados a este salón
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCursosDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={competenciasDialogOpen} onOpenChange={setCompetenciasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Competencias - {selectedSalonCurso?.cursos?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleAddCompetencia} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre-comp">Nombre de la Competencia</Label>
                  <Input
                    id="nombre-comp"
                    value={competenciaForm.nombre}
                    onChange={(e) => setCompetenciaForm({ ...competenciaForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="porcentaje">Porcentaje (%)</Label>
                  <Input
                    id="porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={competenciaForm.porcentaje}
                    onChange={(e) => setCompetenciaForm({ ...competenciaForm, porcentaje: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="descripcion-comp">Descripción</Label>
                <Input
                  id="descripcion-comp"
                  value={competenciaForm.descripcion}
                  onChange={(e) => setCompetenciaForm({ ...competenciaForm, descripcion: e.target.value })}
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Competencia
              </Button>
            </form>

            <div>
              <h3 className="font-semibold mb-4">
                Competencias Configuradas
                {competencias.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (Total: {competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0).toFixed(2)}%)
                  </span>
                )}
              </h3>
              {competencias.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competencia</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Porcentaje</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competencias.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.nombre}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {comp.descripcion || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge>{comp.porcentaje}%</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCompetencia(comp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay competencias configuradas para este curso
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCompetenciasDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
