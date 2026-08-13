const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const basename = path.basename(__filename);
const models = {};

for (const file of fs.readdirSync(__dirname)) {
  if (file === basename || !file.endsWith('.js')) continue;
  const modelFactory = require(path.join(__dirname, file));
  const model = modelFactory(sequelize, DataTypes);
  models[model.name] = model;
}

for (const model of Object.values(models)) {
  if (typeof model.associate === 'function') model.associate(models);
}

models.sequelize = sequelize;
models.Sequelize = require('sequelize').Sequelize;

module.exports = models;
