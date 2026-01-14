export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentDiagnostics {
  componentName: string;
  selector: string;
  boundingBox: BoundingBox | null;
  isVisible: boolean;
  innerHTML: string;
  attributes: Record<string, string>;
}
