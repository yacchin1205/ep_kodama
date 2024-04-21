export type CompletionResponse = {
  query: string;
  result: string;
};

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

export function requestCompletion(
  query: CompletionQuery
): Promise<CompletionResponse> {
  return new Promise((resolve, reject) => {
    $.post(
      "/kodama/completion",
      { query: JSON.stringify(query) },
      (data: CompletionResponse) => {
        console.log("completion result:", data);
        resolve(data);
      }
    ).fail((err) => {
      reject(err);
    });
  });
}
