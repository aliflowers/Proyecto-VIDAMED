
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export interface Study {
  id: string;
  name: string;
  category: string;
  description: string;
  preparation: string;
  price: number; // Este es costo_usd
  costo_bs?: number;
  tasa_bcv?: number;
  deliveryTime: string;
  campos_formulario?: any[]; // Puede ser un array de objetos
  veces_realizado?: number;
  background_url?: string;
}

export interface BlogPost {
    id: string;
    title: string;
    summary: string;
    content?: string;
    category: string;
    imageUrl: string;
    author: string;
    date: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
}

export interface Testimonial {
    id: number;
    texto: string;
    author: string;
    city: string;
    is_approved?: boolean;
    rating?: number;
    estudio_realizado?: string;
}

export interface Patient {
    id: number;
    nombres: string;
    apellidos: string;
    cedula_identidad: string;
    email: string;
    telefono: string;
    direccion?: string;
}
