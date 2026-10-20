import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TerritoryClaimStatus } from "@/lib/types/database.types";
import { SUBJECTS, type Subject } from "@/lib/documents/subjects";

export interface StudyGroupSummary {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export interface TerritoryBoardClaim {
  id: string;
  userId: string;
  status: TerritoryClaimStatus;
  deadlineAt: string;
  stars: number | null;
  scorePercent: number | null;
}

export interface TerritoryBoardEntry {
  subject: Subject;
  claim: TerritoryBoardClaim | null;
}

export interface GroupMemberInfo {
  userId: string;
  fullName: string | null;
  joinedAt: string;
}

export async function getGroupById(supabase: SupabaseClient<Database>, groupId: string) {
  // RLS (study_groups_select_member) fait déjà le travail : une personne qui
  // n'est pas membre reçoit `null` ici, jamais une erreur d'accès refusé —
  // donc l'appelant peut traiter `null` comme "introuvable".
  const { data, error } = await supabase.from("study_groups").select("*").eq("id", groupId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listUserGroups(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StudyGroupSummary[]> {
  const { data: memberships, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  if (error) throw error;
  if (memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.group_id);
  const [{ data: groups, error: groupsError }, { data: allMembers, error: membersError }] = await Promise.all([
    supabase.from("study_groups").select("id, name, invite_code").in("id", groupIds),
    supabase.from("group_members").select("group_id").in("group_id", groupIds),
  ]);
  if (groupsError) throw groupsError;
  if (membersError) throw membersError;

  const countByGroup = new Map<string, number>();
  for (const row of allMembers) countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);

  return groups
    .map((g) => ({ id: g.id, name: g.name, inviteCode: g.invite_code, memberCount: countByGroup.get(g.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGroupMembers(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<GroupMemberInfo[]> {
  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  if (members.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  if (profilesError) throw profilesError;

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  return members.map((m) => ({
    userId: m.user_id,
    fullName: nameById.get(m.user_id) ?? null,
    joinedAt: m.joined_at,
  }));
}

/**
 * Déduit le plateau des 11 matières à partir de la dernière réclamation
 * connue pour chacune (il n'existe pas de ligne pour une matière "non
 * réclamée" — son statut se déduit, à l'image de getStreak qui déduit tout
 * de credit_transactions sans table dédiée).
 */
export async function getTerritoryBoard(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<TerritoryBoardEntry[]> {
  const { data, error } = await supabase
    .from("territory_claims")
    .select("id, subject, user_id, status, deadline_at, stars, score_percent, claimed_at")
    .eq("group_id", groupId)
    .order("claimed_at", { ascending: false });
  if (error) throw error;

  const latestBySubject = new Map<string, (typeof data)[number]>();
  for (const row of data) {
    if (!latestBySubject.has(row.subject)) latestBySubject.set(row.subject, row);
  }

  return SUBJECTS.map((subject) => {
    const row = latestBySubject.get(subject);
    if (!row) return { subject, claim: null };
    return {
      subject,
      claim: {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        deadlineAt: row.deadline_at,
        stars: row.stars,
        scorePercent: row.score_percent,
      },
    };
  });
}

/** Réclamations en cours de l'utilisateur, pour la bannière de rappel dans l'app. */
export async function getActiveClaimsForUser(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("territory_claims")
    .select("id, group_id, subject, deadline_at")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("deadline_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTerritoryClaim(supabase: SupabaseClient<Database>, claimId: string) {
  const { data, error } = await supabase.from("territory_claims").select("*").eq("id", claimId).maybeSingle();
  if (error) throw error;
  return data;
}
