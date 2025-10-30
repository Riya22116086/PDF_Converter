const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');
const mammoth = require('mammoth');
const puppeteer = require('puppeteer');

/**
 * Convert DOCX buffer to PDF with preserved formatting
 * @param {Buffer} fileBuffer - Buffer of the DOCX file
 * @param {string} originalFilename - Original filename (for output naming)
 * @param {Object} options - Options for return type and output path (legacy parameter)
 * @param {string} [options.returnType='buffer'] - Return type: 'buffer', 'file', or 'base64'
 * @param {string} [options.outputDir=os.tmpdir()] - Output directory for saved files
 * @param {Object} [formatOptions={}] - Additional formatting options (new parameter)
 * @param {Object} [formatOptions.pageConfig={}] - Page configuration options
 * @param {string} [formatOptions.pageConfig.format='A4'] - Page format (A4, Letter, etc.)
 * @param {Object} [formatOptions.pageConfig.margin] - Page margins in inches or pixels
 * @param {boolean} [formatOptions.preserveHeaders=true] - Whether to attempt to preserve headers/footers
 * @returns {Promise<{buffer: Buffer, filename: string, base64?: string}>} - PDF Buffer, filename, and optionally base64 string
 */
async function convertDocxToPdf(fileBuffer, originalFilename, options = {}, formatOptions = {}) {
  // For backward compatibility, merge options and formatOptions
  const { 
    returnType = 'buffer', 
    outputDir = os.tmpdir(),
  } = options;
  
  // Extract and set default formatting options
  const {
    pageConfig = {},
    preserveHeaders = true
  } = formatOptions;
  
  // Set default page format and margins
  const defaultPageConfig = {
    format: 'A4',
    margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
  };
  
  // Merge with provided pageConfig, ensuring all properties exist
  const finalPageConfig = {
    format: pageConfig.format || defaultPageConfig.format,
    margin: {
      top: pageConfig.margin?.top || defaultPageConfig.margin.top,
      right: pageConfig.margin?.right || defaultPageConfig.margin.right,
      bottom: pageConfig.margin?.bottom || defaultPageConfig.margin.bottom,
      left: pageConfig.margin?.left || defaultPageConfig.margin.left
    }
  };
  
  try {
    // Create temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-convert-'));

    // Write DOCX file to temp directory
    const tempFilePath = path.join(tempDir, `input.docx`);
    await fs.writeFile(tempFilePath, fileBuffer);

    // Use mammoth with custom options to better preserve structure
    const mammothOptions = {
      path: tempFilePath,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "r[style-name='Strong'] => strong",
        "p[style-name='Text Body'] => p:fresh",
        "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
        "p[style-name='Header'] => div.header > p:fresh",
        "p[style-name='Footer'] => div.footer > p:fresh",
        "p[style-name='TOC Heading'] => h1.toc-heading:fresh",
        "p[style-name='TOC 1'] => p.toc-1:fresh",
        "p[style-name='TOC 2'] => p.toc-2:fresh",
        "r[style-name='Hyperlink'] => a"
      ]
    };
    
    // Convert DOCX to HTML using Mammoth with extended options
    const { value: htmlContent, messages } = await mammoth.convertToHtml(mammothOptions);
    
    // Log any conversion messages for debugging
    if (messages.length > 0) {
      console.log('Mammoth conversion messages:', messages);
    }
    
    // Create CSS for formatting
    // BELOW style was removed because of some reason
    // body {
    //   font-family: 'Arial', 'Helvetica', sans-serif;
    //   line-height: 1.5;
    //   margin: 0;
    //   padding: 0;
    //   counter-reset: page;
    // }
    const css = `
     
      @page {
        size: ${finalPageConfig.format};
        margin: ${finalPageConfig.margin.top} ${finalPageConfig.margin.right} ${finalPageConfig.margin.bottom} ${finalPageConfig.margin.left};
      }
      .header, .footer {
        position: fixed;
        width: 100%;
        left: 0;
      }
      .header {
        top: 0;
      }
      .footer {
        bottom: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td, th {
        padding: 8px;
        border: 1px solid #ddd;
      }
      .pagebreak {
        page-break-before: always;
      }
      .text-center {
        text-align: center;
      }
      .text-right {
        text-align: right;
      }
      .text-left {
        text-align: left;
      }
      .text-justify {
        text-align: justify;
      }
      /* Add page numbers */
      .footer:after {
        content: counter(page);
        counter-increment: page;
      }
    `;
    
    // Create the complete HTML with CSS
    const completeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${originalFilename}</title>
        <style>${css}</style>
      </head>
      <body>
        ${preserveHeaders ? 
          `<div class="header"></div>
           <div class="content">${htmlContent}</div>
           <div class="footer"></div>` : 
          htmlContent}
      </body>
      </html>
    `;

    // Write complete HTML to file
    const tempHtmlPath = path.join(tempDir, 'output.html');
    await fs.writeFile(tempHtmlPath, completeHtml);

    // Output PDF path
    const outputPath = path.join(outputDir, originalFilename.replace(/\.docx$/i, '.pdf'));
    
    // Launch browser with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    // Configure page and generate PDF
    const page = await browser.newPage();
    
    // Navigate to the HTML file (better for handling images than setContent)
    await page.goto(`file://${tempHtmlPath}`, {
      waitUntil: 'networkidle0'
    });
    
    // Determine header and footer heights for better spacing
    let headerHeight = 0;
    let footerHeight = 0;
    
    if (preserveHeaders) {
      headerHeight = await page.evaluate(() => {
        const header = document.querySelector('.header');
        return header ? header.offsetHeight : 0;
      });
      
      footerHeight = await page.evaluate(() => {
        const footer = document.querySelector('.footer');
        return footer ? footer.offsetHeight : 0;
      });
    }
    
    // Generate PDF with configured options
    await page.pdf({
      path: outputPath,
      format: finalPageConfig.format,
      margin: {
        top: preserveHeaders ? `${headerHeight + 36}px` : finalPageConfig.margin.top,
        right: finalPageConfig.margin.right,
        bottom: preserveHeaders ? `${footerHeight + 36}px` : finalPageConfig.margin.bottom,
        left: finalPageConfig.margin.left
      },
      printBackground: true,
      displayHeaderFooter: preserveHeaders,
      headerTemplate: preserveHeaders ? '<div style="width: 100%; padding: 0 1cm; font-size: 10px;"></div>' : '',
      footerTemplate: preserveHeaders ? '<div style="width: 100%; padding: 0 1cm; font-size: 10px; text-align: center;"></div>' : '',
    });
    
    await browser.close();

    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Warning: Failed to clean up temporary files', cleanupErr);
    }

    // Read converted PDF
    const pdfBuffer = await fs.readFile(outputPath);
    
    // Generate Base64 string if requested
    let base64 = null;
    if (returnType === 'base64') {
      base64 = pdfBuffer.toString('base64');
    }
    
    // Return according to specified type
    if (returnType === 'buffer') {
      return {
        buffer: pdfBuffer,
        filename: path.basename(outputPath)
      };
    } else if (returnType === 'file') {
      return {
        filename: outputPath
      };
    } else if (returnType === 'base64') {
      return {
        base64,
        filename: path.basename(outputPath)
      };
    } else {
      throw new Error(`Invalid returnType specified: ${returnType}`);
    }
  } catch (error) {
    console.error('Error converting DOCX to PDF:', error);
    throw new Error(`Failed to convert DOCX document to PDF: ${error.message}`);
  }
}

