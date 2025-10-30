# DOCX to PDF Converter

Convert DOCX files to PDF using Mammoth and Puppeteer with preserved formatting and layout.

## Installation

```sh
npm install docx-pdf-converter
```

## Basic Usage

```js
const fs = require('fs')
const { convertDocxToPdf } = require('docx-pdf-converter')

async function convert() {
  const docxBuffer = fs.readFileSync('path/to/input.docx')
  
  // Return as Buffer (default)
  const result = await convertDocxToPdf(docxBuffer, 'input.docx')
  fs.writeFileSync(result.filename, result.buffer)

  // Return as File
  const fileResult = await convertDocxToPdf(docxBuffer, 'input.docx', { returnType: 'file' })
  console.log(`File saved as ${fileResult.filename}`)

  // Return as Base64
  const base64Result = await convertDocxToPdf(docxBuffer, 'input.docx', { returnType: 'base64' })
  console.log(`Base64 string: ${base64Result.base64.slice(0, 30)}...`)
}

convert()
```

## Advanced Usage with Formatting Options

The converter now supports advanced formatting options to preserve page layout, size, margins, and more:

```js
const fs = require('fs')
const { convertDocxToPdf, extractDocumentMetadata } = require('docx-pdf-converter')

async function convertWithFormatting() {
  const docxBuffer = fs.readFileSync('path/to/input.docx')
  
  // Optional: Analyze document to determine best configuration
  const metadata = await extractDocumentMetadata(docxBuffer)
  console.log('Document analysis:', metadata)
  
  // Basic options (original parameters)
  const options = {
    returnType: 'file', 
    outputDir: './output'
  }
  
  // Formatting options (new parameter)
  const formatOptions = {
    pageConfig: {
      format: 'A4',  // 'A4', 'Letter', 'Legal', etc.
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    },
    preserveHeaders: true  // Attempts to preserve headers and footers
  }
  
  // Convert with formatting options
  const result = await convertDocxToPdf(
    docxBuffer, 
    'input.docx', 
    options, 
    formatOptions
  )
  
  console.log(`File saved as ${result.filename}`)
}

convertWithFormatting()
```

## Smart Conversion (Automatic Document Analysis)

For the best results with minimal configuration, use the smart converter:

```js
const fs = require('fs')
const { smartConvertDocxToPdf } = require('docx-pdf-converter')

async function smartConvert() {
  const docxBuffer = fs.readFileSync('path/to/input.docx')
  
  // Smart converter automatically analyzes the document
  // and applies appropriate formatting
  const result = await smartConvertDocxToPdf(
    docxBuffer,
    'input.docx',
    { returnType: 'file', outputDir: './output' }
  )
  
  console.log(`PDF created at: ${result.filename}`)
}

smartConvert()
```

## API Reference

### convertDocxToPdf(fileBuffer, originalFilename, options, formatOptions)

Converts a DOCX file buffer to PDF.

- **fileBuffer** (Buffer): DOCX file as a Buffer
- **originalFilename** (string): Original filename (used for output naming)
- **options** (Object): Basic conversion options
  - **returnType** (string): 'buffer' (default), 'file', or 'base64'
  - **outputDir** (string): Output directory for saved files (default: system temp dir)
- **formatOptions** (Object): Advanced formatting options (optional)
  - **pageConfig** (Object): Page configuration
    - **format** (string): Page format ('A4', 'Letter', 'Legal', etc.)
    - **margin** (Object): Page margins with top, right, bottom, left properties
  - **preserveHeaders** (boolean): Whether to preserve headers and footers (default: true)

Returns an object with one or more of:
- **buffer**: Buffer of the PDF (if returnType is 'buffer')
- **filename**: Name of the output file
- **base64**: Base64 string of the PDF (if returnType is 'base64')

### extractDocumentMetadata(fileBuffer)

Analyzes a DOCX file to extract metadata useful for formatting decisions.

- **fileBuffer** (Buffer): DOCX file as a Buffer

Returns an object with:
- **suggestedFormat**: Recommended page format based on content
- **contentLength**: Approximate content length
- **hasHeaders**: Whether the document appears to have headers
- **hasFooters**: Whether the document appears to have footers
- **messages**: Any messages from the analysis process

### smartConvertDocxToPdf(fileBuffer, originalFilename, options)

Automatically analyzes a document and converts it with optimized formatting.

- **fileBuffer** (Buffer): DOCX file as a Buffer
- **originalFilename** (string): Original filename (used for output naming)
- **options** (Object): Basic conversion options (same as convertDocxToPdf)

Returns the same output as convertDocxToPdf.

## Troubleshooting

If you encounter issues with the layout or formatting in the converted PDF:

1. Try using the `smartConvertDocxToPdf` function for automatic optimization
2. Experiment with different page formats and margins
3. If headers/footers aren't appearing correctly, try setting `preserveHeaders: false`

## Requirements

- Node.js 12 or higher
- This package uses Puppeteer which will download a Chrome browser during installation

## License

MIT