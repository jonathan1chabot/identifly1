import { useState, useRef, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  disabled?: boolean;
}

export function ImageUploader({ onImageSelected, disabled = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      
      // Extract base64 part
      const base64Data = result.split(",")[1];
      onImageSelected(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [disabled, onImageSelected]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="relative w-full max-w-md mx-auto aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden border-2 border-border shadow-sm group">
        <img src={preview} alt="Selected" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={clearImage}
            disabled={disabled}
            className="rounded-full shadow-lg"
          >
            <X className="w-4 h-4 mr-2" /> Clear Image
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        relative w-full max-w-md mx-auto aspect-square md:aspect-[4/3] rounded-2xl 
        border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed border-border' : ''}
        ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
      
      <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
        <UploadCloud className="w-8 h-8" />
      </div>
      
      <h3 className="font-serif font-medium text-lg mb-1 text-foreground">
        {isDragging ? 'Drop it here!' : 'Upload an image'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[250px]">
        Drag and drop any photo here, or click to browse your files.
      </p>
      
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground/80">
        <ImageIcon className="w-3 h-3" />
        <span>Supports JPEG, PNG, WEBP</span>
      </div>
    </div>
  );
}
