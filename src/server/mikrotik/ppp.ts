import type { MikrotikConnectInput, MikrotikCommandResult } from "@/server/mikrotik/api";
import { runMikrotikCommand } from "@/server/mikrotik/api";

export async function createPppSecret(
  input: MikrotikConnectInput,
  secret: {
    name: string;
    password: string;
    service?: string;
    profile?: string;
    comment?: string;
    localAddress?: string;
    remoteAddress?: string;
  },
): Promise<MikrotikCommandResult> {
  const service = secret.service || "l2tp";
  const words = [
    "/ppp/secret/add",
    `=name=${secret.name}`,
    `=password=${secret.password}`,
    `=service=${service}`,
    `=profile=${secret.profile || "default"}`,
  ];
  if (secret.comment) words.push(`=comment=${secret.comment}`);
  if (secret.localAddress) words.push(`=local-address=${secret.localAddress}`);
  if (secret.remoteAddress) words.push(`=remote-address=${secret.remoteAddress}`);
  return runMikrotikCommand(input, words);
}
