export type ClipEntry = {
  id: string;
  name: string;          // entry title
  content: string;       // single textarea (newline = multiple lines)
  masked: boolean;       // mask toggle for entire entry
  createdAt: number;
  updatedAt: number;
  autoExpireAt?: number; // undefined = manual only
};

export type AutoExpireOption = 'manual' | '1h' | '1d';

export type AppSettings = {
  autoClearClipboard: boolean;
  autoClearDelayMs: number; // 0 = disabled
  autoExpireTimer: AutoExpireOption;
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoClearClipboard: false,
  autoClearDelayMs: 0,
  autoExpireTimer: 'manual',
};
