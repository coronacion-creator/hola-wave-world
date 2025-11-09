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
import { DollarSign, RotateCcw } from "lucide-react";

const Pagos = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    cuota_id: "",
    metodo_pago: "efectivo" as const,
  });
  const [selectedCuota, setSelectedCuota] = useState<any>(null);

  const { data: cuotas, isLoading } = useQuery({
    queryKey: ["cuotas-pago"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuotas_pago")
        .select(`
          *,
          planes_pago(
            nombre,
            nivel,
            ciclos_academicos(nombre),
            matriculas(estudiantes(nombres, apellidos, dni))
          )
        `)
        .order("fecha_vencimiento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: cuotasDisponibles } = useQuery({
    queryKey: ["cuotas-disponibles", formData.estudiante_id],
    queryFn: async () => {
      if (!formData.estudiante_id) return [];
      
      const { data } = await supabase
        .from("cuotas_pago")
        .select(`
          *,
          planes_pago!inner(
            nombre,
            matriculas!inner(estudiante_id)
          )
        `)
        .eq("planes_pago.matriculas.estudiante_id", formData.estudiante_id)
        .in("estado", ["pendiente", "vencido"]);
      return data || [];
    },
    enabled: !!formData.estudiante_id,
  });

  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-pagos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("estudiantes")
        .select("*")
        .eq("estado", "activo");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPago: typeof formData) => {
      const { error } = await supabase
        .from("cuotas_pago")
        .update({
          estado: "pagado",
          fecha_pago: new Date().toISOString(),
        })
        .eq("id", newPago.cuota_id);
      
      if (error) throw error;
      return { success: true, message: "Pago procesado exitosamente" };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["cuotas-pago"] });
      queryClient.invalidateQueries({ queryKey: ["cuotas-disponibles"] });
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      toast.success(data.message);
      setOpen(false);
      setFormData({
        estudiante_id: "",
        cuota_id: "",
        metodo_pago: "efectivo",
      });
      setSelectedCuota(null);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: async ({ cuotaId, nuevoEstado }: { cuotaId: string; nuevoEstado: string }) => {
      const { error } = await supabase
        .from("cuotas_pago")
        .update({
          estado: nuevoEstado,
          fecha_pago: nuevoEstado === "pagado" ? new Date().toISOString() : null,
        })
        .eq("id", cuotaId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuotas-pago"] });
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      toast.success("Estado actualizado correctamente");
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
            <CardTitle>Gestión de Pagos</CardTitle>
            <CardDescription>
              Registro y control de pagos con actualización automática de deudas
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                <DialogDescription>
                  El pago se procesa y actualiza la deuda automáticamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estudiante">Estudiante</Label>
                  <Select
                    value={formData.estudiante_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, estudiante_id: value, cuota_id: "" });
                      setSelectedCuota(null);
                    }}
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

                {formData.estudiante_id && (
                  <div className="space-y-2">
                    <Label htmlFor="cuota">Cuota a Pagar</Label>
                    <Select
                      value={formData.cuota_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, cuota_id: value });
                        const cuota = cuotasDisponibles?.find(c => c.id === value);
                        setSelectedCuota(cuota);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione cuota" />
                      </SelectTrigger>
                      <SelectContent>
                        {cuotasDisponibles?.map((cuota) => (
                          <SelectItem key={cuota.id} value={cuota.id}>
                            Cuota {cuota.numero_cuota} - {cuota.concepto} - S/ {Number(cuota.monto).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedCuota && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Concepto:</span>
                      <span>{selectedCuota.concepto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Monto:</span>
                      <span className="font-bold text-lg">S/ {Number(selectedCuota.monto).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Vencimiento:</span>
                      <span>{new Date(selectedCuota.fecha_vencimiento).toLocaleDateString("es-PE")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Plan:</span>
                      <span>{selectedCuota.planes_pago?.nombre}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="metodo">Método de Pago</Label>
                  <Select
                    value={formData.metodo_pago}
                    onValueChange={(value: any) => setFormData({ ...formData, metodo_pago: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending || !formData.cuota_id}
                >
                  {createMutation.isPending ? "Procesando..." : "Procesar Pago"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando cuotas...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>N° Cuota</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuotas?.map((cuota) => {
                const matricula = cuota.planes_pago?.matriculas?.[0];
                const estudiante = matricula?.estudiantes;
                
                return (
                  <TableRow key={cuota.id}>
                    <TableCell>{cuota.planes_pago?.nombre}</TableCell>
                    <TableCell>
                      {estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : "Sin asignar"}
                    </TableCell>
                    <TableCell>{cuota.numero_cuota}</TableCell>
                    <TableCell>{cuota.concepto}</TableCell>
                    <TableCell className="font-semibold">S/ {Number(cuota.monto).toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={cuota.estado}
                        onValueChange={(value) => 
                          cambiarEstadoMutation.mutate({ cuotaId: cuota.id, nuevoEstado: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="pagado">Pagado</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Pagos;
