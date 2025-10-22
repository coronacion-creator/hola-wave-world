import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, LogOut, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cursos");
  const [profesorId, setProfesorId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get teacher profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("profesor_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.profesor_id) {
        setProfesorId(profile.profesor_id);
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: cursos = [] } = useQuery({
    queryKey: ["teacher-cursos", profesorId],
    queryFn: async () => {
      if (!profesorId) return [];
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("profesor_id", profesorId)
        .eq("activo", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profesorId,
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
                Panel de Docente
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
            <TabsTrigger value="calificaciones" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Calificaciones</span>
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
                  <CardTitle>Mis Cursos Asignados</CardTitle>
                  <CardDescription>Cursos que estás impartiendo actualmente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cursos.map((curso) => (
                      <Card key={curso.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{curso.nombre}</CardTitle>
                          <CardDescription>Código: {curso.codigo}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
                          <div className="mt-4 flex gap-2">
                            <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                              {curso.creditos} créditos
                            </span>
                            <span className="text-xs bg-secondary/10 px-2 py-1 rounded">
                              Nivel: {curso.nivel}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {cursos.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tienes cursos asignados actualmente
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calificaciones">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Calificaciones</CardTitle>
                  <CardDescription>Registra y actualiza las calificaciones de tus estudiantes</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Módulo de calificaciones en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="asistencia">
              <Card>
                <CardHeader>
                  <CardTitle>Control de Asistencia</CardTitle>
                  <CardDescription>Registra la asistencia de tus estudiantes</CardDescription>
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

export default TeacherDashboard;
