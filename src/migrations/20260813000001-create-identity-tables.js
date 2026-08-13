const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryInterface.createTable('organizations', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      name: { type: Sequelize.STRING(180), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      status: { type: Sequelize.ENUM('active', 'suspended', 'deleted'), allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('tenants', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      name: { type: Sequelize.STRING(180), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      organization_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'organizations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('pending', 'active', 'suspended', 'deleted'), allowNull: false, defaultValue: 'pending' },
      is_approved: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      email: { type: Sequelize.STRING(320), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: true },
      first_name: { type: Sequelize.STRING(120), allowNull: false },
      last_name: { type: Sequelize.STRING(120), allowNull: false },
      phone: { type: Sequelize.STRING(40), allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'active', 'blocked', 'deleted'), allowNull: false, defaultValue: 'pending' },
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      google_id: { type: Sequelize.STRING(255), allowNull: true },
      failed_login_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      token_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      mfa_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      mfa_secret_encrypted: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('users', ['google_id'], { unique: true, where: { google_id: { [Sequelize.Op.ne]: null } }, name: 'users_google_id_unique' });

    await queryInterface.createTable('permissions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      resource: { type: Sequelize.STRING(80), allowNull: false },
      action: { type: Sequelize.STRING(80), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('permissions', ['resource', 'action'], { unique: true, name: 'permissions_resource_action_unique' });

    await queryInterface.createTable('roles', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      name: { type: Sequelize.STRING(80), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_assignable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX roles_global_slug_unique ON roles (slug) WHERE tenant_id IS NULL;');
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX roles_tenant_slug_unique ON roles (tenant_id, slug) WHERE tenant_id IS NOT NULL;');

    await queryInterface.createTable('memberships', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('invited', 'active', 'suspended', 'revoked'), allowNull: false, defaultValue: 'active' },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      invited_by: { type: Sequelize.UUID, allowNull: true },
      joined_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('memberships', ['user_id', 'tenant_id'], { unique: true, name: 'memberships_user_tenant_unique' });

    await queryInterface.createTable('role_permissions', {
      role_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, references: { model: 'roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      permission_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, references: { model: 'permissions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('user_roles', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      role_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tenant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      assigned_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX user_roles_global_unique ON user_roles (user_id, role_id) WHERE tenant_id IS NULL;');
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX user_roles_tenant_unique ON user_roles (user_id, role_id, tenant_id) WHERE tenant_id IS NOT NULL;');

    await queryInterface.createTable('sessions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      refresh_token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      device_name: { type: Sequelize.STRING(160), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      last_used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      revoke_reason: { type: Sequelize.STRING(120), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('sessions', ['user_id'], { name: 'sessions_user_id_idx' });

    await queryInterface.createTable('verification_tokens', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('email_verification', 'password_reset', 'professional_invite', 'oauth_exchange'), allowNull: false },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('trusted_devices', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(160), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      last_used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('mfa_backup_codes', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      code_hash: { type: Sequelize.STRING(64), allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('mfa_challenges', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    for (const table of ['mfa_challenges', 'mfa_backup_codes', 'trusted_devices', 'verification_tokens', 'sessions', 'user_roles', 'role_permissions', 'memberships', 'roles', 'permissions', 'users', 'tenants', 'organizations']) {
      await queryInterface.dropTable(table);
    }
    for (const type of ['verification_tokens_type', 'users_status', 'tenants_status', 'organizations_status', 'memberships_status']) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}";`);
    }
  },
};
