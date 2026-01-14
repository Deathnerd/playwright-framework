import 'reflect-metadata';
import type { ComponentOptions } from './types.js';

const COMPONENT_METADATA_KEY = Symbol('component:metadata');

export interface ComponentMetadata {
  selector: string;
  multiple: boolean;
  propertyKey: string;
}

export function Component(selector: string, options: ComponentOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const metadata: ComponentMetadata = {
      selector,
      multiple: options.multiple ?? false,
      propertyKey: String(propertyKey),
    };

    // Store metadata for this property
    const existingMetadata = Reflect.getMetadata(COMPONENT_METADATA_KEY, target) ?? {};
    existingMetadata[String(propertyKey)] = metadata;
    Reflect.defineMetadata(COMPONENT_METADATA_KEY, existingMetadata, target);
  };
}

export function getComponentMetadata(
  target: object,
  propertyKey: string
): ComponentMetadata | undefined;
export function getComponentMetadata(target: object): Record<string, ComponentMetadata>;
export function getComponentMetadata(
  target: object,
  propertyKey?: string
): ComponentMetadata | Record<string, ComponentMetadata> | undefined {
  const allMetadata = Reflect.getMetadata(COMPONENT_METADATA_KEY, target) as
    | Record<string, ComponentMetadata>
    | undefined;

  if (propertyKey !== undefined) {
    return allMetadata?.[propertyKey];
  }

  return allMetadata ?? {};
}
