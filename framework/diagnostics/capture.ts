import type { BaseComponent } from '../core/BaseComponent.js';
import type { ComponentDiagnostics } from './types.js';

export async function captureComponentState(
  component: BaseComponent
): Promise<ComponentDiagnostics> {
  const locator = component.locator;

  const [boundingBox, isVisible, innerHTML, attributes] = await Promise.all([
    locator.boundingBox(),
    locator.isVisible(),
    locator.innerHTML(),
    locator.evaluate((el) =>
      Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]))
    ),
  ]);

  return {
    componentName: component.constructor.name,
    selector: (component as any).rootSelector ?? 'unknown',
    boundingBox,
    isVisible,
    innerHTML,
    attributes,
  };
}
