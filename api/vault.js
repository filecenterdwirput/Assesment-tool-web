import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const vaultDir = path.join(process.cwd(), 'vault');

    if (!fs.existsSync(vaultDir)) {
      return res.status(200).json([]);
    }

    const entries = fs.readdirSync(vaultDir);
    const materials = [];

    for (const name of entries.sort()) {
      const folderPath = path.join(vaultDir, name);
      const questionsPath = path.join(folderPath, 'questions.json');

      if (!fs.statSync(folderPath).isDirectory()) continue;
      if (!fs.existsSync(questionsPath)) continue;

      let count = 0;
      try {
        const raw = fs.readFileSync(questionsPath, 'utf-8');
        const data = JSON.parse(raw);
        count = Array.isArray(data) ? data.length : 0;
      } catch {
        count = 0;
      }

      materials.push({
        id: name,
        name: name.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        questionCount: count,
      });
    }

    return res.status(200).json(materials);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
