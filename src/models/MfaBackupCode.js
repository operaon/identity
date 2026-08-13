const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MfaBackupCode extends Model {
    static associate(models) {
      MfaBackupCode.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  MfaBackupCode.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    codeHash: { type: DataTypes.STRING(64), allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize, modelName: 'MfaBackupCode', tableName: 'mfa_backup_codes', underscored: true, indexes: [{ fields: ['user_id'] }] });

  return MfaBackupCode;
};
