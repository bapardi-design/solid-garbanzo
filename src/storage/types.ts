export interface Storage {
  readonly name: string;
  /** Returns a public URL for the file, or undefined if this storage can't provide one. */
  upload(localFile: string, key: string): Promise<string | undefined>;
}
