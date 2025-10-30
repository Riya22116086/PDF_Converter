const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mammoth = require("mammoth");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Set up file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Convert DOCX → PDF
async function convertDocxToPdf(inputPath, outputPath) {
  const { value } = await mammoth.extractRawText({ path: inputPath }); // extract text from DOCX
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);
  doc.fontSize(12).text(value);
  doc.end();

  // wait for file write to complete
  await new Promise((resolve) => writeStream.on("finish", resolve));
}

// Main conversion route
app.post("/convertFile", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, "files");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const outputPath = path.join(outputDir, `${req.file.originalname}.pdf`);

    console.log("Converting file:", inputPath);
    await convertDocxToPdf(inputPath, outputPath);

    console.log("Conversion successful, sending file...");
    res.download(outputPath, (err) => {
      if (err) console.error("Error sending file:", err);
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({ message: "Error converting file" });
  }
});

// Deployment setup
if (process.env.NODE_ENV === "production") {
  const dirPath = path.resolve();
  app.use(express.static(path.join(dirPath, "Frontend", "dist")));
  app.get( (req, res) => {
    res.sendFile(path.resolve(dirPath, "Frontend", "dist", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
