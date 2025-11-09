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
import { Plus, Eye, Edit, Trash2, CalendarIcon, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PlanesPago = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    nombre: "",
    ciclo_academico_id: "",
    nivel: "",
  });

  const { data: planes, isLoading } = useQuery({
    queryKey: ["planes-pago"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planes_pago")
        .select(`
          *,
          ciclos_academicos(nombre)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ciclos } = useQuery({
    queryKey: ["ciclos-activos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ciclos_academicos")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });


  const createPlanMutation = useMutation({
    mutationFn: async (newPlan: typeof formData) => {
      const { data, error } = await supabase
        .from("planes_pago")
        .insert([newPlan])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSelectedPlan(data);
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      toast.success("Plan de pago creado. Ahora agregue las cuotas.");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planes_pago")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      toast.success("Plan eliminado");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlanMutation.mutate(formData);
  };

  const agregarCuota = () => {
    setCuotas([...cuotas, {
      numero_cuota: cuotas.length + 1,
      concepto: "",
      monto: "",
      fecha_vencimiento: null,
    }]);
  };

  const actualizarCuota = (index: number, campo: string, valor: any) => {
    const nuevasCuotas = [...cuotas];
    nuevasCuotas[index] = { ...nuevasCuotas[index], [campo]: valor };
    setCuotas(nuevasCuotas);
  };

  const eliminarCuota = (index: number) => {
    setCuotas(cuotas.filter((_, i) => i !== index));
  };

  const guardarCuotas = async () => {
    if (!selectedPlan) return;
    
    try {
      const cuotasParaGuardar = cuotas.map(c => ({
        plan_pago_id: selectedPlan.id,
        numero_cuota: c.numero_cuota,
        concepto: c.concepto,
        monto: parseFloat(c.monto),
        fecha_vencimiento: c.fecha_vencimiento ? format(c.fecha_vencimiento, "yyyy-MM-dd") : null,
      }));

      const { error } = await supabase
        .from("cuotas_pago")
        .insert(cuotasParaGuardar);
      
      if (error) throw error;
      
      toast.success("Cuotas guardadas exitosamente");
      setOpen(false);
      setCuotas([]);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
        setFormData({
          nombre: "",
          ciclo_academico_id: "",
          nivel: "",
        });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const verDetallePlan = async (plan: any) => {
    const { data } = await supabase
      .from("cuotas_pago")
      .select("*")
      .eq("plan_pago_id", plan.id)
      .order("numero_cuota");
    
    setSelectedPlan({ ...plan, cuotas: data || [] });
    setViewOpen(true);
  };

  const total = cuotas.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Planes de Pago</CardTitle>
            <CardDescription>
              Gestión de planes de pago por ciclo académico
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CreditCard className="h-4 w-4" />
                Nuevo Plan de Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Plan de Pago</DialogTitle>
                <DialogDescription>
                  Configure el plan y luego agregue las cuotas
                </DialogDescription>
              </DialogHeader>
              
              {!selectedPlan ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Plan</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Plan de Pensiones 2025"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo">Ciclo Académico</Label>
                    <Select
                      value={formData.ciclo_academico_id}
                      onValueChange={(value) => setFormData({ ...formData, ciclo_academico_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione ciclo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ciclos?.map((ciclo) => (
                          <SelectItem key={ciclo.id} value={ciclo.id}>
                            {ciclo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nivel</Label>
                    <Select
                      value={formData.nivel}
                      onValueChange={(value) => setFormData({ ...formData, nivel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INICIAL">INICIAL</SelectItem>
                        <SelectItem value="PRIMARIA">PRIMARIA</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Crear Plan
                </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{formData.nombre}</h3>
                    <p className="text-sm text-muted-foreground">Nivel: {formData.nivel}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Cuotas</h4>
                      <Button onClick={agregarCuota} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Cuota
                      </Button>
                    </div>
                    
                    {cuotas.map((cuota, index) => (
                      <div key={index} className="border p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Cuota #{cuota.numero_cuota}</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => eliminarCuota(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Concepto</Label>
                            <Input
                              value={cuota.concepto}
                              onChange={(e) => actualizarCuota(index, "concepto", e.target.value)}
                              placeholder="Ej: Pensión Marzo"
                            />
                          </div>
                          <div>
                            <Label>Monto (S/)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={cuota.monto}
                              onChange={(e) => actualizarCuota(index, "monto", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Fecha de Vencimiento</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !cuota.fecha_vencimiento && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {cuota.fecha_vencimiento ? format(cuota.fecha_vencimiento, "PPP") : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={cuota.fecha_vencimiento}
                                  onSelect={(date) => actualizarCuota(index, "fecha_vencimiento", date)}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {cuotas.length > 0 && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total del Plan:</span>
                          <span className="text-lg font-bold">S/ {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-400">Pagado:</span>
                          <span className="text-green-600 dark:text-green-400">S/ 0.00</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600 dark:text-red-400">Restante:</span>
                          <span className="text-red-600 dark:text-red-400">S/ {total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    <Button onClick={guardarCuotas} className="w-full" disabled={cuotas.length === 0}>
                      Guardar Plan y Cuotas
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando planes...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planes?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.nombre}</TableCell>
                  <TableCell>{plan.ciclos_academicos?.nombre}</TableCell>
                  <TableCell>{plan.nivel}</TableCell>
                  <TableCell>S/ {Number(plan.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verDetallePlan(plan)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.info("Funcionalidad de editar en desarrollo");
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("¿Eliminar este plan?")) {
                            deletePlanMutation.mutate(plan.id);
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

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Plan de Pago</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedPlan.nombre}</h3>
                <p className="text-sm">Nivel: {selectedPlan.nivel}</p>
                <p className="text-sm">Ciclo: {selectedPlan.ciclos_academicos?.nombre}</p>
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
                    {selectedPlan.cuotas?.map((cuota: any) => (
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

export default PlanesPago;