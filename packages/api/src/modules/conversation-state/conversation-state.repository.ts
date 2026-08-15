import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { conversationState, ConversationState } from "./conversation-state.schema";

export async function getState(clubId: string, phone: string): Promise<ConversationState | null> {
  const [row] = await db
    .select()
    .from(conversationState)
    .where(and(eq(conversationState.clubId, clubId), eq(conversationState.phone, phone)))
    .limit(1);
  return row ?? null;
}

export async function setState(
  clubId: string,
  phone: string,
  step: string,
  data: Record<string, unknown>
): Promise<ConversationState> {
  const [row] = await db
    .insert(conversationState)
    .values({ clubId, phone, step, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationState.clubId, conversationState.phone],
      set: { step, data, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function clearState(clubId: string, phone: string): Promise<void> {
  await db
    .delete(conversationState)
    .where(and(eq(conversationState.clubId, clubId), eq(conversationState.phone, phone)));
}
