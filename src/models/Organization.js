const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Organization extends Model {
    static associate(models) {
      Organization.hasMany(models.Tenant, { foreignKey: 'organizationId', as: 'tenants' });
    }
  }

  Organization.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'suspended', 'deleted'), allowNull: false, defaultValue: 'active' },
  }, { sequelize, modelName: 'Organization', tableName: 'organizations', underscored: true, paranoid: true });

  return Organization;
};
