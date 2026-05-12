# ⚒️ Forge CLI

> **Opinionated frontend architecture generator for TypeScript projects.**  
> Versão `2.0` · Publicado como `@vitongovisk/forge`

Forge é um CLI que gera automaticamente todas as camadas de integração com APIs REST no seu frontend: tipos de contrato, cliente HTTP, serviços e hooks TanStack Query — tudo fortemente tipado, a partir de um único comando.

---

## Pré-requisitos

Seu projeto deve ter as seguintes dependências instaladas:

```bash
npm install axios @tanstack/react-query
```

> O Forge verifica essas dependências no `forge init` e oferece instalação automática caso não estejam presentes.

**Node.js:** `>= 18`

---

## Instalação

```bash
npm install -D @vitongovisk/forge
```

Ou use globalmente:

```bash
npm install -g @vitongovisk/forge
```

---

## Início Rápido

```bash
# 1. Inicializar o Forge no projeto
forge init

# 2. Criar um módulo
forge module users

# 3. Adicionar endpoints ao módulo
forge add users getUser --get
forge add users createUser --post
forge add users updateUser --put
forge add users deleteUser --delete
```

Pronto. O Forge gera toda a estrutura de arquivos para você.

---

## Comandos

### `forge init`

Inicializa o Forge no projeto atual.

```bash
forge init
forge init --overwrite   # Reconfigura um projeto já inicializado
```

**O que faz:**
- Cria o arquivo de configuração `.forge.json`
- Cria `forge.data.json` (registro de intenção dos módulos)
- Cria `forge.state.json` (estado real dos arquivos gerados)
- Gera o `api-client.ts` com Axios configurado (interceptors de autenticação JWT)
- Gera os tipos base compartilhados (`api.types.ts`, `global.types.ts`, `shared.types.ts`)
- Gera o utilitário `api.utils.ts` com `parseApiError`

**Pergunta apenas:** modo de sincronização (`auto` ou `manual`).

---

### `forge module <name>` · alias: `forge m`

Cria um novo módulo com a estrutura base completa.

```bash
forge module users
forge m auth

# Módulo sem tipos inicialmente (para módulos utilitários como auth, session)
forge module auth --minimal
```

**Estrutura gerada (padrão):**

```
src/modules/users/
├── users.api.ts       ← cliente HTTP tipado
├── users.service.ts   ← camada de serviço/negócio
└── users.types.ts     ← interface base do modelo
```

**Com `--minimal`** (sem `users.types.ts` e sem `contracts/`):

```
src/modules/auth/
├── auth.api.ts
└── auth.service.ts
```

---

### `forge add <module> <functionName>` · alias: `forge a`

Adiciona um endpoint a um módulo existente, gerando todas as camadas verticalmente.

```bash
# Com flag de método explícita
forge add users getUser --get
forge add users createUser --post
forge add users updateUser --put
forge add users deleteUser --delete

# Aliases
forge a users getUser --get

# Sem flag → modo interativo
forge add users getUser
# → Escolha o método:
#   1. GET
#   2. POST
#   3. PUT
#   4. DELETE
```

**O que é gerado por chamada:**

| Arquivo | Descrição |
|---|---|
| `contracts/getUser.types.ts` | Tipos de `Payload`, `Response` e mapa de erros da operação |
| Injeção em `users.api.ts` | Método `getUser` adicionado via AST ao objeto `UsersAPI` |
| Injeção em `users.service.ts` | Método `getUser` com `try/catch` adicionado ao `UsersService` |
| `hooks/useGetUser.hook.ts` | Hook `useQuery` ou `useMutation` do TanStack Query |

**Estrutura final do módulo após 4 endpoints:**

```
src/modules/users/
├── contracts/
│   ├── createUser.types.ts
│   ├── deleteUser.types.ts
│   ├── getUser.types.ts
│   └── updateUser.types.ts
├── hooks/
│   ├── useCreateUser.hook.ts
│   ├── useDeleteUser.hook.ts
│   ├── useGetUser.hook.ts
│   └── useUpdateUser.hook.ts
├── users.api.ts
├── users.service.ts
└── users.types.ts
```

---

### `forge sync` · alias: `forge s`

Sincroniza o estado interno do Forge com o estado real do filesystem.

```bash
forge sync
```

**O que faz:**
- Verifica quais arquivos existem fisicamente no disco
- Atualiza o `forge.state.json` com o estado real
- Detecta módulos **incompletos** (api ou service faltando)
- Detecta módulos **órfãos** (existem no disco mas não foram registrados)
- Exibe um relatório detalhado no terminal

**Relatório de exemplo:**

```
🔄 Sincronizando projeto...

✅ Sync finalizado!

📊 Módulos: 2 ativos, 1 incompletos, 1 órfãos

⚠️  Módulos com arquivos faltando:
   - billing (faltando: service, contracts)

👻 Módulos órfãos detectados:
   - legacy-module

   💡 Dica: rode 'forge module legacy-module' para registrá-lo.
```

---

### Comandos em Desenvolvimento 🚧

