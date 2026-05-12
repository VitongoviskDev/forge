# Forge V2 — Architecture & CLI Refactor RFC

> Status: Approved for Implementation  
> Version: V2  
> Goal: Simplify architecture, improve DX, reduce maintenance complexity, and prepare Forge for future transports (WS, GraphQL, RPC) without overengineering.

---

# Vision

Forge is evolving from a simple API generator into an:

> Opinionated frontend architecture generator

The focus of V2 is:

- Strong conventions
- Predictable output
- Incremental code generation
- Smart synchronization
- Modular architecture only
- Better DX
- Future-ready transport abstraction

Forge should prioritize:

> Convention over configuration

---

# Core Architectural Decisions

## 1. Module-Only Architecture

### Decision

Remove support for layer-based architecture completely.

Forge V2 will support:

```txt
module architecture only


Why

Supporting both:

layers
modules

creates exponential complexity in:

path resolution
template generation
sync logic
code injection
state management
maintenance
documentation
debugging

Forge naturally evolved toward modular architecture.

2. REST API is Implicit

REST becomes the default transport.

No need for:

forge api ...

Instead:

forge module users
forge add users getUser --get

Future transports remain explicit:

forge ws ...
forge graphql ...
forge rpc ...
Why

Better DX and less verbosity.

Most Forge usage is REST-based.

3. module Replaces resource
Old
forge make:resource user
New
forge module user
forge m user
Why

resource becomes semantically weak for:

auth
session
analytics
upload
notifications

Forge generates:

api
services
hooks
contracts
types

This is conceptually:

a module

not just a CRUD resource.

CLI Commands (V2)
Init
Command
forge init
Behavior

Forge always initializes in:

module architecture

No architecture selection.

Only asks:

Enable auto sync?

○ Yes
○ No

This value is saved to:

.forge.json
Module Creation
Full
forge module <name>
Alias
forge m <name>
Example
forge module users
forge m auth
Minimal Module Variant

Some modules do not require types initially.

Examples:

auth
session
analytics
health
upload
Command
forge module auth --minimal
Alias
forge m auth --minimal
Behavior

Does NOT generate:

<module>.types.ts
contracts/

Until endpoints are added.

Generated structure:

auth/
├── hooks/
│   └── index.ts
├── auth.api.ts
├── auth.service.ts
└── index.ts
Add Endpoint
Explicit Method
forge add <module> <functionName> --get
forge add <module> <functionName> --post
forge add <module> <functionName> --put
forge add <module> <functionName> --delete
Alias
forge a <module> <functionName> --get
forge a <module> <functionName> --post
forge a <module> <functionName> --put
forge a <module> <functionName> --delete
Examples
forge add users getUser --get
forge add users createUser --post
forge add users updateUser --put
forge add users deleteUser --delete
Interactive Add Mode

If request method is omitted:

forge add users getUser

Forge enters interactive mode:

Select request method:

1. GET
2. POST
3. PUT
4. DELETE

User chooses option.

Forge continues generation.

Why

Better DX.

Less memorization.

Faster onboarding.

Remove Endpoint
Full
forge remove <module> <functionName>
Alias
forge rm <module> <functionName>
Example
forge remove users getUser
Rename Endpoint
Full
forge rename <module> <oldName> <newName>
Alias
forge rn <module> <oldName> <newName>
Example
forge rename users getUser fetchUser
List Modules

Lists all modules in the project.

Full
forge list
Alias
forge l
Example Output
Modules

- auth
- users
- profile
- billing
Describe Module

Shows detailed module information.

Full
forge describe <module>
Alias
forge d <module>
Example
forge describe users
Example Output
Module: users

Functions:
- getUser (GET)
- createUser (POST)
- updateUser (PUT)
- deleteUser (DELETE)

Files:
- user.api.ts
- user.service.ts
- user.types.ts

Hooks:
- useGetUser
- useCreateUser
- useUpdateUser
- useDeleteUser

Contracts:
- getUser.types.ts
- createUser.types.ts
- updateUser.types.ts
- deleteUser.types.ts
Sync
Full
forge sync
Alias
forge s
Purpose

Synchronizes:

forge.state.json
forge.data.json

Ensures state consistency.

Future Transport Namespaces (Roadmap)

Not implemented in V2.

Only prepare architecture.

WebSocket
forge ws module chat
forge ws add chat messageReceived
forge ws remove chat messageReceived
forge ws rename chat oldEvent newEvent
forge ws list
forge ws describe chat
forge ws sync

Aliases:

forge ws m chat
forge ws a chat messageReceived
forge ws rm chat messageReceived
forge ws rn chat oldEvent newEvent
forge ws l
forge ws d chat
forge ws s
Final Output Structure
Root
forge/
├── .forge.json
├── forge.data.json
├── forge.state.json
└── src/
Shared Infrastructure
src/
└── modules/
    └── api/
        └── api-client.ts
Why

This is global shared infrastructure.

Must remain isolated.

Standard Module Structure
src/
└── modules/
    └── user/
        ├── contracts/
        │   ├── createUser.types.ts
        │   ├── deleteUser.types.ts
        │   ├── getUser.types.ts
        │   ├── updateUser.types.ts
        │   └── index.ts
        │
        ├── hooks/
        │   ├── useCreateUser.hook.ts
        │   ├── useDeleteUser.hook.ts
        │   ├── useGetUser.hook.ts
        │   ├── useUpdateUser.hook.ts
        │   └── index.ts
        │
        ├── user.api.ts
        ├── user.service.ts
        ├── user.types.ts
        └── index.ts
Structural Decisions
contracts/ replaces endpoints/
Old
endpoints/
New
contracts/
Why

These files contain:

payload
response
errors
operation contracts

They are not just endpoints.

This naming scales better for:

REST
WS
GraphQL
RPC
user.types.ts (plural)
Old
user.type.ts
New
user.types.ts
Why

Modules naturally grow.

Future types:

User
UserRole
UserStatus
UserFilter
UserPagination

Plural naming scales better.

Hooks Stay Granular
Decision

Keep:

hooks/

instead of:

user.hooks.ts
Why

Forge scales with user projects.

Large SaaS modules may contain:

10+
20+
50+
hooks

Separate files scale better for:

merge conflicts
ownership
navigation
maintainability
Add Barrel Exports

Every folder should contain:

index.ts
Example
hooks/index.ts
export * from './useGetUser.hook'
export * from './useCreateUser.hook'
export * from './useUpdateUser.hook'
export * from './useDeleteUser.hook'
contracts/index.ts
export * from './getUser.types'
export * from './createUser.types'
module/index.ts
export * from './user.api'
export * from './user.service'
export * from './user.types'
export * from './hooks'
export * from './contracts'
Why

Improves DX:

import { UserService } from '@/modules/user'

instead of:

import { UserService } from '@/modules/user/user.service'
Internal Forge Refactor

Current architecture is:

command-driven

V2 should progressively move toward:

generator-driven

Current Problem

Business logic is concentrated in:

commands/

Especially:

consume.ts

Generators currently exist but are empty:

generator/
├── api.generator.ts
├── hook.generator.ts
├── service.generator.ts
└── types.generator.ts
New Direction
Commands

Only orchestrate.

Generators

Generate and inject code.

Example:

await generateContracts()
await generateApi()
await generateService()
await generateHooks()
await syncState()
Suggested Migration Plan
Phase 1

Rename CLI architecture.

Replace:

make:resource
consume
make:api
make:service
make:type

with V2 commands.

No deep refactor yet.

Phase 2

Move logic from:

commands/

to:

generator/
Phase 3

Improve state engine.

Refactor:

forge.state.json
forge.data.json

for smarter sync behavior.

Success Criteria

V2 is considered complete when:

Module-only architecture exists
Old commands are removed
Interactive add mode works
Minimal modules work
Contracts replace endpoints
Hooks remain granular
Describe command works
List command works
Sync works
Barrel exports exist
Generators own code generation
Commands become orchestration only
Final Principle

Forge should optimize for:

Predictable scalable frontend architecture

not:

maximum flexibility

Forge is opinionated by design.