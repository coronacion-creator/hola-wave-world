import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, Calendar, Trophy, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { signOut } = useAuth();

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
                Portal del Estudiante
              </h1>
              <p className="text-sm text-muted-foreground">Mi Rendimiento Académico</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-2 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Notas</span>
            </TabsTrigger>
            <TabsTrigger value="cursos" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="asistencia" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Asistencia</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard">
              <Card>
                <CardHeader>
                  <CardTitle>Mi Rendimiento Académico</CardTitle>
                  <CardDescription>
                    Resumen de tu progreso y estadísticas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notas">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Notas por Curso</CardTitle>
                  <CardDescription>
                    Visualiza tus calificaciones en cada curso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cursos">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Cursos</CardTitle>
                  <CardDescription>
                    Cursos en los que estás matriculado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="asistencia">
              <Card>
                <CardHeader>
                  <CardTitle>Mi Asistencia</CardTitle>
                  <CardDescription>
                    Calendario de asistencia a clases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contenido en desarrollo...</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking del Aula</CardTitle>
                  <CardDescription>
                    Tu posición según rendimiento académico
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

export default StudentDashboard;
