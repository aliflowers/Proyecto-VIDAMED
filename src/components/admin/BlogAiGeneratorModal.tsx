import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader } from 'lucide-react';

interface BlogAiGeneratorModalProps {
  onGenerate: (content: any) => void;
  onClose: () => void;
  isLoading: boolean;
}

const BlogAiGeneratorModal: React.FC<BlogAiGeneratorModalProps> = ({ onGenerate, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    topic: '',
    postType: 'Educativa',
    categories: [] as string[],
    tone: 'Profesional',
    targetAudience: 'Pacientes',
  });
  const [studyCategories, setStudyCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.rpc('get_distinct_categories');
      if (error) {
        console.error('Error fetching study categories:', error);
      } else {
        setStudyCategories(data.map((c: any) => c.category));
      }
    };
    fetchCategories();
  }, []);

  const handleCheckboxChange = (category: string) => {
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Generar Artículo con IA</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema Principal del Artículo</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="Ej: La importancia del perfil tiroideo"
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Publicación</label>
              <select value={formData.postType} onChange={(e) => setFormData({ ...formData, postType: e.target.value })} className="w-full p-2 border rounded">
                <option>Educativa</option>
                <option>Informativa</option>
                <option>Noticia</option>
                <option>Innovación Tecnológica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tono del Artículo</label>
              <select value={formData.tone} onChange={(e) => setFormData({ ...formData, tone: e.target.value })} className="w-full p-2 border rounded">
                <option>Profesional</option>
                <option>Cercano y Amigable</option>
                <option>Técnico</option>
                <option>Inspirador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Público Objetivo</label>
              <select value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} className="w-full p-2 border rounded">
                <option>Pacientes</option>
                <option>Médicos</option>
                <option>Público General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorías de Estudios a Mencionar</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 border rounded max-h-32 sm:max-h-48 overflow-y-auto">
              <div key="general">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" onChange={() => handleCheckboxChange('Conocimiento General')} checked={formData.categories.includes('Conocimiento General')} />
                  <span>Conocimiento General</span>
                </label>
              </div>
              {studyCategories.map(cat => (
                <div key={cat}>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange(cat)} checked={formData.categories.includes(cat)} />
                    <span>{cat}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary-dark disabled:bg-gray-400 flex items-center">
              {isLoading ? <><Loader size={18} className="animate-spin mr-2" /> Generando...</> : 'Generar Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogAiGeneratorModal;