Os comandos abaixo já estão registrados no CLI e serão implementados em breve:

| Comando | Alias | Descrição |
|---|---|---|
| `forge remove <module> <fn>` | `forge rm` | Remove um endpoint e seus arquivos gerados |
| `forge rename <module> <old> <new>` | `forge rn` | Renomeia um endpoint em todas as camadas |
| `forge list` | `forge l` | Lista todos os módulos do projeto |
| `forge describe <module>` | `forge d` | Exibe detalhes de um módulo (endpoints, hooks, contratos) |

---

## Arquivos de Configuração

### `.forge.json`

Configuração principal do Forge (gerada pelo `init`, raramente editada manualmente).

```json
{
  "project": {
    "architecture": "module",
    "modulePath": "src/modules",
    "apiFile": "src/modules/api/api-client.ts"
  },
  "sync": {
    "mode": "auto"
  }
}
```

| Campo | Valores | Descrição |
|---|---|---|
| `architecture` | `"module"` | Sempre modular no V2 |
| `modulePath` | `string` | Pasta raiz dos módulos |
| `apiFile` | `string` | Caminho do `api-client.ts` |
| `sync.mode` | `"auto"` \| `"manual"` | Se `auto`, sync roda após cada operação |

### `forge.data.json`

Registro de **intenção** — o que você declarou ao Forge que existe no projeto.

```json
{
  "resources": [
    {
      "name": "users",
      "methods": ["getUser", "createUser", "updateUser", "deleteUser"]
    }
  ]
}
```

### `forge.state.json`

Registro de **realidade** — o que o Forge verificou que existe no filesystem.

```json
{
  "project": { "architecture": "module", "lastSync": "2026-05-12T00:00:00.000Z" },
  "sync": { "mode": "auto", "lastRun": "2026-05-12T00:00:00.000Z" },
  "resources": [
    {
      "name": "users",
      "status": "active",
      "files": {
        "api":       { "exists": true,  "path": "src/modules/users/users.api.ts" },
        "service":   { "exists": true,  "path": "src/modules/users/users.service.ts" },
        "types":     { "exists": true,  "path": "src/modules/users/users.types.ts" },
        "contracts": { "exists": true,  "path": "src/modules/users/contracts" },
        "hooks":     { "exists": true,  "path": "src/modules/users/hooks" }
      },
      "methods": {}
    }
  ]
}
```

---

## Arquitetura Gerada

### Infraestrutura Global (gerada pelo `init`)

```
src/
├── modules/
│   └── api/
│       ├── api-client.ts     ← Instância Axios com interceptors JWT
│       └── api.types.ts      ← Tipos base: BasePayload, BaseSuccessResponse, erros
├── types/
│   ├── global.types.ts       ← Tipos globais da aplicação
│   └── shared.types.ts       ← Tipos compartilhados (ex: TFieldValidationError)
└── utils/
    └── api.utils.ts          ← parseApiError e utilitários HTTP
```

### Por Módulo (gerado pelo `module` + `add`)

```
src/modules/<module>/
├── contracts/                ← Tipos específicos por operação
│   └── <fn>.types.ts         ← Payload, Response, ErrorMap
├── hooks/                    ← Integração TanStack Query
│   └── use<Fn>.hook.ts       ← useMutation (POST/PUT/DELETE) ou useQuery (GET)
├── <module>.api.ts           ← Objeto API com chamadas Axios tipadas
├── <module>.service.ts       ← Camada de serviço com try/catch e parseApiError
└── <module>.types.ts         ← Interface base do modelo (ex: User, Product)
```

### Fluxo de Camadas

```
Componente React
     │
     ▼
hooks/useGetUser.hook.ts     → useQuery({ queryFn: ... })
     │
     ▼
users.service.ts             → try/catch + parseApiError
     │
     ▼
users.api.ts                 → api.get<GetUserResponse>(...)
     │
     ▼
api-client.ts                → Axios com Bearer token automático
     │
     ▼
Backend REST API
```

---

## Exemplo de Uso no Componente

Após rodar `forge add users getUser --get`, você pode usar diretamente no seu componente:

```tsx
import { useGetUser } from '@/modules/users/hooks/useGetUser.hook';

export function UserProfile({ id }: { id: string }) {
  const { data, isPending, isError } = useGetUser();

  if (isPending) return <Spinner />;
  if (isError) return <ErrorMessage />;

  return <div>{data.user.name}</div>;
}
```

**O TypeScript inferirá automaticamente** o tipo de `data` como `GetUserResponse`.

---

## Roadmap

- [x] Fase 1 — Nova interface CLI (V2 commands, aliases, modo interativo)
- [x] Fase 2 — Generators próprios (lógica extraída para `generator/`)
- [x] Fase 3 — State engine melhorado (sync V2, tipos consolidados)
- [ ] `forge remove` e `forge rename`
- [ ] `forge list` e `forge describe`
- [ ] Barrel exports automáticos (`index.ts`)
- [ ] Suporte a WebSocket (`forge ws ...`)

---

## Licença

ISC © [vitongovisk](https://github.com/vitongovisk)
