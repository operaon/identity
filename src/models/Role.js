const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      Role.belongsToMany(models.Permission, { through: models.RolePermission, foreignKey: 'roleId', otherKey: 'permissionId', as: 'permissions' });
      Role.belongsToMany(models.User, { through: models.UserRole, foreignKey: 'roleId', otherKey: 'userId', as: 'users' });
    }
  }

  Role.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    tenantId: { type: DataTypes.UUID, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isAssignable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'Role', tableName: 'roles', underscored: true, paranoid: true, indexes: [{ unique: true, fields: ['slug', 'tenant_id'] }] });

  return Role;
};
