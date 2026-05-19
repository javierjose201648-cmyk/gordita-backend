import pool from '../config/database';
import { PromocionModel } from './promocion.model';

export interface Orden {
  id: number;
  numero_orden: string;
  total: number;
  estado: string;
  nombre_cliente?: string;
  notas?: string;
  creado_en: Date;
  completado_en?: Date;
}

export interface OrdenItem {
  id: number;
  orden_id: number;
  tipo_masa_id: number;
  guisado_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  creado_en: Date;
}

export interface OrdenItemExtra {
  id: number;
  orden_item_id: number;
  extra_id: number;
  cantidad: number;
  precio: number;
}

export interface OrdenRefresco {
  id: number;
  orden_id: number;
  refresco_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CrearOrdenDTO {
  notas?: string;
  items: {
    tipo_masa_id: number;
    guisado_id: number;
    cantidad: number;
    extras?: { extra_id: number; cantidad: number }[];
  }[];
  refrescos?: {
    refresco_id: number;
    cantidad: number;
  }[];
}

export class OrdenModel {
  static async getAll(): Promise<Orden[]> {
    const result = await pool.query(
      'SELECT * FROM ordenes ORDER BY creado_en DESC'
    );
    return result.rows;
  }

  static async getById(id: number): Promise<any | null> {
    const client = await pool.connect();
    try {
      // Obtener la orden
      const ordenResult = await client.query(
        'SELECT * FROM ordenes WHERE id = $1',
        [id]
      );

      if (ordenResult.rows.length === 0) {
        return null;
      }

      const orden = ordenResult.rows[0];

      // Obtener items de la orden con detalles
      const itemsResult = await client.query(
        `SELECT 
          oi.*,
          g.nombre as guisado_nombre,
          g.precio as guisado_precio,
          tm.nombre as tipo_masa_nombre,
          tm.precio_extra as masa_precio_extra
        FROM orden_items oi
        JOIN guisados g ON oi.guisado_id = g.id
        JOIN tipos_masa tm ON oi.tipo_masa_id = tm.id
        WHERE oi.orden_id = $1`,
        [id]
      );

      // Obtener extras por cada item
      for (const item of itemsResult.rows) {
        const extrasResult = await client.query(
          `SELECT 
            oie.*,
            e.nombre as extra_nombre
          FROM orden_item_extras oie
          JOIN extras e ON oie.extra_id = e.id
          WHERE oie.orden_item_id = $1`,
          [item.id]
        );
        item.extras = extrasResult.rows;
      }

      // Obtener refrescos
      const refrescosResult = await client.query(
        `SELECT 
          ore.*,
          r.nombre as refresco_nombre,
          r.sabor,
          r.tamaño
        FROM orden_refrescos ore
        JOIN refrescos r ON ore.refresco_id = r.id
        WHERE ore.orden_id = $1`,
        [id]
      );

      return {
        ...orden,
        items: itemsResult.rows,
        refrescos: refrescosResult.rows
      };
    } finally {
      client.release();
    }
  }

static async create(ordenData: CrearOrdenDTO): Promise<any> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generar número de comanda simple
    const hoy = new Date().toISOString().split('T')[0];
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM ordenes WHERE DATE(creado_en) = $1`,
      [hoy]
    );
    const numeroComanda = parseInt(countResult.rows[0].total) + 1;
    const numeroOrden = `${numeroComanda}`;

    let total = 0;
    let totalGorditas = 0;

    // Crear la orden
    const ordenResult = await client.query(
      `INSERT INTO ordenes (numero_orden, total, estado, notas)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [numeroOrden, 0, 'pendiente', ordenData.notas]
    );

    const orden = ordenResult.rows[0];

