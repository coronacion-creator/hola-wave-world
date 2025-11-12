-- =====================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS
-- Sistema de Gestión Educativa
-- =====================================================

-- =====================================================
-- CREAR ENUM PARA ROLES
-- =====================================================
CREATE TYPE app_role AS ENUM ('admin', 'teacher', 'student');

-- =====================================================
-- TABLAS
-- =====================================================

-- Tabla: sedes
CREATE TABLE IF NOT EXISTS public.sedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: ciclos_academicos
CREATE TABLE IF NOT EXISTS public.ciclos_academicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: grados_secciones
CREATE TABLE IF NOT EXISTS public.grados_secciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  nivel TEXT NOT NULL DEFAULT 'PRIMARIA',
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: estudiantes
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  dni TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT,
  fecha_nacimiento DATE,
  edad INTEGER,
  sexo TEXT,
  direccion TEXT,
  telefono TEXT,
  apoderado_dni TEXT,
  apoderado_nombres TEXT,
  apoderado_apellidos TEXT,
  apoderado_email TEXT,
  apoderado_telefono TEXT,
  apoderado_direccion TEXT,
  apoderado_fecha_nacimiento DATE,
  apoderado_edad INTEGER,
  apoderado_sexo TEXT,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: profesores
CREATE TABLE IF NOT EXISTS public.profesores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  dni TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  fecha_nacimiento DATE,
  edad INTEGER,
  sexo TEXT,
  especialidad TEXT,
  fecha_contratacion DATE,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla: salones
CREATE TABLE IF NOT EXISTS public.salones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  ciclo_academico_id UUID REFERENCES public.ciclos_academicos(id),
  profesor_id UUID REFERENCES public.profesores(id),
  codigo TEXT NOT NULL,
  nombre TEXT,
  nivel TEXT NOT NULL,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  capacidad INTEGER DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  nivel TEXT,
  creditos INTEGER DEFAULT 0,
  profesor_id UUID REFERENCES public.profesores(id),
  grado_seccion_id UUID REFERENCES public.grados_secciones(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: salon_cursos
CREATE TABLE IF NOT EXISTS public.salon_cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salones(id),
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: competencias
CREATE TABLE IF NOT EXISTS public.competencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_curso_id UUID NOT NULL REFERENCES public.salon_cursos(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: estudiantes_salones
CREATE TABLE IF NOT EXISTS public.estudiantes_salones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  salon_id UUID NOT NULL REFERENCES public.salones(id),
  periodo_academico TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: planes_pago
CREATE TABLE IF NOT EXISTS public.planes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID REFERENCES public.estudiantes(id),
  ciclo_academico_id UUID REFERENCES public.ciclos_academicos(id),
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL,
  total NUMERIC DEFAULT 0,
  pagado NUMERIC DEFAULT 0,
  restante NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: matriculas
CREATE TABLE IF NOT EXISTS public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  grado_seccion_id UUID REFERENCES public.grados_secciones(id),
  plan_pago_id UUID REFERENCES public.planes_pago(id),
  periodo_academico TEXT NOT NULL,
  estado TEXT DEFAULT 'activa',
  fecha_matricula TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: evaluaciones
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id),
  tipo_evaluacion TEXT,
  nota NUMERIC,
  peso NUMERIC DEFAULT 1.00,
  fecha_evaluacion DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: estado_academico
CREATE TABLE IF NOT EXISTS public.estado_academico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) UNIQUE,
  promedio NUMERIC DEFAULT 0.00,
  estado TEXT DEFAULT 'en_curso',
  ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: asistencias
CREATE TABLE IF NOT EXISTS public.asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id),
  fecha DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  justificacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: deudas_estudiantes
CREATE TABLE IF NOT EXISTS public.deudas_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  deuda_total NUMERIC DEFAULT 0.00,
  deuda_pendiente NUMERIC DEFAULT 0.00,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  monto NUMERIC NOT NULL,
  concepto TEXT NOT NULL,
  metodo_pago TEXT,
  estado TEXT DEFAULT 'completado',
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: cuotas_pago
CREATE TABLE IF NOT EXISTS public.cuotas_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_pago_id UUID NOT NULL REFERENCES public.planes_pago(id),
  numero_cuota INTEGER NOT NULL,
  monto NUMERIC NOT NULL,
  concepto TEXT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: inventario
