export type ClipEntry = {
  id: string;
  name: string;          // entry title
  content: string;       // single textarea (newline = multiple lines)
  masked: boolean;       // mask toggle for entire entry
  createdAt: number;
  updatedAt: number;
};

export type AppSettings = Record<string, never>;

export const DEFAULT_SETTINGS: AppSettings = {};
