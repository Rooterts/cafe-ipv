import { z } from 'zod';
import type {
  productIdSchema,
  orderIdSchema,
  dayIdSchema,
  productDailyDataSchema,
  productSchema,
  orderItemSchema,
  orderSchema,
  daySchema,
} from './schemas';

// Inferred types
export type IMutableProductDailyField = keyof Pick<
  IProductDailyData,
  'inicio' | 'entrada' | 'salida'
>;
export type IProductId = z.infer<typeof productIdSchema>;
export type IOrderId = z.infer<typeof orderIdSchema>;
export type IDayId = z.infer<typeof dayIdSchema>;

export type IProductDailyData = z.infer<typeof productDailyDataSchema>;
export type IProduct = z.infer<typeof productSchema>;
export type IOrderItem = z.infer<typeof orderItemSchema>;
export type IOrder = z.infer<typeof orderSchema>;
export type IDay = z.infer<typeof daySchema>;

export interface ICartItem {
  productId: IProductId;
  name: string;
  price: number;
  quantity: number;
}

export interface ICard {
  id: string;
  alias: string;
  cardNumber: string;
  phoneNumber: string;
  createdAt: number;
}
