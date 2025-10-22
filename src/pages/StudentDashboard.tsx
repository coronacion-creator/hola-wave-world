import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Calendar, TrendingUp, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cursos");
  const [estudianteId, setEstudianteId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get student profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("estudiante_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.estudiante_id) {
        setEstudianteId(profile.estudiante_id);
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: matriculas = [] } = useQuery({
    queryKey: ["student-matriculas", estudianteId],
    queryFn: async () => {
      if (!estudianteId) return [];
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          *,
          cursos (nombre, codigo, creditos),
          estado_academico (promedio, estado)
        `)
        .eq("estudiante_id", estudianteId)
        .eq("estado", "activa");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!estudianteId,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Sesión cerrada exitosamente");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-green-50/30 dark:from-background dark:via-blue-950/20 dark:to-green-950/20">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Panel de Estudiante
              </h1>
              <p className="text-sm text-muted-foreground">EduGlobal S.A.C.</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto p-1">
            <TabsTrigger value="cursos" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="asistencia" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Asistencia</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="cursos">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Cursos Matriculados</CardTitle>
                  <CardDescription>Cursos en los que estás inscrito actualmente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {matriculas.map((matricula: any) => (
                      <Card key={matricula.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{matricula.cursos?.nombre}</CardTitle>
                          <CardDescription>Código: {matricula.cursos?.codigo}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Promedio:</span>
                              <span className="text-lg font-bold text-primary">
                                {matricula.estado_academico?.[0]?.promedio?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                                {matricula.cursos?.creditos} créditos
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                matricula.estado_academico?.[0]?.estado === 'aprobado' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {matricula.estado_academico?.[0]?.estado || 'en_curso'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {matriculas.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tienes cursos matriculados actualmente
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Notas</CardTitle>
                  <CardDescription>Consulta tus calificaciones por curso</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Módulo de notas en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="asistencia">
              <Card>
                <CardHeader>
                  <CardTitle>Registro de Asistencia</CardTitle>
                  <CardDescription>Visualiza tu asistencia en cada curso</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Módulo de asistencia en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
