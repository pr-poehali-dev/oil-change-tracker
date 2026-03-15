const URLS = {
  clients: "https://functions.poehali.dev/26590625-e9c3-4985-9119-34729743adc3",
  orders: "https://functions.poehali.dev/549b3541-0f68-4984-8c11-4a0a2b52403e",
  documents: "https://functions.poehali.dev/c30a9245-2ba9-4b1e-91f1-986a7adff669",
  cars: "https://functions.poehali.dev/569f47e9-9c87-4e78-aac2-72676d772a07",
};

async function req(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Clients
export const apiGetClients = (params?: { search?: string; type?: string }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.type) qs.set("type", params.type);
  return req(`${URLS.clients}${qs.toString() ? "?" + qs : ""}`);
};
export const apiCreateClient = (data: Record<string, unknown>) =>
  req(URLS.clients, "POST", data);
export const apiUpdateClient = (id: number, data: Record<string, unknown>) =>
  req(`${URLS.clients}/${id}`, "PUT", data);

// Orders
export const apiGetOrders = (params?: { search?: string; status?: string }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  return req(`${URLS.orders}${qs.toString() ? "?" + qs : ""}`);
};
export const apiCreateOrder = (data: Record<string, unknown>) =>
  req(URLS.orders, "POST", data);
export const apiUpdateOrder = (id: number, data: Record<string, unknown>) =>
  req(`${URLS.orders}/${id}`, "PUT", data);

// Cars
export const apiGetCars = () => req(URLS.cars);
export const apiCreateCar = (data: Record<string, unknown>) => req(URLS.cars, "POST", data);
export const apiUpdateCar = (id: string, data: Record<string, unknown>) => req(`${URLS.cars}/${id}`, "PUT", data);
export const apiDeleteCar = (id: string) => req(`${URLS.cars}/${id}`, "DELETE");
export const apiSearchCar = (brand: string, model: string, year: string) => {
  const qs = new URLSearchParams({ brand, model, year });
  return fetch(`${URLS.cars}/search?${qs}`).then((r) => r.json());
};
export const apiGetEntries = (carId: string) => req(`${URLS.cars}/entries/${carId}`);
export const apiSaveEntry = (carId: string, date: string, km: number) =>
  req(`${URLS.cars}/entries`, "POST", { carId, date, km });
export const apiDeleteEntry = (carId: string, date: string) =>
  req(`${URLS.cars}/entries/${carId}/${date}`, "DELETE");

// Documents
export const apiGetDocuments = (params?: { type?: string }) => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  return req(`${URLS.documents}${qs.toString() ? "?" + qs : ""}`);
};
export const apiCreateDocument = (data: Record<string, unknown>) =>
  req(URLS.documents, "POST", data);
export const apiUpdateDocument = (id: number, data: Record<string, unknown>) =>
  req(`${URLS.documents}/${id}`, "PUT", data);