/**
 * Extract document metadata and structure to better configure PDF output
 * @param {Buffer} fileBuffer - Buffer of the DOCX file
 * @returns {Promise<Object>} - Document metadata
 */
async function extractDocumentMetadata(fileBuffer) {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-meta-'));
    const tempFilePath = path.join(tempDir, 'temp.docx');
    await fs.writeFile(tempFilePath, fileBuffer);
    
    // Extract raw document properties to analyze document structure
    const { value, messages } = await mammoth.extractRawText({ path: tempFilePath });
    
    // A simple heuristic to guess page size based on content length
    // This is a fallback when direct extraction isn't possible
    const contentLength = value.length;
    let suggestedFormat = 'A4';
    
    if (contentLength > 3000) {
      suggestedFormat = 'A4';
    } else if (contentLength > 500) {
      suggestedFormat = 'Letter';
    }
    
    return {
      suggestedFormat,
      contentLength,
      hasHeaders: messages.some(m => m.message.includes('header')),
      hasFooters: messages.some(m => m.message.includes('footer')),
      messages
    };
  } catch (error) {
    console.error('Failed to extract document metadata:', error);
    return {
      suggestedFormat: 'A4',
      contentLength: 0,
      hasHeaders: false,
      hasFooters: false,
      messages: []
    };
  }
}

/**
 * Convenience function that combines document analysis with conversion
 * @param {Buffer} fileBuffer - Buffer of the DOCX file
 * @param {string} originalFilename - Original filename (for output naming)
 * @param {Object} options - Basic options for return type and output path
 * @returns {Promise<{buffer: Buffer, filename: string, base64?: string}>} - PDF result
 */
async function smartConvertDocxToPdf(fileBuffer, originalFilename, options = {}) {
  // Analyze the document first
  const metadata = await extractDocumentMetadata(fileBuffer);
  
  // Configure formatting options based on document analysis
  const formatOptions = {
    pageConfig: {
      format: metadata.suggestedFormat,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
    },
    preserveHeaders: metadata.hasHeaders || metadata.hasFooters
  };
  
  // Convert with auto-detected settings
  return convertDocxToPdf(fileBuffer, originalFilename, options, formatOptions);
}

module.exports = { 
  convertDocxToPdf,
  extractDocumentMetadata,
  smartConvertDocxToPdf
};