CREATE TABLE IF NOT EXISTS public.inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  codigo_material TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_material TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  precio_unitario NUMERIC DEFAULT 0.00,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: ventas_inventario
CREATE TABLE IF NOT EXISTS public.ventas_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  inventario_id UUID NOT NULL REFERENCES public.inventario(id),
  cantidad INTEGER NOT NULL,
  precio_total NUMERIC NOT NULL,
  fecha_venta TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: horarios
CREATE TABLE IF NOT EXISTS public.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  dia_semana INTEGER NOT NULL,
  hora_inicio TIME WITHOUT TIME ZONE NOT NULL,
  hora_fin TIME WITHOUT TIME ZONE NOT NULL,
  aula TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  profesor_id UUID REFERENCES public.profesores(id),
  estudiante_id UUID REFERENCES public.estudiantes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Función: get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Función: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Función: actualizar_totales_plan_pago
CREATE OR REPLACE FUNCTION public.actualizar_totales_plan_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE planes_pago
  SET 
    total = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id),
    pagado = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id AND estado = 'pagado'),
    restante = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id AND estado != 'pagado'),
    updated_at = now()
  WHERE id = NEW.plan_pago_id;
  RETURN NEW;
END;
$$;

-- Función: matricular_con_validacion
CREATE OR REPLACE FUNCTION public.matricular_con_validacion(
  p_estudiante_id UUID,
  p_curso_id UUID,
  p_sede_id UUID,
  p_periodo_academico TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_matricula_id UUID;
  v_matricula_existente INTEGER;
  v_result JSON;
BEGIN
  SELECT COUNT(*) INTO v_matricula_existente
  FROM matriculas
  WHERE estudiante_id = p_estudiante_id
    AND curso_id = p_curso_id
    AND periodo_academico = p_periodo_academico
    AND estado = 'activa';
  
  IF v_matricula_existente > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'El estudiante ya está matriculado en este curso para el periodo académico actual'
    );
  END IF;
  
  INSERT INTO matriculas (estudiante_id, curso_id, sede_id, periodo_academico)
  VALUES (p_estudiante_id, p_curso_id, p_sede_id, p_periodo_academico)
  RETURNING id INTO v_matricula_id;
  
  INSERT INTO estado_academico (matricula_id, promedio, estado)
  VALUES (v_matricula_id, 0, 'en_curso')
  ON CONFLICT (matricula_id) DO NOTHING;
  
  v_result := json_build_object(
    'success', true,
    'matricula_id', v_matricula_id,
    'message', 'Matrícula registrada exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar la matrícula'
    );
END;
$$;

-- Función: registrar_estudiante_y_matricula
CREATE OR REPLACE FUNCTION public.registrar_estudiante_y_matricula(
  p_sede_id UUID,
  p_dni TEXT,
  p_nombres TEXT,
  p_apellidos TEXT,
  p_email TEXT,
  p_curso_id UUID,
  p_periodo_academico TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estudiante_id UUID;
  v_matricula_id UUID;
  v_result JSON;
BEGIN
  INSERT INTO estudiantes (sede_id, dni, nombres, apellidos, email)
  VALUES (p_sede_id, p_dni, p_nombres, p_apellidos, p_email)
  RETURNING id INTO v_estudiante_id;
  
  INSERT INTO deudas_estudiantes (estudiante_id, deuda_total, deuda_pendiente)
  VALUES (v_estudiante_id, 0, 0);
  
  INSERT INTO matriculas (estudiante_id, curso_id, sede_id, periodo_academico)
  VALUES (v_estudiante_id, p_curso_id, p_sede_id, p_periodo_academico)
  RETURNING id INTO v_matricula_id;
  
  INSERT INTO estado_academico (matricula_id, promedio, estado)
  VALUES (v_matricula_id, 0, 'en_curso');
  
  v_result := json_build_object(
    'success', true,
    'estudiante_id', v_estudiante_id,
    'matricula_id', v_matricula_id,
    'message', 'Estudiante y matrícula registrados exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al registrar estudiante y matrícula'
    );
END;
$$;

-- Función: procesar_pago
CREATE OR REPLACE FUNCTION public.procesar_pago(
  p_estudiante_id UUID,
  p_sede_id UUID,
  p_monto NUMERIC,
  p_concepto TEXT,
  p_metodo_pago TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pago_id UUID;
  v_deuda_actual DECIMAL;
  v_result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM estudiantes WHERE id = p_estudiante_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Estudiante no encontrado'
    );
  END IF;
  
  INSERT INTO pagos (estudiante_id, sede_id, monto, concepto, metodo_pago, estado)
  VALUES (p_estudiante_id, p_sede_id, p_monto, p_concepto, p_metodo_pago, 'completado')
  RETURNING id INTO v_pago_id;
  
  UPDATE deudas_estudiantes
  SET deuda_pendiente = GREATEST(deuda_pendiente - p_monto, 0),
      ultima_actualizacion = now()
  WHERE estudiante_id = p_estudiante_id
  RETURNING deuda_pendiente INTO v_deuda_actual;
  
  v_result := json_build_object(
    'success', true,
    'pago_id', v_pago_id,
    'deuda_restante', v_deuda_actual,
    'message', 'Pago procesado exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar el pago'
    );
END;
$$;

-- Función: revertir_pago
CREATE OR REPLACE FUNCTION public.revertir_pago(p_pago_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pago_record RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_pago_record FROM pagos WHERE id = p_pago_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Pago no encontrado'
    );
  END IF;
  
  UPDATE pagos
  SET estado = 'revertido'
  WHERE id = p_pago_id;
  
  UPDATE deudas_estudiantes
  SET deuda_pendiente = deuda_pendiente + v_pago_record.monto,
      ultima_actualizacion = now()
  WHERE estudiante_id = v_pago_record.estudiante_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Pago revertido exitosamente',
    'monto_revertido', v_pago_record.monto
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al revertir el pago'
    );
