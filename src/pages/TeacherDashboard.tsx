import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, ClipboardCheck, BarChart3, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  nivel: string;
  creditos: number;
  estudiantes_count?: number;
}

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("cursos");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadCursosProfesor();
    }
  }, [user]);

  const loadCursosProfesor = async () => {
    try {
      setLoading(true);
      
      // Get profile to find profesor_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('profesor_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profile?.profesor_id) {
        toast({
          title: "Error",
          description: "No se encontró perfil de profesor vinculado",
          variant: "destructive",
        });
        return;
      }

      // Get cursos assigned to this profesor
      const { data: cursosData, error } = await supabase
        .from('cursos')
        .select('*')
        .eq('profesor_id', profile.profesor_id)
        .eq('activo', true);

      if (error) throw error;

      // Get student count for each curso
      const cursosConEstudiantes = await Promise.all(
        (cursosData || []).map(async (curso) => {
          const { count } = await supabase
            .from('matriculas')
            .select('*', { count: 'exact', head: true })
            .eq('curso_id', curso.id)
            .eq('estado', 'activa');

          return {
            ...curso,
            estudiantes_count: count || 0
          };
        })
      );

      setCursos(cursosConEstudiantes);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los cursos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                Panel de Profesor
              </h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión Educativa</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-2 h-auto p-1">
            <TabsTrigger value="cursos" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="asistencia" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Asistencia</span>
            </TabsTrigger>
            <TabsTrigger value="evaluaciones" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Evaluaciones</span>
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estadísticas</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="cursos">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Cursos Asignados</CardTitle>
                  <CardDescription>
                    Gestiona tus cursos y estudiantes matriculados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : cursos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tienes cursos asignados actualmente
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {cursos.map((curso) => (
                        <Card key={curso.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{curso.nombre}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {curso.codigo}
                                </p>
                              </div>
                              <Badge variant="secondary">{curso.nivel}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              {curso.descripcion || 'Sin descripción'}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {curso.creditos} créditos
                              </span>
                              <span className="font-medium">
                                {curso.estudiantes_count || 0} estudiantes
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="asistencia">
              <Card>
                <CardHeader>
                  <CardTitle>Control de Asistencia</CardTitle>
                  <CardDescription>
                    Marca la asistencia de tus estudiantes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="evaluaciones">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluaciones</CardTitle>
                  <CardDescription>
                    Registra y gestiona las calificaciones de tus estudiantes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="estadisticas">
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas del Aula</CardTitle>
                  <CardDescription>
                    Visualiza el rendimiento general de tus clases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
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
