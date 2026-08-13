const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsToMany(models.Role, { through: models.UserRole, foreignKey: 'userId', otherKey: 'roleId', as: 'roles' });
      User.belongsToMany(models.Tenant, { through: models.Membership, foreignKey: 'userId', otherKey: 'tenantId', as: 'tenants' });
      User.hasMany(models.Session, { foreignKey: 'userId', as: 'sessions' });
      User.hasMany(models.VerificationToken, { foreignKey: 'userId', as: 'verificationTokens' });
      User.hasMany(models.TrustedDevice, { foreignKey: 'userId', as: 'trustedDevices' });
      User.hasMany(models.MfaBackupCode, { foreignKey: 'userId', as: 'mfaBackupCodes' });
    }
  }

  User.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(320), allowNull: false, unique: true, set(value) { this.setDataValue('email', String(value).trim().toLowerCase()); } },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
    firstName: { type: DataTypes.STRING(120), allowNull: false },
    lastName: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'active', 'blocked', 'deleted'), allowNull: false, defaultValue: 'pending' },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    googleId: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    failedLoginAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    mfaEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    mfaSecretEncrypted: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    paranoid: true,
    indexes: [{ unique: true, fields: ['email'] }, { unique: true, fields: ['google_id'], where: { google_id: { [Op.ne]: null } } }],
  });

  return User;
};
