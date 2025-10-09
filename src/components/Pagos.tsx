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
    sede_id: "",
    monto: "",
    concepto: "",
    metodo_pago: "efectivo" as const,
  });

  const { data: pagos, isLoading } = useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagos")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni),
          sedes(nombre)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

  const { data: sedes } = useQuery({
    queryKey: ["sedes-pagos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sedes")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPago: typeof formData) => {
      const { data, error } = await supabase.rpc("procesar_pago", {
        p_estudiante_id: newPago.estudiante_id,
        p_sede_id: newPago.sede_id,
        p_monto: parseFloat(newPago.monto),
        p_concepto: newPago.concepto,
        p_metodo_pago: newPago.metodo_pago,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["pagos"] });
        toast.success(data.message);
        setOpen(false);
        setFormData({
          estudiante_id: "",
          sede_id: "",
          monto: "",
          concepto: "",
          metodo_pago: "efectivo",
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const revertirMutation = useMutation({
    mutationFn: async (pagoId: string) => {
      const { data, error } = await supabase.rpc("revertir_pago", {
        p_pago_id: pagoId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["pagos"] });
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
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
                          {sede.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (S/)</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto</Label>
                  <Input
                    id="concepto"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    placeholder="Ej: Mensualidad, Matrícula"
                    required
                  />
                </div>
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
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Procesando..." : "Procesar Pago"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando pagos...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos?.map((pago) => (
                <TableRow key={pago.id}>
                  <TableCell>
                    {pago.estudiantes?.nombres} {pago.estudiantes?.apellidos}
                  </TableCell>
                  <TableCell>{pago.sedes?.nombre}</TableCell>
                  <TableCell className="font-semibold">S/ {Number(pago.monto).toFixed(2)}</TableCell>
                  <TableCell>{pago.concepto}</TableCell>
                  <TableCell className="capitalize">{pago.metodo_pago}</TableCell>
                  <TableCell>
                    {new Date(pago.fecha_pago).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      pago.estado === "completado"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : pago.estado === "revertido"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {pago.estado}
                    </span>
                  </TableCell>
                  <TableCell>
                    {pago.estado === "completado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revertirMutation.mutate(pago.id)}
                        disabled={revertirMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Revertir
                      </Button>
                    )}
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

export default Pagos;