END;
$$;

-- Función: vender_material_inventario
CREATE OR REPLACE FUNCTION public.vender_material_inventario(
  p_estudiante_id UUID,
  p_inventario_id UUID,
  p_cantidad INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inventario RECORD;
  v_venta_id UUID;
  v_precio_total DECIMAL;
  v_result JSON;
BEGIN
  SELECT * INTO v_inventario
  FROM inventario
  WHERE id = p_inventario_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Material no encontrado en inventario'
    );
  END IF;
  
  IF v_inventario.stock < p_cantidad THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Stock insuficiente',
      'stock_disponible', v_inventario.stock
    );
  END IF;
  
  v_precio_total := v_inventario.precio_unitario * p_cantidad;
  
  INSERT INTO ventas_inventario (estudiante_id, inventario_id, cantidad, precio_total)
  VALUES (p_estudiante_id, p_inventario_id, p_cantidad, v_precio_total)
  RETURNING id INTO v_venta_id;
  
  UPDATE inventario
  SET stock = stock - p_cantidad,
      updated_at = now()
  WHERE id = p_inventario_id;
  
  v_result := json_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'precio_total', v_precio_total,
    'stock_restante', v_inventario.stock - p_cantidad,
    'message', 'Venta registrada exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar la venta'
    );
END;
$$;

-- Función: registrar_evaluacion_y_actualizar_promedio
CREATE OR REPLACE FUNCTION public.registrar_evaluacion_y_actualizar_promedio(
  p_matricula_id UUID,
  p_tipo_evaluacion TEXT,
  p_nota NUMERIC,
  p_peso NUMERIC,
  p_fecha_evaluacion DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_evaluacion_id UUID;
  v_nuevo_promedio DECIMAL;
  v_result JSON;
BEGIN
  INSERT INTO evaluaciones (matricula_id, tipo_evaluacion, nota, peso, fecha_evaluacion)
  VALUES (p_matricula_id, p_tipo_evaluacion, p_nota, p_peso, p_fecha_evaluacion)
  RETURNING id INTO v_evaluacion_id;
  
  SELECT COALESCE(SUM(nota * peso) / NULLIF(SUM(peso), 0), 0)
  INTO v_nuevo_promedio
  FROM evaluaciones
  WHERE matricula_id = p_matricula_id;
  
  UPDATE estado_academico
  SET promedio = v_nuevo_promedio,
      estado = CASE
        WHEN v_nuevo_promedio >= 10.5 THEN 'aprobado'
        ELSE 'reprobado'
      END,
      ultima_actualizacion = now()
  WHERE matricula_id = p_matricula_id;
  
  v_result := json_build_object(
    'success', true,
    'evaluacion_id', v_evaluacion_id,
    'nuevo_promedio', v_nuevo_promedio,
    'message', 'Evaluación registrada y promedio actualizado'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al registrar evaluación'
    );
END;
$$;

-- Función: asignar_profesor_a_curso
CREATE OR REPLACE FUNCTION public.asignar_profesor_a_curso(
  p_curso_id UUID,
  p_profesor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Curso no encontrado'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profesores WHERE id = p_profesor_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Profesor no encontrado'
    );
  END IF;
  
  UPDATE cursos
  SET profesor_id = p_profesor_id
  WHERE id = p_curso_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Profesor asignado exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al asignar profesor'
    );
