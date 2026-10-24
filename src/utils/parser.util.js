const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../config/logger');

class ParserUtil {
  /**
   * Parse document from file path based on MIME type or extension.
   * Returns array of { content, pageNumber } objects.
   *
   * @param {string} filePath
   * @param {string} mimeType
   * @param {string} originalFilename
   * @returns {Promise<Array<{ content: string, pageNumber: number }>>}
   */
  async parseDocument(filePath, mimeType, originalFilename) {
    const ext = originalFilename.toLowerCase();

    if (mimeType === 'application/pdf' || ext.endsWith('.pdf')) {
      return await this.parsePdf(filePath);
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext.endsWith('.docx')
    ) {
      return await this.parseDocx(filePath);
    }

    if (mimeType === 'text/plain' || ext.endsWith('.txt')) {
      return await this.parseTxt(filePath);
    }

    throw new Error(`Unsupported document type for file: ${originalFilename}`);
  }

  async parsePdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);

    const pages = [];
    // pdf-parse allows custom page render function
    const options = {
      pagerender: (pageData) => this.renderPdfPage(pageData, pages)
    };

    try {
      await pdfParse(dataBuffer, options);
    } catch (err) {
      // Fallback: standard pdf-parse parsing without per-page callback if custom pagerender fails
      logger.warn({ err }, 'Custom PDF page render failed, falling back to standard extraction');
      const standardData = await pdfParse(dataBuffer);
      return [
        {
          pageNumber: 1,
          content: this.cleanText(standardData.text)
        }
      ];
    }

    return pages.filter((p) => p.content.trim().length > 0);
  }

  async renderPdfPage(pageData, pages) {
    const textContent = await pageData.getTextContent();
    let lastY = null;
    let lastX = null;
    let text = '';

    for (const item of textContent.items) {
      const [x, y] = [item.transform[4], item.transform[5]];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += '\n';
        lastX = null;
      } else if (lastX !== null && x - lastX > 2 && !text.endsWith(' ') && !item.str.startsWith(' ')) {
        text += ' ';
      }

      text += item.str;
      lastY = y;
      lastX = x + (item.width || 0);
    }

    pages.push({
      pageNumber: pageData.pageIndex + 1,
      content: this.cleanText(text)
    });
    return text;
  }

  async parseDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    const cleaned = this.cleanText(result.value);
    return [
      {
        pageNumber: 1,
        content: cleaned
      }
    ];
  }

  async parseTxt(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const cleaned = this.cleanText(raw);
    return [
      {
        pageNumber: 1,
        content: cleaned
      }
    ];
  }

  /**
   * Clean and normalize text by standardizing whitespace and removing control characters
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove invisible non-printable control chars, excluding \n
      .replace(/[ ]{2,}/g, ' ') // collapse multi-spaces
      .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
      .trim();
  }
}

module.exports = new ParserUtil();
