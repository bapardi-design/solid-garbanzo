import crypto from "node:crypto";
import fs from "node:fs";
import type { Storage } from "./types.js";

export function cloudinarySignature(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export class CloudinaryStorage implements Storage {
  readonly name = "cloudinary";
  constructor(private cloudName: string, private apiKey: string, private apiSecret: string, private folder: string) {}

  async upload(localFile: string, key: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = key.replace(/\.[a-z0-9]+$/i, "");
    const params = { folder: this.folder, overwrite: "true", public_id: publicId, timestamp };
    const form = new FormData();
    form.set("file", new Blob([fs.readFileSync(localFile)], { type: "image/png" }), "image.png");
    form.set("api_key", this.apiKey);
    for (const [k, v] of Object.entries(params)) form.set(k, String(v));
    form.set("signature", cloudinarySignature(params, this.apiSecret));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as { secure_url: string };
    return json.secure_url;
  }
}
