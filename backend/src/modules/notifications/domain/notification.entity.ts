import {
  ImmutableNotificationError,
  InvalidNotificationMessageError,
  InvalidNotificationStateError,
  InvalidNotificationTitleError,
  InvalidNotificationUserError,
} from './notification.errors';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface NotificationProps {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  dismissedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Notification {
  private props: NotificationProps;

  private constructor(props: NotificationProps) {
    this.props = props;
  }

  public static create(input: {
    id: string;
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    now?: Date;
  }): Notification {
    const trimmedTitle = (input.title || '').trim();
    if (!trimmedTitle) {
      throw new InvalidNotificationTitleError('Notification title is required');
    }

    const trimmedMessage = (input.message || '').trim();
    if (!trimmedMessage) {
      throw new InvalidNotificationMessageError('Notification message is required');
    }

    if (!input.userId || !input.userId.trim()) {
      throw new InvalidNotificationUserError('User ID is required');
    }

    const now = input.now || new Date();

    return new Notification({
      id: input.id,
      userId: input.userId,
      title: trimmedTitle,
      message: trimmedMessage,
      type: input.type || 'INFO',
      isRead: false,
      dismissedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  public static rehydrate(props: NotificationProps): Notification {
    if (!props.title || !props.title.trim()) {
      throw new InvalidNotificationTitleError('Rehydrated notification title is required');
    }
    if (!props.message || !props.message.trim()) {
      throw new InvalidNotificationMessageError('Rehydrated notification message is required');
    }
    return new Notification({ ...props });
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  public get id(): string {
    return this.props.id;
  }
  public get userId(): string {
    return this.props.userId;
  }
  public get title(): string {
    return this.props.title;
  }
  public get message(): string {
    return this.props.message;
  }
  public get type(): NotificationType {
    return this.props.type;
  }
  public get isRead(): boolean {
    return this.props.isRead;
  }
  public get dismissedAt(): Date | null {
    return this.props.dismissedAt;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  // ─── Guards ──────────────────────────────────────────────────────────────────

  private ensureMutable(): void {
    if (this.props.deletedAt) {
      throw new ImmutableNotificationError('Cannot modify a deleted notification');
    }
  }

  private ensureNotDismissed(): void {
    if (this.props.dismissedAt) {
      throw new InvalidNotificationStateError(
        'Cannot modify a dismissed notification (terminal state)'
      );
    }
  }

  // ─── Domain Mutations ────────────────────────────────────────────────────────

  public markAsRead(now?: Date): void {
    this.ensureMutable();
    this.ensureNotDismissed();

    if (!this.props.isRead) {
      this.props.isRead = true;
      this.props.updatedAt = now || new Date();
    }
  }

  public markAsUnread(now?: Date): void {
    this.ensureMutable();
    this.ensureNotDismissed();

    if (this.props.isRead) {
      this.props.isRead = false;
      this.props.updatedAt = now || new Date();
    }
  }

  public dismiss(now?: Date): void {
    this.ensureMutable();
    if (this.props.dismissedAt) {
      throw new InvalidNotificationStateError('Notification is already dismissed');
    }

    const updateTime = now || new Date();
    this.props.dismissedAt = updateTime;
    this.props.updatedAt = updateTime;
  }

  public softDelete(now?: Date): void {
    if (this.props.deletedAt) {
      return; // Idempotent: return early
    }
    const updateTime = now || new Date();
    this.props.deletedAt = updateTime;
    this.props.updatedAt = updateTime;
  }

  public equals(other: Notification): boolean {
    return this.id === other.id;
  }

  public toPersistence(): NotificationProps {
    return { ...this.props };
  }
}
