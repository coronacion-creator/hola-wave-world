import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

const Matriculas = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    curso_id: "",
    sede_id: "",
    periodo_academico: "2025-1",
  });

  const { data: matriculas, isLoading } = useQuery({
    queryKey: ["matriculas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni),
          cursos(nombre, codigo),
          sedes(nombre, ciudad)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("estudiantes")
        .select("*")
        .eq("estado", "activo");
      return data || [];
    },
  });

  const { data: cursos } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cursos")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sedes")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newMatricula: typeof formData) => {
      const { data, error } = await supabase.rpc("matricular_con_validacion", {
        p_estudiante_id: newMatricula.estudiante_id,
        p_curso_id: newMatricula.curso_id,
        p_sede_id: newMatricula.sede_id,
        p_periodo_academico: newMatricula.periodo_academico,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["matriculas"] });
        toast.success(data.message);
        setOpen(false);
        setFormData({
          estudiante_id: "",
          curso_id: "",
          sede_id: "",
          periodo_academico: "2025-1",
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Matrículas</CardTitle>
            <CardDescription>
              Registro de matrículas con validación de duplicados
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" />
                Nueva Matrícula
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nueva Matrícula</DialogTitle>
                <DialogDescription>
                  El sistema valida duplicados automáticamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estudiante">Estudiante</Label>
                  <Select
                    value={formData.estudiante_id}
                    onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione estudiante" />
                    </SelectTrigger>
                    <SelectContent>
                      {estudiantes?.map((est) => (
                        <SelectItem key={est.id} value={est.id}>
                          {est.nombres} {est.apellidos} - DNI: {est.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curso">Curso</Label>
                  <Select
                    value={formData.curso_id}
                    onValueChange={(value) => setFormData({ ...formData, curso_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursos?.map((curso) => (
                        <SelectItem key={curso.id} value={curso.id}>
                          {curso.codigo} - {curso.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="periodo">Periodo Académico</Label>
                  <Input
                    id="periodo"
                    value={formData.periodo_academico}
                    onChange={(e) => setFormData({ ...formData, periodo_academico: e.target.value })}
                    placeholder="2025-1"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Procesando..." : "Matricular"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando matrículas...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriculas?.map((matricula) => (
                <TableRow key={matricula.id}>
                  <TableCell>
                    {matricula.estudiantes?.nombres} {matricula.estudiantes?.apellidos}
                  </TableCell>
                  <TableCell>
                    {matricula.cursos?.codigo} - {matricula.cursos?.nombre}
                  </TableCell>
                  <TableCell>
                    {matricula.sedes?.nombre}
                  </TableCell>
                  <TableCell>{matricula.periodo_academico}</TableCell>
                  <TableCell>
                    {new Date(matricula.fecha_matricula).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      matricula.estado === "activa"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {matricula.estado}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Matriculas;
