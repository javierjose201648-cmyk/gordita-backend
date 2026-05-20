import pool from '../config/database';
import { TurnoModel } from './turno.model';

export interface GorditaResumen {
  masa_nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface RefrescoVendidoResumen {
  categoria_nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface ResumenDia {
  turno_id: number;
  turno_inicio: Date;
  total_gorditas_pesos: number;
  total_refrescos_pesos: number;
  total_ventas: number;
  gorditas: GorditaResumen[];
  total_gorditas: number;
  refrescos_vendidos: RefrescoVendidoResumen[];
  total_refrescos: number;
  gastos: any[];
  total_gastos: number;
  refri_actual: {
    categoria_id: number;
    categoria_nombre: string;
    cantidad: number;
  }[];
}

export class ResumenModel {
  /**
   * Devuelve el resumen del turno activo.
   * Filtra todas las consultas por `inicio` del turno, no por fecha del día.
   */
  static async getResumenDia(): Promise<ResumenDia | null> {
    const turno = await TurnoModel.getActivo();
    if (!turno) return null;
    const inicio = turno.inicio;

    // ── Gorditas vendidas desde el inicio del turno ──
    const gorditasRes = await pool.query(`
      SELECT
        COALESCE(tm.nombre, 'Sin tipo') AS masa_nombre,
        SUM(oi.cantidad)::int           AS cantidad,
        SUM(oi.subtotal)::numeric       AS subtotal
      FROM orden_items oi
      LEFT JOIN tipos_masa tm ON oi.tipo_masa_id = tm.id
      JOIN ordenes o ON oi.orden_id = o.id
      WHERE o.creado_en >= $1
      GROUP BY tm.nombre
      ORDER BY tm.nombre ASC
    `, [inicio]);

    // ── Refrescos vendidos desde el inicio del turno ──
    const refrescosVendidosRes = await pool.query(`
      SELECT
        r.nombre                             AS categoria_nombre,
        SUM(ore.cantidad)::int               AS cantidad,
        SUM(ore.subtotal)::numeric           AS subtotal
      FROM orden_refrescos ore
      JOIN refrescos r ON ore.refresco_id = r.id
      JOIN ordenes o ON ore.orden_id = o.id
      WHERE o.creado_en >= $1
      GROUP BY r.nombre
      ORDER BY r.nombre ASC
    `, [inicio]);

    // ── Total ventas del turno ──
    const ventasRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0)::numeric AS total_ventas
      FROM ordenes
      WHERE creado_en >= $1
    `, [inicio]);

    // ── Gastos del turno ──
    const gastosRes = await pool.query(`
      SELECT * FROM gastos
      WHERE creado_en >= $1
      ORDER BY creado_en ASC
    `, [inicio]);

    // ── Inventario actual del refri (siempre el estado actual) ──
    const refriRes = await pool.query(`
      SELECT ri.categoria_id,
             c.nombre AS categoria_nombre,
             ri.cantidad::int
      FROM   refri_inventario ri
      JOIN   categorias_refresco c ON c.id = ri.categoria_id
      ORDER  BY c.nombre ASC
    `);

    const gorditas: GorditaResumen[] = gorditasRes.rows.map(r => ({
      masa_nombre: r.masa_nombre,
      cantidad:    Number(r.cantidad),
      subtotal:    parseFloat(r.subtotal),
    }));

    const refrescosVendidos: RefrescoVendidoResumen[] = refrescosVendidosRes.rows.map(r => ({
      categoria_nombre: r.categoria_nombre,
      cantidad:         Number(r.cantidad),
      subtotal:         parseFloat(r.subtotal),
    }));

    const gastos = gastosRes.rows;
    const totalGastos = gastos.reduce((s: number, g: any) => s + parseFloat(g.monto), 0);

    return {
      turno_id:    turno.id,
      turno_inicio: turno.inicio,
      total_ventas: parseFloat(ventasRes.rows[0].total_ventas),
      gorditas,
      total_gorditas:       gorditas.reduce((s, g) => s + g.cantidad, 0),
      total_gorditas_pesos: gorditas.reduce((s, g) => s + g.subtotal, 0),
      refrescos_vendidos:   refrescosVendidos,
      total_refrescos:       refrescosVendidos.reduce((s, r) => s + r.cantidad, 0),
      total_refrescos_pesos: refrescosVendidos.reduce((s, r) => s + r.subtotal, 0),
      gastos,
      total_gastos: totalGastos,
      refri_actual: refriRes.rows.map(r => ({
        categoria_id:     r.categoria_id,
        categoria_nombre: r.categoria_nombre,
        cantidad:         Number(r.cantidad),
      })),
    };
  }

  /**
   * Cierra el turno activo: borra los gastos del turno y marca el turno como cerrado.
   * Las órdenes se conservan para historial.
   */
  static async cerrarTurno(): Promise<void> {
    const turno = await TurnoModel.getActivo();
    if (!turno) return;

    // Borrar gastos registrados durante este turno
    await pool.query(`DELETE FROM gastos WHERE creado_en >= $1`, [turno.inicio]);

    // Cerrar el turno — el siguiente getOrCrearActivo creará uno nuevo
    await TurnoModel.cerrar(turno.id);
  }
}
