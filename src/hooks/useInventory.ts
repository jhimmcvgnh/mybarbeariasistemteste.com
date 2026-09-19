import { useState, useEffect, useCallback } from 'react';
import { supabase, type EstoqueItem } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export interface InventoryItem extends EstoqueItem {
  name?: string;
  category?: string;
  quantity?: number;
  min_quantity?: number;
  price_per_unit?: number;
  last_purchase_date?: string | null;
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, loading: barbLoading } = useBarbearia();

  const fetchInventory = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setInventory([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('item', { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        const normalized: InventoryItem[] = (data || []).map((i: any) => ({
          ...i,
          name: i.item,
          category: i.categoria,
          quantity: i.quantidade,
          min_quantity: i.minimo_alerta,
          price_per_unit: Number(i.preco_unitario ?? 0),
          last_purchase_date: i.data_ultima_compra,
        }));
        setInventory(normalized);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchInventory();

    if (!barbeariaId) return;

    const channelId = `estoque-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'estoque_itens',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchInventory]);

  const addItem = async (item: {
    item?: string;
    name?: string;
    categoria?: string;
    category?: string;
    quantidade?: number;
    quantity?: number;
    minimo_alerta?: number;
    min_quantity?: number;
    preco_unitario?: number;
    price_per_unit?: number;
  }) => {
    if (!barbeariaId) throw new Error('Barbearia não autenticada.');

    const payload = {
      barbearia_id: barbeariaId,
      item: item.item || item.name || 'Novo Item',
      categoria: item.categoria || item.category || 'Produtos',
      quantidade: Number(item.quantidade ?? item.quantity ?? 0),
      minimo_alerta: Number(item.minimo_alerta ?? item.min_quantity ?? 5),
      preco_unitario: Number(item.preco_unitario ?? item.price_per_unit ?? 0),
      data_ultima_compra: new Date().toISOString().split('T')[0],
    };

    const { error: err } = await supabase.from('estoque_itens').insert([payload]);
    if (err) throw err;
    await fetchInventory();
  };

  const updateQuantity = async (id: string, delta: number) => {
    const found = inventory.find(i => i.id === id);
    if (!found) return;

    const novaQuantidade = Math.max(0, (found.quantidade ?? found.quantity ?? 0) + delta);
    const { error: err } = await supabase
      .from('estoque_itens')
      .update({ quantidade: novaQuantidade })
      .eq('id', id);
    if (err) throw err;
    await fetchInventory();
  };

  return { inventory, loading, error, addItem, updateQuantity, refetch: fetchInventory };
}
