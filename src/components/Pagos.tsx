import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye } from "lucide-react";

const Pagos = () => {
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<any>(null);

  const { data: planes, isLoading } = useQuery({
    queryKey: ["planes-con-estudiantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planes_pago")
        .select(`
          *,
          ciclos_academicos(nombre)
        `)
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verEstudiantesPlan = async (plan: any) => {
    const { data } = await supabase
      .from("matriculas")
      .select(`
        *,
        estudiantes(id, nombres, apellidos, dni)
      `)
      .eq("plan_pago_id", plan.id);
    
    setSelectedPlan({ ...plan, estudiantes: data || [] });
    setViewOpen(true);
    setSelectedEstudiante(null);
  };

  const verPagosEstudiante = async (estudiante: any) => {
    const { data } = await supabase
      .from("cuotas_pago")
      .select("*")
      .eq("plan_pago_id", selectedPlan.id)
      .order("numero_cuota");
    
    setSelectedEstudiante({ ...estudiante, cuotas: data || [] });
  };

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
      queryClient.invalidateQueries({ queryKey: ["planes-con-estudiantes"] });
      toast.success("Estado actualizado correctamente");
      if (selectedEstudiante) {
        verPagosEstudiante(selectedEstudiante.estudiantes);
      }
    },
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Gestión de Pagos</CardTitle>
        <CardDescription>
          Visualice planes de pago y gestione el estado de las cuotas por estudiante
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando planes...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estudiantes</TableHead>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verEstudiantesPlan(plan)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Estudiantes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan?.nombre} - {selectedPlan?.ciclos_academicos?.nombre}
            </DialogTitle>
            <DialogDescription>
              {selectedEstudiante 
                ? `Cuotas de ${selectedEstudiante.estudiantes?.nombres} ${selectedEstudiante.estudiantes?.apellidos}`
                : "Estudiantes inscritos en este plan"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              {!selectedEstudiante ? (
                <>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm"><strong>Nivel:</strong> {selectedPlan.nivel}</p>
                    <p className="text-sm"><strong>Total Plan:</strong> S/ {Number(selectedPlan.total).toFixed(2)}</p>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlan.estudiantes?.map((matricula: any) => (
                        <TableRow key={matricula.id}>
                          <TableCell>
                            {matricula.estudiantes?.nombres} {matricula.estudiantes?.apellidos}
                          </TableCell>
                          <TableCell>{matricula.estudiantes?.dni}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verPagosEstudiante(matricula)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Pagos
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEstudiante(null)}
                  >
                    ← Volver a estudiantes
                  </Button>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm"><strong>Estudiante:</strong> {selectedEstudiante.estudiantes?.nombres} {selectedEstudiante.estudiantes?.apellidos}</p>
                    <p className="text-sm"><strong>DNI:</strong> {selectedEstudiante.estudiantes?.dni}</p>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Cuota</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEstudiante.cuotas?.map((cuota: any) => (
                        <TableRow key={cuota.id}>
                          <TableCell>{cuota.numero_cuota}</TableCell>
                          <TableCell>{cuota.concepto}</TableCell>
                          <TableCell>S/ {Number(cuota.monto).toFixed(2)}</TableCell>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Pagos;
