const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'materials.json');

function loadMaterials() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading materials:', err);
  }
  return {
    sticker: { name: 'Sticker', rate: 2.5 },
    flexy: { name: 'Flexy', rate: 3.0 }
  };
}

function saveMaterials(materials) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(materials, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving materials:', err);
  }
}

let materials = loadMaterials();

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/materials', (req, res) => {
  res.json({ success: true, materials });
});

app.post('/api/materials', (req, res) => {
  const { id, name, rate } = req.body;
  if (!id || !name || !rate || parseFloat(rate) <= 0) {
    return res.json({ success: false, error: "Please provide valid material details." });
  }
  materials[id] = { name, rate: parseFloat(rate) };
  saveMaterials(materials);
  res.json({ success: true, materials });
});

app.delete('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  if (materials[id]) {
    delete materials[id];
    saveMaterials(materials);
  }
  res.json({ success: true, materials });
});

app.post('/calculate', (req, res) => {
  const { height, length, material } = req.body;

  const heightNum = parseFloat(height);
  const lengthNum = parseFloat(length);

  if (isNaN(heightNum) || isNaN(lengthNum) || heightNum <= 0 || lengthNum <= 0) {
    return res.json({ success: false, error: "Please enter valid positive numbers for both dimensions." });
  }

  if (!materials[material]) {
    return res.json({ success: false, error: "Please select a valid material type." });
  }

  const grandTotal = (lengthNum * heightNum) * materials[material].rate;
  const roundedTotal = Math.round(grandTotal * 100) / 100;

  res.json({ success: true, total: roundedTotal });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Asafo Print POS server running at http://localhost:${PORT}`);
});
