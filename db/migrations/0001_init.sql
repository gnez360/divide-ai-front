-- 0001_init.sql — schema da conta-juntos (spec_tecnica §5.2)

create extension if not exists pgcrypto;

-- Papéis (dev local; no Supabase viram config do projeto)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime login password 'app_runtime';
  end if;
end $$;

create schema if not exists app;

-- Contas: agregado JSONB + colunas extraídas
create table if not exists app.bills (
  id                   uuid primary key,
  status               text not null check (status in
                         ('DRAFT','OCR_PROCESSING','OCR_FAILED','RECEIPT_REVIEW','OPEN','CLOSED')),
  revision             bigint not null default 0,
  schema_version       smallint not null default 1,
  document             jsonb not null,
  created_by           uuid not null,
  join_token_version   integer not null default 1,
  image_path           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  receipt_confirmed_at timestamptz,
  closed_at            timestamptz,
  constraint document_size check (octet_length(document::text) < 262144)
);
create index if not exists bills_image_purge_idx on app.bills (closed_at) where image_path is not null;
create index if not exists bills_open_idx        on app.bills (updated_at) where status = 'OPEN';

create table if not exists app.sessions (
  id                uuid primary key,
  token_hash        bytea not null unique,
  bill_id           uuid not null references app.bills(id) on delete cascade,
  participant_id    uuid not null,
  created_at        timestamptz not null default now(),
  last_used_at      timestamptz not null default now(),
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  revocation_reason text check (revocation_reason in ('SIGN_OUT','CLAIM','REMOVAL','DELETION','EXPIRATION'))
);
create index if not exists sessions_active_idx on app.sessions (bill_id, participant_id) where revoked_at is null;

create table if not exists app.claim_secrets (
  claim_id    uuid primary key,
  bill_id     uuid not null references app.bills(id) on delete cascade,
  secret_hash bytea not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

create table if not exists app.operations (
  bill_id      uuid not null references app.bills(id) on delete cascade,
  operation_id uuid not null,
  type         text not null,
  http_status  smallint not null,
  result       jsonb not null,
  created_at   timestamptz not null default now(),
  primary key (bill_id, operation_id)
);

create table if not exists app.entry_operations (
  operation_id   uuid primary key,
  type           text not null check (type in ('CREATE_BILL','JOIN_AS_NEW','TAKE_RESERVED_SEAT','REQUEST_CLAIM')),
  bill_id        uuid references app.bills(id) on delete cascade,
  participant_id uuid,
  http_status    smallint not null,
  result         jsonb not null,
  created_at     timestamptz not null default now()
);

create table if not exists app.events (
  bill_id    uuid not null references app.bills(id) on delete cascade,
  revision   bigint not null,
  event_id   uuid not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  primary key (bill_id, revision)
);

create table if not exists app.presence (
  bill_id        uuid not null references app.bills(id) on delete cascade,
  participant_id uuid not null,
  instance       text not null,
  connections    smallint not null,
  last_seen_at   timestamptz not null,
  primary key (bill_id, participant_id, instance)
);

create table if not exists app.audit_log (
  id                   uuid primary key default gen_random_uuid(),
  bill_id              uuid,
  bill_ref             bytea,
  action               text not null,
  actor_participant_id uuid,
  target               jsonb not null default '{}',
  data                 jsonb not null default '{}',
  ip_hmac              bytea,
  created_at           timestamptz not null default now()
);
create index if not exists audit_log_bill_idx      on app.audit_log (bill_id, created_at);
create index if not exists audit_log_retention_idx on app.audit_log (created_at);

-- Rate limit (tabela gerida pela aplicação; criação automática desligada)
create table if not exists app.rate_limits (
  bucket   text primary key,
  count    integer not null default 0,
  reset_at timestamptz not null
);

grant usage on schema app to app_runtime;
grant select, insert, update, delete on all tables in schema app to app_runtime;
alter default privileges in schema app grant select, insert, update, delete on tables to app_runtime;

-- Escuta de NOTIFY na própria conexão é feita pela aplicação (LISTEN)
