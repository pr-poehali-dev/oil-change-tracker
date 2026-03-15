import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <div
          className="aspect-[4/3] md:aspect-square overflow-hidden rounded-lg bg-gray-100 relative group cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        >
          <img
            src={images[selectedImageIndex]}
            alt={productName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Icon name="Maximize2" size={48} className="text-white opacity-0 group-hover:opacity-70 transition-opacity" />
          </div>
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }}
              >
                <Icon name="ChevronLeft" size={24} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }}
              >
                <Icon name="ChevronRight" size={24} />
              </Button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:gap-3">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 md:w-auto md:h-auto md:aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  selectedImageIndex === index
                    ? 'border-primary shadow-lg'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={img}
                  alt={`${productName} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            <Icon name="X" size={32} />
          </Button>

          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedImageIndex]}
              alt={productName}
              className="max-w-full max-h-[90vh] object-contain"
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={() => setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                >
                  <Icon name="ChevronLeft" size={24} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={() => setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                >
                  <Icon name="ChevronRight" size={24} />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