END;
$$;

-- Función: obtener_estadisticas_curso
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_curso(p_curso_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_total_estudiantes INTEGER;
  v_promedio_general DECIMAL;
BEGIN
  SELECT COUNT(*) INTO v_total_estudiantes
  FROM matriculas
  WHERE curso_id = p_curso_id
    AND estado = 'activa';
  
  SELECT AVG(ea.promedio) INTO v_promedio_general
  FROM estado_academico ea
  INNER JOIN matriculas m ON ea.matricula_id = m.id
  WHERE m.curso_id = p_curso_id
    AND m.estado = 'activa';
  
  v_result := json_build_object(
    'total_estudiantes', v_total_estudiantes,
    'promedio_general', COALESCE(v_promedio_general, 0)
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Actualizar updated_at en ciclos_academicos
CREATE TRIGGER update_ciclos_academicos_updated_at
BEFORE UPDATE ON public.ciclos_academicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en estudiantes
CREATE TRIGGER update_estudiantes_updated_at
BEFORE UPDATE ON public.estudiantes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en profesores
CREATE TRIGGER update_profesores_updated_at
BEFORE UPDATE ON public.profesores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en salones
CREATE TRIGGER update_salones_updated_at
BEFORE UPDATE ON public.salones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en competencias
CREATE TRIGGER update_competencias_updated_at
BEFORE UPDATE ON public.competencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en evaluaciones
CREATE TRIGGER update_evaluaciones_updated_at
BEFORE UPDATE ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en inventario
CREATE TRIGGER update_inventario_updated_at
BEFORE UPDATE ON public.inventario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en planes_pago
CREATE TRIGGER update_planes_pago_updated_at
BEFORE UPDATE ON public.planes_pago
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en cuotas_pago
CREATE TRIGGER update_cuotas_pago_updated_at
BEFORE UPDATE ON public.cuotas_pago
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar updated_at en profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar totales de plan de pago
CREATE TRIGGER trigger_actualizar_totales_plan_pago
AFTER INSERT OR UPDATE ON public.cuotas_pago
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_totales_plan_pago();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grados_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes_salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estado_academico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deudas_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - SEDES
-- =====================================================
CREATE POLICY "Todos pueden ver sedes" ON public.sedes FOR SELECT USING (true);

-- =====================================================
-- POLÍTICAS RLS - CICLOS ACADÉMICOS
-- =====================================================
CREATE POLICY "Todos pueden ver ciclos académicos" ON public.ciclos_academicos FOR SELECT USING (true);
CREATE POLICY "Admins pueden gestionar ciclos académicos" ON public.ciclos_academicos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - GRADOS SECCIONES
-- =====================================================
CREATE POLICY "Todos pueden ver grados_secciones" ON public.grados_secciones FOR SELECT USING (true);
CREATE POLICY "Admins can manage grados_secciones" ON public.grados_secciones FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - ESTUDIANTES
-- =====================================================
CREATE POLICY "Todos pueden ver estudiantes" ON public.estudiantes FOR SELECT USING (true);
CREATE POLICY "Admins can manage students" ON public.estudiantes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - PROFESORES
-- =====================================================
CREATE POLICY "Todos pueden ver profesores" ON public.profesores FOR SELECT USING (true);
CREATE POLICY "Admins can manage teachers" ON public.profesores FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - SALONES
-- =====================================================
CREATE POLICY "Todos pueden ver salones" ON public.salones FOR SELECT USING (true);
CREATE POLICY "Admins can manage salones" ON public.salones FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - CURSOS
-- =====================================================
CREATE POLICY "Todos pueden ver cursos" ON public.cursos FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses" ON public.cursos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - SALON_CURSOS
-- =====================================================
CREATE POLICY "Everyone can view salon courses" ON public.salon_cursos FOR SELECT USING (true);
CREATE POLICY "Teachers can view their salon courses" ON public.salon_cursos FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM salones s JOIN profiles p ON s.profesor_id = p.profesor_id WHERE s.id = salon_cursos.salon_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can manage salon_cursos" ON public.salon_cursos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - COMPETENCIAS
-- =====================================================
CREATE POLICY "Everyone can view competencias" ON public.competencias FOR SELECT USING (true);
CREATE POLICY "Teachers can view competencias for their salons" ON public.competencias FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM salon_cursos sc JOIN salones s ON sc.salon_id = s.id JOIN profiles p ON s.profesor_id = p.profesor_id WHERE sc.id = competencias.salon_curso_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can manage competencias" ON public.competencias FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - ESTUDIANTES_SALONES
-- =====================================================
CREATE POLICY "Todos pueden ver estudiantes_salones" ON public.estudiantes_salones FOR SELECT USING (true);
CREATE POLICY "Admins can manage estudiantes_salones" ON public.estudiantes_salones FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - PLANES_PAGO
-- =====================================================
CREATE POLICY "Estudiantes pueden ver sus planes" ON public.planes_pago FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.estudiante_id = planes_pago.estudiante_id));
CREATE POLICY "Admins pueden gestionar planes de pago" ON public.planes_pago FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - MATRICULAS
-- =====================================================
CREATE POLICY "Todos pueden ver matrículas" ON public.matriculas FOR SELECT USING (true);
CREATE POLICY "Admins can manage enrollments" ON public.matriculas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - EVALUACIONES
-- =====================================================
CREATE POLICY "Todos pueden ver evaluaciones" ON public.evaluaciones FOR SELECT USING (true);
CREATE POLICY "Teachers can manage evaluations for their courses" ON public.evaluaciones FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN cursos c ON m.curso_id = c.id JOIN profiles p ON c.profesor_id = p.profesor_id WHERE m.id = evaluaciones.matricula_id AND p.user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN cursos c ON m.curso_id = c.id JOIN profiles p ON c.profesor_id = p.profesor_id WHERE m.id = evaluaciones.matricula_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can manage evaluations" ON public.evaluaciones FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - ESTADO_ACADEMICO
-- =====================================================
CREATE POLICY "Todos pueden ver estado académico" ON public.estado_academico FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar estado académico" ON public.estado_academico FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar estado académico" ON public.estado_academico FOR UPDATE USING (true);

