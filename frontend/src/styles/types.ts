import { SystemStyleObject } from '@chakra-ui/react';

export type StyleCommandKey = string;

export interface ComponentStyleConfig {
  description: string;
  base?: SystemStyleObject;
  commands?: StyleCommandKey[];
}

export interface StyleResolutionOptions {
  commands?: StyleCommandKey[];
  overrides?: SystemStyleObject;
}
