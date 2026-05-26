#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = {
        materials: {
          'sticker': { name: 'Sticker', rate: 2.5 },
          'flexy': { name: 'Flexy', rate: 3.0 },
          'banner': { name: 'Banner', rate: 4.0 },
          'vinyl': { name: 'Vinyl', rate: 3.5 }
        },
        history: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error loading data:', err);
    process.exit(1);
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

function showLogo() {
  console.log(chalk.cyan(figlet.textSync('PrintPosCli', { horizontalLayout: 'full' })));
  console.log(chalk.gray('Print Price Calculator - by Nenifix'));
  console.log('');
}

async function mainMenu() {
  while (true) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to do?',
        choices: [
          { name: 'Calculate Print Price', value: 'calculate' },
          { name: 'Manage Materials', value: 'materials' },
          { name: 'View History', value: 'history' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    switch (choice) {
      case 'calculate': await calculatePrice(); break;
      case 'materials': await manageMaterials(); break;
      case 'history': await viewHistory(); break;
      case 'exit': console.log(chalk.green('Goodbye!')); process.exit(0);
    }
  }
}

async function calculatePrice() {
  const data = loadData();
  const materialChoices = Object.entries(data.materials).map(([id, mat]) => ({
    name: `${mat.name} (GHS ${mat.rate.toFixed(2)}/sq ft)`,
    value: id
  }));

  materialChoices.unshift({ name: '← Back to Main Menu', value: 'back' });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'material',
      message: 'Select material type:',
      choices: materialChoices
    }
  ]);

  if (answers.material === 'back') return;

  const { height, length } = await inquirer.prompt([
    { type: 'input', name: 'height', message: 'Enter height (ft):', validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Please enter a valid positive number' },
    { type: 'input', name: 'length', message: 'Enter length (ft):', validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Please enter a valid positive number' }
  ]);

  const h = parseFloat(height);
  const l = parseFloat(length);
  const mat = data.materials[answers.material];
  const total = Math.round((h * l * mat.rate) * 100) / 100;

  console.log('\n' + chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Calculation Result:'));
  console.log(chalk.cyan('Material:') + ` ${mat.name}`);
  console.log(chalk.cyan('Dimensions:') + ` ${h}ft × ${l}ft`);
  console.log(chalk.cyan('Rate:') + ` GHS ${mat.rate.toFixed(2)}/sq ft`);
  console.log(chalk.cyan('Total:') + chalk.bold.yellow(` GHS ${total.toFixed(2)}`));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  data.history.unshift({
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    height: h,
    length: l,
    material: mat.name,
    rate: mat.rate,
    total: total
  });
  saveData(data);

  const { again } = await inquirer.prompt([
    { type: 'confirm', name: 'again', message: 'Calculate another price?', default: true }
  ]);

  if (again) await calculatePrice();
}

async function manageMaterials() {
  const data = loadData();
  
  while (true) {
    const materialList = Object.entries(data.materials).map(([id, mat]) => ({
      name: `${mat.name} - GHS ${mat.rate.toFixed(2)}`,
      value: id
    }));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Materials menu:',
        choices: [
          { name: 'Add Material', value: 'add' },
          { name: 'Edit Material', value: 'edit', disabled: materialList.length === 0 },
          { name: 'Delete Material', value: 'delete', disabled: materialList.length === 0 },
          { name: '← Back to Main Menu', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') return;

    if (action === 'add') {
      const { id, name, rate } = await inquirer.prompt([
        { type: 'input', name: 'id', message: 'Material ID (e.g., vinyl):' },
        { type: 'input', name: 'name', message: 'Material name:' },
        { type: 'input', name: 'rate', message: 'Rate (GHS):', validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Please enter valid positive number' }
      ]);
      const sanitizedId = id.trim().toLowerCase().replace(/\s+/g, '-');
      data.materials[sanitizedId] = { name, rate: parseFloat(rate) };
      saveData(data);
      console.log(chalk.green('Material added successfully!'));
    }

    if (action === 'edit') {
      const { materialId } = await inquirer.prompt([
        { type: 'list', name: 'materialId', message: 'Select material to edit:', choices: materialList }
      ]);
      const current = data.materials[materialId];
      const { name, rate } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'New material name:', default: current.name },
        { type: 'input', name: 'rate', message: 'New rate (GHS):', default: current.rate, validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Please enter valid positive number' }
      ]);
      data.materials[materialId] = { name, rate: parseFloat(rate) };
      saveData(data);
      console.log(chalk.green('Material updated successfully!'));
    }

    if (action === 'delete') {
      const { materialId } = await inquirer.prompt([
        { type: 'list', name: 'materialId', message: 'Select material to delete:', choices: materialList }
      ]);
      const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: `Are you sure you want to delete this material?`, default: false }
      ]);
      if (confirm) {
        delete data.materials[materialId];
        saveData(data);
        console.log(chalk.green('Material deleted successfully!'));
      }
    }
  }
}

async function viewHistory() {
  const data = loadData();
  if (data.history.length === 0) {
    console.log(chalk.gray('No history yet.\n'));
    return;
  }

  console.log('\n' + chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Calculation History'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  data.history.slice(0, 20).forEach(item => {
    console.log(chalk.gray(`${item.date} ${item.time}`));
    console.log(`  ${item.height}ft × ${item.length}ft • ${item.material} @ GHS ${item.rate.toFixed(2)} = GHS ${item.total.toFixed(2)}\n`);
  });

  const { clear } = await inquirer.prompt([
    { type: 'confirm', name: 'clear', message: 'Clear all history?', default: false }
  ]);

  if (clear) {
    data.history = [];
    saveData(data);
    console.log(chalk.green('History cleared!'));
  }
}

showLogo();
mainMenu();
