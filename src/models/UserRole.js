const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRole extends Model {
    static associate(models) {
      UserRole.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      UserRole.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
      UserRole.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    }
  }
  UserRole.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    roleId: { type: DataTypes.UUID, allowNull: false },
    tenantId: { type: DataTypes.UUID, allowNull: true },
    assignedBy: { type: DataTypes.UUID, allowNull: true },
  }, { sequelize, modelName: 'UserRole', tableName: 'user_roles', underscored: true, indexes: [{ unique: true, fields: ['user_id', 'role_id', 'tenant_id'] }, { fields: ['user_id'] }, { fields: ['tenant_id'] }] });
  return UserRole;
};
