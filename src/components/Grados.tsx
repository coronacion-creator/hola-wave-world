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
import { Plus, Pencil, Trash2, Users, BookOpen, User } from "lucide-react";
import { toast } from "sonner";

interface GradoSeccion {
  id: string;
  grado: string;
  seccion: string;
  sede_id: string;
  activo: boolean;
  sedes?: { nombre: string };
}

interface GradoDetails {
  totalEstudiantes: number;
  totalCursos: number;
  profesores: string[];
}

export function Grados() {
  const [grados, setGrados] = useState<GradoSeccion[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrado, setEditingGrado] = useState<GradoSeccion | null>(null);
  const [gradoDetails, setGradoDetails] = useState<Record<string, GradoDetails>>({});
  
  const [formData, setFormData] = useState({
    grado: "1°",
    seccion: "A",
    sede_id: "",
    activo: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [{ data: sedesData }, { data: gradosData }] = await Promise.all([
        supabase.from("sedes").select("*"),
        supabase.from("grados_secciones").select("*, sedes(nombre)").order("grado, seccion"),
      ]);

      if (sedesData) setSedes(sedesData);
      if (gradosData) {
        setGrados(gradosData);
        await loadGradoDetails(gradosData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadGradoDetails = async (gradosData: GradoSeccion[]) => {
    const details: Record<string, GradoDetails> = {};

    for (const grado of gradosData) {
      const [{ count: estudiantes }, { data: cursos }] = await Promise.all([
        supabase
          .from("matriculas")
          .select("*", { count: "exact", head: true })
          .eq("grado_seccion_id", grado.id),
        supabase
          .from("cursos")
          .select("profesor_id, profesores(nombres, apellidos)")
          .eq("grado_seccion_id", grado.id),
      ]);

      const profesoresUnicos = new Set(
        cursos?.filter(c => c.profesores).map((c: any) => 
          `${c.profesores.nombres} ${c.profesores.apellidos}`
        ) || []
      );

      details[grado.id] = {
        totalEstudiantes: estudiantes || 0,
        totalCursos: cursos?.length || 0,
        profesores: Array.from(profesoresUnicos),
      };
    }

    setGradoDetails(details);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGrado) {
        const { error } = await supabase
          .from("grados_secciones")
          .update(formData)
          .eq("id", editingGrado.id);

        if (error) throw error;
        toast.success("Grado actualizado exitosamente");
      } else {
        const { error } = await supabase.from("grados_secciones").insert([formData]);

        if (error) throw error;
        toast.success("Grado creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === "23505") {
        toast.error("Este grado y sección ya existe en esta sede");
      } else {
        toast.error("Error al guardar");
      }
    }
  };

  const handleEdit = (grado: GradoSeccion) => {
    setEditingGrado(grado);
    setFormData({
      grado: grado.grado,
      seccion: grado.seccion,
      sede_id: grado.sede_id,
      activo: grado.activo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este grado?")) return;

    try {
      const { error } = await supabase.from("grados_secciones").delete().eq("id", id);

      if (error) throw error;
      toast.success("Grado eliminado exitosamente");
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar");
    }
  };

  const resetForm = () => {
    setFormData({ grado: "1°", seccion: "A", sede_id: "", activo: true });
    setEditingGrado(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gestión de Grados y Secciones</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGrado ? "Editar Grado" : "Crear Nuevo Grado"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="grado">Grado</Label>
                <Select value={formData.grado} onValueChange={(value) => setFormData({ ...formData, grado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1°", "2°", "3°", "4°", "5°", "6°"].map((g) => (
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
                <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })} required>
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
                <Button type="submit">{editingGrado ? "Actualizar" : "Crear"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {grados.map((grado) => {
          const details = gradoDetails[grado.id];
          return (
            <Card key={grado.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold">
                  {grado.grado} - Sección {grado.seccion}
                  <Badge variant={grado.activo ? "default" : "secondary"} className="ml-3">
                    {grado.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(grado)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(grado.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Sede: {grado.sedes?.nombre}
                </div>
                
                {details && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-2xl font-bold">{details.totalEstudiantes}</div>
                        <div className="text-xs text-muted-foreground">Estudiantes</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-2xl font-bold">{details.totalCursos}</div>
                        <div className="text-xs text-muted-foreground">Cursos</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-2xl font-bold">{details.profesores.length}</div>
                        <div className="text-xs text-muted-foreground">Profesores</div>
                      </div>
                    </div>
                  </div>
                )}

                {details && details.profesores.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">Profesores asignados:</div>
                    <div className="flex flex-wrap gap-2">
                      {details.profesores.map((profesor, idx) => (
                        <Badge key={idx} variant="outline">{profesor}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {grados.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">No hay grados registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
