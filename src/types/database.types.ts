export type UserRole = 'dono' | 'barbeiro' | 'recepcionista' | 'admin' | 'cliente';
export type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
export type FormPagamento = 'presencial' | 'pix';
export type Urgencia = 'baixa' | 'media' | 'alta';
export type OrigemAgendamento = 'site' | 'painel';
export type CorAnotacao = 'amarelo' | 'azul' | 'verde' | 'rosa' | 'roxo' | 'laranja';
export type TipoNotificacao = 'info' | 'sucesso' | 'alerta';
export type TipoTransacao = 'entrada' | 'saida';

export interface Barbearia {
  id: string;
  dono_id: string;
  nome: string;
  slug: string;
  telefone?: string | null;
  email_contato?: string | null;
  logo_url?: string | null;
  endereco?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Profile {
  id: string;
  barbearia_id: string;
  nome: string | null;
  email: string | null;
  telefone?: string | null;
  papel: 'dono' | 'barbeiro' | 'recepcionista';
  avatar_url?: string | null;
  ativo: boolean;
  criado_em: string;
  // Aliases legados para compatibilidade com a interface visual
  name?: string;
  role?: string;
  phone?: string | null;
  created_at?: string;
}

export interface Profissional {
  id: string;
  barbearia_id: string;
  perfil_id?: string | null;
  nome: string;
  especialidade?: string | null;
  avatar_url?: string | null;
  avaliacao_media: number;
  ativo: boolean;
  criado_em: string;
  // Aliases legados para componentes
  name?: string;
  cargo?: string | null;
  active?: boolean;
  nota_avaliacao?: number;
  profile?: Profile;
  perfil?: Profile;
}

export type StaffMember = Profissional;

export interface Servico {
  id: string;
  barbearia_id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
  criado_em: string;
  // Aliases
  price?: number;
  duration?: number;
}

export interface Cliente {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  criado_em: string;
  atualizado_em: string;
  // Aliases calculados
  total_gasto?: number;
  qtd_agendamentos?: number;
}

export interface HorarioDisponivel {
  id: string;
  barbearia_id: string;
  profissional_id?: string | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  intervalo_minutos: number;
  ativo: boolean;
}

export interface Appointment {
  id: string;
  barbearia_id: string;
  cliente_id?: string | null;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email?: string | null;
  profissional_id?: string | null;
  servico_nome?: string | null;
  data_hora_inicio: string;
  data_hora_fim: string;
  valor_total: number;
  duracao_minutos: number;
  status: AppointmentStatus;
  forma_pagamento: FormPagamento;
  canal_confirmacao?: string | null;
  urgencia?: Urgencia | null;
  observacoes?: string | null;
  imagens?: string[] | null;
  origem: OrigemAgendamento;
  criado_em: string;
  atualizado_em: string;
  
  // Aliases legados para componentes
  valor_cobrado?: number;
  duracao_total_minutos?: number;
  created_at?: string;
  metodo_pagamento?: string;
  servico_id?: string;
  servico?: { id?: string; nome?: string; preco?: number };
}

export interface AgendamentoServico {
  id: string;
  agendamento_id: string;
  servico_id?: string | null;
  nome_servico: string;
  preco: number;
  duracao_minutos: number;
}

export interface Anotacao {
  id: string;
  barbearia_id: string;
  perfil_id?: string | null;
  conteudo: string;
  cor: CorAnotacao;
  criado_em: string;
  // Aliases legados
  content?: string;
  color?: string;
  created_at?: string;
  user_id?: string;
}

export interface Notificacao {
  id: string;
  barbearia_id: string;
  perfil_id?: string | null;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criado_em: string;
  // Aliases legados
  title?: string;
  content?: string;
  body?: string;
  type?: 'success' | 'warning' | 'info' | 'alerta' | 'sucesso' | string;
  read?: boolean;
  created_at?: string;
}

export interface FinanceiroTransacao {
  id: string;
  barbearia_id: string;
  tipo: TipoTransacao;
  categoria: string;
  descricao?: string | null;
  valor: number;
  agendamento_id?: string | null;
  criado_em: string;
  // Aliases legados
  amount?: number;
  date?: string;
  description?: string;
  type?: 'income' | 'expense';
}

export interface EstoqueItem {
  id: string;
  barbearia_id: string;
  item: string;
  categoria?: string | null;
  quantidade: number;
  minimo_alerta?: number | null;
  preco_unitario?: number | null;
  data_ultima_compra?: string | null;
  criado_em: string;
  // Aliases legados
  name?: string;
  category?: string;
  quantity?: number;
  min_quantity?: number;
  price_per_unit?: number;
  last_purchase_date?: string | null;
}

export interface Chat {
  id: string;
  barbearia_id: string;
  tipo?: 'equipe' | 'suporte' | null;
  titulo?: string | null;
  criado_em: string;
}

export interface ChatMensagem {
  id: string;
  chat_id: string;
  autor_id?: string | null;
  conteudo?: string | null;
  tipo: 'texto' | 'arquivo';
  url_arquivo?: string | null;
  criado_em: string;
}
