const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MfaChallenge extends Model {
    static associate(models) {
      MfaChallenge.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  MfaChallenge.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize, modelName: 'MfaChallenge', tableName: 'mfa_challenges', underscored: true, indexes: [{ fields: ['expires_at'] }] });

  return MfaChallenge;
};
