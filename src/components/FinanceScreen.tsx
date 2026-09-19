import React, { useState, useMemo } from 'react';
import { type Appointment } from '../lib/supabase';
import { useFinance, type FinanceTransaction } from '../hooks/useFinance';
import { 
  isToday, 
  isSameWeek, 
  isSameMonth, 
  isSameYear, 
  parseISO 
} from 'date-fns';

interface FinanceScreenProps {
  appointments: Appointment[];
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ appointments }) => {
  const { 
    transactions: dbTransactions, 
    totalIncome: dbTotalIncome, 
    totalExpense: dbTotalExpense, 
    balance: dbBalance, 
    addTransaction 
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  // Form State
  const [newType, setNewType] = useState<'income' | 'expense'>('income');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Fallback calculado em memória apenas se não houver registros no banco
  const fallbackTransactions: FinanceTransaction[] = useMemo(() => {
    return appointments
      .filter(a => a.status === 'concluido' || a.status === 'confirmado')
      .map(a => ({
        id: a.id,
        barbearia_id: a.barbearia_id || '',
        tipo: 'entrada',
        type: 'income',
        categoria: a.servico_nome || 'Serviço',
        category: a.servico_nome || 'Serviço',
        descricao: `Agendamento: ${a.cliente_nome || 'Cliente'}`,
        description: `Agendamento: ${a.cliente_nome || 'Cliente'}`,
        valor: Number(a.valor_total ?? a.valor_cobrado ?? 0),
        amount: Number(a.valor_total ?? a.valor_cobrado ?? 0),
        criado_em: a.data_hora_inicio || new Date().toISOString(),
        date: (a.data_hora_inicio || new Date().toISOString()).split('T')[0]
      }));
  }, [appointments]);

  const rawTransactions = dbTransactions.length > 0 ? dbTransactions : fallbackTransactions;

  // Filtragem por Período e Tipo
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return rawTransactions.filter(t => {
      // Filtro de tipo
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Filtro de data
      if (periodFilter === 'all') return true;

      const dateStr = t.date || t.criado_em;
      if (!dateStr) return true;

      try {
        const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        if (isNaN(d.getTime())) return true;

        if (periodFilter === 'today') return isToday(d);
        if (periodFilter === 'week') return isSameWeek(d, now, { weekStartsOn: 1 });
        if (periodFilter === 'month') return isSameMonth(d, now);
        if (periodFilter === 'year') return isSameYear(d, now);
      } catch {
        return true;
      }
      return true;
    });
  }, [rawTransactions, periodFilter, typeFilter]);

  // Cálculos consolidados para o período filtrado
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  const balance = totalIncome - totalExpense;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newAmount) return;

    try {
      await addTransaction({
        type: newType,
        category: newCategory,
        description: newDescription,
        amount: parseFloat(newAmount),
      });
      setShowAddModal(false);
      setNewCategory('');
      setNewDescription('');
      setNewAmount('');
    } catch (err: any) {
      console.error('Erro ao registrar transação:', err);
      alert(`Erro ao registrar transação: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
       {/* Top Filter Bar */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-surface p-4 rounded-2xl border border-border-main shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-text-main">Fluxo Financeiro</h2>
            <p className="text-xs text-text-secondary">Entradas, saídas e faturamento detalhado</p>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-bg-base rounded-xl border border-border-main overflow-x-auto max-w-full">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'year', label: 'Este Ano' },
              { id: 'all', label: 'Tudo' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  periodFilter === p.id
                    ? 'bg-primary text-primary-text shadow-sm'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
       </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income Card */}
          <div className="bg-bg-surface p-6 rounded-3xl shadow-sm border border-border-main flex items-center gap-4 transition-colors duration-200">
            <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center text-success">
               <span className="material-icons-outlined text-2xl">arrow_downward</span>
            </div>
            <div>
               <p className="text-text-secondary text-xs font-medium">Total de Entradas</p>
               <h3 className="text-2xl font-bold text-text-main">
                 R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h3>
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-bg-surface p-6 rounded-3xl shadow-sm border border-border-main flex items-center gap-4 transition-colors duration-200">
            <div className="w-12 h-12 rounded-2xl bg-danger/15 flex items-center justify-center text-danger">
               <span className="material-icons-outlined text-2xl">arrow_upward</span>
            </div>
            <div>
               <p className="text-text-secondary text-xs font-medium">Total de Saídas</p>
               <h3 className="text-2xl font-bold text-text-main">
                 R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h3>
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-bg-surface p-6 rounded-3xl shadow-sm border border-border-main flex items-center gap-4 transition-colors duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${balance >= 0 ? 'bg-info/15 text-info' : 'bg-danger/15 text-danger'}`}>
               <span className="material-icons-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
               <p className="text-text-secondary text-xs font-medium">Saldo do Período</p>
               <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                 R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h3>
            </div>
          </div>
       </div>

       {/* Actions & Filters */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
             <h3 className="text-lg font-bold text-text-main">Lançamentos</h3>
             <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
               {filteredTransactions.length} registros
             </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
             {/* Type Pills */}
             <div className="flex items-center gap-1 p-1 bg-bg-surface border border-border-main rounded-xl">
                {(['all', 'income', 'expense'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTypeFilter(tp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      typeFilter === tp 
                        ? 'bg-primary text-primary-text shadow-sm' 
                        : 'text-text-secondary hover:text-text-main'
                    }`}
                  >
                    {tp === 'all' ? 'Todos' : tp === 'income' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
             </div>

             <button 
               onClick={() => setShowAddModal(true)}
               className="bg-primary hover:bg-primary/90 text-primary-text px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-semibold text-xs shadow-sm shadow-primary/20 cursor-pointer"
             >
               <span className="material-icons-outlined text-sm">add</span> Nova Transação
             </button>
          </div>
       </div>

       {/* Transactions List */}
       <div className="bg-bg-surface rounded-3xl shadow-sm border border-border-main overflow-hidden flex-1 transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-bg-base">
                <tr className="text-xs uppercase tracking-wider text-text-secondary border-b border-border-main">
                  <th className="p-4 font-semibold">Tipo</th>
                  <th className="p-4 font-semibold">Categoria</th>
                  <th className="p-4 font-semibold">Descrição</th>
                  <th className="p-4 font-semibold">Data</th>
                  <th className="p-4 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-border-main">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary text-xs">
                      Nenhuma transação encontrada para este período.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-bg-elevated transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${t.type === 'income' ? 'bg-success/10 text-success border-success/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
                          {t.type === 'income' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="p-4 text-text-main font-semibold">{t.category}</td>
                      <td className="p-4 text-text-secondary">{t.description}</td>
                      <td className="p-4 text-text-secondary font-medium">
                        {t.date ? new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className={`p-4 text-right font-bold text-sm ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
       </div>

       {/* Add Transaction Modal */}
       {showAddModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-bg-surface rounded-3xl p-6 w-full max-w-md shadow-xl border border-border-main animate-in fade-in zoom-in duration-200">
             <h3 className="text-xl font-bold text-text-main mb-4">Nova Transação</h3>
             <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
               
               {/* Type Selection */}
               <div className="flex gap-2 p-1 bg-bg-base rounded-xl">
                 <button 
                   type="button"
                   onClick={() => setNewType('income')}
                   className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${newType === 'income' ? 'bg-bg-surface text-success shadow-sm' : 'text-text-secondary hover:text-text-main'}`}
                 >
                   Entrada
                 </button>
                 <button 
                   type="button"
                   onClick={() => setNewType('expense')}
                   className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${newType === 'expense' ? 'bg-bg-surface text-danger shadow-sm' : 'text-text-secondary hover:text-text-main'}`}
                 >
                   Saída
                 </button>
               </div>

               <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Valor (R$)</label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={newAmount}
                   onChange={(e) => setNewAmount(e.target.value)}
                   className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm text-sm"
                   placeholder="0.00"
                   required
                 />
               </div>

               <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Categoria</label>
                 <input 
                   type="text" 
                   value={newCategory}
                   onChange={(e) => setNewCategory(e.target.value)}
                   className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm text-sm"
                   placeholder="Ex: Corte, Produto, Aluguel, Luz"
                   required
                 />
               </div>

               <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Descrição (Opcional)</label>
                 <input 
                   type="text" 
                   value={newDescription}
                   onChange={(e) => setNewDescription(e.target.value)}
                   className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm text-sm"
                   placeholder="Ex: Pagamento referente a..."
                 />
               </div>

               <div className="flex gap-3 justify-end mt-4">
                 <button 
                   type="button"
                   onClick={() => setShowAddModal(false)}
                   className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-main text-xs font-semibold transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit"
                   className="px-5 py-2 rounded-xl bg-primary text-primary-text text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                 >
                   Salvar Transação
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  );
};
