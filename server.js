const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/calculate', (req, res) => {
  const { height, length, material } = req.body;

  const heightNum = parseFloat(height);
  const lengthNum = parseFloat(length);

  if (isNaN(heightNum) || isNaN(lengthNum) || heightNum <= 0 || lengthNum <= 0) {
    return res.json({ success: false, error: "Please enter valid positive numbers for both dimensions." });
  }

  const materialConstants = {
    sticker: 2.5,
    flexy: 3.0
  };

  const materialConstant = materialConstants[material];
  if (!materialConstant) {
    return res.json({ success: false, error: "Please select a valid material type." });
  }

  const grandTotal = (lengthNum * heightNum) * materialConstant;
  const roundedTotal = Math.round(grandTotal * 100) / 100;

  res.json({ success: true, total: roundedTotal });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Asafo Print POS server running at http://localhost:${PORT}`);
});
