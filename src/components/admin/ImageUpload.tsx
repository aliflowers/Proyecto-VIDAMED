import React, { useState, useRef } from 'react';
import { FaTimes, FaImage } from 'react-icons/fa';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null, previewUrl: string | null) => void;
  bucket?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageChange,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)');
      return false;
    }

    if (file.size > maxSize) {
      alert('El archivo no puede superar los 5MB');
      return false;
    }

    return true;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!validateFile(file)) return;

    // Crear preview inmediato
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      onImageChange(file, result);
    };
    reader.readAsDataURL(file);
  };



  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Imagen del Material
      </label>

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            title="Eliminar imagen"
          >
            <FaTimes size={12} />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="text-white">Subiendo...</div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/10'
              : 'border-gray-300 hover:border-primary'
          }`}
        >
          <FaImage className="mx-auto mb-4 text-gray-400 text-3xl" />
          <div className="text-gray-600">
            <p className="font-medium">Arrastra una imagen aquí</p>
            <p className="text-sm">o <span className="text-primary underline">haz clic para seleccionar</span></p>
            <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF hasta 5MB</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
