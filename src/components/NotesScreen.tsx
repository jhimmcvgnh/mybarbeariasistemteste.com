import React, { useState } from 'react';
import { useNotes } from '../hooks/useNotes';

const colors = [
  { name: 'Amarelo', value: 'bg-yellow-200 text-yellow-900' },
  { name: 'Azul', value: 'bg-blue-200 text-blue-900' },
  { name: 'Verde', value: 'bg-green-200 text-green-900' },
  { name: 'Rosa', value: 'bg-pink-200 text-pink-900' },
  { name: 'Roxo', value: 'bg-purple-200 text-purple-900' },
  { name: 'Laranja', value: 'bg-orange-200 text-orange-900' },
];

export const NotesScreen: React.FC = () => {
  const { notes, loading, addNote, deleteNote } = useNotes();
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      await addNote(newNoteContent, selectedColor);
      setNewNoteContent('');
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Anotações</h2>
          <p className="text-text-secondary">Organize suas ideias e tarefas diárias</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary-hover text-primary-text px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm shadow-primary/20"
        >
          <span className="material-icons-outlined">{isAdding ? 'close' : 'add'}</span> 
          {isAdding ? 'Cancelar' : 'Nova Nota'}
        </button>
      </div>

      {/* Add Note Area */}
      {isAdding && (
        <div className="bg-bg-surface p-6 rounded-3xl shadow-sm border border-border-main animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleAddNote} className="flex flex-col gap-4">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Escreva sua anotação aqui..."
              className="w-full p-4 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main min-h-[100px] resize-none"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color.value.split(' ')[0]} ${selectedColor === color.value ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                    title={color.name}
                  />
                ))}
              </div>
              <button 
                type="submit"
                disabled={!newNoteContent.trim()}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-text rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto pt-8 pb-8 hide-scrollbar">
        {notes.map((note, index) => (
          <div 
            key={note.id} 
            className={`${note.color} p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 relative group min-h-[220px] flex flex-col transform hover:-translate-y-2 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
          >
            {/* Pin Effect */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
              <div className="w-5 h-5 rounded-full bg-red-600 shadow-md border-2 border-white/30 relative">
                <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-white/40"></div>
              </div>
              <div className="w-1 h-3 bg-gray-400 -mt-1 shadow-sm"></div>
            </div>
            
            <div className="flex-1 font-medium font-handwriting text-lg leading-relaxed whitespace-pre-wrap">
              {note.content}
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/10">
              <span className="text-xs font-medium opacity-70">{new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
              <button 
                onClick={() => handleDeleteNote(note.id)}
                className="p-1.5 rounded-full hover:bg-black/10 text-inherit opacity-0 group-hover:opacity-100 transition-opacity"
                title="Excluir"
              >
                <span className="material-icons-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {notes.length === 0 && !isAdding && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-secondary opacity-50">
            <span className="material-icons-outlined text-6xl mb-4">note_add</span>
            <p className="text-lg">Nenhuma anotação ainda. Crie a primeira!</p>
          </div>
        )}
      </div>
    </div>
  );
};
