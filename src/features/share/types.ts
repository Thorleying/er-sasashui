/**
 * 分享只读链接的前端类型，与 docs/contracts/api.md 对齐。
 */
export type SharePayload = {
  inputText: string;
  isColored: boolean;
  showComment: boolean;
  hideFields: boolean;
  nodes: Array<{ id: string; x?: number; y?: number; label?: string }>;
};

export type CreateShareResult = {
  token: string;
  urlPath: string;
  expiresAt: string | null;
};

export type PublicShare = {
  token: string;
  title: string | null;
  payload: SharePayload;
  viewCount: number;
  createdAt: string;
};
