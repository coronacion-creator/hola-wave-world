import React, { useState } from "react";
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
import { BookOpen, Eye, Edit, Trash2 } from "lucide-react";

const Matriculas = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<any>(null);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    grado_seccion_id: "",
    sede_id: "",
    periodo_academico: "",
    plan_pago_id: "",
  });

  const { data: matriculas, isLoading } = useQuery({
    queryKey: ["matriculas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni),
          grados_secciones(grado, seccion, nivel),
          sedes(nombre, ciudad),
          planes_pago(nombre, total, pagado, restante)
        `)
        .order("created_at", { ascending: false});
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

  const { data: gradosSecciones } = useQuery({
    queryKey: ["grados-secciones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("grados_secciones")
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

  const { data: ciclos } = useQuery({
    queryKey: ["ciclos-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ciclos_academicos")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const { data: planesPago } = useQuery({
    queryKey: ["planes-disponibles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("planes_pago")
        .select("*, estudiantes(nombres, apellidos)")
        .eq("activo", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newMatricula: typeof formData) => {
      // Crear un curso dummy para cumplir con el constraint NOT NULL
      const { data: cursoData, error: cursoError } = await supabase
        .from("cursos")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      let cursoId = cursoData?.id;
      
      // Si no hay cursos, crear uno dummy
      if (!cursoId) {
        const { data: nuevoCurso, error: errorNuevoCurso } = await supabase
          .from("cursos")
          .insert({
            nombre: "Curso General",
            codigo: "GEN-001",
            descripcion: "Curso general por defecto",
            sede_id: newMatricula.sede_id,
          })
          .select()
          .single();
        
        if (errorNuevoCurso) throw errorNuevoCurso;
        cursoId = nuevoCurso.id;
      }

      const { data: matriculaData, error: matriculaError } = await supabase
        .from("matriculas")
        .insert({
          estudiante_id: newMatricula.estudiante_id,
          curso_id: cursoId,
          grado_seccion_id: newMatricula.grado_seccion_id,
          sede_id: newMatricula.sede_id,
          periodo_academico: newMatricula.periodo_academico,
          plan_pago_id: newMatricula.plan_pago_id || null,
        })
        .select()
        .single();
      
      if (matriculaError) throw matriculaError;
      
      return {
        success: true,
        matricula_id: matriculaData.id,
        message: "Matrícula registrada exitosamente"
      };
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["matriculas"] });
        toast.success(data.message);
        setOpen(false);
        setFormData({
          estudiante_id: "",
          grado_seccion_id: "",
          sede_id: "",
          periodo_academico: "",
          plan_pago_id: "",
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("matriculas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast.success("Matrícula eliminada exitosamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { data: cursoData } = await supabase
        .from("cursos")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      let cursoId = cursoData?.id;
      
      if (!cursoId) {
        const { data: nuevoCurso } = await supabase
          .from("cursos")
          .insert({
            nombre: "Curso General",
            codigo: "GEN-001",
            descripcion: "Curso general por defecto",
            sede_id: data.sede_id,
          })
          .select()
          .single();
        cursoId = nuevoCurso.id;
      }

      const { error } = await supabase
        .from("matriculas")
        .update({
          estudiante_id: data.estudiante_id,
          curso_id: cursoId,
          grado_seccion_id: data.grado_seccion_id,
          sede_id: data.sede_id,
          periodo_academico: data.periodo_academico,
          plan_pago_id: data.plan_pago_id || null,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast.success("Matrícula actualizada exitosamente");
      setEditOpen(false);
      setSelectedMatricula(null);
      setFormData({
        estudiante_id: "",
        grado_seccion_id: "",
        sede_id: "",
        periodo_academico: "",
        plan_pago_id: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMatricula) {
      updateMutation.mutate({ id: selectedMatricula.id, data: formData });
    }
  };

  const handleEdit = (matricula: any) => {
    setSelectedMatricula(matricula);
    setFormData({
      estudiante_id: matricula.estudiante_id,
      grado_seccion_id: matricula.grado_seccion_id,
      sede_id: matricula.sede_id,
      periodo_academico: matricula.periodo_academico,
      plan_pago_id: matricula.plan_pago_id || "",
    });
    setEditOpen(true);
  };

  const verPlanPago = async (planId: string) => {
    const { data } = await supabase
      .from("planes_pago")
      .select(`
        *,
        cuotas_pago(*),
        estudiantes(nombres, apellidos)
      `)
      .eq("id", planId)
      .single();
    
    if (data) {
      setSelectedPlan(data);
      setViewOpen(true);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Matrículas</CardTitle>
            <CardDescription>
              Registro de matrículas con selección de periodo y plan de pago
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
                  Complete los datos de matrícula
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
                  <Label htmlFor="grado">Grado y Sección</Label>
                  <Select
                    value={formData.grado_seccion_id}
                    onValueChange={(value) => setFormData({ ...formData, grado_seccion_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione grado y sección" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradosSecciones?.map((gs) => (
                        <SelectItem key={gs.id} value={gs.id}>
                          {gs.nivel} - {gs.grado} "{gs.seccion}"
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
                  <Select
                    value={formData.periodo_academico}
                    onValueChange={(value) => setFormData({ ...formData, periodo_academico: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ciclos?.map((ciclo) => (
                        <SelectItem key={ciclo.id} value={ciclo.nombre}>
                          {ciclo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan de Pago (Opcional)</Label>
                  <Select
                    value={formData.plan_pago_id}
                    onValueChange={(value) => setFormData({ ...formData, plan_pago_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {planesPago?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.nombre} - {plan.estudiantes?.nombres} {plan.estudiantes?.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <TableHead>Grado y Sección</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Plan de Pago</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriculas?.map((matricula) => (
                <TableRow key={matricula.id}>
                  <TableCell>
                    {matricula.estudiantes?.nombres} {matricula.estudiantes?.apellidos}
                  </TableCell>
                  <TableCell>
                    {matricula.grados_secciones?.nivel} - {matricula.grados_secciones?.grado} "{matricula.grados_secciones?.seccion}"
                  </TableCell>
                  <TableCell>
                    {matricula.sedes?.nombre}
                  </TableCell>
                  <TableCell>{matricula.periodo_academico}</TableCell>
                  <TableCell>
                    {matricula.plan_pago_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verPlanPago(matricula.plan_pago_id!)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Plan
                      </Button>
                    ) : (
                      "Sin plan"
                    )}
                  </TableCell>
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
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(matricula)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("¿Está seguro de eliminar esta matrícula?")) {
                            deleteMutation.mutate(matricula.id);
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

      {/* Dialog para editar matrícula */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Matrícula</DialogTitle>
            <DialogDescription>
              Modifique los datos de la matrícula
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estudiante-edit">Estudiante</Label>
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
              <Label htmlFor="grado-edit">Grado y Sección</Label>
              <Select
                value={formData.grado_seccion_id}
                onValueChange={(value) => setFormData({ ...formData, grado_seccion_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione grado y sección" />
                </SelectTrigger>
                <SelectContent>
                  {gradosSecciones?.map((gs) => (
                    <SelectItem key={gs.id} value={gs.id}>
                      {gs.nivel} - {gs.grado} "{gs.seccion}"
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sede-edit">Sede</Label>
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
              <Label htmlFor="periodo-edit">Periodo Académico</Label>
              <Select
                value={formData.periodo_academico}
                onValueChange={(value) => setFormData({ ...formData, periodo_academico: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione periodo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclos?.map((ciclo) => (
                    <SelectItem key={ciclo.id} value={ciclo.nombre}>
                      {ciclo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-edit">Plan de Pago (Opcional)</Label>
              <Select
                value={formData.plan_pago_id}
                onValueChange={(value) => setFormData({ ...formData, plan_pago_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione plan" />
                </SelectTrigger>
                <SelectContent>
                  {planesPago?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre} - {plan.estudiantes?.nombres} {plan.estudiantes?.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Matrícula"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver plan de pago */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan de Pago</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedPlan.nombre}</h3>
                <p className="text-sm">Estudiante: {selectedPlan.estudiantes?.nombres} {selectedPlan.estudiantes?.apellidos}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Cuotas</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPlan.cuotas_pago?.map((cuota: any) => (
                      <TableRow key={cuota.id}>
                        <TableCell>{cuota.numero_cuota}</TableCell>
                        <TableCell>{cuota.concepto}</TableCell>
                        <TableCell>S/ {Number(cuota.monto).toFixed(2)}</TableCell>
                        <TableCell>
                          {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            cuota.estado === "pagado"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : cuota.estado === "vencido"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {cuota.estado}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">S/ {Number(selectedPlan.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Pagado:</span>
                  <span>S/ {Number(selectedPlan.pagado).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Restante:</span>
                  <span>S/ {Number(selectedPlan.restante).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Matriculas;