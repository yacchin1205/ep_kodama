export type CompletionResponse = {
  query: string;
  result: string;
};

export function requestCompletion(query: string): Promise<CompletionResponse> {
  return new Promise((resolve, reject) => {
    $.getJSON(
      `/kodama/completion?query=${encodeURIComponent(query)}`,
      (data: CompletionResponse) => {
        resolve(data);
      }
    ).fail((err) => {
      reject(err);
    });
  });
}
