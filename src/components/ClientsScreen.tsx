import React, { useState, useMemo, useRef } from 'react';
import { type Appointment } from '../lib/supabase';
import { useClients } from '../hooks/useClients';
import * as XLSX from 'xlsx';

interface ClientsScreenProps {
  appointments: Appointment[];
  updateStatus: (id: string, status: any) => Promise<void>;
}

interface ClientData {
  email: string;
  name: string;
  phone: string;
  totalSpent: number;
  appointmentCount: number;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({ appointments, updateStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { clients: dbClients, loading: clientsLoading } = useClients();

  const clientsData = useMemo(() => {
    // 1. Prioriza a lista real da tabela clientes vinda do banco via useClients
    if (dbClients && dbClients.length > 0) {
      return dbClients.map(c => ({
        email: c.email || 'N/A',
        name: c.name || 'N/A',
        phone: c.phone || 'N/A',
        totalSpent: c.totalSpent || 0,
        appointmentCount: c.appointmentCount || 0
      }));
    }

    // 2. Fallback de segurança a partir dos agendamentos em memória caso a tabela esteja vazia
    const clientsMap = new Map<string, ClientData>();
    appointments.forEach(app => {
      const key = app.cliente_email || app.cliente_telefone || app.cliente_nome;
      if (!key) return;

      const existing = clientsMap.get(key);
      if (existing) {
        existing.totalSpent += Number(app.valor_total ?? app.valor_cobrado ?? 0);
        existing.appointmentCount += 1;
      } else {
        clientsMap.set(key, {
          email: app.cliente_email || 'N/A',
          name: app.cliente_nome || 'N/A',
          phone: app.cliente_telefone || 'N/A',
          totalSpent: Number(app.valor_total ?? app.valor_cobrado ?? 0),
          appointmentCount: 1
        });
      }
    });

    return Array.from(clientsMap.values());
  }, [dbClients, appointments]);

  const filteredClients = clientsData.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const handleExportExcel = () => {
    // Preparar dados para exportação
    const exportData = clientsData.map(client => ({
      'Nome': client.name,
      'E-mail': client.email,
      'Telefone': client.phone,
      'Agendamentos': client.appointmentCount,
      'Valor Gasto (R$)': client.totalSpent.toFixed(2)
    }));

    // Criar planilha e pasta de trabalho
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    // Gerar arquivo e baixar
    XLSX.writeFile(workbook, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (jsonData && jsonData.length > 0) {
          alert(`${jsonData.length} registros encontrados na planilha. A importação direta de clientes será integrada em breve.`);
        } else {
          alert('A planilha está vazia ou em formato inválido.');
        }
      } catch (error) {
        console.error('Erro ao importar Excel:', error);
        alert('Erro ao ler o arquivo Excel. Certifique-se de que é um arquivo .xlsx ou .xls válido.');
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-text-main">Clientes</h1>
        <p className="text-text-secondary">Histórico completo de clientes e valor total gasto.</p>
      </div>

      <div className="bg-bg-surface rounded-3xl p-6 shadow-sm border border-border-main flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
            <input 
              type="text" 
              placeholder="Buscar cliente por nome, email ou telefone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-bg-elevated border border-border-main hover:bg-bg-surface text-text-main px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
              title="Importar Excel"
            >
              <span className="material-icons-outlined text-sm">upload_file</span> Importar
            </button>
            <button 
              onClick={handleExportExcel}
              className="bg-primary hover:bg-primary-hover text-primary-text px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm shadow-primary/20 text-sm"
              title="Exportar Excel"
            >
              <span className="material-icons-outlined text-sm">download</span> Exportar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-main text-text-secondary text-sm bg-bg-base">
                <th className="py-3 font-medium px-4 rounded-tl-xl">Nome</th>
                <th className="py-3 font-medium px-4">E-mail (Gmail)</th>
                <th className="py-3 font-medium px-4">Número</th>
                <th className="py-3 font-medium px-4 text-right">Agendamentos</th>
                <th className="py-3 font-medium px-4 text-right rounded-tr-xl">Valor Gasto</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client, index) => (
                  <tr key={client.email || client.phone || index} className="border-b border-border-main/50 hover:bg-bg-elevated transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-text-main">{client.name}</div>
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      {client.email}
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      {client.phone}
                    </td>
                    <td className="py-4 px-4 text-right text-text-secondary">
                      {client.appointmentCount}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-text-main">
                      R$ {client.totalSpent.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-secondary">
                    {clientsLoading ? 'Carregando clientes...' : 'Nenhum cliente encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
