const fs = require('fs')
const path = require('path')
const { convertDocxToPdf, extractDocumentMetadata, smartConvertDocxToPdf } = require('./index')

async function test() {
  try {
    // Load a sample DOCX file
    const docxBuffer = fs.readFileSync(path.join(__dirname, 'sample.docx'))
    
    console.log('---- Original API Tests (Backward Compatibility) ----')
    
    // Test 1: Return as Buffer (default)
    const bufferResult = await convertDocxToPdf(docxBuffer, 'sample.docx')
    fs.writeFileSync(path.join(__dirname, bufferResult.filename), bufferResult.buffer)
    console.log(`Buffer PDF saved as ${bufferResult.filename}`)

    // Test 2: Return as File
    const fileResult = await convertDocxToPdf(docxBuffer, 'sample.docx', { returnType: 'file' })
    console.log(`File PDF saved as ${fileResult.filename}`)

    // Test 3: Return as Base64
    const base64Result = await convertDocxToPdf(docxBuffer, 'sample.docx', { returnType: 'base64' })
    console.log(`Base64 string of PDF: ${base64Result.base64.slice(0, 30)}...`)
    
    console.log('\n---- New Enhanced API Tests (New Formatting Options) ----')
    
    // Test 4: Using the new formatting options as 4th parameter
    const formattedResult = await convertDocxToPdf(
      docxBuffer, 
      'formatted-sample.docx', 
      { returnType: 'file', outputDir: path.join(__dirname, 'output') }, 
      { 
        pageConfig: {
          format: 'Letter',
          margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' }
        },
        preserveHeaders: true
      }
    )
    console.log(`Formatted PDF saved as ${formattedResult.filename}`)
    
    // Test 5: Using document metadata to analyze before conversion
    console.log('\n---- Document Analysis ----')
    const metadata = await extractDocumentMetadata(docxBuffer)
    console.log('Document analysis results:')
    console.log(`- Suggested format: ${metadata.suggestedFormat}`)
    console.log(`- Content length: ${metadata.contentLength}`)
    console.log(`- Has headers: ${metadata.hasHeaders}`)
    console.log(`- Has footers: ${metadata.hasFooters}`)
    
    // Test 6: Using the smart converter function
    console.log('\n---- Smart Converter Test (Auto-detection) ----')
    const smartResult = await smartConvertDocxToPdf(
      docxBuffer,
      'smart-sample.docx',
      { returnType: 'file', outputDir: path.join(__dirname, 'output') }
    )
    console.log(`Smart converter saved PDF as ${smartResult.filename}`)
    
    // Test 7: Different page sizes
    console.log('\n---- Page Size Tests ----')
    
    // A4 Format
    await convertDocxToPdf(
      docxBuffer,
      'a4-sample.docx',
      { returnType: 'file', outputDir: path.join(__dirname, 'output') },
      { pageConfig: { 
          format: 'A4',
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
        } 
      }
    )
    console.log('A4 format PDF created')
    
    // Letter Format
    await convertDocxToPdf(
      docxBuffer,
      'letter-sample.docx',
      { returnType: 'file', outputDir: path.join(__dirname, 'output') },
      { pageConfig: { 
          format: 'Letter',
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
        } 
      }
    )
    console.log('Letter format PDF created')
    
    // Legal Format
    await convertDocxToPdf(
      docxBuffer,
      'legal-sample.docx',
      { returnType: 'file', outputDir: path.join(__dirname, 'output') },
      { pageConfig: { 
          format: 'Legal',
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
        } 
      }
    )
    console.log('Legal format PDF created')
    
    console.log('\nAll tests completed successfully!')
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

test()