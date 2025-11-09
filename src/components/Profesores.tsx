import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Plus, Eye, Edit, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Profesores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProfesor, setSelectedProfesor] = useState<any>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date>();
  
  const [formData, setFormData] = useState({
    sede_id: "",
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    especialidad: "",
    sexo: "",
    edad: "",
    fecha_nacimiento: "",
  });

  const { data: profesores, isLoading } = useQuery({
    queryKey: ["profesores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profesores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sedes").select("*").eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  const createProfesor = useMutation({
    mutationFn: async (newProfesor: any) => {
      const { data, error } = await supabase.from("profesores").insert([newProfesor]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      toast({ title: "Profesor registrado exitosamente" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al registrar profesor", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from("profesores")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      toast({ title: "Profesor actualizado exitosamente" });
      setEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profesores")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      toast({ title: "Profesor eliminado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      sede_id: "",
      dni: "",
      nombres: "",
      apellidos: "",
      email: "",
      telefono: "",
      direccion: "",
      especialidad: "",
      sexo: "",
      edad: "",
      fecha_nacimiento: "",
    });
    setFechaNacimiento(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
    };
    createProfesor.mutate(dataToSubmit);
  };

  const handleEdit = (profesor: any) => {
    setSelectedProfesor(profesor);
    setFormData({
      sede_id: profesor.sede_id || "",
      dni: profesor.dni || "",
      nombres: profesor.nombres || "",
      apellidos: profesor.apellidos || "",
      email: profesor.email || "",
      telefono: profesor.telefono || "",
      direccion: profesor.direccion || "",
      especialidad: profesor.especialidad || "",
      sexo: profesor.sexo || "",
      edad: profesor.edad?.toString() || "",
      fecha_nacimiento: profesor.fecha_nacimiento || "",
    });
    if (profesor.fecha_nacimiento) {
      setFechaNacimiento(new Date(profesor.fecha_nacimiento));
    }
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToUpdate = {
      id: selectedProfesor.id,
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
    };
    updateMutation.mutate(dataToUpdate);
  };

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="sede">Sede</Label>
        <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione sede" />
          </SelectTrigger>
          <SelectContent>
            {sedes?.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dni">DNI</Label>
        <Input
          id="dni"
          value={formData.dni}
          onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nombres">Nombres</Label>
        <Input
          id="nombres"
          value={formData.nombres}
          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apellidos">Apellidos</Label>
        <Input
          id="apellidos"
          value={formData.apellidos}
          onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sexo">Sexo</Label>
        <Select
          value={formData.sexo}
          onValueChange={(value) => setFormData({ ...formData, sexo: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MASCULINO">MASCULINO</SelectItem>
            <SelectItem value="FEMENINO">FEMENINO</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edad">Edad</Label>
        <Input
          id="edad"
          type="number"
          value={formData.edad}
          onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Fecha de Nacimiento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !fechaNacimiento && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fechaNacimiento ? format(fechaNacimiento, "PPP") : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaNacimiento}
              onSelect={setFechaNacimiento}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
        />
      </div>
      <div className="space-y-2 col-span-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />
      </div>
      <div className="space-y-2 col-span-2">
        <Label htmlFor="especialidad">Especialidad</Label>
        <Input
          id="especialidad"
          value={formData.especialidad}
          onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Profesores</CardTitle>
              <CardDescription>Gestión de docentes del sistema</CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Profesor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Profesor</DialogTitle>
                <DialogDescription>Complete los datos del profesor</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormFields />
                <Button type="submit" className="w-full">
                  Registrar Profesor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando profesores...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombres</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profesores?.map((profesor) => {
                const sede = sedes?.find((s) => s.id === profesor.sede_id);
                return (
                  <TableRow key={profesor.id}>
                    <TableCell>{profesor.dni}</TableCell>
                    <TableCell>{profesor.nombres}</TableCell>
                    <TableCell>{profesor.apellidos}</TableCell>
                    <TableCell>{profesor.especialidad || "N/A"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        profesor.estado === "activo"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {profesor.estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProfesor(profesor);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(profesor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("¿Está seguro de eliminar este profesor?")) {
                              deleteMutation.mutate(profesor.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog para editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Profesor</DialogTitle>
            <DialogDescription>
              Actualice los datos del profesor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormFields />
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Profesor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Información del Profesor</DialogTitle>
          </DialogHeader>
          {selectedProfesor && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>DNI:</strong> {selectedProfesor.dni}</div>
                <div><strong>Nombres:</strong> {selectedProfesor.nombres}</div>
                <div><strong>Apellidos:</strong> {selectedProfesor.apellidos}</div>
                <div><strong>Sexo:</strong> {selectedProfesor.sexo || "N/A"}</div>
                <div><strong>Edad:</strong> {selectedProfesor.edad || "N/A"}</div>
                <div><strong>Fecha Nacimiento:</strong> {selectedProfesor.fecha_nacimiento || "N/A"}</div>
                <div><strong>Email:</strong> {selectedProfesor.email || "N/A"}</div>
                <div><strong>Teléfono:</strong> {selectedProfesor.telefono || "N/A"}</div>
                <div className="col-span-2"><strong>Dirección:</strong> {selectedProfesor.direccion || "N/A"}</div>
                <div className="col-span-2"><strong>Especialidad:</strong> {selectedProfesor.especialidad || "N/A"}</div>
                <div><strong>Sede:</strong> {sedes?.find(s => s.id === selectedProfesor.sede_id)?.nombre || "N/A"}</div>
                <div><strong>Estado:</strong> {selectedProfesor.estado}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Profesores;