import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = 5174;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadDir = path.join(projectRoot, 'public', 'handle-images');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const axis = String(req.body.axis || '').toLowerCase();
    const safeAxis = axis === 'x' || axis === 'y' || axis === 'z' ? axis : 'x';
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `handle-${safeAxis}${ext}`);
  }
});

const upload = multer({ storage });

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.post('/upload-handle', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filename = req.file.filename;
  res.json({ url: `/handle-images/${filename}` });
});

app.listen(port, () => {
  console.log(`Handle image upload server running on http://localhost:${port}`);
});
