import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

const RegistrarPago = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    cuota_id: "",
    metodo_pago: "efectivo" as const,
  });
  const [selectedCuota, setSelectedCuota] = useState<any>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Registrar Pago</CardTitle>
            <CardDescription>
              Procesar pagos de cuotas de estudiantes
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Nuevo Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                <DialogDescription>
                  Seleccione el estudiante y la cuota a pagar
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
        <div className="text-center py-8 text-muted-foreground">
          <p>Haga clic en "Nuevo Pago" para registrar un pago</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegistrarPago;
