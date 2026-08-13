const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  Session.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    refreshTokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    deviceName: { type: DataTypes.STRING(160), allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    lastUsedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    revokeReason: { type: DataTypes.STRING(120), allowNull: true },
  }, { sequelize, modelName: 'Session', tableName: 'sessions', underscored: true, indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }] });

  return Session;
};