-- =====================================================
-- POLÍTICAS RLS - ASISTENCIAS
-- =====================================================
CREATE POLICY "Admins can view all attendance" ON public.asistencias FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage all attendance" ON public.asistencias FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view attendance for their courses" ON public.asistencias FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN cursos c ON m.curso_id = c.id JOIN profiles p ON c.profesor_id = p.profesor_id WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()));
CREATE POLICY "Teachers can insert attendance for their courses" ON public.asistencias FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN cursos c ON m.curso_id = c.id JOIN profiles p ON c.profesor_id = p.profesor_id WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()));
CREATE POLICY "Teachers can update attendance for their courses" ON public.asistencias FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN cursos c ON m.curso_id = c.id JOIN profiles p ON c.profesor_id = p.profesor_id WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()));
CREATE POLICY "Students can view their own attendance" ON public.asistencias FOR SELECT USING (has_role(auth.uid(), 'student'::app_role) AND EXISTS (SELECT 1 FROM matriculas m JOIN profiles p ON m.estudiante_id = p.estudiante_id WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()));

-- =====================================================
-- POLÍTICAS RLS - DEUDAS_ESTUDIANTES
-- =====================================================
CREATE POLICY "Todos pueden ver deudas" ON public.deudas_estudiantes FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar deudas" ON public.deudas_estudiantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar deudas" ON public.deudas_estudiantes FOR UPDATE USING (true);

-- =====================================================
-- POLÍTICAS RLS - PAGOS
-- =====================================================
CREATE POLICY "Todos pueden ver pagos" ON public.pagos FOR SELECT USING (true);
CREATE POLICY "Admins can manage payments" ON public.pagos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - CUOTAS_PAGO
-- =====================================================
CREATE POLICY "Estudiantes pueden ver sus cuotas" ON public.cuotas_pago FOR SELECT USING (EXISTS (SELECT 1 FROM planes_pago pp JOIN profiles p ON pp.estudiante_id = p.estudiante_id WHERE pp.id = cuotas_pago.plan_pago_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins pueden gestionar cuotas" ON public.cuotas_pago FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - INVENTARIO
-- =====================================================
CREATE POLICY "Todos pueden ver inventario" ON public.inventario FOR SELECT USING (true);
CREATE POLICY "Admins can manage inventory" ON public.inventario FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - VENTAS_INVENTARIO
-- =====================================================
CREATE POLICY "Todos pueden ver ventas" ON public.ventas_inventario FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar ventas" ON public.ventas_inventario FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLÍTICAS RLS - HORARIOS
-- =====================================================
CREATE POLICY "Everyone can view schedules" ON public.horarios FOR SELECT USING (true);
CREATE POLICY "Admins can manage schedules" ON public.horarios FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - USER_ROLES
-- =====================================================
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLÍTICAS RLS - PROFILES
-- =====================================================
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================
