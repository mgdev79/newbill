import { createHash } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

export type MikrotikConnectInput = {
  host: string;
  port: number;
  user: string;
  password: string;
  useSsl: boolean;
  timeoutMs: number;
};

export type MikrotikTestResult = {
  ok: boolean;
  message: string;
  identity?: string;
  version?: string;
  board?: string;
  uptime?: string;
  cpuLoad?: string;
  freeMemory?: string;
};

export type MikrotikCommandResult = {
  ok: boolean;
  message: string;
  replies: Record<string, string>[];
};

function encodeLength(length: number) {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) {
    return Buffer.from([0x80 | (length >> 8), length & 0xff]);
  }
  if (length < 0x200000) {
    return Buffer.from([0xc0 | (length >> 16), (length >> 8) & 0xff, length & 0xff]);
  }
  if (length < 0x10000000) {
    return Buffer.from([
      0xe0 | (length >> 24),
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }
  return Buffer.from([
    0xf0,
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
  ]);
}

function encodeSentence(words: string[]) {
  const parts = words.map((word) => {
    const payload = Buffer.from(word, "utf8");
    return Buffer.concat([encodeLength(payload.length), payload]);
  });
  return Buffer.concat([...parts, encodeLength(0)]);
}

class SentenceReader {
  private buf = Buffer.alloc(0);

  push(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk]);
  }

  private readLength(): number | null {
    if (this.buf.length < 1) return null;
    const b0 = this.buf[0];
    if ((b0 & 0x80) === 0) {
      this.buf = this.buf.subarray(1);
      return b0;
    }
    if ((b0 & 0xc0) === 0x80) {
      if (this.buf.length < 2) return null;
      const length = ((b0 & ~0xc0) << 8) + this.buf[1];
      this.buf = this.buf.subarray(2);
      return length;
    }
    if ((b0 & 0xe0) === 0xc0) {
      if (this.buf.length < 3) return null;
      const length = ((b0 & ~0xe0) << 16) + (this.buf[1] << 8) + this.buf[2];
      this.buf = this.buf.subarray(3);
      return length;
    }
    if ((b0 & 0xf0) === 0xe0) {
      if (this.buf.length < 4) return null;
      const length =
        ((b0 & ~0xf0) << 24) + (this.buf[1] << 16) + (this.buf[2] << 8) + this.buf[3];
      this.buf = this.buf.subarray(4);
      return length;
    }
    if (this.buf.length < 5) return null;
    const length =
      (this.buf[1] << 24) + (this.buf[2] << 16) + (this.buf[3] << 8) + this.buf[4];
    this.buf = this.buf.subarray(5);
    return length;
  }

  nextSentence(): string[] | null {
    const snapshot = this.buf;
    const words: string[] = [];
    for (;;) {
      const length = this.readLength();
      if (length === null) {
        this.buf = snapshot;
        return null;
      }
      if (length === 0) return words;
      if (this.buf.length < length) {
        this.buf = snapshot;
        return null;
      }
      words.push(this.buf.subarray(0, length).toString("utf8"));
      this.buf = this.buf.subarray(length);
    }
  }
}

function attrs(words: string[]) {
  const map: Record<string, string> = {};
  for (const word of words) {
    if (!word.startsWith("=")) continue;
    const cut = word.indexOf("=", 1);
    if (cut < 0) continue;
    map[word.slice(1, cut)] = word.slice(cut + 1);
  }
  return map;
}

/** Jalankan satu perintah API setelah login (mis. /ppp/secret/add). */
export async function runMikrotikCommand(
  input: MikrotikConnectInput,
  words: string[],
): Promise<MikrotikCommandResult> {
  const timeoutMs = Math.min(Math.max(input.timeoutMs, 1000), 30000);

  return new Promise((resolve) => {
    const reader = new SentenceReader();
    let settled = false;
    let socket: net.Socket | tls.TLSSocket;
    const replies: Record<string, string>[] = [];

    const finish = (result: MikrotikCommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        message: `Timeout ${timeoutMs}ms ke ${input.host}:${input.port}`,
        replies,
      });
    }, timeoutMs);

    const onConnect = () => {
      socket.write(
        encodeSentence(["/login", `=name=${input.user}`, `=password=${input.password}`]),
      );
    };

    if (input.useSsl) {
      socket = tls.connect(
        {
          host: input.host,
          port: input.port,
          rejectUnauthorized: false,
        },
        onConnect,
      );
    } else {
      socket = net.connect({ host: input.host, port: input.port }, onConnect);
    }

    socket.on("error", (error) => {
      finish({ ok: false, message: error.message, replies });
    });

    let loginDone = false;
    let commandSent = false;

    socket.on("data", (chunk) => {
      reader.push(chunk);
      let sentence: string[] | null;
      while ((sentence = reader.nextSentence())) {
        const tag = sentence[0] ?? "";
        const map = attrs(sentence);

        if (tag === "!trap" || tag === "!fatal") {
          finish({
            ok: false,
            message: map.message || map.detail || "Perintah API ditolak",
            replies: [...replies, map],
          });
          return;
        }

        if (!loginDone && tag === "!done") {
          if (map.ret) {
            const challenge = Buffer.from(map.ret, "hex");
            const hash = createHash("md5")
              .update(Buffer.concat([Buffer.from([0]), Buffer.from(input.password), challenge]))
              .digest("hex");
            socket.write(
              encodeSentence(["/login", `=name=${input.user}`, `=response=${hash}`]),
            );
            return;
          }
          loginDone = true;
          commandSent = true;
          socket.write(encodeSentence(words));
          continue;
        }

        if (loginDone && commandSent) {
          if (tag === "!re") {
            replies.push(map);
            continue;
          }
          if (tag === "!done") {
            finish({
              ok: true,
              message: "OK",
              replies,
            });
          }
        }
      }
    });
  });
}

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

export async function testMikrotikApi(
  input: MikrotikConnectInput,
): Promise<MikrotikTestResult> {
  const result = await runMikrotikCommand(input, ["/system/resource/print"]);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const resource = result.replies[0] ?? {};
  const identity = await runMikrotikCommand(input, ["/system/identity/print"]);
  const name = identity.replies[0]?.name || resource.identity;

  return {
    ok: true,
    message: "API MikroTik merespons",
    identity: name,
    version: resource.version,
    board: resource["board-name"],
    uptime: resource.uptime,
    cpuLoad: resource["cpu-load"],
    freeMemory: resource["free-memory"],
  };
}
