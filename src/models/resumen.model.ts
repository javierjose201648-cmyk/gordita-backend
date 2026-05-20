import pool from '../config/database';

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
  static async getResumenDia(): Promise<ResumenDia> {
    // ── Gorditas vendidas hoy por tipo de masa ──
    const gorditasRes = await pool.query(`
      SELECT
        COALESCE(tm.nombre, 'Sin tipo') AS masa_nombre,
        SUM(oi.cantidad)::int           AS cantidad,
        SUM(oi.subtotal)::numeric       AS subtotal
      FROM orden_items oi
      LEFT JOIN tipos_masa tm ON oi.tipo_masa_id = tm.id
      JOIN ordenes o ON oi.orden_id = o.id
      WHERE DATE(o.creado_en) = CURRENT_DATE
      GROUP BY tm.nombre
      ORDER BY tm.nombre ASC
    `);

    // ── Refrescos vendidos hoy por categoría ──
    const refrescosVendidosRes = await pool.query(`
      SELECT
        COALESCE(cr.nombre, 'Sin categoría') AS categoria_nombre,
        SUM(ore.cantidad)::int               AS cantidad,
        SUM(ore.subtotal)::numeric           AS subtotal
      FROM orden_refrescos ore
      JOIN refrescos r ON ore.refresco_id = r.id
      LEFT JOIN categorias_refresco cr ON r.categoria_id = cr.id
      JOIN ordenes o ON ore.orden_id = o.id
      WHERE DATE(o.creado_en) = CURRENT_DATE
      GROUP BY cr.nombre
      ORDER BY cr.nombre ASC
    `);

    // ── Total ventas del día ──
    const ventasRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0)::numeric AS total_ventas
      FROM ordenes
      WHERE DATE(creado_en) = CURRENT_DATE
    `);

    // ── Gastos del día ──
    const gastosRes = await pool.query(`
      SELECT * FROM gastos
      WHERE fecha = CURRENT_DATE
      ORDER BY creado_en ASC
    `);

    // ── Inventario actual del refri ──
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

    const totalGorditasPesos = gorditas.reduce((s, g) => s + g.subtotal, 0);
    const totalRefrescosPesos = refrescosVendidos.reduce((s, r) => s + r.subtotal, 0);

    return {
      total_ventas:      parseFloat(ventasRes.rows[0].total_ventas),
      gorditas,
      total_gorditas:    gorditas.reduce((s, g) => s + g.cantidad, 0),
      refrescos_vendidos: refrescosVendidos,
      total_refrescos:   refrescosVendidos.reduce((s, r) => s + r.cantidad, 0),
      gastos,
      total_gastos:      totalGastos,
      total_gorditas_pesos:   totalGorditasPesos,
      total_refrescos_pesos:  totalRefrescosPesos,
      refri_actual:      refriRes.rows.map(r => ({
        categoria_id:    r.categoria_id,
        categoria_nombre: r.categoria_nombre,
        cantidad:        Number(r.cantidad),
      })),
    };
  }

  /** Elimina los gastos del día actual (cierre de turno). Las órdenes se conservan. */
  static async cerrarTurno(): Promise<void> {
    await pool.query(`DELETE FROM gastos WHERE fecha = CURRENT_DATE`);
  }
}
