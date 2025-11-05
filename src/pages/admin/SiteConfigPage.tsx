import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader } from 'lucide-react';

interface HeroImage {
    id: number;
    image_url: string;
    alt_text: string;
    is_active: boolean;
    orden: number;
}

const SiteConfigPage: React.FC = () => {
    const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setIsLoading(true);
        const { data: heroData } = await supabase.from('hero_images').select('*').order('orden');
        
        if (heroData) setHeroImages(heroData);
        setIsLoading(false);
    };

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, orden: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = `hero_${orden}_${Date.now()}`;
        try {
            const { error: uploadError } = await supabase.storage.from('hero-slider').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('hero-slider').getPublicUrl(fileName);
            const publicUrl = data.publicUrl;

            await supabase.from('hero_images').upsert({ id: orden, orden, image_url: publicUrl, alt_text: `Hero Image ${orden}` }, { onConflict: 'id' });
            fetchConfig();
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-dark mb-6">Personalización Visual</h1>
            
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold text-dark mb-4">Carrusel de la Página de Inicio</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => {
                        const image = heroImages.find(img => img.orden === i + 1);
                        return (
                            <div key={i} className="border p-4 rounded-lg text-center">
                                <p className="font-bold mb-2">Imagen {i + 1}</p>
                                {image?.image_url && <img src={image.image_url} alt={`Slide ${i+1}`} className="h-24 w-full object-cover rounded-md mb-2" />}
                                <input type="file" id={`hero-upload-${i}`} className="hidden" onChange={(e) => handleHeroImageUpload(e, i + 1)} />
                                <label htmlFor={`hero-upload-${i}`} className="cursor-pointer bg-primary text-white px-3 py-1 rounded text-sm">Subir</label>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default SiteConfigPage;