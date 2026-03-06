import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

type Car = {
  id: string;
  brand: string;
  model: string;
  year: string;
  interval: number;
};

const BRANDS = [
  "Audi", "BMW", "Ford", "Honda", "Hyundai", "Kia", "Lada",
  "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan", "Renault",
  "Skoda", "Subaru", "Toyota", "Volkswagen", "Volvo",
];

const INTERVALS = [5000, 7500, 10000, 12000, 15000];

function loadCars(): Car[] {
  try { return JSON.parse(localStorage.getItem("oil_cars") || "[]"); }
  catch { return []; }
}

function saveCars(cars: Car[]) {
  localStorage.setItem("oil_cars", JSON.stringify(cars));
}

function getActiveCar(): string | null {
  return localStorage.getItem("oil_active_car");
}

function setActiveCar(id: string) {
  localStorage.setItem("oil_active_car", id);
}

export default function Car() {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>(loadCars);
  const [activeId, setActiveId] = useState<string | null>(getActiveCar);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", year: new Date().getFullYear().toString(), interval: 10000 });
  const [editId, setEditId] = useState<string | null>(null);

  function handleSave() {
    if (!form.brand || !form.model) return;
    if (editId) {
      const updated = cars.map((c) => c.id === editId ? { ...c, ...form } : c);
      setCars(updated);
      saveCars(updated);
      setEditId(null);
    } else {
      const newCar: Car = { id: Date.now().toString(), ...form };
      const updated = [...cars, newCar];
      setCars(updated);
      saveCars(updated);
      if (updated.length === 1) {
        setActiveId(newCar.id);
        setActiveCar(newCar.id);
      }
    }
    setForm({ brand: "", model: "", year: new Date().getFullYear().toString(), interval: 10000 });
    setAdding(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setActiveCar(id);
  }

  function handleDelete(id: string) {
    const updated = cars.filter((c) => c.id !== id);
    setCars(updated);
    saveCars(updated);
    if (activeId === id) {
      const next = updated[0]?.id ?? null;
      setActiveId(next);
      if (next) setActiveCar(next);
      else localStorage.removeItem("oil_active_car");
    }
  }

  function startEdit(car: Car) {
    setForm({ brand: car.brand, model: car.model, year: car.year, interval: car.interval });
    setEditId(car.id);
    setAdding(true);
  }

  function cancelForm() {
    setAdding(false);
    setEditId(null);
    setForm({ brand: "", model: "", year: new Date().getFullYear().toString(), interval: 10000 });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-10 pb-6 px-6 max-w-md mx-auto w-full flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">
            Настройки
          </p>
          <h1 className="text-2xl font-golos font-bold text-foreground tracking-tight">
            Мои автомобили
          </h1>
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-1 w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Icon name="X" size={16} />
        </button>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-md mx-auto w-full space-y-3">
        {/* Car list */}
        {cars.length > 0 && !adding && (
          <div className="space-y-2 animate-fade-in">
            {cars.map((car) => {
              const isActive = car.id === activeId;
              return (
                <div
                  key={car.id}
                  onClick={() => handleSelect(car.id)}
                  className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
                    isActive ? "border-foreground shadow-sm" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isActive ? "bg-foreground" : "bg-secondary"
                        }`}
                      >
                        <Icon
                          name="Car"
                          size={18}
                          className={isActive ? "text-background" : "text-muted-foreground"}
                        />
                      </div>
                      <div>
                        <p className="font-golos font-semibold text-foreground text-sm">
                          {car.brand} {car.model}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {car.year} · замена через {car.interval.toLocaleString("ru-RU")} км
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center mr-1">
                          <Icon name="Check" size={11} className="text-background" />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(car); }}
                        className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
                      >
                        <Icon name="Pencil" size={13} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(car.id); }}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                      >
                        <Icon name="Trash2" size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add button */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full bg-card border border-dashed border-border rounded-2xl py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all font-golos animate-fade-in"
          >
            <Icon name="Plus" size={16} />
            Добавить автомобиль
          </button>
        )}

        {/* Form */}
        {adding && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-fade-in">
            <p className="font-golos font-semibold text-foreground text-sm">
              {editId ? "Редактировать" : "Новый автомобиль"}
            </p>

            {/* Brand */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Марка
              </label>
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full bg-secondary rounded-xl px-4 py-3 font-golos text-sm text-foreground border border-transparent focus:outline-none focus:border-ring transition-colors appearance-none"
              >
                <option value="">Выберите марку</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Модель
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Например: Camry, Polo, Creta"
                className="w-full bg-secondary rounded-xl px-4 py-3 font-golos text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Год выпуска
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                min="1990"
                max={new Date().getFullYear()}
                className="w-full bg-secondary rounded-xl px-4 py-3 font-mono text-sm text-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Интервал замены масла
              </label>
              <div className="grid grid-cols-5 gap-2">
                {INTERVALS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm({ ...form, interval: v })}
                    className={`py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                      form.interval === v
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground hover:bg-muted"
                    }`}
                  >
                    {(v / 1000).toLocaleString("ru-RU")}к
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Выбрано: {form.interval.toLocaleString("ru-RU")} км
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={cancelForm}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={!form.brand || !form.model}
                className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {editId ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        )}

        {/* Hint */}
        {cars.length > 0 && !adding && (
          <p className="text-xs text-center text-muted-foreground font-golos pt-1">
            Нажмите на автомобиль, чтобы выбрать его активным
          </p>
        )}

        {/* Go to counter */}
        {activeId && !adding && (
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Icon name="ArrowLeft" size={15} className="text-background" />
            Перейти к счётчику
          </button>
        )}
      </main>
    </div>
  );
}
