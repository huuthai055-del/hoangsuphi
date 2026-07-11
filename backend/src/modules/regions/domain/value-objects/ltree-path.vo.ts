export class LtreePath {
  private readonly value: string;

  constructor(value: string) {
    const normalized = value.replace(/-/g, '_');
    if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/.test(normalized)) {
      throw new Error(`Invalid ltree format: ${value}`);
    }
    this.value = normalized;
  }

  public getValue(): string {
    return this.value;
  }

  public getParentPath(): string | null {
    const parts = this.value.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  }
}
