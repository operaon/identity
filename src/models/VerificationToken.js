const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VerificationToken extends Model {
    static associate(models) {
      VerificationToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  VerificationToken.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('email_verification', 'password_reset', 'professional_invite', 'oauth_exchange'), allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize, modelName: 'VerificationToken', tableName: 'verification_tokens', underscored: true, indexes: [{ fields: ['user_id', 'type'] }, { fields: ['expires_at'] }] });

  return VerificationToken;
};
