# Operaon Identity

Standalone de **Identidade e Acesso (IAM)** da Operaon. O serviço centraliza autenticação, sessões, refresh tokens rotativos, MFA/2FA, memberships multi-tenant, roles e permissões dinâmicas, sem assumir a propriedade dos dados clínicos, comerciais ou de agenda dos demais módulos.

## Responsabilidades

O Identity é responsável por usuários, credenciais, status de conta, sessões, dispositivos confiáveis, tokens de verificação e recuperação, configurações de MFA, organizações, tenants, memberships, roles, permissions e atribuições de roles. Os domínios de Patient, Clinical, Catalog, Billing, Agend, Notification e demais dados operacionais continuam pertencendo aos respectivos standalones ou à API de domínio.

O RBAC é **100% orientado a dados**. As permissões são registros persistidos no banco, as roles podem ser de sistema ou customizadas por tenant e as atribuições são avaliadas pelo contexto autenticado. Não há uma matriz de autorização de negócio hardcoded no controller.

## Execução local

Requisitos: Node.js 18 ou superior e PostgreSQL 14 ou superior.

```bash
npm ci
cp .env.example .env
npm run migrate
npm run seed
npm test
npm start
```

O serviço expõe, por padrão, `http://localhost:4700`. O health check básico é `GET /health`, o readiness check é `GET /ready` e a API fica sob o prefixo `/api`.

## Variáveis de ambiente essenciais

| Variável | Obrigatória | Descrição |
|---|---:|---|
| `PORT` | não | Porta HTTP; default `4700`. |
| `HOST` | não | Host de bind; default `0.0.0.0`. |
| `DATABASE_URL` ou `DB_*` | sim | Conexão PostgreSQL exclusiva do Identity. |
| `JWT_ALGORITHM` | não | `HS256` em testes; produção deve evoluir para assinatura assimétrica/JWKS. |
| `JWT_SECRET` | sim em HS256 | Segredo temporário de compatibilidade; use segredo forte. |
| `JWT_ISSUER` | sim | Issuer validado em access e refresh tokens. |
| `JWT_AUDIENCE` | sim | Audience validada em access e refresh tokens. |
| `JWT_ACCESS_EXPIRATION` | não | TTL do access token; default `15m`. |
| `JWT_REFRESH_EXPIRATION` | não | TTL do refresh token; default `7d`. |
| `SERVICE_API_KEY` | sim em produção | Chave backend-a-backend recebida em `X-Service-Key`. Em testes, `IDENTITY_SERVICE_API_KEY` também é aceito como fallback. |
| `MFA_ENCRYPTION_KEY` | sim quando MFA ativo | Chave de 32 bytes para proteger segredo TOTP em repouso. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | não | SMTP opcional para recuperação e verificação de e-mail. |
| `CORS_ORIGIN` | não | Lista de origens separadas por vírgula. |

Em produção, os segredos devem ser fornecidos pelo gerenciador de secrets da infraestrutura. Nunca versionar `.env`, chaves JWT, `X-Service-Key`, códigos de backup ou tokens.

## Contrato de autenticação

| Método | Endpoint | Acesso | Finalidade |
|---|---|---|---|
| `POST` | `/api/auth/register` | público | Cria conta inicial, organização/tenant e contexto administrativo. |
| `POST` | `/api/auth/register-professional` | público | Cadastro profissional por convite. |
| `POST` | `/api/auth/register-patient` | público | Autocadastro de paciente. |
| `POST` | `/api/auth/login` | público | Login com senha; pode iniciar desafio MFA. |
| `POST` | `/api/auth/mfa/verify` | público | Conclui login com TOTP ou backup code. |
| `POST` | `/api/auth/refresh` | público | Rotaciona o refresh token e emite novo par de tokens. |
| `POST` | `/api/auth/password-reset/request` | público | Solicita recuperação de senha. |
| `POST` | `/api/auth/password-reset/confirm` | público | Confirma recuperação com token. |
| `GET` | `/api/auth/me` | bearer | Retorna o contexto atual do usuário. |
| `POST` | `/api/auth/logout` | bearer | Revoga a sessão corrente. |
| `POST` | `/api/auth/logout-all` | bearer | Revoga todas as sessões do usuário. |
| `POST` | `/api/auth/switch-tenant` | bearer | Troca o tenant ativo após validar membership. |
| `POST` | `/api/auth/email/verify` | bearer | Confirma verificação de e-mail. |
| `POST` | `/api/auth/email/resend` | bearer | Reenvia verificação. |
| `POST` | `/api/auth/mfa/setup` | bearer | Gera configuração TOTP e QR code. |
| `POST` | `/api/auth/mfa/enable` | bearer | Ativa MFA com código TOTP. |
| `POST` | `/api/auth/mfa/disable` | bearer | Desativa MFA após validação. |
| `POST` | `/api/auth/mfa/backup-codes` | bearer | Regenera códigos de recuperação. |
| `GET` | `/api/auth/mfa/status` | bearer | Consulta o estado de MFA. |
| `POST` | `/api/auth/service-token` | `X-Service-Key` | Emite token para chamadas backend-a-backend autorizadas. |

