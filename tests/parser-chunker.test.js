const parserUtil = require('../src/utils/parser.util');
const textChunker = require('../src/utils/chunker.util');

describe('Parser & Chunker Unit Tests', () => {
  describe('Parser cleanText', () => {
    it('should normalize whitespaces, line breaks and strip control characters', () => {
      const rawText = "Hello \x00\x08 World!\r\n\r\n\r\nThis   is a    test.\tTab.";
      const cleaned = parserUtil.cleanText(rawText);
      expect(cleaned).toContain('Hello World!');
      expect(cleaned).toContain('This is a test. Tab.');
      expect(cleaned).not.toContain('\x00');
    });

    it('should preserve spaces between PDF text items and line breaks', async () => {
      const pages = [];
      const pageData = {
        pageIndex: 0,
        getTextContent: async () => ({
          items: [
            { str: 'Remote', transform: [0, 0, 0, 10, 10, 100], width: 30 },
            { str: 'work', transform: [0, 0, 0, 10, 45, 100], width: 20 },
            { str: 'policy', transform: [0, 0, 0, 10, 10, 80], width: 30 }
          ]
        })
      };

      const renderedText = await parserUtil.renderPdfPage(pageData, pages);

      expect(renderedText).toBe('Remote work\npolicy');
      expect(pages[0]).toEqual({ pageNumber: 1, content: 'Remote work\npolicy' });
    });
  });

  describe('Text Chunker', () => {
    it('should split single short page into one chunk', () => {
      const pages = [{ content: 'This is a short paragraph of text.', pageNumber: 1 }];
      const chunks = textChunker.splitIntoChunks(pages, { chunkSize: 200, chunkOverlap: 20 });

      expect(chunks.length).toBe(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].pageNumber).toBe(1);
      expect(chunks[0].content).toBe('This is a short paragraph of text.');
    });

    it('should split long text into multiple overlapping chunks', () => {
      const longSentence = 'Machine learning and retrieval augmented generation are transforming AI systems. '.repeat(10);
      const pages = [{ content: longSentence, pageNumber: 1 }];
      const chunks = textChunker.splitIntoChunks(pages, { chunkSize: 150, chunkOverlap: 30 });

      expect(chunks.length).toBeGreaterThan(1);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunkIndex).toBe(i);
        expect(chunks[i].pageNumber).toBe(1);
        expect(chunks[i].content.length).toBeGreaterThan(0);
      }
    });

    it('should preserve page numbers across multi-page documents', () => {
      const pages = [
        { content: 'Content from page 1.', pageNumber: 1 },
        { content: 'Content from page 2.', pageNumber: 2 }
      ];
      const chunks = textChunker.splitIntoChunks(pages, { chunkSize: 200, chunkOverlap: 20 });

      expect(chunks.length).toBe(2);
      expect(chunks[0].pageNumber).toBe(1);
      expect(chunks[1].pageNumber).toBe(2);
    });
  });
});
