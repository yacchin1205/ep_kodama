export enum CompletionContentType {
  Text = "text",
  Image = "image",
}

export type CompletionContent = {
  type: CompletionContentType;
  value: string;
};

export interface CompletionQuery {
  content: CompletionContent[];
}

export interface CompletionService {
  completion(query: CompletionQuery): Promise<string>;
}
