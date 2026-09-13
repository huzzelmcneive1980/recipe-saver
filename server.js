// This is the "backend" — a small program that:
//  1. Serves the web page files (in the public/ folder) to your browser
//  2. Reads and writes recipes to a MongoDB Atlas database, so they're
//     saved permanently — even when this app is hosted somewhere like
//     Render, where the server's own disk gets wiped on restart.

require('dotenv').config();

// Some hosts (including Render) have unreliable outbound IPv6, which makes
// the TLS handshake to MongoDB Atlas fail with a generic "SSL alert 80"
// error. Preferring IPv4 for DNS lookups avoids that.
require('dns').setDefaultResultOrder('ipv4first');

const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    'Missing MONGODB_URI. Copy .env.example to .env and paste in your MongoDB Atlas connection string.'
  );
  process.exit(1);
}

app.use(express.json()); // lets the server understand JSON sent from the browser
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html, style.css, app.js

let recipesCollection;

// Turn a MongoDB document (which has _id) into the shape the frontend expects (id)
function toRecipe(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    url: doc.url,
    notes: doc.notes,
    tags: doc.tags,
    dateAdded: doc.dateAdded,
  };
}

// GET /api/recipes -> send back the full list of saved recipes, newest first
app.get('/api/recipes', async (req, res) => {
  const docs = await recipesCollection.find().sort({ dateAdded: -1 }).toArray();
  res.json(docs.map(toRecipe));
});

// POST /api/recipes -> add a new recipe
app.post('/api/recipes', async (req, res) => {
  const { name, url, notes, tags } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Recipe name is required' });
  }

  const newRecipe = {
    name: name.trim(),
    url: (url || '').trim(),
    notes: (notes || '').trim(),
    tags: (tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
    dateAdded: new Date().toISOString(),
  };

  const result = await recipesCollection.insertOne(newRecipe);
  res.status(201).json(toRecipe({ _id: result.insertedId, ...newRecipe }));
});

// DELETE /api/recipes/:id -> remove a recipe
app.delete('/api/recipes/:id', async (req, res) => {
  let objectId;
  try {
    objectId = new ObjectId(req.params.id);
  } catch {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  const result = await recipesCollection.deleteOne({ _id: objectId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  res.status(204).end();
});

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  recipesCollection = client.db('recipe-saver').collection('recipes');
  console.log('Connected to MongoDB');

  app.listen(PORT, () => {
    console.log(`Recipe Saver running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
