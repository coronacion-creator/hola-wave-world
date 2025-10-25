import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2 } from "lucide-react";

type UserRole = 'admin' | 'teacher' | 'student';

interface Profesor {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
}

interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
}

const GestionUsuarios = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [profesorId, setProfesorId] = useState<string>("");
  const [estudianteId, setEstudianteId] = useState<string>("");
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfesoresYEstudiantes();
  }, []);

  const loadProfesoresYEstudiantes = async () => {
    setLoadingData(true);
    try {
      const [profesoresResult, estudiantesResult] = await Promise.all([
        supabase.from('profesores').select('id, nombres, apellidos, dni').eq('estado', 'activo'),
        supabase.from('estudiantes').select('id, nombres, apellidos, dni').eq('estado', 'activo')
      ]);

      if (profesoresResult.data) setProfesores(profesoresResult.data);
      if (estudiantesResult.data) setEstudiantes(estudiantesResult.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que se haya seleccionado un profesor o estudiante según el rol
    if (role === 'teacher' && !profesorId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un profesor",
        variant: "destructive",
      });
      return;
    }
    
    if (role === 'student' && !estudianteId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un estudiante",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Call edge function to create user with role
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email,
          password,
          role,
          profesor_id: role === 'teacher' ? profesorId : undefined,
          estudiante_id: role === 'student' ? estudianteId : undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Usuario creado",
          description: `Usuario ${email} creado exitosamente como ${role}`,
        });
        setEmail("");
        setPassword("");
        setRole("student");
        setProfesorId("");
        setEstudianteId("");
      } else {
        throw new Error(data.message || "Error al crear usuario");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nuevo Usuario
          </CardTitle>
          <CardDescription>
            Crea cuentas para administradores, profesores o estudiantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(value) => {
                setRole(value as UserRole);
                setProfesorId("");
                setEstudianteId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="teacher">Profesor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {role === 'teacher' && (
              <div className="space-y-2">
                <Label htmlFor="profesor">Vincular con Profesor</Label>
                <Select value={profesorId} onValueChange={setProfesorId} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Cargando..." : "Selecciona un profesor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {profesores.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.nombres} {prof.apellidos} - DNI: {prof.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="estudiante">Vincular con Estudiante</Label>
                <Select value={estudianteId} onValueChange={setEstudianteId} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Cargando..." : "Selecciona un estudiante"} />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.nombres} {est.apellidos} - DNI: {est.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Usuario
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionUsuarios;
