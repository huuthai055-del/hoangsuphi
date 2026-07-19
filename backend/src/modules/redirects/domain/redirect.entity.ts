export const REDIRECT_STATUS_CODES = [301, 302] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

export interface RedirectProps {
  id: string;
  sourcePath: string;
  targetPath: string;
  statusCode: RedirectStatusCode;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RedirectUpdateProps {
  sourcePath?: string;
  targetPath?: string;
  statusCode?: RedirectStatusCode;
  isActive?: boolean;
  now?: Date;
}

export class Redirect {
  private props: RedirectProps;

  private constructor(props: RedirectProps) {
    this.props = props;
  }

  public static create(props: {
    id: string;
    sourcePath: string;
    targetPath: string;
    statusCode?: RedirectStatusCode;
    isActive?: boolean;
    createdBy: string;
    now?: Date;
  }): Redirect {
    const now = props.now ?? new Date();
    return new Redirect({
      id: props.id,
      sourcePath: props.sourcePath,
      targetPath: props.targetPath,
      statusCode: props.statusCode ?? 301,
      isActive: props.isActive ?? true,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  public static rehydrate(props: RedirectProps): Redirect {
    return new Redirect({ ...props });
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get sourcePath(): string { return this.props.sourcePath; }
  public get targetPath(): string { return this.props.targetPath; }
  public get statusCode(): RedirectStatusCode { return this.props.statusCode; }
  public get isActive(): boolean { return this.props.isActive; }
  public get createdBy(): string { return this.props.createdBy; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }
  public get deletedAt(): Date | null | undefined { return this.props.deletedAt; }

  // Actions
  public update(props: RedirectUpdateProps): void {
    if (this.props.deletedAt) {
      throw new Error('Cannot modify a deleted redirect');
    }

    let changed = false;

    if (props.sourcePath !== undefined && props.sourcePath !== this.props.sourcePath) {
      this.props.sourcePath = props.sourcePath;
      changed = true;
    }

    if (props.targetPath !== undefined && props.targetPath !== this.props.targetPath) {
      this.props.targetPath = props.targetPath;
      changed = true;
    }

    if (props.statusCode !== undefined && props.statusCode !== this.props.statusCode) {
      this.props.statusCode = props.statusCode;
      changed = true;
    }

    if (props.isActive !== undefined && props.isActive !== this.props.isActive) {
      this.props.isActive = props.isActive;
      changed = true;
    }

    if (changed) {
      this.props.updatedAt = props.now ?? new Date();
    }
  }

  public softDelete(now: Date = new Date()): void {
    if (this.props.deletedAt) {
      throw new Error('Redirect is already deleted');
    }
    this.props.deletedAt = now;
    this.props.isActive = false; // also mark as inactive when deleted
    this.props.updatedAt = now;
  }

  public toPersistence(): RedirectProps {
    return { ...this.props };
  }
}
