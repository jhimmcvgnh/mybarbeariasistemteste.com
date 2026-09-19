-- ============================================================================
-- SCHEMA DEFINITIVO — Barduka (SITE + SISTEMA)
-- ============================================================================
-- Este schema foi desenhado a partir do mapeamento completo do código real
-- dos dois projetos (mapeamento.md). Cada comentário indica qual problema
-- real ele corrige.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============================================================================
-- 1. TABELAS
-- ============================================================================

-- BARBEARIAS ------------------------------------------------------------
-- Corrige: fallback perigoso de "primeira barbearia do banco". dono_id é
-- UNIQUE: um login = uma barbearia, sempre, sem exceção.
create table if not exists public.barbearias (
  id             uuid primary key default gen_random_uuid(),
  dono_id        uuid not null unique references auth.users(id) on delete cascade,
  nome           text not null,
  slug           text not null unique,
  telefone       text,
  email_contato  text,
  logo_url       text,
  endereco       text,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- PERFIS ------------------------------------------------------------------
-- Um perfil por usuário autenticado. barbearia_id nunca é nulo e nunca muda
-- depois de criado.
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  nome          text,
  email         text,
  telefone      text,
  papel         text not null default 'dono' check (papel in ('dono','barbeiro','recepcionista')),
  avatar_url    text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

-- PROFISSIONAIS -------------------------------------------------------------
-- Corrige: EmployeesScreen esperava join com perfis que nunca existia,
-- deixando nome/avatar sempre undefined. Nome/avatar ficam direto aqui —
-- nenhum join é necessário para exibir a equipe.
create table if not exists public.profissionais (
  id                uuid primary key default gen_random_uuid(),
  barbearia_id      uuid not null references public.barbearias(id) on delete cascade,
  perfil_id         uuid references public.perfis(id) on delete set null,
  nome              text not null,
  especialidade     text,
  avatar_url        text,
  avaliacao_media   numeric(3,2) not null default 5.0,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);

-- SERVICOS --------------------------------------------------------------
create table if not exists public.servicos (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references public.barbearias(id) on delete cascade,
  nome             text not null,
  descricao        text,
  preco            numeric(10,2) not null,
  duracao_minutos  integer not null,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

-- CLIENTES ----------------------------------------------------------------
-- Corrige: ClientsScreen hoje ignora esta tabela e recalcula tudo em memória
-- a partir de agendamentos. A partir de agora, todo agendamento público
-- grava (ou atualiza) um cliente real aqui, via a RPC de agendamento.
create table if not exists public.clientes (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null references public.barbearias(id) on delete cascade,
  nome           text not null,
  telefone       text,
  email          text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (barbearia_id, telefone)
);

-- HORARIOS_DISPONIVEIS ------------------------------------------------------
-- Corrige: os slots de horário mostrados no site hoje são uma lista fixa no
-- JS, desalinhada desta tabela (que hoje só serve para checar ocupação).
-- A partir de agora, esta tabela é a ÚNICA fonte da grade de horários.
create table if not exists public.horarios_disponiveis (
  id                 uuid primary key default gen_random_uuid(),
  barbearia_id       uuid not null references public.barbearias(id) on delete cascade,
  profissional_id    uuid references public.profissionais(id) on delete cascade, -- null = vale para toda a barbearia
  dia_semana         smallint not null check (dia_semana between 0 and 6),        -- 0 = domingo
  hora_inicio        time not null,
  hora_fim           time not null,
  intervalo_minutos  integer not null default 45,
  ativo              boolean not null default true
);

create unique index if not exists idx_horarios_unico
  on public.horarios_disponiveis (barbearia_id, dia_semana, coalesce(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- AGENDAMENTOS --------------------------------------------------------------
-- Corrige: nomes de coluna únicos (valor_total, duracao_minutos — nunca
-- valor_cobrado/duracao_total), sem coluna estudio_id duplicada. Coluna
-- urgencia adicionada para parar de descartar esse campo do formulário do
-- painel. profissional_id nulo só é permitido para registros criados
-- manualmente no painel; todo agendamento vindo do site (via RPC) sempre
-- grava um profissional concreto, para que a constraint de exclusão abaixo
-- elimine o double-booking de verdade, no banco.
create table if not exists public.agendamentos (
  id                  uuid primary key default gen_random_uuid(),
  barbearia_id        uuid not null references public.barbearias(id) on delete cascade,
  cliente_id          uuid references public.clientes(id) on delete set null,
  cliente_nome        text not null,
  cliente_telefone    text not null,
  cliente_email       text,
  profissional_id     uuid references public.profissionais(id) on delete set null,
  servico_nome        text,                       -- nomes concatenados, para exibição rápida sem join
  data_hora_inicio    timestamptz not null,
  data_hora_fim       timestamptz not null,
  valor_total         numeric(10,2) not null default 0,
  duracao_minutos     integer not null default 0,
  status              text not null default 'pendente' check (status in ('pendente','confirmado','concluido','cancelado')),
  forma_pagamento     text not null default 'presencial' check (forma_pagamento in ('presencial','pix')),
  canal_confirmacao   text default 'whatsapp',
  urgencia            text check (urgencia in ('baixa','media','alta')),
  observacoes         text,
  imagens             text[],
  origem              text not null default 'site' check (origem in ('site','painel')),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  -- Corrige: double-booking e falsos "horário indisponível" — a checagem
  -- deixa de ser só em JS e passa a ser garantida pelo próprio banco.
  exclude using gist (
    profissional_id with =,
    tstzrange(data_hora_inicio, data_hora_fim, '[)') with &&
  ) where (status <> 'cancelado' and profissional_id is not null)
);

-- AGENDAMENTO_SERVICOS --------------------------------------------------
create table if not exists public.agendamento_servicos (
  id                uuid primary key default gen_random_uuid(),
  agendamento_id    uuid not null references public.agendamentos(id) on delete cascade,
  servico_id        uuid references public.servicos(id) on delete set null,
  nome_servico      text not null,
  preco             numeric(10,2) not null,
  duracao_minutos   integer not null
);

-- ANOTACOES -----------------------------------------------------------------
-- Corrige: cor hoje é salva como classe CSS Tailwind inteira no banco
-- (acoplamento com o front). Agora é um enum semântico; a tradução para
-- classe CSS fica no código do front, não no banco.
create table if not exists public.anotacoes (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  perfil_id    uuid references public.perfis(id) on delete set null,
  conteudo     text not null,
  cor          text not null default 'amarelo' check (cor in ('amarelo','azul','verde','rosa','roxo','laranja')),
  criado_em    timestamptz not null default now()
);

-- NOTIFICACOES ----------------------------------------------------------
create table if not exists public.notificacoes (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  perfil_id    uuid references public.perfis(id) on delete set null,
  titulo       text not null,
  mensagem     text not null,
  tipo         text not null default 'info' check (tipo in ('info','sucesso','alerta')),
  lida         boolean not null default false,
  criado_em    timestamptz not null default now()
);

-- FINANCEIRO_TRANSACOES ------------------------------------------------
-- Corrige: hoje esta tabela existe mas nunca é lida — FinanceScreen calcula
-- tudo em memória e perde as saídas ao trocar de tela. A partir de agora,
-- entradas são geradas automaticamente ao concluir um agendamento (trigger
-- abaixo) e saídas manuais são gravadas aqui de verdade.
create table if not exists public.financeiro_transacoes (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null references public.barbearias(id) on delete cascade,
  tipo           text not null check (tipo in ('entrada','saida')),
  categoria      text not null,
  descricao      text,
  valor          numeric(10,2) not null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  criado_em      timestamptz not null default now()
);

-- ESTOQUE_ITENS -----------------------------------------------------------
create table if not exists public.estoque_itens (
  id                  uuid primary key default gen_random_uuid(),
  barbearia_id        uuid not null references public.barbearias(id) on delete cascade,
  item                text not null,
  categoria           text,
  quantidade          integer not null default 0,
  minimo_alerta       integer default 5,
  preco_unitario      numeric(10,2),
  data_ultima_compra  date,
  criado_em           timestamptz not null default now()
);

-- CHATS / CHAT_MENSAGENS -------------------------------------------------
-- Corrige: hoje 100% mock no front, tabelas existem mas nunca são usadas.
-- Ficam prontas aqui; a integração real do ChatScreen está fora do escopo
-- deste prompt (ver seção 7).
create table if not exists public.chats (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  tipo          text check (tipo in ('equipe','suporte')),
  titulo        text,
  criado_em     timestamptz not null default now()
);

create table if not exists public.chat_mensagens (
  id            uuid primary key default gen_random_uuid(),
  chat_id       uuid not null references public.chats(id) on delete cascade,
  autor_id      uuid references public.perfis(id) on delete set null,
  conteudo      text,
  tipo          text not null default 'texto' check (tipo in ('texto','arquivo')),
  url_arquivo   text,
  criado_em     timestamptz not null default now()
);

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================

create index if not exists idx_agendamentos_barbearia_data on public.agendamentos(barbearia_id, data_hora_inicio);
create index if not exists idx_agendamentos_profissional_data on public.agendamentos(profissional_id, data_hora_inicio);
create index if not exists idx_clientes_barbearia on public.clientes(barbearia_id);
create index if not exists idx_profissionais_barbearia on public.profissionais(barbearia_id);
create index if not exists idx_servicos_barbearia on public.servicos(barbearia_id);
create index if not exists idx_anotacoes_barbearia on public.anotacoes(barbearia_id);
create index if not exists idx_notificacoes_barbearia on public.notificacoes(barbearia_id);
create index if not exists idx_financeiro_barbearia on public.financeiro_transacoes(barbearia_id);
create index if not exists idx_estoque_barbearia on public.estoque_itens(barbearia_id);
create index if not exists idx_chats_barbearia on public.chats(barbearia_id);
create index if not exists idx_chat_mensagens_chat on public.chat_mensagens(chat_id);
create index if not exists idx_perfis_barbearia on public.perfis(barbearia_id);

-- ============================================================================
-- 3. FUNÇÃO CENTRAL DE RESOLUÇÃO DE TENANT
-- ============================================================================

create or replace function public.barbearia_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select barbearia_id from public.perfis where id = auth.uid()
$$;

-- ============================================================================
-- 4. CRIAÇÃO ATÔMICA DE BARBEARIA + PERFIL + PROFISSIONAL PADRÃO
-- ============================================================================
-- Corrige a causa raiz documentada: hoje existem DUAS lógicas divergentes
-- (checagem idempotente no JS `ensureUserBarbearia`, e um trigger SQL antigo
-- sem checagem). Daqui pra frente, esta função é a ÚNICA fonte de verdade,
-- roda dentro da mesma transação do signup, e é protegida pela constraint
-- UNIQUE em barbearias.dono_id.

create or replace function public.lidar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barbearia_id uuid;
  v_nome_barbearia text;
  v_slug_base text;
  v_slug text;
  v_sufixo int := 0;
begin
  v_nome_barbearia := coalesce(nullif(trim(new.raw_user_meta_data->>'nome_barbearia'), ''), 'Minha Barbearia');
  v_slug_base := lower(regexp_replace(v_nome_barbearia, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug_base;

  while exists (select 1 from public.barbearias where slug = v_slug) loop
    v_sufixo := v_sufixo + 1;
    v_slug := v_slug_base || '-' || v_sufixo;
  end loop;

  insert into public.barbearias (dono_id, nome, slug, email_contato)
  values (new.id, v_nome_barbearia, v_slug, new.email)
  on conflict (dono_id) do nothing
  returning id into v_barbearia_id;

  if v_barbearia_id is null then
    select id into v_barbearia_id from public.barbearias where dono_id = new.id;
  end if;

  insert into public.perfis (id, barbearia_id, nome, email, telefone, papel)
  values (
    new.id,
    v_barbearia_id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    'dono'
  )
  on conflict (id) do nothing;

  -- Garante que sempre existe pelo menos um profissional real (evita o bug
  -- de "Qualquer Barbeiro" gerar profissional_id inválido quando não há
  -- staff cadastrado ainda).
  insert into public.profissionais (barbearia_id, nome, especialidade, ativo)
  select v_barbearia_id, coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), 'Profissional'), 'Geral', true
  where not exists (select 1 from public.profissionais where barbearia_id = v_barbearia_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.lidar_novo_usuario();

-- ============================================================================
-- 5. RPCs PÚBLICAS (usadas pelo SITE)
-- ============================================================================

-- Substitui a leitura direta de `barbearias` pelo visitante anônimo por uma
-- função que expõe só os campos públicos necessários.
create or replace function public.buscar_barbearia_publica(p_slug text)
returns table(id uuid, nome text, slug text, logo_url text, endereco text, telefone text)
language sql
stable
security definer
set search_path = public
as $$
  select id, nome, slug, logo_url, endereco, telefone
  from public.barbearias
  where slug = p_slug and ativo = true
$$;

-- Corrige: horários hoje são uma lista fixa no JS, ignorando esta
-- configuração. Esta função gera os slots reais a partir de
-- `horarios_disponiveis` e já cruza com agendamentos existentes.
create or replace function public.buscar_horarios_disponiveis(
  p_barbearia_id uuid,
  p_data date,
  p_profissional_id uuid default null
)
returns table(horario time, disponivel boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dia_semana int := extract(dow from p_data);
begin
  return query
  with config as (
    select hora_inicio, hora_fim, intervalo_minutos
    from public.horarios_disponiveis
    where barbearia_id = p_barbearia_id
      and dia_semana = v_dia_semana
      and ativo = true
      and (profissional_id = p_profissional_id or (p_profissional_id is null and profissional_id is null))
    order by profissional_id nulls last
    limit 1
  ),
  slots as (
    select generate_series(
      (p_data + hora_inicio)::timestamptz,
      (p_data + hora_fim)::timestamptz - make_interval(mins => intervalo_minutos),
      make_interval(mins => intervalo_minutos)
    ) as inicio,
    intervalo_minutos
    from config
  )
  select
    s.inicio::time as horario,
    not exists (
      select 1 from public.agendamentos a
      where a.barbearia_id = p_barbearia_id
        and a.status <> 'cancelado'
        and (p_profissional_id is null or a.profissional_id = p_profissional_id)
        and tstzrange(a.data_hora_inicio, a.data_hora_fim, '[)') && tstzrange(s.inicio, s.inicio + make_interval(mins => s.intervalo_minutos), '[)')
    ) as disponivel
  from slots s
  order by s.inicio;
end;
$$;

-- Corrige: as 3 rotas de gravação divergentes (RPC, insert direto, modo
-- offline). Esta função passa a ser o ÚNICO caminho de gravação de
-- agendamento público. Assinatura compatível com o payload já enviado
-- hoje pelo site (ver mapeamento.md, seção 4.3) — o front não precisa
-- mudar a forma como chama esta RPC.
create or replace function public.criar_agendamento_publico(
  p_barbearia_id uuid,
  p_cliente_nome text,
  p_cliente_telefone text,
  p_data_hora_inicio timestamptz,
  p_servicos jsonb,
  p_cliente_email text default null,
  p_profissional_id uuid default null,
  p_forma_pagamento text default 'presencial',
  p_imagens text[] default null,
  p_observacoes text default null,
  p_canal_confirmacao text default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_duracao_total int;
  v_valor_total numeric(10,2);
  v_servico_nome text;
  v_data_hora_fim timestamptz;
  v_profissional_id uuid;
  v_agendamento_id uuid;
  v_servico jsonb;
  v_resultado jsonb;
begin
  if not exists (select 1 from public.barbearias where id = p_barbearia_id and ativo = true) then
    raise exception 'BARBEARIA_INVALIDA';
  end if;

  select
    coalesce(sum((s->>'duracao_minutos')::int), 0),
    coalesce(sum((s->>'preco')::numeric), 0),
    string_agg(s->>'nome_servico', ' + ')
  into v_duracao_total, v_valor_total, v_servico_nome
  from jsonb_array_elements(p_servicos) s;

  if v_duracao_total <= 0 then
    raise exception 'SERVICOS_INVALIDOS';
  end if;

  v_data_hora_fim := p_data_hora_inicio + make_interval(mins => v_duracao_total);

  -- Resolve "Qualquer Barbeiro" para um profissional concreto ANTES do
  -- insert, para que a constraint de exclusão sempre proteja o slot.
  if p_profissional_id is not null then
    v_profissional_id := p_profissional_id;
  else
    select id into v_profissional_id
    from public.profissionais
    where barbearia_id = p_barbearia_id and ativo = true
      and id not in (
        select coalesce(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid)
        from public.agendamentos
        where barbearia_id = p_barbearia_id
          and status <> 'cancelado'
          and tstzrange(data_hora_inicio, data_hora_fim, '[)') && tstzrange(p_data_hora_inicio, v_data_hora_fim, '[)')
      )
    order by id
    limit 1;

    if v_profissional_id is null then
      raise exception 'HORARIO_INDISPONIVEL';
    end if;
  end if;

  insert into public.clientes (barbearia_id, nome, telefone, email)
  values (p_barbearia_id, p_cliente_nome, p_cliente_telefone, p_cliente_email)
  on conflict (barbearia_id, telefone) do update
    set nome = excluded.nome, email = coalesce(excluded.email, public.clientes.email), atualizado_em = now()
  returning id into v_cliente_id;

  begin
    insert into public.agendamentos (
      barbearia_id, cliente_id, cliente_nome, cliente_telefone, cliente_email,
      profissional_id, servico_nome, data_hora_inicio, data_hora_fim, valor_total, duracao_minutos,
      status, forma_pagamento, canal_confirmacao, observacoes, imagens, origem
    ) values (
      p_barbearia_id, v_cliente_id, p_cliente_nome, p_cliente_telefone, p_cliente_email,
      v_profissional_id, v_servico_nome, p_data_hora_inicio, v_data_hora_fim, v_valor_total, v_duracao_total,
      'pendente', p_forma_pagamento, p_canal_confirmacao, p_observacoes, p_imagens, 'site'
    )
    returning id into v_agendamento_id;
  exception
    when exclusion_violation then
      raise exception 'HORARIO_INDISPONIVEL';
  end;

  for v_servico in select * from jsonb_array_elements(p_servicos) loop
    insert into public.agendamento_servicos (agendamento_id, servico_id, nome_servico, preco, duracao_minutos)
    values (
      v_agendamento_id,
      nullif(v_servico->>'servico_id','')::uuid,
      v_servico->>'nome_servico',
      (v_servico->>'preco')::numeric,
      (v_servico->>'duracao_minutos')::int
    );
  end loop;

  insert into public.notificacoes (barbearia_id, titulo, mensagem, tipo)
  values (p_barbearia_id, 'Novo agendamento', p_cliente_nome || ' agendou para ' || to_char(p_data_hora_inicio, 'DD/MM HH24:MI'), 'info');

  select to_jsonb(a.*) into v_resultado from public.agendamentos a where id = v_agendamento_id;
  return v_resultado;
end;
$$;

-- Preparada para uso futuro: construção.md pede que o cliente possa editar
-- ou cancelar um agendamento antes de finalizar, mas isso ainda não existe
-- na interface do site (ver seção 7 — fora de escopo). A função já existe
-- aqui para quando essa tela for construída.
create or replace function public.cancelar_agendamento_publico(
  p_agendamento_id uuid,
  p_cliente_telefone text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atualizado boolean;
begin
  update public.agendamentos
  set status = 'cancelado', atualizado_em = now()
  where id = p_agendamento_id
    and cliente_telefone = p_cliente_telefone
    and status = 'pendente';

  get diagnostics v_atualizado = row_count;
  return v_atualizado > 0;
end;
$$;

grant execute on function public.buscar_barbearia_publica(text) to anon, authenticated;
grant execute on function public.buscar_horarios_disponiveis(uuid, date, uuid) to anon, authenticated;
grant execute on function public.criar_agendamento_publico(uuid, text, text, timestamptz, jsonb, text, uuid, text, text[], text, text) to anon, authenticated;
grant execute on function public.cancelar_agendamento_publico(uuid, text) to anon, authenticated;

-- ============================================================================
-- 6. RECEITA AUTOMÁTICA AO CONCLUIR AGENDAMENTO
-- ============================================================================
-- Corrige: FinanceScreen hoje calcula "entradas" em memória filtrando
-- appointments; a tabela financeiro_transacoes nunca é escrita. A partir de
-- agora, concluir um agendamento gera a entrada financeira de verdade.

create or replace function public.registrar_receita_ao_concluir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    insert into public.financeiro_transacoes (barbearia_id, tipo, categoria, descricao, valor, agendamento_id)
    values (new.barbearia_id, 'entrada', 'Serviço', new.cliente_nome || coalesce(' - ' || new.servico_nome, ''), new.valor_total, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_agendamento_concluido on public.agendamentos;
create trigger on_agendamento_concluido
  after update on public.agendamentos
  for each row execute function public.registrar_receita_ao_concluir();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

alter table public.barbearias enable row level security;
alter table public.perfis enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos enable row level security;
alter table public.clientes enable row level security;
alter table public.horarios_disponiveis enable row level security;
alter table public.agendamentos enable row level security;
alter table public.agendamento_servicos enable row level security;
alter table public.anotacoes enable row level security;
alter table public.notificacoes enable row level security;
alter table public.financeiro_transacoes enable row level security;
alter table public.estoque_itens enable row level security;
alter table public.chats enable row level security;
alter table public.chat_mensagens enable row level security;

drop policy if exists "dono ve a propria barbearia" on public.barbearias;
create policy "dono ve a propria barbearia" on public.barbearias
  for select using (dono_id = auth.uid());
drop policy if exists "dono edita a propria barbearia" on public.barbearias;
create policy "dono edita a propria barbearia" on public.barbearias
  for update using (dono_id = auth.uid());

drop policy if exists "usuario ve o proprio perfil" on public.perfis;
create policy "usuario ve o proprio perfil" on public.perfis
  for select using (id = auth.uid());
drop policy if exists "usuario edita o proprio perfil" on public.perfis;
create policy "usuario edita o proprio perfil" on public.perfis
  for update using (id = auth.uid());

drop policy if exists "isolamento profissionais" on public.profissionais;
create policy "isolamento profissionais" on public.profissionais
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento servicos" on public.servicos;
create policy "isolamento servicos" on public.servicos
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento clientes" on public.clientes;
create policy "isolamento clientes" on public.clientes
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento horarios" on public.horarios_disponiveis;
create policy "isolamento horarios" on public.horarios_disponiveis
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento agendamentos" on public.agendamentos;
create policy "isolamento agendamentos" on public.agendamentos
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento anotacoes" on public.anotacoes;
create policy "isolamento anotacoes" on public.anotacoes
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento notificacoes" on public.notificacoes;
create policy "isolamento notificacoes" on public.notificacoes
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento financeiro" on public.financeiro_transacoes;
create policy "isolamento financeiro" on public.financeiro_transacoes
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento estoque" on public.estoque_itens;
create policy "isolamento estoque" on public.estoque_itens
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento chats" on public.chats;
create policy "isolamento chats" on public.chats
  for all using (barbearia_id = public.barbearia_atual()) with check (barbearia_id = public.barbearia_atual());

drop policy if exists "isolamento agendamento_servicos" on public.agendamento_servicos;
create policy "isolamento agendamento_servicos" on public.agendamento_servicos
  for all using (
    exists (select 1 from public.agendamentos a where a.id = agendamento_id and a.barbearia_id = public.barbearia_atual())
  );

drop policy if exists "isolamento chat_mensagens" on public.chat_mensagens;
create policy "isolamento chat_mensagens" on public.chat_mensagens
  for all using (
    exists (select 1 from public.chats c where c.id = chat_id and c.barbearia_id = public.barbearia_atual())
  );
