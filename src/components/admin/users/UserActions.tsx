"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Ban, KeyRound, LogOut, Mail, PlayCircle, Trash2 } from "lucide-react";
import {
  deleteUser,
  reactivateUser,
  resendUserVerification,
  revokeUserSessions,
  sendUserPasswordReset,
  suspendUser,
  verifyUserEmail,
  type UserDetail,
} from "@/lib/admin-api";
import { errorText } from "@/lib/admin-format";
import { ActionDialog, Button, INPUT, LABEL, Note } from "@/components/admin/ui";
import { useAdmin, useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { useInvalidateUser, useUserAction } from "./shared";

type Dialog = "verify" | "suspend" | "reactivate" | "sessions" | "reset" | "delete" | null;

/** Optional audit-log reason for actions where the backend doesn't require one. */
function OptionalReason({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL}>Reason (optional, kept in the audit log)</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} maxLength={500} className={INPUT} placeholder="e.g. User asked by email" />
    </div>
  );
}

export function UserActions({ detail }: { detail: UserDetail }) {
  const { account, subscription } = detail;
  const id = account.id;
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const admin = useAdmin();
  const canWrite = useCan("users:write");
  const canDelete = useCan("users:delete");
  const run = useUserAction(id);
  const invalidate = useInvalidateUser(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [optionalReason, setOptionalReason] = useState("");

  const isSelf = admin.id === id;
  const isAdminTarget = account.role === "ADMIN";
  const protectedTarget = isSelf || isAdminTarget;
  const unverified = !account.emailVerifiedAt;
  const suspended = account.status === "SUSPENDED";

  const resend = useMutation({
    mutationFn: () => resendUserVerification(id),
    onSuccess: async () => {
      toast.success("Verification email sent", { description: `A new link went to ${account.email}.` });
      await invalidate();
    },
    onError: (err) => toast.error("Couldn't resend the verification email", { description: errorText(err) }),
  });

  const open = (d: Exclude<Dialog, null>) => {
    setOptionalReason("");
    setDialog(d);
  };
  const close = () => setDialog(null);

  if (!canWrite && !canDelete) return null;

  const restrictions: string[] = [];
  if (isSelf) restrictions.push("You can't suspend or delete your own account.");
  else if (isAdminTarget) restrictions.push("Admin accounts can't be suspended or deleted from the dashboard — use the server script.");
  if (canDelete && !protectedTarget && subscription.renewingPolar) {
    restrictions.push("Delete is blocked while the Polar subscription still renews. Cancel it first under Billing → Cancel at period end.");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canWrite && unverified && (
          <Button size="sm" onClick={() => open("verify")}>
            <BadgeCheck className="w-3.5 h-3.5" />
            Verify email
          </Button>
        )}
        {canWrite && unverified && account.hasPassword && (
          <Button size="sm" loading={resend.isPending} onClick={() => resend.mutate()}>
            <Mail className="w-3.5 h-3.5" />
            Resend verification
          </Button>
        )}
        {canWrite && !suspended && (
          <Button size="sm" variant="danger-outline" disabled={protectedTarget} onClick={() => open("suspend")} title={protectedTarget ? restrictions[0] : undefined}>
            <Ban className="w-3.5 h-3.5" />
            Suspend
          </Button>
        )}
        {canWrite && suspended && (
          <Button size="sm" onClick={() => open("reactivate")}>
            <PlayCircle className="w-3.5 h-3.5" />
            Reactivate
          </Button>
        )}
        {canWrite && (
          <Button size="sm" onClick={() => open("sessions")}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out all sessions
          </Button>
        )}
        {canWrite && (
          <Button size="sm" onClick={() => open("reset")}>
            <KeyRound className="w-3.5 h-3.5" />
            Send password reset
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="danger-outline"
            disabled={protectedTarget || subscription.renewingPolar}
            onClick={() => open("delete")}
            title={protectedTarget || subscription.renewingPolar ? restrictions.join(" ") : undefined}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete account
          </Button>
        )}
      </div>
      {restrictions.length > 0 && <p className="text-xs text-neutral-500">{restrictions.join(" ")}</p>}

      <ActionDialog
        open={dialog === "verify"}
        title="Mark email as verified"
        description={
          <>
            Marks <strong>{account.email}</strong> as verified without the user clicking the link, and invalidates any outstanding verification links. Only do
            this when you&apos;re confident the address belongs to them.
          </>
        }
        confirmLabel="Verify email"
        requireReason
        onClose={close}
        onConfirm={(reason) => run(() => verifyUserEmail(id, reason), { success: "Email marked as verified", error: "Couldn't verify the email" })}
      />

      <ActionDialog
        open={dialog === "suspend"}
        title="Suspend account"
        danger
        description={
          <>
            <strong>{account.email}</strong> will be signed out everywhere immediately and can&apos;t sign in or refresh a session until reactivated. Their CVs,
            profiles and billing are kept untouched. A Polar subscription is <em>not</em> cancelled by suspending.
          </>
        }
        confirmLabel="Suspend account"
        requireReason
        reasonLabel="Reason (shown on the account and kept in the audit log)"
        onClose={close}
        onConfirm={(reason) => run(() => suspendUser(id, reason), { success: "Account suspended", error: "Couldn't suspend the account" })}
      />

      <ActionDialog
        open={dialog === "reactivate"}
        title="Reactivate account"
        description={
          <>
            <strong>{account.email}</strong> will be able to sign in again. The suspension reason is cleared from the account (it stays in the audit log).
          </>
        }
        confirmLabel="Reactivate"
        requireReason
        onClose={close}
        onConfirm={(reason) => run(() => reactivateUser(id, reason), { success: "Account reactivated", error: "Couldn't reactivate the account" })}
      />

      <ActionDialog
        open={dialog === "sessions"}
        title="Sign out all sessions"
        description={
          <>
            Ends all {account.activeSessions} active session{account.activeSessions === 1 ? "" : "s"} for <strong>{account.email}</strong> on every device. They
            can sign straight back in; nothing else changes.
          </>
        }
        confirmLabel="Sign out everywhere"
        onClose={close}
        onConfirm={() =>
          run(() => revokeUserSessions(id, optionalReason.trim() || undefined), { success: "All sessions signed out", error: "Couldn't revoke the sessions" })
        }
      >
        <OptionalReason value={optionalReason} onChange={setOptionalReason} />
      </ActionDialog>

      <ActionDialog
        open={dialog === "reset"}
        title="Send password reset"
        description={
          <>
            Emails <strong>{account.email}</strong> a one-time link to choose a new password. The link is valid for 60 minutes. You never see or set the password
            — only the user does.
            {!account.hasPassword && " This account currently signs in with Google only; the link lets them add a password."}
          </>
        }
        confirmLabel="Send reset link"
        onClose={close}
        onConfirm={() =>
          run(() => sendUserPasswordReset(id, optionalReason.trim() || undefined), {
            success: (r) =>
              r.delivery === "sent"
                ? toast.success("Password reset email sent", { description: `A one-time link went to ${account.email}.` })
                : toast.info("Reset link created, but the email was skipped", {
                    description: "Email delivery isn't configured on this server, so nothing reached the user.",
                  }),
            error: "Couldn't send the password reset",
          })
        }
      >
        <OptionalReason value={optionalReason} onChange={setOptionalReason} />
      </ActionDialog>

      <ActionDialog
        open={dialog === "delete"}
        title="Delete account permanently"
        danger
        description={
          <>
            This permanently deletes <strong>{account.email}</strong> and everything the account owns ({detail.content.cvCount} CVs,{" "}
            {detail.content.profileCount} profiles, imports, Chapa payment records, grants, sessions, notifications and email logs). It can&apos;t be undone.
            It follows the same rules as a user deleting their own account, and it&apos;s refused while a Polar subscription still renews.
          </>
        }
        confirmLabel="Delete permanently"
        requireReason
        confirmText={account.email}
        onClose={close}
        onConfirm={async (reason) => {
          try {
            await deleteUser(id, account.email, reason);
          } catch (err) {
            toast.error("Couldn't delete the account", { description: errorText(err) });
            throw err;
          }
          toast.success("Account deleted", { description: account.email });
          // Drop the detail query instead of refetching a user that no longer exists.
          queryClient.removeQueries({ queryKey: ["admin", "user", id] });
          await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
          router.push("/admin/users");
        }}
      >
        <Note tone="neutral">
          AI usage events stay for cost totals with the user unlinked, and the audit log keeps a record of this deletion. Orders already in Polar stay in the
          Polar dashboard.
        </Note>
      </ActionDialog>
    </div>
  );
}
