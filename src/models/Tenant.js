const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
      Tenant.belongsToMany(models.User, { through: models.Membership, foreignKey: 'tenantId', otherKey: 'userId', as: 'users' });
      Tenant.hasMany(models.Role, { foreignKey: 'tenantId', as: 'roles' });
    }
  }

  Tenant.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    organizationId: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'active', 'suspended', 'deleted'), allowNull: false, defaultValue: 'pending' },
    isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'Tenant', tableName: 'tenants', underscored: true, paranoid: true, indexes: [{ unique: true, fields: ['slug'] }] });

  return Tenant;
};
