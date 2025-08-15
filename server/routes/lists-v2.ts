/**
 * Lists API V2 Routes - Enhanced Visibility System
 * 
 * Implements V2 visibility system with backward compatibility
 */

import { Router } from 'express';
import { z } from 'zod';
import { createListV2Schema, updateListV2Schema, saveStatusResponseSchema } from '../../shared/schema-v2';
import { DatabaseStorage } from '../storage';
// Note: Using inline middleware since auth/validation modules don't exist yet
const authenticateUser = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const validateRequest = (schema: any) => (req: any, res: any, next: any) => {
  try {
    if (schema.body) {
      schema.body.parse(req.body);
    }
    next();
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
  }
};

const router = Router();

// ============================================================================
// V2 LIST CREATION
// ============================================================================

router.post('/', 
  authenticateUser,
  validateRequest({ body: createListV2Schema }),
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listData = req.body;

      // Create list with V2 visibility system
      const list = await storage.createListV2({
        ...listData,
        createdById: userId,
        migratedToV2: true,
        migrationTimestamp: new Date(),
      });

      res.status(201).json(list);
    } catch (error: any) {
      console.error('Error creating list V2:', error);
      
      if (error.message?.includes('duplicate')) {
        res.status(409).json({ error: 'A list with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create list' });
      }
    }
  }
);

// ============================================================================
// V2 LIST UPDATE
// ============================================================================

router.put('/:id',
  authenticateUser,
  validateRequest({ body: updateListV2Schema }),
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      // Check ownership
      const existingList = await storage.getListById(listId);
      if (!existingList) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      if (existingList.createdById !== userId) {
        return res.status(403).json({ error: 'Not authorized to edit this list' });
      }

      // Update with V2 system
      const updatedList = await storage.updateListV2(listId, {
        ...updateData,
        migratedToV2: true,
        migrationTimestamp: new Date(),
      });

      res.json(updatedList);
    } catch (error: any) {
      console.error('Error updating list V2:', error);
      res.status(500).json({ error: 'Failed to update list' });
    }
  }
);

// ============================================================================
// V2 SAVE/UNSAVE ENDPOINTS
// ============================================================================

router.get('/:id/save-status',
  authenticateUser,
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      const saved = await storage.isListSavedByUser(listId, userId);
      
      const response: z.infer<typeof saveStatusResponseSchema> = { saved };
      res.json(response);
    } catch (error: any) {
      console.error('Error checking save status:', error);
      res.status(500).json({ error: 'Failed to check save status' });
    }
  }
);

router.post('/:id/save',
  authenticateUser,
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      // Check if list exists and user has access
      const list = await storage.getListById(listId);
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      // Check visibility access
      const hasAccess = await storage.checkListAccess(listId, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this list' });
      }

      await storage.saveList(listId, userId);
      
      const response: z.infer<typeof saveStatusResponseSchema> = { saved: true };
      res.json(response);
    } catch (error: any) {
      console.error('Error saving list:', error);
      
      if (error.message?.includes('already saved')) {
        res.status(409).json({ error: 'List already saved' });
      } else {
        res.status(500).json({ error: 'Failed to save list' });
      }
    }
  }
);

router.delete('/:id/save',
  authenticateUser,
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      await storage.unsaveList(listId, userId);
      
      const response: z.infer<typeof saveStatusResponseSchema> = { saved: false };
      res.json(response);
    } catch (error: any) {
      console.error('Error unsaving list:', error);
      res.status(500).json({ error: 'Failed to unsave list' });
    }
  }
);

// ============================================================================
// V2 VISIBILITY-AWARE LIST RETRIEVAL
// ============================================================================

router.get('/:id',
  authenticateUser,
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      // Get list with V2 visibility checking
      const list = await storage.getListWithV2Visibility(listId, userId);
      if (!list) {
        return res.status(404).json({ error: 'List not found or access denied' });
      }

      res.json(list);
    } catch (error: any) {
      console.error('Error retrieving list V2:', error);
      res.status(500).json({ error: 'Failed to retrieve list' });
    }
  }
);

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

router.post('/:id/migrate-to-v2',
  authenticateUser,
  async (req, res) => {
    try {
      const storage = req.app.get('storage') as DatabaseStorage;
      const userId = req.user!.id;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ error: 'Invalid list ID' });
      }

      // Check ownership
      const existingList = await storage.getListById(listId);
      if (!existingList) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      if (existingList.createdById !== userId) {
        return res.status(403).json({ error: 'Not authorized to migrate this list' });
      }

      // Perform V2 migration
      const migratedList = await storage.migrateListToV2(listId);
      res.json(migratedList);
    } catch (error: any) {
      console.error('Error migrating list to V2:', error);
      res.status(500).json({ error: 'Failed to migrate list' });
    }
  }
);

export default router;