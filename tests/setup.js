require('./env');

const { execFileSync } = require('child_process');
const path = require('path');
const { sequelize } = require('../src/models');

module.exports = async () => {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'sequelize-cli', 'lib', 'sequelize'), 'db:migrate:undo:all'], { cwd: path.join(__dirname, '..'), env: process.env, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'sequelize-cli', 'lib', 'sequelize'), 'db:migrate'], { cwd: path.join(__dirname, '..'), env: process.env, stdio: 'inherit' });
  execFileSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'sequelize-cli', 'lib', 'sequelize'), 'db:seed:all'], { cwd: path.join(__dirname, '..'), env: process.env, stdio: 'inherit' });
  await sequelize.close();
};
