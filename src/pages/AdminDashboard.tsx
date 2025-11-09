import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Users, BookOpen, DollarSign, BarChart3, UserCheck, BookMarked, LogOut, UserPlus, DoorOpen, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/components/Dashboard";
import Estudiantes from "@/components/Estudiantes";
import Matriculas from "@/components/Matriculas";
import Pagos from "@/components/Pagos";
import Evaluaciones from "@/components/Evaluaciones";
import Profesores from "@/components/Profesores";
import Cursos from "@/components/Cursos";
import GestionUsuarios from "@/components/GestionUsuarios";
import { CicloAcademico } from "@/components/CicloAcademico";
import { Salones } from "@/components/Salones";

const AdminDashboard = () => {
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
                Panel de Administración
              </h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión Educativa Distribuida</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-10 gap-2 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="estudiantes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Estudiantes</span>
            </TabsTrigger>
            <TabsTrigger value="profesores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Profesores</span>
            </TabsTrigger>
            <TabsTrigger value="cursos" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              <span className="hidden sm:inline">Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="matriculas" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Matrículas</span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="academico" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Académico</span>
            </TabsTrigger>
            <TabsTrigger value="ciclos" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Ciclo Académico</span>
            </TabsTrigger>
            <TabsTrigger value="salones" className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Salones</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard">
              <Dashboard />
            </TabsContent>
            <TabsContent value="usuarios">
              <GestionUsuarios />
            </TabsContent>
            <TabsContent value="estudiantes">
              <Estudiantes />
            </TabsContent>
            <TabsContent value="profesores">
              <Profesores />
            </TabsContent>
            <TabsContent value="cursos">
              <Cursos />
            </TabsContent>
            <TabsContent value="matriculas">
              <Matriculas />
            </TabsContent>
            <TabsContent value="pagos">
              <Pagos />
            </TabsContent>
            <TabsContent value="academico">
              <Evaluaciones />
            </TabsContent>
            <TabsContent value="ciclos">
              <CicloAcademico />
            </TabsContent>
            <TabsContent value="salones">
              <Salones />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
