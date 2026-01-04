const express = require('express');
const { getFirestore, verifyToken } = require('../config/firebase');
const router = express.Router();

// Initialize Firestore
let db;
try {
  db = getFirestore();
} catch (error) {
  console.error('Firebase not configured. Notes functionality will be limited.');
}

// Middleware to check if Firebase is configured
const checkFirebaseConfig = (req, res, next) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not configured',
      message: 'Firebase configuration is required for notes functionality'
    });
  }
  next();
};

// GET /api/notes - Get all notes for a user
router.get('/', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, orderBy = 'updatedAt', orderDirection = 'desc' } = req.query;

    const notesRef = db.collection('notes');
    let query = notesRef
      .where('userId', '==', userId)
      .orderBy(orderBy, orderDirection)
      .limit(parseInt(limit));

    const snapshot = await query.get();
    
    const notes = [];
    snapshot.forEach(doc => {
      notes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      notes,
      count: notes.length
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Failed to fetch notes',
      message: error.message
    });
  }
});

// GET /api/notes/:id - Get a specific note
router.get('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const noteId = req.params.id;

    const noteRef = db.collection('notes').doc(noteId);
    const doc = await noteRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist'
      });
    }

    const noteData = doc.data();
    
    // Check if user owns this note
    if (noteData.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this note'
      });
    }

    res.json({
      success: true,
      note: {
        id: doc.id,
        ...noteData
      }
    });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      error: 'Failed to fetch note',
      message: error.message
    });
  }
});

// POST /api/notes - Create a new note
router.post('/', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { title, content, tags = [], links = [], category = 'general' } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        error: 'Title or content is required',
        message: 'Please provide either a title or content for the note'
      });
    }

    const noteData = {
      userId,
      title: title || 'Untitled Note',
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      links: Array.isArray(links) ? links : [],
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    const docRef = await db.collection('notes').add(noteData);

    res.status(201).json({
      success: true,
      note: {
        id: docRef.id,
        ...noteData
      }
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Failed to create note',
      message: error.message
    });
  }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const noteId = req.params.id;
    const { title, content, tags, links, category } = req.body;

    const noteRef = db.collection('notes').doc(noteId);
    const doc = await noteRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist'
      });
    }

    const existingData = doc.data();
    
    // Check if user owns this note
    if (existingData.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to update this note'
      });
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date().toISOString(),
      version: (existingData.version || 1) + 1
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (links !== undefined) updateData.links = Array.isArray(links) ? links : [];
    if (category !== undefined) updateData.category = category;

    await noteRef.update(updateData);

    // Get updated note
    const updatedDoc = await noteRef.get();

    res.json({
      success: true,
      note: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Failed to update note',
      message: error.message
    });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const noteId = req.params.id;

    const noteRef = db.collection('notes').doc(noteId);
    const doc = await noteRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist'
      });
    }

    const noteData = doc.data();
    
    // Check if user owns this note
    if (noteData.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to delete this note'
      });
    }

    await noteRef.delete();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Failed to delete note',
      message: error.message
    });
  }
});

// GET /api/notes/search - Search notes
router.get('/search/query', checkFirebaseConfig, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { q, tags, category, limit = 20 } = req.query;

    if (!q && !tags && !category) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query, tags, or category'
      });
    }

    const notesRef = db.collection('notes');
    let query = notesRef.where('userId', '==', userId);

    // Add filters
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.where('tags', 'array-contains-any', tagArray);
    }

    if (category) {
      query = query.where('category', '==', category);
    }

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    
    let notes = [];
    snapshot.forEach(doc => {
      notes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // If text query provided, filter by content/title (client-side filtering due to Firestore limitations)
    if (q) {
      const searchTerm = q.toLowerCase();
      notes = notes.filter(note => 
        note.title?.toLowerCase().includes(searchTerm) || 
        note.content?.toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      success: true,
      notes,
      count: notes.length,
      searchQuery: { q, tags, category }
    });

  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({
      error: 'Failed to search notes',
      message: error.message
    });
  }
});

module.exports = router;