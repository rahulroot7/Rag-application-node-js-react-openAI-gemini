/**
 * Automated script to check or create MongoDB Atlas Search Index.
 * Run with: node scripts/create-vector-index.js
 */

const { MongoClient } = require('mongodb');
const env = require('../src/config/env');
const indexDefinition = require('./atlas-vector-search-index.json');

async function createAtlasVectorIndex() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('documentchunks');

    console.log(`Checking existing search indexes on 'documentchunks' collection...`);
    const searchIndexes = await collection.listSearchIndexes().toArray();

    const existingIndex = searchIndexes.find((idx) => idx.name === env.VECTOR_SEARCH_INDEX_NAME);

    if (existingIndex) {
      console.log(`Vector Search Index '${env.VECTOR_SEARCH_INDEX_NAME}' already exists on 'documentchunks'.`);
      return;
    }

    console.log(`Creating Vector Search Index '${env.VECTOR_SEARCH_INDEX_NAME}'...`);
    await collection.createSearchIndex({
      name: env.VECTOR_SEARCH_INDEX_NAME,
      type: 'vectorSearch',
      definition: indexDefinition
    });

    console.log(`Successfully submitted Vector Search Index creation. Atlas will build the index shortly.`);
  } catch (error) {
    console.error('Error creating Atlas Vector Index:', error.message);
    if (error.message.includes('not supported') || error.message.includes('no such command')) {
      console.error(
        '\nNOTE: Programmatic search index creation requires MongoDB Atlas (M0 or higher). Standalone local MongoDB does not support Atlas Vector Search.'
      );
    }
  } finally {
    await client.close();
  }
}

createAtlasVectorIndex();
