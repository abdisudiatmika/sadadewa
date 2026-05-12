import { db } from "../db/index.js";
import { systemSettings, user } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class SettingsService {
  /**
   * Get all settings for a user.
   */
  async getUserSettings(userId: string) {
    const settings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.userId, userId));

    // Convert to key-value map
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return result;
  }

  /**
   * Bulk upsert settings for a user.
   */
  async updateSettings(
    userId: string,
    settings: Record<string, any>
  ) {
    const entries = Object.entries(settings);

    for (const [key, value] of entries) {
      // Check if setting exists
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.userId, userId),
            eq(systemSettings.key, key)
          )
        );

      if (existing) {
        await db
          .update(systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(systemSettings.id, existing.id));
      } else {
        await db.insert(systemSettings).values({
          userId,
          key,
          value,
        });
      }
    }

    return this.getUserSettings(userId);
  }

  /**
   * Reset all settings for a user to defaults.
   */
  async resetToDefaults(userId: string) {
    await db
      .delete(systemSettings)
      .where(eq(systemSettings.userId, userId));

    // Insert default settings
    const defaults: Record<string, any> = {
      theme: "light",
      font_size: "default",
      component_roundness: "rounded",
      brand_color: "#006a61",
    };

    return this.updateSettings(userId, defaults);
  }

  /**
   * Update user profile fields (name, image).
   */
  async updateProfile(
    userId: string,
    data: { name?: string; image?: string }
  ) {
    const [updated] = await db
      .update(user)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();

    return updated || null;
  }
}

export const settingsService = new SettingsService();
