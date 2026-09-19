import React, { useState, useEffect, useRef } from 'react';
import { useInventory, type InventoryItem } from '../hooks/useInventory';

export const InventoryScreen: React.FC = () => {
  const { inventory, loading, addItem, updateQuantity } = useInventory();
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form state
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Products' as InventoryItem['category'],
    quantity: 0,
    min_quantity: 0,
    price_per_unit: 0
  });

  const lowStockItems = inventory.filter(item => item.quantity <= item.min_quantity);

  useEffect(() => {
    if (lowStockItems.length > 0) {
      setShowNotification(true);
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    } else {
      setShowNotification(false);
    }
  }, [inventory]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity < 0) return;

    try {
      await addItem(newItem);
      setIsAdding(false);
      setNewItem({ name: '', category: 'Products', quantity: 0, min_quantity: 0, price_per_unit: 0 });
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    try {
      await updateQuantity(id, delta);
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const totalValue = inventory.reduce((acc, curr) => acc + (curr.quantity * curr.price_per_unit), 0);

  return (
    <div className="flex flex-col h-full gap-6">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Estoque & Mercadorias</h2>
          <p className="text-text-secondary">Gerencie seus equipamentos e produtos</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary-hover text-primary-text px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-primary/20"
        >
          <span className="material-icons-outlined">add_shopping_cart</span> Comprar Mercadoria
        </button>
      </div>

      {/* Low Stock Alert Banner */}
      {showNotification && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top duration-300">
          <div className="w-10 h-10 rounded-full bg-danger flex items-center justify-center text-white animate-bounce">
            <span className="material-icons-outlined">notifications_active</span>
          </div>
          <div className="flex-1">
            <h4 className="text-danger font-bold">Aviso de Estoque Baixo!</h4>
            <p className="text-sm text-text-main opacity-80">
              Existem {lowStockItems.length} itens que precisam de reposição imediata.
            </p>
          </div>
          <div className="flex gap-2">
            {lowStockItems.slice(0, 2).map(item => (
              <span key={item.id} className="px-3 py-1 bg-danger/20 text-danger rounded-lg text-xs font-bold uppercase tracking-wider">
                {item.name}
              </span>
            ))}
            {lowStockItems.length > 2 && <span className="text-xs text-danger font-bold">+{lowStockItems.length - 2} mais</span>}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col gap-2">
          <span className="text-text-secondary text-sm">Valor Total em Estoque</span>
          <h3 className="text-3xl font-bold text-primary">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 text-xs text-success">
            <span className="material-icons-outlined text-sm">trending_up</span>
            <span>+4.2% este mês</span>
          </div>
        </div>
        <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col gap-2">
          <span className="text-text-secondary text-sm">Total de Itens</span>
          <h3 className="text-3xl font-bold text-text-main">{inventory.reduce((acc, curr) => acc + curr.quantity, 0)}</h3>
          <span className="text-xs text-text-secondary">{inventory.length} categorias cadastradas</span>
        </div>
        <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col gap-2">
          <span className="text-text-secondary text-sm">Itens Críticos</span>
          <h3 className={`text-3xl font-bold ${lowStockItems.length > 0 ? 'text-danger' : 'text-success'}`}>{lowStockItems.length}</h3>
          <span className="text-xs text-text-secondary">Necessitam de compra</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-bg-surface rounded-3xl border border-border-main shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-base border-b border-border-main">
              <tr>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Mercadoria</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Categoria</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Qtd. Atual</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Preço/Un.</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Subtotal</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-bg-elevated/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-text-main">{item.name}</div>
                    <div className="text-xs text-text-secondary">Última compra: {item.last_purchase_date ? new Date(item.last_purchase_date).toLocaleDateString('pt-BR') : 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      item.category === 'Equipment' ? 'bg-info/10 text-info border border-info/20' :
                      item.category === 'Products' ? 'bg-primary/10 text-primary border border-primary/20' :
                      'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                    }`}>
                      {item.category === 'Equipment' ? 'Equipamento' : item.category === 'Products' ? 'Produto' : 'Estoque'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleUpdateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-bg-elevated hover:bg-danger/10 hover:text-danger flex items-center justify-center transition-colors">
                        <span className="material-icons-outlined text-sm">remove</span>
                      </button>
                      <span className={`font-bold min-w-[20px] text-center ${item.quantity <= item.min_quantity ? 'text-danger scale-110' : 'text-text-main'}`}>
                        {item.quantity}
                      </span>
                      <button onClick={() => handleUpdateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-bg-elevated hover:bg-success/10 hover:text-success flex items-center justify-center transition-colors">
                        <span className="material-icons-outlined text-sm">add</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-text-main">
                    R$ {item.price_per_unit.toFixed(2)}
                  </td>
                  <td className="p-4 text-sm font-bold text-text-main">
                    R$ {(item.quantity * item.price_per_unit).toFixed(2)}
                  </td>
                  <td className="p-4">
                    {item.quantity <= item.min_quantity ? (
                      <span className="flex items-center gap-1 text-danger text-xs font-bold">
                        <span className="material-icons-outlined text-sm">warning</span> Reposição
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-success text-xs font-bold">
                        <span className="material-icons-outlined text-sm">check_circle</span> OK
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-text-secondary hover:text-primary transition-colors">
                      <span className="material-icons-outlined text-lg">shopping_basket</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Merchandise Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-border-main p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-text-main">Registrar Nova Compra</h3>
              <button onClick={() => setIsAdding(false)} className="text-text-secondary hover:text-text-main">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nome da Mercadoria</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    placeholder="Ex: Navalhete Premium, Gel de Barbear..."
                    className="w-full p-3.5 bg-bg-base border border-border-main rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-text-main"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Categoria</label>
                  <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value as any})}
                    className="w-full p-3.5 bg-bg-base border border-border-main rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-text-main"
                  >
                    <option value="Products">Produto (Uso/Venda)</option>
                    <option value="Equipment">Equipamento</option>
                    <option value="Stock">Estoque Comum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Preço Unitário (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItem.price_per_unit || ''}
                    onChange={e => setNewItem({...newItem, price_per_unit: parseFloat(e.target.value)})}
                    placeholder="0.00"
                    className="w-full p-3.5 bg-bg-base border border-border-main rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-text-main"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    required
                    value={newItem.quantity || ''}
                    onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                    placeholder="0"
                    className="w-full p-3.5 bg-bg-base border border-border-main rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-text-main"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Mínimo para Alerta</label>
                  <input 
                    type="number" 
                    required
                    value={newItem.min_quantity || ''}
                    onChange={e => setNewItem({...newItem, min_quantity: parseInt(e.target.value)})}
                    placeholder="Ex: 5"
                    className="w-full p-3.5 bg-bg-base border border-border-main rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-text-main"
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mt-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-text-secondary">Subtotal da Compra:</span>
                  <span className="text-primary text-xl">R$ {(newItem.quantity * newItem.price_per_unit).toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-primary-text font-bold rounded-2xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 mt-2">
                Confirmar Compra
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