    // Procesar items (gorditas) y contar total
    for (const item of ordenData.items) {
      totalGorditas += item.cantidad;

      const guisadoResult = await client.query(
        'SELECT precio FROM guisados WHERE id = $1',
        [item.guisado_id]
      );
      const guisadoPrecio = parseFloat(guisadoResult.rows[0].precio);

      const masaResult = await client.query(
        'SELECT precio_extra FROM tipos_masa WHERE id = $1',
        [item.tipo_masa_id]
      );
      const masaPrecioExtra = parseFloat(masaResult.rows[0].precio_extra);

      const precioUnitario = guisadoPrecio + masaPrecioExtra;
      let subtotalItem = precioUnitario * item.cantidad;

      const itemResult = await client.query(
        `INSERT INTO orden_items (orden_id, tipo_masa_id, guisado_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orden.id, item.tipo_masa_id, item.guisado_id, item.cantidad, precioUnitario, subtotalItem]
      );

      const ordenItem = itemResult.rows[0];

      if (item.extras && item.extras.length > 0) {
        for (const extra of item.extras) {
          const extraResult = await client.query(
            'SELECT precio FROM extras WHERE id = $1',
            [extra.extra_id]
          );
          const extraPrecio = parseFloat(extraResult.rows[0].precio) * extra.cantidad;

          await client.query(
            `INSERT INTO orden_item_extras (orden_item_id, extra_id, cantidad, precio)
             VALUES ($1, $2, $3, $4)`,
            [ordenItem.id, extra.extra_id, extra.cantidad, extraPrecio]
          );

          subtotalItem += extraPrecio * item.cantidad;
        }

        await client.query(
          'UPDATE orden_items SET subtotal = $1 WHERE id = $2',
          [subtotalItem, ordenItem.id]
        );
      }

      total += subtotalItem;
    }

    // Buscar y aplicar promoción si existe
    let promocionAplicada = null;
    let descuento = 0;

    const promocion = await PromocionModel.findMejorPromocion(totalGorditas);
    if (promocion) {
      promocionAplicada = {
        id: promocion.id,
        nombre: promocion.nombre,
        cantidad_minima: promocion.cantidad_minima
      };

      if (promocion.descuento_porcentaje) {
        descuento = (total * parseFloat(promocion.descuento_porcentaje.toString())) / 100;
      } else if (promocion.precio_especial) {
        const precioConPromo = parseFloat(promocion.precio_especial.toString()) * totalGorditas;
        descuento = total - precioConPromo;
      }

      total = total - descuento;
    }

    // Procesar refrescos
    if (ordenData.refrescos && ordenData.refrescos.length > 0) {
      for (const refresco of ordenData.refrescos) {
        const refrescoResult = await client.query(
          'SELECT precio FROM refrescos WHERE id = $1',
          [refresco.refresco_id]
        );
        const refrescoPrecio = parseFloat(refrescoResult.rows[0].precio);
        const subtotalRefresco = refrescoPrecio * refresco.cantidad;

        await client.query(
          `INSERT INTO orden_refrescos (orden_id, refresco_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [orden.id, refresco.refresco_id, refresco.cantidad, refrescoPrecio, subtotalRefresco]
        );

        total += subtotalRefresco;
      }
    }

    // Actualizar total de la orden
    await client.query(
      'UPDATE ordenes SET total = $1 WHERE id = $2',
      [total, orden.id]
    );

    await client.query('COMMIT');

    return {
      id: orden.id,
      numero_orden: numeroOrden,
      total: total,
      total_gorditas: totalGorditas,
      descuento: descuento,
      promocion_aplicada: promocionAplicada,
      estado: 'pendiente',
      creado_en: orden.creado_en
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  static async updateEstado(id: number, estado: string): Promise<Orden | null> {
    const completadoEn = estado === 'completado' ? new Date() : null;
    const result = await pool.query(
      `UPDATE ordenes 
       SET estado = $1, completado_en = $2
       WHERE id = $3
       RETURNING *`,
      [estado, completadoEn, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM ordenes WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async getResumenDia(): Promise<any> {
    const hoy = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_ordenes,
        SUM(total) as ventas_total,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as ordenes_pendientes,
        SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as ordenes_completadas
       FROM ordenes 
       WHERE DATE(creado_en) = $1`,
      [hoy]
    );

    return result.rows[0];
  }

  static async getOrdenesDia(): Promise<Orden[]> {
    const hoy = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT * FROM ordenes 
       WHERE DATE(creado_en) = $1 
       ORDER BY creado_en DESC`,
      [hoy]
    );

    return result.rows;
  }
}