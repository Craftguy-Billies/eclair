const express = require('express');
const { getFirestore, verifyToken } = require('../config/firebase');
const router = express.Router();

// Initialize Firestore
let db;
try {
  db = getFirestore();
} catch (error) {
  console.error('Firebase not configured. Workspaces functionality will be limited.');
}

// Middleware to check if Firebase is configured
const checkFirebaseConfig = (req, res, next) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not configured',
      message: 'Firebase configuration is required for workspaces functionality'
    });
  }
  next();
};

// GET /api/workspaces - Get all workspaces for a user
router.get('/', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, orderBy = 'createdAt', orderDirection = 'desc' } = req.query;

    const workspacesRef = db.collection('workspaces');
    let query = workspacesRef
      .where('userId', '==', userId)
      .orderBy(orderBy, orderDirection)
      .limit(parseInt(limit));

    const snapshot = await query.get();
    
    const workspaces = [];
    snapshot.forEach(doc => {
      workspaces.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      workspaces,
      count: workspaces.length
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({
      error: 'Failed to fetch workspaces',
      message: error.message
    });
  }
});

// GET /api/workspaces/:id - Get a specific workspace
router.get('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const workspaceId = req.params.id;

    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

    if (!workspaceDoc.exists) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Workspace not found'
      });
    }

    const workspace = workspaceDoc.data();

    // Verify ownership
    if (workspace.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this workspace'
      });
    }

    res.json({
      success: true,
      workspace: {
        id: workspaceDoc.id,
        ...workspace
      }
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({
      error: 'Failed to fetch workspace',
      message: error.message
    });
  }
});

// POST /api/workspaces - Create a new workspace
router.post('/', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, description, color, icon } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Workspace name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Workspace name must be 100 characters or less'
      });
    }

    const workspace = {
      userId,
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || '#3B82F6', // Default blue
      icon: icon || '📁', // Default folder icon
      noteCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('workspaces').add(workspace);

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace: {
        id: docRef.id,
        ...workspace
      }
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({
      error: 'Failed to create workspace',
      message: error.message
    });
  }
});

// PUT /api/workspaces/:id - Update a workspace
router.put('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const workspaceId = req.params.id;
    const { name, description, color, icon } = req.body;

    // Get existing workspace
    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

    if (!workspaceDoc.exists) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Workspace not found'
      });
    }

    const existingWorkspace = workspaceDoc.data();

    // Verify ownership
    if (existingWorkspace.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this workspace'
      });
    }

    // Prepare update
    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Workspace name cannot be empty'
        });
      }
      if (name.length > 100) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Workspace name must be 100 characters or less'
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : '';
    }

    if (color !== undefined) {
      updates.color = color;
    }

    if (icon !== undefined) {
      updates.icon = icon;
    }

    await db.collection('workspaces').doc(workspaceId).update(updates);

    const updatedDoc = await db.collection('workspaces').doc(workspaceId).get();

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      workspace: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({
      error: 'Failed to update workspace',
      message: error.message
    });
  }
});

// DELETE /api/workspaces/:id - Delete a workspace
router.delete('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const workspaceId = req.params.id;

    // Get existing workspace
    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

    if (!workspaceDoc.exists) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Workspace not found'
      });
    }

    const workspace = workspaceDoc.data();

    // Verify ownership
    if (workspace.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this workspace'
      });
    }

    // Optional: Delete all notes in this workspace
    // Uncomment if you want cascade delete
    /*
    const notesSnapshot = await db.collection('notes')
      .where('workspaceId', '==', workspaceId)
      .get();
    
    const batch = db.batch();
    notesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    */

    await db.collection('workspaces').doc(workspaceId).delete();

    res.json({
      success: true,
      message: 'Workspace deleted successfully',
      workspaceId
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({
      error: 'Failed to delete workspace',
      message: error.message
    });
  }
});

module.exports = router;
