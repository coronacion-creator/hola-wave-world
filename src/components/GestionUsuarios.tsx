import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

interface UserData {
  user_id: string;
  email: string;
  role: UserRole;
  profesor_nombre?: string;
  estudiante_nombre?: string;
  created_at: string;
}

const GestionUsuarios = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [profesorId, setProfesorId] = useState<string>("");
  const [estudianteId, setEstudianteId] = useState<string>("");
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfesoresYEstudiantes();
    loadUsers();
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

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: userRolesData, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          profiles!inner(
            user_id,
            profesor_id,
            estudiante_id
          )
        `);

      if (error) throw error;

      // Get auth users emails
      const { data } = await supabase.auth.admin.listUsers();
      const authUsers = data.users;
      
      const usersWithDetails = await Promise.all(
        (userRolesData || []).map(async (ur: any) => {
          const authUser = authUsers?.find((u: any) => u.id === ur.user_id);
          const profile = ur.profiles;
          
          let profesor_nombre, estudiante_nombre;
          
          if (profile?.profesor_id) {
            const { data: prof } = await supabase
              .from('profesores')
              .select('nombres, apellidos')
              .eq('id', profile.profesor_id)
              .maybeSingle();
            if (prof) profesor_nombre = `${prof.nombres} ${prof.apellidos}`;
          }
          
          if (profile?.estudiante_id) {
            const { data: est } = await supabase
              .from('estudiantes')
              .select('nombres, apellidos')
              .eq('id', profile.estudiante_id)
              .maybeSingle();
            if (est) estudiante_nombre = `${est.nombres} ${est.apellidos}`;
          }
          
          return {
            user_id: ur.user_id,
            email: authUser?.email || 'N/A',
            role: ur.role,
            profesor_nombre,
            estudiante_nombre,
            created_at: ur.created_at
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
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
        setIsDialogOpen(false);
        loadUsers();
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'secondary';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Lista de usuarios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios Registrados
            </CardTitle>
            <CardDescription>
              Gestiona todos los usuarios del sistema
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Crea una cuenta y asigna un rol
                </DialogDescription>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados aún
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Vinculado a</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.profesor_nombre || user.estudiante_nombre || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionUsuarios;
