"use client";

interface TypingUser {
  userId: string;
  displayName: string;
  avatarUrl: string;
}

export function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0].displayName
      : users.length === 2
        ? `${users[0].displayName} og ${users[1].displayName}`
        : `${users[0].displayName} og ${users.length - 1} andre`;

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs animate-fade-in"
      style={{ color: "var(--text-muted)" }}
    >
      <div className="flex -space-x-1.5">
        {users.slice(0, 3).map((u) =>
          u.avatarUrl ? (
            <img
              key={u.userId}
              src={u.avatarUrl}
              alt=""
              className="w-4 h-4 rounded-full ring-1 ring-[var(--bg-primary)]"
            />
          ) : (
            <div
              key={u.userId}
              className="w-4 h-4 rounded-full avatar-gradient ring-1 ring-[var(--bg-primary)] flex items-center justify-center text-[7px] font-bold text-white"
            >
              {u.displayName[0].toUpperCase()}
            </div>
          )
        )}
      </div>
      <span>
        {names} skriver
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }}>.</span>
        </span>
      </span>
    </div>
  );
}
