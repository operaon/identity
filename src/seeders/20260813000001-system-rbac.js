const { randomUUID } = require('crypto');

const permissions = [
  ['tenant', 'read'], ['tenant', 'update'], ['user', 'read'], ['user', 'write'],
  ['rbac', 'read'], ['rbac', 'write'], ['patient', 'read'], ['patient', 'write'],
  ['clinical', 'read'], ['clinical', 'write'], ['billing', 'read'], ['billing', 'write'],
  ['catalog', 'read'], ['catalog', 'write'], ['equipment', 'read'], ['equipment', 'write'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionRows = permissions.map(([resource, action]) => ({ id: randomUUID(), resource, action, description: `${resource}:${action}`, is_system: true, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('permissions', permissionRows, { ignoreDuplicates: true });

    const rows = await queryInterface.sequelize.query('SELECT id, resource, action FROM permissions', { type: queryInterface.sequelize.QueryTypes.SELECT });
    const permissionMap = new Map(rows.map((row) => [`${row.resource}:${row.action}`, row.id]));
    const roleRows = [
      { id: randomUUID(), name: 'Super administrador', slug: 'super_admin', description: 'Acesso global do sistema', tenant_id: null, is_system: true, is_assignable: false, created_at: now, updated_at: now },
      { id: randomUUID(), name: 'Administrador do tenant', slug: 'tenant_admin', description: 'Administração do tenant', tenant_id: null, is_system: true, is_assignable: true, created_at: now, updated_at: now },
      { id: randomUUID(), name: 'Profissional', slug: 'professional', description: 'Acesso clínico profissional', tenant_id: null, is_system: true, is_assignable: true, created_at: now, updated_at: now },
      { id: randomUUID(), name: 'Paciente', slug: 'patient', description: 'Acesso do paciente', tenant_id: null, is_system: true, is_assignable: true, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('roles', roleRows, { ignoreDuplicates: true });
    const roles = await queryInterface.sequelize.query("SELECT id, slug FROM roles WHERE slug IN ('super_admin','tenant_admin','professional','patient') AND tenant_id IS NULL", { type: queryInterface.sequelize.QueryTypes.SELECT });
    const roleMap = new Map(roles.map((row) => [row.slug, row.id]));
    const rolePermissionMap = {
      super_admin: permissions.map(([r, a]) => `${r}:${a}`),
      tenant_admin: ['tenant:read', 'tenant:update', 'user:read', 'user:write', 'rbac:read', 'rbac:write'],
      professional: ['patient:read', 'clinical:read', 'clinical:write'],
      patient: ['patient:read', 'patient:write'],
    };
    const links = [];
    for (const [slug, names] of Object.entries(rolePermissionMap)) for (const name of names) if (roleMap.get(slug) && permissionMap.get(name)) links.push({ role_id: roleMap.get(slug), permission_id: permissionMap.get(name), created_at: now, updated_at: now });
    await queryInterface.bulkInsert('role_permissions', links, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('super_admin','tenant_admin','professional','patient') AND tenant_id IS NULL);");
    await queryInterface.bulkDelete('roles', { slug: ['super_admin', 'tenant_admin', 'professional', 'patient'], tenant_id: null });
    await queryInterface.bulkDelete('permissions', { is_system: true });
  },
};
