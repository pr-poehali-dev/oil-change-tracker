import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { addToCart, getCart, getCartCount } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';

interface ProductInfoProps {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  pricePrefix?: string;
  magnification: string;
  images: string[];
  onCartCountChange: (count: number) => void;
}

export default function ProductInfo({
  id,
  name,
  price,
  oldPrice,
  pricePrefix,
  magnification,
  images,
  onCartCountChange,
}: ProductInfoProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="flex gap-2 mb-3 md:mb-4">
          <Badge className="bg-primary text-white">В наличии</Badge>
          {oldPrice && <Badge className="bg-red-500 text-white">АКЦИЯ</Badge>}
        </div>
        <h1 className="text-2xl md:text-4xl font-display font-bold mb-3">{name}</h1>
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-2xl md:text-4xl font-bold ${oldPrice ? 'text-red-600' : 'text-primary'}`}>
            {pricePrefix && <span className="text-xl md:text-2xl mr-2">{pricePrefix}</span>}
            {price.toLocaleString('ru-RU')} ₽
          </div>
          {oldPrice && (
            <div className="text-lg md:text-2xl text-gray-400 line-through">
              {oldPrice.toLocaleString('ru-RU')} ₽
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-gray-600">
            {(id === 5 || id === 7 || id === 9) ? 'Интенсивность света:' : 'Увеличение:'}
          </span>
          <Badge variant="secondary" className="text-lg">{magnification}</Badge>
        </div>
      </div>

      <div className="space-y-3 pt-4 md:pt-6">
        <Button
          size="lg"
          className="w-full bg-primary hover:bg-primary/90"
          onClick={() => {
            addToCart({ id, name, price, image: images[0] });
            onCartCountChange(getCartCount(getCart()));
            toast({
              title: "Добавлено в корзину",
              description: `${name} добавлен в корзину`,
            });
          }}
        >
          <Icon name="ShoppingCart" size={20} className="mr-2" />
          Добавить в корзину
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/', { state: { scrollTo: 'testdrive' } })}
        >
          <Icon name="Calendar" size={20} className="mr-2" />
          Записаться на тест-драйв
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 md:pt-6 border-t">
        <div className="text-center">
          <Icon name="Shield" size={24} className="mx-auto mb-2 text-primary" />
          <p className="text-sm text-gray-400">Гарантия качества</p>
        </div>
        <div className="text-center">
          <Icon name="Truck" size={24} className="mx-auto mb-2 text-primary" />
          <p className="text-sm text-gray-400">Доставка по РФ</p>
        </div>
        <div className="text-center">
          <Icon name="Wrench" size={24} className="mx-auto mb-2 text-primary" />
          <p className="text-sm text-gray-400">Сервисное обслуживание</p>
        </div>
      </div>
    </div>
  );
}
