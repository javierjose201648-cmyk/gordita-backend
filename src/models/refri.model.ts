import pool from '../config/database';

export interface RefriEntry {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  cantidad: number;
  actualizado_en: Date;
}

export class RefriModel {
  /** All categories with their current refri quantity */
  static async getAll(): Promise<RefriEntry[]> {
    const result = await pool.query(`
      SELECT ri.id, ri.categoria_id, c.nombre AS categoria_nombre,
             ri.cantidad, ri.actualizado_en
      FROM   refri_inventario ri
      JOIN   categorias_refresco c ON c.id = ri.categoria_id
      ORDER  BY c.nombre ASC
    `);
    return result.rows;
  }

  /** Adjust quantity by a delta (positive = add, negative = subtract). Never below 0. */
  static async ajustar(categoria_id: number, delta: number): Promise<RefriEntry | null> {
    const result = await pool.query(`
      UPDATE refri_inventario
         SET cantidad      = GREATEST(0, cantidad + $1),
             actualizado_en = NOW()
       WHERE categoria_id = $2
      RETURNING id, categoria_id, cantidad, actualizado_en
    `, [delta, categoria_id]);
    return result.rows[0] ?? null;
  }

  /** Set an absolute quantity */
  static async setCantidad(categoria_id: number, cantidad: number): Promise<RefriEntry | null> {
    const result = await pool.query(`
      UPDATE refri_inventario
         SET cantidad      = GREATEST(0, $1),
             actualizado_en = NOW()
       WHERE categoria_id = $2
      RETURNING id, categoria_id, cantidad, actualizado_en
    `, [cantidad, categoria_id]);
    return result.rows[0] ?? null;
  }

  /** Ensure a row exists for a newly-created category */
  static async ensureCategory(categoria_id: number): Promise<void> {
    await pool.query(`
      INSERT INTO refri_inventario (categoria_id)
      VALUES ($1)
      ON CONFLICT (categoria_id) DO NOTHING
    `, [categoria_id]);
  }

  /**
   * Decrease inventory for refrescos sold in an order.
   * Expects an already-open pg client so it runs inside the order transaction.
   */
  static async decreaseForSale(
    client: import('pg').PoolClient,
    refrescos: { refresco_id: number; cantidad: number }[]
  ): Promise<void> {
    for (const r of refrescos) {
      // Look up this refresco's category
      const catRes = await client.query(
        'SELECT categoria_id FROM refrescos WHERE id = $1',
        [r.refresco_id]
      );
      const categoria_id: number | null = catRes.rows[0]?.categoria_id ?? null;
      if (!categoria_id) continue;

      await client.query(`
        UPDATE refri_inventario
           SET cantidad       = GREATEST(0, cantidad - $1),
               actualizado_en = NOW()
         WHERE categoria_id  = $2
      `, [r.cantidad, categoria_id]);
    }
  }
}
