import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Límites en minutos para evitar decimales
  weeklyLimitMin: integer("weekly_limit_min").notNull().default(16 * 60),
  annualLimitMin: integer("annual_limit_min").notNull().default(720 * 60),
  // Ventana nocturna en minutos desde medianoche (22:00 → 06:00)
  nightStartMin: integer("night_start_min").notNull().default(22 * 60),
  nightEndMin: integer("night_end_min").notNull().default(6 * 60),
});

export const shifts = sqliteTable(
  "shifts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Fecha local YYYY-MM-DD del inicio del tramo
    date: text("date").notNull(),
    // Minutos desde medianoche; endMin > 1440 si el tramo cruza la medianoche
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    source: text("source", { enum: ["manual", "ocr"] })
      .notNull()
      .default("manual"),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex("shifts_unique_segment").on(
      t.userId,
      t.date,
      t.startMin,
      t.endMin
    ),
  ]
);

export const payrolls = sqliteTable(
  "payrolls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    fileName: text("file_name").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedAt: text("uploaded_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex("payrolls_unique_month").on(t.userId, t.year, t.month)]
);

export type User = typeof users.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Payroll = typeof payrolls.$inferSelect;
