import { z } from "zod";

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

export const scheduleRangeSchema = z
  .object({
    /** 0 = Sunday ... 6 = Saturday (same as Date.getDay and Postgres DOW) */
    day_of_week: z.number().int().min(0).max(6),
    start_time: timeOfDay,
    end_time: timeOfDay,
  })
  .refine((r) => r.start_time < r.end_time, {
    message: "La hora de fin debe ser posterior a la de inicio",
  });

export const staffScheduleSchema = z
  .object({
    ranges: z.array(scheduleRangeSchema).max(50),
    service_ids: z.array(z.uuid()),
  })
  .superRefine((data, ctx) => {
    for (let day = 0; day <= 6; day++) {
      const sorted = data.ranges
        .filter((r) => r.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start_time < sorted[i - 1].end_time) {
          ctx.addIssue({
            code: "custom",
            message: "Hay tramos que se superponen en el mismo día",
          });
          return;
        }
      }
    }
  });

export type ScheduleRange = z.infer<typeof scheduleRangeSchema>;
export type StaffScheduleInput = z.infer<typeof staffScheduleSchema>;
