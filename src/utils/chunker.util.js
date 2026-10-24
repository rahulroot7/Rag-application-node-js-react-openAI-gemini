const env = require('../config/env');

class TextChunker {
  /**
   * Split pages of text into overlapping chunks while preserving page numbers.
   *
   * @param {Array<{ content: string, pageNumber: number }>} pages
   * @param {Object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.chunkOverlap]
   * @returns {Array<{ chunkIndex: number, content: string, pageNumber: number, metadata: Object }>}
   */
  splitIntoChunks(pages, options = {}) {
    const chunkSize = options.chunkSize || env.CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap !== undefined ? options.chunkOverlap : env.CHUNK_OVERLAP;

    const allChunks = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      const text = page.content;
      if (!text || text.trim().length === 0) continue;

      const pageChunks = this.chunkText(text, chunkSize, chunkOverlap);

      for (const chunkText of pageChunks) {
        allChunks.push({
          chunkIndex: globalChunkIndex++,
          content: chunkText,
          pageNumber: page.pageNumber,
          metadata: {
            length: chunkText.length,
            pageNumber: page.pageNumber
          }
        });
      }
    }

    return allChunks;
  }

  /**
   * Chunker that splits text by paragraphs/sentences while respecting chunk size and overlap
   */
  chunkText(text, chunkSize, chunkOverlap) {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + chunkSize;

      if (endIndex >= text.length) {
        chunks.push(text.slice(startIndex).trim());
        break;
      }

      // Try finding natural boundary (newline, period, question mark, or space)
      let boundaryIndex = -1;
      const windowSearch = text.slice(startIndex, endIndex);

      const lastNewline = windowSearch.lastIndexOf('\n');
      const lastPeriod = windowSearch.lastIndexOf('. ');
      const lastQuestion = windowSearch.lastIndexOf('? ');
      const lastSpace = windowSearch.lastIndexOf(' ');

      if (lastNewline > chunkSize * 0.6) {
        boundaryIndex = startIndex + lastNewline + 1;
      } else if (lastPeriod > chunkSize * 0.6) {
        boundaryIndex = startIndex + lastPeriod + 1;
      } else if (lastQuestion > chunkSize * 0.6) {
        boundaryIndex = startIndex + lastQuestion + 1;
      } else if (lastSpace > chunkSize * 0.5) {
        boundaryIndex = startIndex + lastSpace + 1;
      } else {
        boundaryIndex = endIndex;
      }

      const chunk = text.slice(startIndex, boundaryIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Step forward with overlap
      startIndex = Math.max(boundaryIndex - chunkOverlap, startIndex + 1);
    }

    return chunks;
  }
}

module.exports = new TextChunker();
