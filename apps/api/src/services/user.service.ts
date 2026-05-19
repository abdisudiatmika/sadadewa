import { db } from "../db/index.js";
import { user } from "../db/schema.js";
import { eq, desc, ne, and, or } from "drizzle-orm";
import { auth } from "../auth/index.js";

export class UserService {
  async getUsers() {
    return await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(ne(user.role, "student")) // Usually students are managed elsewhere
      .orderBy(desc(user.createdAt));
  }

  async createUser(data: { email: string; password?: string; name: string; role: string }) {
    // We use better-auth's internal API to create the user with hashed password
    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password || "Password123!", // Default password if not provided
        name: data.name,
        // @ts-ignore: better-auth typescript definition limitation for custom fields
        role: data.role,
      },
    });

    return result.user;
  }

  async updateUser(id: string, data: { name?: string; role?: string; email?: string }) {
    const [updated] = await db
      .update(user)
      .set(data as any)
      .where(eq(user.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string) {
    const [deleted] = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();
    return deleted;
  }
}

export const userService = new UserService();
