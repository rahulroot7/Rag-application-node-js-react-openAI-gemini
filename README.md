# Production-Ready RAG Application

A modular, secure, high-performance Retrieval-Augmented Generation (RAG) backend built with **Node.js**, **Express.js**, **Mongoose / MongoDB Atlas Vector Search**, and OpenAI or Gemini.

Designed following strict **MVC + Service Layer + Repository Pattern** principles.

---

## 1. System Architecture

```mermaid
flowchart TD
    Client["Client (Web / Mobile / Postman)"] -->|JWT Auth & Requests| Middlewares["Middleware (Helmet, CORS, RateLimit, Auth, Multer)"]
    Middlewares --> Controllers["Controllers (Auth, Document, Chat, Conversation)"]
    
    subgraph "Application Layer"
        Controllers --> Services["Services (Auth, Document, RAG, Retrieval, LLM, Embedding)"]
        Services --> Pipelines["Pipelines (Ingestion, Retrieval)"]
        Pipelines --> Background["Background Jobs (BullMQ + Redis)"]
    end

    subgraph "Data & Vector Layer"
        Pipelines --> Repositories["Repositories (User, Document, Chunk, Vector, Conversation)"]
        Repositories --> Models["Mongoose Models"]
        Models --> MongoDBAtlas[("MongoDB Atlas Database")]
        Repositories --> AtlasVectorSearch["MongoDB Atlas $vectorSearch"]
    end

    subgraph "AI Providers"
        Pipelines --> OpenAIEmbeddings["OpenAI text-embedding-3-small (1536 dim)"]
        Pipelines --> OpenAIChat["OpenAI chat model"]
        Pipelines --> GeminiChat["Gemini chat model"]
    end
```
---

## 3. Technology Stack & Key Highlights

- **Backend Framework**: Node.js v18+ with Express.js (CommonJS).
- **Database**: MongoDB Atlas using Mongoose 8.x.
- **Vector Search**: MongoDB Atlas Vector Search using `$vectorSearch` aggregation stage.
- **Embeddings**: OpenAI API (`text-embedding-3-small`, 1536 dimensions) to keep vectors compatible with the configured Atlas index.
- **Answer generation**: Per-user OpenAI or Gemini API key, configured under **AI Provider** in the app.
- **Parsing**: `pdf-parse` (PDF with page retention), `mammoth` (DOCX), and native text stream (TXT).
- **Chunking**: Natural sentence boundary detection with configurable chunk size and overlap.
- **Security & Hardening**:
  - Helmet for secure HTTP headers.
  - Rate limiting (100 req/15 min).
  - Explicit CORS policy.
  - Strict Zod validation on all incoming payload bodies, queries, and params.
  - Full tenant isolation: users can only view, query, or delete their own documents and conversations.
  - Prompt Injection Defense: Retrieved chunks are treated as untrusted data in LLM prompt templates.
  - Pino logger with automatic redaction of passwords, tokens, API keys, and sensitive vectors.
- **Testing**: Jest + Supertest with `mongodb-memory-server` for instant, isolated, cost-free tests without requiring paid OpenAI credentials.

📸 Project Screenshot
![Project Screenshot](./Screenshot_1.png)
![Project Screenshot](./Screenshot_2.png)
