import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import guisadoRoutes    from './routes/guisado.routes';
import tipoMasaRoutes   from './routes/tipoMasa.routes';
import extraRoutes      from './routes/extra.routes';
import refrescoRoutes   from './routes/refresco.routes';
import ordenRoutes      from './routes/orden.routes';
import authRoutes       from './routes/auth.routes';
import usuarioRoutes    from './routes/usuario.routes';
import promocionRoutes         from './routes/promocion.routes';
import categoriaRefrescoRoutes from './routes/categoriaRefresco.routes';
import gastoRoutes             from './routes/gasto.routes';
import refriRoutes             from './routes/refri.routes';
import resumenRoutes           from './routes/resumen.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://gordita-app.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido — ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'API Gorditas OK', env: process.env.NODE_ENV ?? 'development' });
});

app.get('/test-db', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Conexión a base de datos exitosa', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({
      message: 'Error al conectar con la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// API routes
app.use('/api/auth',       authRoutes);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/guisados',   guisadoRoutes);
app.use('/api/tipos-masa', tipoMasaRoutes);
app.use('/api/extras',     extraRoutes);
app.use('/api/refrescos',  refrescoRoutes);
app.use('/api/promociones',          promocionRoutes);
app.use('/api/categorias-refresco',  categoriaRefrescoRoutes);
app.use('/api/gastos',     gastoRoutes);
app.use('/api/refri',      refriRoutes);
app.use('/api/resumen',    resumenRoutes);
app.use('/api/ordenes',    ordenRoutes);

// ── Local dev: start HTTP server
// ── Vercel: just export the app (Vercel handles the HTTP layer)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

export default app;
