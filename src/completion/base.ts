export interface CompletionService {
  completion(query: string): Promise<string>;
}
