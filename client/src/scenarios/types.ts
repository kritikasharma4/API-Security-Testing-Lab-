export interface ScenarioResult {
  name: string;
  pass: boolean;
  detail: string;
}

export type ScenarioFn = (baseURL: string) => Promise<ScenarioResult>;
