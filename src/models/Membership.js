const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Membership extends Model {
    static associate(models) {
      Membership.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Membership.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    }
  }
  Membership.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('invited', 'active', 'suspended', 'revoked'), allowNull: false, defaultValue: 'active' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    invitedBy: { type: DataTypes.UUID, allowNull: true },
    joinedAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize, modelName: 'Membership', tableName: 'memberships', underscored: true, indexes: [{ unique: true, fields: ['user_id', 'tenant_id'] }] });
  return Membership;
};
