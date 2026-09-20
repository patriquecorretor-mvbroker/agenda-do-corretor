import { useState } from "react";

export function ClientAvatar({ name, photo }: { name: string; photo?: string }) {
  const [failed, setFailed] = useState<string>();
  return photo && failed !== photo ? (
    <img src={photo} alt={name} className="h-full w-full rounded-full object-cover" draggable={false} onError={() => setFailed(photo)} />
  ) : (
    <span className="grid h-full w-full place-items-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
      {name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}
    </span>
  );
}
