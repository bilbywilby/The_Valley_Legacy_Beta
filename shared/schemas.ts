import { z } from 'zod';
const TrafficPayloadSchema = z.object({
  speed: z.number().min(0),
  location: z.string().min(1),
});
const WeatherPayloadSchema = z.object({
  temp: z.number(),
  condition: z.string().min(1),
});
const PublicSafetyPayloadSchema = z.object({
  event: z.string().min(1),
  unit: z.string().min(1),
});
const InfrastructurePayloadSchema = z.object({
  status: z.string().min(1),
  affected: z.number().min(0),
});
export const schemas = {
  Traffic: TrafficPayloadSchema,
  Weather: WeatherPayloadSchema,
  PublicSafety: PublicSafetyPayloadSchema,
  Infrastructure: InfrastructurePayloadSchema,
};
export type FeedType = keyof typeof schemas;