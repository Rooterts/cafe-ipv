import z from 'zod';

export const DAY_EXPORT_KEY = 'v1:cafe-ipv-app:day';
export const productIdSchema = z.string().brand('IProductId');
export const orderIdSchema = z.string().brand('IOrderId');
export const dayIdSchema = z.string().brand('IDayId');

export const productDailyDataSchema = z.object({
  inicio: z.number(),
  entrada: z.number(),
  salida: z.number(),
  total: z.number(),
  vendido: z.number(),
  importe: z.number(),
  final: z.number(),
});

export const productSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  price: z.number(),
  unitType: z.enum(['units', 'weighing']).default('units'),
  daily: productDailyDataSchema,
});

export const orderItemSchema = z.object({
  productId: productIdSchema,
  quantity: z.number(),
});

export const orderSchema = z.object({
  id: orderIdSchema,
  items: z.array(orderItemSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const daySchema = z.object({
  id: dayIdSchema,
  date: z.string(),
  products: z.array(productSchema),
  orders: z.array(orderSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const exportedDaySchema = z.object({
  exportId: z.literal(DAY_EXPORT_KEY),
  createdAt: z.number(),
  export: daySchema,
});
