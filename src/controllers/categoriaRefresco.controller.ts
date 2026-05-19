import { Request, Response } from 'express';
import { CategoriaRefrescoModel } from '../models/categoriaRefresco.model';
import { RefriModel } from '../models/refri.model';

export class CategoriaRefrescoController {
  static async getAll(_req: Request, res: Response) {
    try {
      res.json(await CategoriaRefrescoModel.getAll());
    } catch {
      res.status(500).json({ message: 'Error al obtener categorías' });
    }
  }

  static async create(req: Request, res: Response) {
    const { nombre } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    try {
      const cat = await CategoriaRefrescoModel.create(nombre);
      // Auto-create refri inventory row for the new category
      await RefriModel.ensureCategory(cat.id);
      res.status(201).json(cat);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return res.status(409).json({ message: 'Esa categoría ya existe' });
      }
      res.status(500).json({ message: 'Error al crear categoría' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { nombre } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    try {
      const cat = await CategoriaRefrescoModel.update(id, nombre);
      if (!cat) return res.status(404).json({ message: 'Categoría no encontrada' });
      res.json(cat);
    } catch {
      res.status(500).json({ message: 'Error al actualizar categoría' });
    }
  }

  static async delete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const deleted = await CategoriaRefrescoModel.delete(id);
      if (!deleted) return res.status(404).json({ message: 'Categoría no encontrada' });
      res.json({ message: 'Categoría eliminada (y sus bebidas asociadas)' });
    } catch {
      res.status(500).json({ message: 'Error al eliminar categoría' });
    }
  }
}
