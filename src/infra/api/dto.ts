export interface CreatePagePayload {
  title: string;
  content: string;
  visibility?: 'public' | 'private';
  tags?: string[];
  space_id?: number;
}

export interface UpdatePagePayload {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface PageResponse {
  slug: string;
  title: string;
  content: string;
}
