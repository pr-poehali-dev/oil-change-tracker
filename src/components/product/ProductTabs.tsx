import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';

interface Specification {
  label: string;
  value: string;
}

interface ProductTabsProps {
  fullDescription: string;
  specifications: Specification[];
  package: string[];
}

export default function ProductTabs({ fullDescription, specifications, package: packageItems }: ProductTabsProps) {
  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="description">Описание</TabsTrigger>
        <TabsTrigger value="specifications">Характеристики</TabsTrigger>
        <TabsTrigger value="package">Комплектация</TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-lg text-gray-300">{fullDescription}</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="specifications" className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {specifications.map((spec, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <span className="font-medium text-gray-400">{spec.label}</span>
                  <span className="font-semibold">{spec.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="package" className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {packageItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <Icon name="CheckCircle" size={20} className="text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
