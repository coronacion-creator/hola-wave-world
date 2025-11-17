/**
 * Cliente MongoDB - Patrón Singleton
 * 
 * Este archivo implementa la conexión a MongoDB Atlas usando el patrón singleton
 * para garantizar una única instancia de conexión en toda la aplicación.
 */

import { MongoClient, Db, Collection } from 'mongodb';

// Variable global para almacenar la instancia única del cliente
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

/**
 * Obtiene o crea la conexión a MongoDB
 * 
 * @returns {Promise<MongoClient>} Instancia del cliente MongoDB
 * @throws {Error} Si MONGODB_URI no está definida en las variables de entorno
 */
export async function getMongoClient(): Promise<MongoClient> {
  // Si ya existe una conexión, la reutilizamos (patrón singleton)
  if (mongoClient) {
    return mongoClient;
  }

  // Obtenemos la URI de conexión desde las variables de entorno
  const uri = import.meta.env.VITE_MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI no está definida en las variables de entorno');
  }

  try {
    // Creamos una nueva instancia del cliente MongoDB
    mongoClient = new MongoClient(uri, {
      // Opciones de conexión recomendadas
      maxPoolSize: 10, // Número máximo de conexiones en el pool
      minPoolSize: 2,  // Número mínimo de conexiones en el pool
      serverSelectionTimeoutMS: 5000, // Timeout para seleccionar servidor
      socketTimeoutMS: 45000, // Timeout para operaciones de socket
    });

    // Conectamos al servidor MongoDB
    await mongoClient.connect();
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    
    return mongoClient;
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia de la base de datos
 * 
 * @param {string} dbName - Nombre de la base de datos (por defecto: 'school_management')
 * @returns {Promise<Db>} Instancia de la base de datos MongoDB
 */
export async function getDatabase(dbName: string = 'school_management'): Promise<Db> {
  if (mongoDb) {
    return mongoDb;
  }

  const client = await getMongoClient();
  mongoDb = client.db(dbName);
  return mongoDb;
}

/**
 * Obtiene una colección específica de MongoDB
 * 
 * @template T - Tipo de documento almacenado en la colección
 * @param {string} collectionName - Nombre de la colección
 * @returns {Promise<Collection<T>>} Instancia de la colección
 */
export async function getCollection<T = any>(
  collectionName: string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

/**
 * Cierra la conexión a MongoDB
 * Útil para testing o cuando la aplicación se cierra
 */
export async function closeMongoConnection(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

/**
 * Ejemplo de uso: Lectura de documentos
 * 
 * @example
 * ```typescript
 * const collection = await getCollection('estudiantes_logs');
 * const logs = await collection.find({ estudiante_id: 'xxx' }).toArray();
 * ```
 */
export async function ejemploLectura(estudianteId: string) {
  try {
    const collection = await getCollection('estudiantes_logs');
    
    // Buscar todos los logs de un estudiante específico
    const logs = await collection
      .find({ estudiante_id: estudianteId })
      .sort({ timestamp: -1 }) // Ordenar por fecha descendente
      .limit(10) // Limitar a 10 registros
      .toArray();
    
    return logs;
  } catch (error) {
    console.error('Error al leer datos de MongoDB:', error);
    throw error;
  }
}

/**
 * Ejemplo de uso: Escritura de documentos
 * 
 * @example
 * ```typescript
 * await ejemploEscritura({
 *   estudiante_id: 'uuid-123',
 *   accion: 'login',
 *   detalles: { ip: '192.168.1.1' }
 * });
 * ```
 */
export async function ejemploEscritura(logData: {
  estudiante_id: string;
  accion: string;
  detalles?: any;
}) {
  try {
    const collection = await getCollection('estudiantes_logs');
    
    // Insertar un nuevo documento
    const result = await collection.insertOne({
      ...logData,
      timestamp: new Date(),
      created_at: new Date(),
    });
    
    console.log('✅ Documento insertado con ID:', result.insertedId);
    return result;
  } catch (error) {
    console.error('Error al escribir en MongoDB:', error);
    throw error;
  }
}
