import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Eye, Edit, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Estudiantes = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedEstudiante, setSelectedEstudiante] = useState<any>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date>();
  const [fechaNacimientoApoderado, setFechaNacimientoApoderado] = useState<Date>();
  
  const [formData, setFormData] = useState({
    sede_id: "",
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    sexo: "",
    edad: "",
    fecha_nacimiento: "",
    apoderado_dni: "",
    apoderado_nombres: "",
    apoderado_apellidos: "",
    apoderado_email: "",
    apoderado_telefono: "",
    apoderado_sexo: "",
    apoderado_edad: "",
    apoderado_fecha_nacimiento: "",
    apoderado_direccion: "",
  });

  const { data: estudiantes, isLoading } = useQuery({
    queryKey: ["estudiantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudiantes")
        .select("*, sedes(nombre, ciudad)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data } = await supabase.from("sedes").select("*").eq("activo", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEstudiante: any) => {
      const { data, error } = await supabase
        .from("estudiantes")
        .insert([newEstudiante])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      toast.success("Estudiante registrado exitosamente");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from("estudiantes")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      toast.success("Estudiante actualizado exitosamente");
      setEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estudiantes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      toast.success("Estudiante eliminado exitosamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
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
      sexo: "",
      edad: "",
      fecha_nacimiento: "",
      apoderado_dni: "",
      apoderado_nombres: "",
      apoderado_apellidos: "",
      apoderado_email: "",
      apoderado_telefono: "",
      apoderado_sexo: "",
      apoderado_edad: "",
      apoderado_fecha_nacimiento: "",
      apoderado_direccion: "",
    });
    setFechaNacimiento(undefined);
    setFechaNacimientoApoderado(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      apoderado_edad: formData.apoderado_edad ? parseInt(formData.apoderado_edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
      apoderado_fecha_nacimiento: fechaNacimientoApoderado ? format(fechaNacimientoApoderado, "yyyy-MM-dd") : null,
    };
    createMutation.mutate(dataToSubmit as any);
  };

  const handleEdit = (estudiante: any) => {
    setSelectedEstudiante(estudiante);
    setFormData({
      sede_id: estudiante.sede_id || "",
      dni: estudiante.dni || "",
      nombres: estudiante.nombres || "",
      apellidos: estudiante.apellidos || "",
      email: estudiante.email || "",
      telefono: estudiante.telefono || "",
      direccion: estudiante.direccion || "",
      sexo: estudiante.sexo || "",
      edad: estudiante.edad?.toString() || "",
      fecha_nacimiento: estudiante.fecha_nacimiento || "",
      apoderado_dni: estudiante.apoderado_dni || "",
      apoderado_nombres: estudiante.apoderado_nombres || "",
      apoderado_apellidos: estudiante.apoderado_apellidos || "",
      apoderado_email: estudiante.apoderado_email || "",
      apoderado_telefono: estudiante.apoderado_telefono || "",
      apoderado_sexo: estudiante.apoderado_sexo || "",
      apoderado_edad: estudiante.apoderado_edad?.toString() || "",
      apoderado_fecha_nacimiento: estudiante.apoderado_fecha_nacimiento || "",
      apoderado_direccion: estudiante.apoderado_direccion || "",
    });
    if (estudiante.fecha_nacimiento) {
      setFechaNacimiento(new Date(estudiante.fecha_nacimiento));
    }
    if (estudiante.apoderado_fecha_nacimiento) {
      setFechaNacimientoApoderado(new Date(estudiante.apoderado_fecha_nacimiento));
    }
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToUpdate = {
      id: selectedEstudiante.id,
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      apoderado_edad: formData.apoderado_edad ? parseInt(formData.apoderado_edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
      apoderado_fecha_nacimiento: fechaNacimientoApoderado ? format(fechaNacimientoApoderado, "yyyy-MM-dd") : null,
    };
    updateMutation.mutate(dataToUpdate);
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <h3 className="text-lg font-semibold">Datos del Estudiante</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sede">Sede</Label>
          <Select
            value={formData.sede_id}
            onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione sede" />
            </SelectTrigger>
            <SelectContent>
              {sedes?.map((sede) => (
                <SelectItem key={sede.id} value={sede.id}>
                  {sede.nombre} - {sede.ciudad}
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

        <div className="space-y-2 col-span-2 pt-4">
          <h3 className="text-lg font-semibold">Datos del Padre o Apoderado</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_dni">DNI Apoderado</Label>
          <Input
            id="apoderado_dni"
            value={formData.apoderado_dni}
            onChange={(e) => setFormData({ ...formData, apoderado_dni: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_nombres">Nombres Apoderado</Label>
          <Input
            id="apoderado_nombres"
            value={formData.apoderado_nombres}
            onChange={(e) => setFormData({ ...formData, apoderado_nombres: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_apellidos">Apellidos Apoderado</Label>
          <Input
            id="apoderado_apellidos"
            value={formData.apoderado_apellidos}
            onChange={(e) => setFormData({ ...formData, apoderado_apellidos: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_sexo">Sexo Apoderado</Label>
          <Select
            value={formData.apoderado_sexo}
            onValueChange={(value) => setFormData({ ...formData, apoderado_sexo: value })}
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
          <Label htmlFor="apoderado_edad">Edad Apoderado</Label>
          <Input
            id="apoderado_edad"
            type="number"
            value={formData.apoderado_edad}
            onChange={(e) => setFormData({ ...formData, apoderado_edad: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Nacimiento Apoderado</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaNacimientoApoderado && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaNacimientoApoderado ? format(fechaNacimientoApoderado, "PPP") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaNacimientoApoderado}
                onSelect={setFechaNacimientoApoderado}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_email">Email Apoderado</Label>
          <Input
            id="apoderado_email"
            type="email"
            value={formData.apoderado_email}
            onChange={(e) => setFormData({ ...formData, apoderado_email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apoderado_telefono">Teléfono Apoderado</Label>
          <Input
            id="apoderado_telefono"
            value={formData.apoderado_telefono}
            onChange={(e) => setFormData({ ...formData, apoderado_telefono: e.target.value })}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="apoderado_direccion">Dirección Apoderado</Label>
          <Input
            id="apoderado_direccion"
            value={formData.apoderado_direccion}
            onChange={(e) => setFormData({ ...formData, apoderado_direccion: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Estudiantes</CardTitle>
            <CardDescription>
              Registro y administración de estudiantes por sede
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Nuevo Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Estudiante</DialogTitle>
                <DialogDescription>
                  Complete los datos del estudiante y apoderado
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <FormFields />
                <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Registrando..." : "Registrar Estudiante"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando estudiantes...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombres</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estudiantes?.map((estudiante) => (
                <TableRow key={estudiante.id}>
                  <TableCell className="font-medium">{estudiante.dni}</TableCell>
                  <TableCell>{estudiante.nombres}</TableCell>
                  <TableCell>{estudiante.apellidos}</TableCell>
                  <TableCell>
                    {estudiante.sedes?.nombre} - {estudiante.sedes?.ciudad}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      estudiante.estado === "activo"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {estudiante.estado}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEstudiante(estudiante);
                          setViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(estudiante)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("¿Está seguro de eliminar este estudiante?")) {
                            deleteMutation.mutate(estudiante.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog para editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
            <DialogDescription>
              Actualice los datos del estudiante
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <FormFields />
            <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Estudiante"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Información del Estudiante</DialogTitle>
          </DialogHeader>
          {selectedEstudiante && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Datos del Estudiante</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>DNI:</strong> {selectedEstudiante.dni}</div>
                  <div><strong>Nombres:</strong> {selectedEstudiante.nombres}</div>
                  <div><strong>Apellidos:</strong> {selectedEstudiante.apellidos}</div>
                  <div><strong>Sexo:</strong> {selectedEstudiante.sexo || "N/A"}</div>
                  <div><strong>Edad:</strong> {selectedEstudiante.edad || "N/A"}</div>
                  <div><strong>Fecha Nacimiento:</strong> {selectedEstudiante.fecha_nacimiento || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedEstudiante.email || "N/A"}</div>
                  <div><strong>Teléfono:</strong> {selectedEstudiante.telefono || "N/A"}</div>
                  <div className="col-span-2"><strong>Dirección:</strong> {selectedEstudiante.direccion || "N/A"}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Datos del Apoderado</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>DNI:</strong> {selectedEstudiante.apoderado_dni || "N/A"}</div>
                  <div><strong>Nombres:</strong> {selectedEstudiante.apoderado_nombres || "N/A"}</div>
                  <div><strong>Apellidos:</strong> {selectedEstudiante.apoderado_apellidos || "N/A"}</div>
                  <div><strong>Sexo:</strong> {selectedEstudiante.apoderado_sexo || "N/A"}</div>
                  <div><strong>Edad:</strong> {selectedEstudiante.apoderado_edad || "N/A"}</div>
                  <div><strong>Fecha Nacimiento:</strong> {selectedEstudiante.apoderado_fecha_nacimiento || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedEstudiante.apoderado_email || "N/A"}</div>
                  <div><strong>Teléfono:</strong> {selectedEstudiante.apoderado_telefono || "N/A"}</div>
                  <div className="col-span-2"><strong>Dirección:</strong> {selectedEstudiante.apoderado_direccion || "N/A"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Estudiantes;