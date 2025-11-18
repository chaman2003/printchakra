import { SystemStyleObject } from '@chakra-ui/react';
// Import registry data
import { componentStyleRegistry } from './registryData';
import { StyleResolutionOptions } from './types';
import { interpretCommandText, mergeStyles, resolveCommandList } from './styleLibrary';

const commandOverrides: Record<string, string[]> = {};
const styleOverrides: Record<string, SystemStyleObject> = {};

export const getComponentStyle = (
  componentKey: string,
  options: StyleResolutionOptions = {}
): SystemStyleObject => {
  const registryEntry = componentStyleRegistry[componentKey];
  const base = registryEntry?.base ?? {};
  const defaultCommands = registryEntry?.commands ?? [];
  const overrideCommands = commandOverrides[componentKey] ?? [];
  const requestedCommands = options.commands ?? [];

  const resolvedBase = mergeStyles(base, resolveCommandList(defaultCommands));
  const resolvedOverrides = resolveCommandList([...overrideCommands, ...requestedCommands]);
  const merged = mergeStyles(resolvedBase, resolvedOverrides);
  const manualOverrides = styleOverrides[componentKey];
  const finalStyle = mergeStyles(merged, manualOverrides);

  if (options.overrides) {
    return mergeStyles(finalStyle, options.overrides);
  }

  return finalStyle;
};

export const updateComponentStyle = (
  componentKey: string,
  overrides: SystemStyleObject
): void => {
  styleOverrides[componentKey] = mergeStyles(styleOverrides[componentKey] ?? {}, overrides);
};

export const applyEnglishStyleCommand = (componentKey: string, commandText: string): void => {
  const parsed = interpretCommandText(commandText);
  if (!parsed.length) {
    return;
  }
  commandOverrides[componentKey] = [...(commandOverrides[componentKey] ?? []), ...parsed];
};

export const resetComponentOverride = (componentKey: string): void => {
  delete commandOverrides[componentKey];
  delete styleOverrides[componentKey];
};
