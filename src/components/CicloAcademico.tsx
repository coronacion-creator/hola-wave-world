import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, CalendarIcon, DoorOpen, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CicloAcademico {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Salon {
  id: string;
  nombre: string;
  codigo: string;
  nivel: string;
  grado: string;
  seccion: string;
  capacidad: number;
  profesores?: { nombres: string; apellidos: string };
}

export function CicloAcademico() {
  const [ciclos, setCiclos] = useState<CicloAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salonesDialogOpen, setSalonesDialogOpen] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState<CicloAcademico | null>(null);
  const [selectedCiclo, setSelectedCiclo] = useState<CicloAcademico | null>(null);
  const [salones, setSalones] = useState<Salon[]>([]);
  const [salonesDisponibles, setSalonesDisponibles] = useState<Salon[]>([]);
  
  const [formData, setFormData] = useState({
    nombre: "",
    fecha_inicio: new Date(),
    fecha_fin: new Date(new Date().setMonth(new Date().getMonth() + 6)),
    activo: true,
  });

  useEffect(() => {
    loadCiclos();
  }, []);

  const loadCiclos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ciclos_academicos")
        .select("*")
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;
      setCiclos(data || []);
    } catch (error) {
      console.error("Error loading ciclos:", error);
      toast.error("Error al cargar ciclos académicos");
    } finally {
      setLoading(false);
    }
  };

  const loadSalones = async (cicloId: string) => {
    try {
      const { data, error } = await supabase
        .from("salones")
        .select("*, profesores(nombres, apellidos)")
        .eq("ciclo_academico_id", cicloId)
        .eq("activo", true);

      if (error) throw error;
      setSalones(data || []);
    } catch (error) {
      console.error("Error loading salones:", error);
      toast.error("Error al cargar salones");
    }
  };

  const loadSalonesDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from("salones")
        .select("*, profesores(nombres, apellidos)")
        .is("ciclo_academico_id", null)
        .eq("activo", true);

      if (error) throw error;
      setSalonesDisponibles(data || []);
    } catch (error) {
      console.error("Error loading salones disponibles:", error);
      toast.error("Error al cargar salones disponibles");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        nombre: formData.nombre,
        fecha_inicio: format(formData.fecha_inicio, "yyyy-MM-dd"),
        fecha_fin: format(formData.fecha_fin, "yyyy-MM-dd"),
        activo: formData.activo,
      };

      if (editingCiclo) {
        const { error } = await supabase
          .from("ciclos_academicos")
          .update(dataToSave)
          .eq("id", editingCiclo.id);

        if (error) throw error;
        toast.success("Ciclo académico actualizado exitosamente");
      } else {
        const { error } = await supabase
          .from("ciclos_academicos")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Ciclo académico creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadCiclos();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al guardar ciclo académico");
    }
  };

  const handleEdit = (ciclo: CicloAcademico) => {
    setEditingCiclo(ciclo);
    setFormData({
      nombre: ciclo.nombre,
      fecha_inicio: new Date(ciclo.fecha_inicio),
      fecha_fin: new Date(ciclo.fecha_fin),
      activo: ciclo.activo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ciclo académico?")) return;

    try {
      const { error } = await supabase
        .from("ciclos_academicos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Ciclo académico eliminado exitosamente");
      loadCiclos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar ciclo académico");
    }
  };

  const handleOpenSalones = async (ciclo: CicloAcademico) => {
    setSelectedCiclo(ciclo);
    await loadSalones(ciclo.id);
    await loadSalonesDisponibles();
    setSalonesDialogOpen(true);
  };

  const handleAsignarSalon = async (salonId: string) => {
    if (!selectedCiclo) return;

    try {
      const { error } = await supabase
        .from("salones")
        .update({ ciclo_academico_id: selectedCiclo.id })
        .eq("id", salonId);

      if (error) throw error;
      toast.success("Salón asignado al ciclo académico");
      await loadSalones(selectedCiclo.id);
      await loadSalonesDisponibles();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al asignar salón");
    }
  };

  const handleRemoverSalon = async (salonId: string) => {
    if (!selectedCiclo) return;

    try {
      const { error } = await supabase
        .from("salones")
        .update({ ciclo_academico_id: null })
        .eq("id", salonId);

      if (error) throw error;
      toast.success("Salón removido del ciclo académico");
      await loadSalones(selectedCiclo.id);
      await loadSalonesDisponibles();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al remover salón");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      fecha_inicio: new Date(),
      fecha_fin: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      activo: true,
    });
    setEditingCiclo(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gestión de Ciclos Académicos</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Ciclo Académico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCiclo ? "Editar Ciclo Académico" : "Crear Nuevo Ciclo Académico"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Ciclo</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Ciclo 2024-I"
                  required
                />
              </div>

              <div>
                <Label>Fecha de Inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fecha_inicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_inicio ? (
                        format(formData.fecha_inicio, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha_inicio}
                      onSelect={(date) => date && setFormData({ ...formData, fecha_inicio: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Fecha de Fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fecha_fin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_fin ? (
                        format(formData.fecha_fin, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha_fin}
                      onSelect={(date) => date && setFormData({ ...formData, fecha_fin: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                <Button type="submit">{editingCiclo ? "Actualizar" : "Crear"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {ciclos.map((ciclo) => (
          <Card key={ciclo.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">
                {ciclo.nombre}
                <Badge variant={ciclo.activo ? "default" : "secondary"} className="ml-3">
                  {ciclo.activo ? "Activo" : "Inactivo"}
                </Badge>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOpenSalones(ciclo)}
                  title="Gestionar Salones"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEdit(ciclo)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(ciclo.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Fecha de Inicio:</span>{" "}
                  {format(new Date(ciclo.fecha_inicio), "PPP", { locale: es })}
                </div>
                <div>
                  <span className="font-semibold">Fecha de Fin:</span>{" "}
                  {format(new Date(ciclo.fecha_fin), "PPP", { locale: es })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ciclos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">No hay ciclos académicos registrados</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={salonesDialogOpen} onOpenChange={setSalonesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Salones - {selectedCiclo?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Salones Asignados</h3>
              {salones.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay salones asignados</p>
              ) : (
                <div className="grid gap-2">
                  {salones.map((salon) => (
                    <Card key={salon.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <DoorOpen className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-semibold">
                              {salon.nombre || `${salon.nivel} - ${salon.grado} ${salon.seccion}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Código: {salon.codigo} | Capacidad: {salon.capacidad}
                              {salon.profesores && (
                                <> | Profesor: {salon.profesores.nombres} {salon.profesores.apellidos}</>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoverSalon(salon.id)}
                        >
                          Remover
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Salones Disponibles</h3>
              {salonesDisponibles.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay salones disponibles</p>
              ) : (
                <div className="grid gap-2">
                  {salonesDisponibles.map((salon) => (
                    <Card key={salon.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <DoorOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-semibold">
                              {salon.nombre || `${salon.nivel} - ${salon.grado} ${salon.seccion}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Código: {salon.codigo} | Capacidad: {salon.capacidad}
                              {salon.profesores && (
                                <> | Profesor: {salon.profesores.nombres} {salon.profesores.apellidos}</>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAsignarSalon(salon.id)}
                        >
                          Asignar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}