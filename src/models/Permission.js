const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsToMany(models.Role, { through: models.RolePermission, foreignKey: 'permissionId', otherKey: 'roleId', as: 'roles' });
    }
  }

  Permission.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    resource: { type: DataTypes.STRING(80), allowNull: false },
    action: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'Permission', tableName: 'permissions', underscored: true, indexes: [{ unique: true, fields: ['resource', 'action'] }] });

  return Permission;
};
