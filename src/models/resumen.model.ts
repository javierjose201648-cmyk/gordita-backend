import pool from '../config/database';
import { TurnoModel } from './turno.model';
import { CajaMovimiento } from './caja.model';

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
  // Ventas generales
  total_ventas: number;
  ventas_efectivo: number;
  ventas_tarjeta: number;
  // Gorditas
  gorditas: GorditaResumen[];
  total_gorditas: number;
  total_gorditas_pesos: number;
  // Refrescos
  refrescos_vendidos: RefrescoVendidoResumen[];
  total_refrescos: number;
  total_refrescos_pesos: number;
  // Gastos
  gastos: any[];
  total_gastos: number;
  // Caja
  caja_inicial: number;
  movimientos_caja: CajaMovimiento[];
  total_movimientos_caja: number;
  caja_esperada: number;
  // Refri
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
    const turnoId = turno.id;

    // ── Gorditas vendidas del turno (#7: filtro por turno_id) ──
    const gorditasRes = await pool.query(`
      SELECT
        COALESCE(tm.nombre, 'Sin tipo') AS masa_nombre,
        SUM(oi.cantidad)::int           AS cantidad,
        SUM(oi.subtotal)::numeric       AS subtotal
      FROM orden_items oi
      LEFT JOIN tipos_masa tm ON oi.tipo_masa_id = tm.id
      JOIN ordenes o ON oi.orden_id = o.id
      WHERE o.turno_id = $1
      GROUP BY tm.nombre
      ORDER BY tm.nombre ASC
    `, [turnoId]);

    // ── Refrescos vendidos del turno (#7: filtro por turno_id) ──
    const refrescosVendidosRes = await pool.query(`
      SELECT
        r.nombre                             AS categoria_nombre,
        SUM(ore.cantidad)::int               AS cantidad,
        SUM(ore.subtotal)::numeric           AS subtotal
      FROM orden_refrescos ore
      JOIN refrescos r ON ore.refresco_id = r.id
      JOIN ordenes o ON ore.orden_id = o.id
      WHERE o.turno_id = $1
      GROUP BY r.nombre
      ORDER BY r.nombre ASC
    `, [turnoId]);

    // ── Ventas totales, en efectivo y en tarjeta del turno (#7: filtro por turno_id) ──
    const ventasRes = await pool.query(`
      SELECT
        COALESCE(SUM(total), 0)::numeric                                         AS total_ventas,
        COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'efectivo'), 0)::numeric AS ventas_efectivo,
        COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'tarjeta'),  0)::numeric AS ventas_tarjeta
      FROM ordenes
      WHERE turno_id = $1
    `, [turnoId]);

    // ── Gastos del turno (#9: filtro por turno_id, ya no se borran al cerrar) ──
    const gastosRes = await pool.query(`
      SELECT g.*, u.nombre_completo AS usuario_nombre
      FROM gastos g
      LEFT JOIN usuarios u ON u.id = g.usuario_id
      WHERE g.turno_id = $1
      ORDER BY g.creado_en ASC
    `, [turnoId]);

    // ── Movimientos de caja del turno (con nombre de quien lo registró) ──
    const cajaRes = await pool.query(`
      SELECT
        cm.id,
        cm.turno_id,
        cm.monto::numeric AS monto,
        cm.usuario_id,
        u.nombre_completo AS usuario_nombre,
        cm.creado_en
      FROM caja_movimientos cm
      LEFT JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.turno_id = $1
      ORDER BY cm.creado_en ASC
    `, [turno.id]);

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

    const movimientosCaja: CajaMovimiento[] = cajaRes.rows.map(r => ({
      ...r,
      monto: parseFloat(r.monto),
    }));
    const totalMovimientosCaja = movimientosCaja.reduce((s, m) => s + m.monto, 0);

    const totalVentas    = parseFloat(ventasRes.rows[0].total_ventas);
    const ventasEfectivo = parseFloat(ventasRes.rows[0].ventas_efectivo);
    const ventasTarjeta  = parseFloat(ventasRes.rows[0].ventas_tarjeta);
    const cajaInicial    = turno.caja_inicial;

    // Caja esperada = lo que inició + ventas en efectivo + ingresos manuales - gastos
    const cajaEsperada = cajaInicial + ventasEfectivo + totalMovimientosCaja - totalGastos;

    return {
      turno_id:    turno.id,
      turno_inicio: turno.inicio,
      // Ventas
      total_ventas: totalVentas,
      ventas_efectivo: ventasEfectivo,
      ventas_tarjeta: ventasTarjeta,
      // Gorditas
      gorditas,
      total_gorditas:       gorditas.reduce((s, g) => s + g.cantidad, 0),
      total_gorditas_pesos: gorditas.reduce((s, g) => s + g.subtotal, 0),
      // Refrescos
      refrescos_vendidos:   refrescosVendidos,
      total_refrescos:       refrescosVendidos.reduce((s, r) => s + r.cantidad, 0),
      total_refrescos_pesos: refrescosVendidos.reduce((s, r) => s + r.subtotal, 0),
      // Gastos
      gastos,
      total_gastos: totalGastos,
      // Caja
      caja_inicial:         cajaInicial,
      movimientos_caja:     movimientosCaja,
      total_movimientos_caja: totalMovimientosCaja,
      caja_esperada:        cajaEsperada,
      // Refri
      refri_actual: refriRes.rows.map(r => ({
        categoria_id:     r.categoria_id,
        categoria_nombre: r.categoria_nombre,
        cantidad:         Number(r.cantidad),
      })),
    };
  }

  /**
   * Cierra el turno activo:
   * - Guarda cuánto dinero queda en caja para el siguiente turno
   * - Gastos, órdenes y movimientos de caja se conservan (historial permanente)
   */
  static async cerrarTurno(cajaFinal: number = 0): Promise<void> {
    const turno = await TurnoModel.getActivo();
    if (!turno) return;

    // Cerrar el turno guardando el saldo de caja para mañana
    await TurnoModel.cerrar(turno.id, cajaFinal);
  }
}
