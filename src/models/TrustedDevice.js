const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustedDevice extends Model {
    static associate(models) {
      TrustedDevice.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  TrustedDevice.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(160), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    lastUsedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize, modelName: 'TrustedDevice', tableName: 'trusted_devices', underscored: true, indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }] });

  return TrustedDevice;
};