As respostas seguem o envelope `{ success: true, data }`. Falhas usam `{ success: false, error: { code, message, details? } }`, com status HTTP correspondente.

## Refresh token e sessões

O access token é curto e contém `sub`, `sessionId`, `tenantId`, `roles`, `permissions`, `iss`, `aud`, `iat`, `exp` e `tokenVersion`. O refresh token é um JWT de longa duração, mas a sessão persiste somente `sha256(refreshToken)`, nunca o token em claro.

Cada rotação emite um novo identificador de sessão e um `jti` único. O hash persistido é substituído atomicamente; o token anterior deixa de ser aceito. Logout, logout-all, alteração de senha, MFA e mudanças críticas de RBAC podem revogar a sessão ou incrementar `tokenVersion`, obrigando nova autenticação conforme a política de segurança.

## RBAC e multi-tenant

A superfície administrativa está em `/api/rbac`:

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET/POST` | `/api/rbac/permissions` | Consulta e cria permissões. |
| `GET/POST` | `/api/rbac/roles` | Consulta e cria roles. |
| `PATCH/DELETE` | `/api/rbac/roles/:roleId` | Atualiza ou remove role customizada. |
| `POST/DELETE` | `/api/rbac/assignments` | Atribui ou remove role de usuário/membership. |
| `GET` | `/api/rbac/evaluate` | Avalia uma permissão no contexto atual. |

A autorização de gestão exige a permissão persistida `rbac:read` ou `rbac:write`. O isolamento de tenant é aplicado pela membership e pelo `tenantId` do contexto, não por regras fixas específicas de cada frontend.

## Integração com a API gateway

A API Operaon mantém as rotas legadas durante a migração e expõe o contrato novo sob `/api/identity`:

```text
POST /api/identity/auth/register
POST /api/identity/auth/login
POST /api/identity/auth/refresh
GET  /api/identity/auth/me
POST /api/identity/auth/logout
GET  /api/identity/auth/mfa/status
GET  /api/identity/rbac/roles
POST /api/identity/rbac/assignments
```

O gateway resolve a integração ativa `provider=identity` na tabela `integrations`, descriptografa a `serviceApiKey` em memória e encaminha as requisições ao standalone. O bearer token é propagado somente para endpoints autenticados; a chave backend-a-backend é enviada em `X-Service-Key`. As rotas `/api/auth`, `/api/roles`, `/api/permissions` e `/api/sessions` legadas permanecem disponíveis até a conclusão da migração dos clientes.

Para cadastrar a integração no gateway, use uma integração ativa com `provider=identity`, `environment=sandbox|production`, `credentials.serviceApiKey` e `config.baseURL`, por exemplo:

```json
{
  "provider": "identity",
  "environment": "production",
  "label": "Operaon Identity Production",
  "credentials": {
    "serviceApiKey": "secret-gerenciado-fora-do-repositorio"
  },
  "config": {
    "baseURL": "https://identity.operaon.com"
  },
  "isActive": true
}
```

## Banco, migrations e seed

O Identity possui PostgreSQL próprio. A migration inicial cria as tabelas de usuários, organizações, tenants, permissions, roles, junções RBAC, memberships, sessões, tokens de verificação, dispositivos confiáveis, desafios MFA e códigos de backup. O seeder de RBAC é idempotente e cria somente permissões e roles de sistema ausentes.

As migrations devem ser executadas antes do boot do serviço. O gateway possui uma migration independente, `add-identity-to-integrations-provider-enum`, que adiciona `identity` ao ENUM de providers da tabela genérica de integrações.

## Testes

A suíte de contrato do standalone cobre registro, login, perfil, refresh rotativo, RBAC, MFA e logout. Execute:

```bash
npm test
```

O gateway possui testes unitários do adapter em `tests/identityService.test.js` e smoke tests manuais podem apontar `baseURL` para o Identity local. Em qualquer mudança de claims, status HTTP ou envelopes, atualize primeiro os testes de contrato antes de migrar os frontends.

## Segurança operacional

Logs não devem conter access tokens, refresh tokens, senhas, códigos TOTP, backup codes ou chaves de serviço. O Identity deve operar atrás de TLS, com `X-Service-Key` rotacionável, rate limit em autenticação, CORS explícito e banco isolado. A adoção de RS256/EdDSA com JWKS é o próximo passo recomendado para eliminar a distribuição de segredo simétrico entre consumidores.
