/**
 * VoiceCommandsHelper Component
 * Displays available voice commands based on current context
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Collapse,
  IconButton,
  useDisclosure,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import Iconify from '../common/Iconify';

interface VoiceCommandsHelperProps {
  mode: 'print' | 'scan' | null;
  step: number;
  isExpanded?: boolean;
  compact?: boolean;
}

interface CommandCategory {
  title: string;
  icon: string;
  commands: { phrase: string; description: string }[];
}

const getCommandCategories = (
  mode: 'print' | 'scan' | null,
  step: number
): CommandCategory[] => {
  const categories: CommandCategory[] = [];

  // Navigation commands (always available)
  categories.push({
    title: 'Navigation',
    icon: 'solar:cursor-bold-duotone',
    commands: [
      { phrase: 'scroll down', description: 'Scroll content down' },
      { phrase: 'scroll up', description: 'Scroll content up' },
      { phrase: 'go back', description: 'Return to previous step' },
      { phrase: 'next / continue', description: 'Move to next step' },
    ],
  });

  // Document commands
  if (mode) {
    categories.push({
      title: 'Documents',
      icon: 'solar:document-bold-duotone',
      commands: [
        { phrase: 'select document', description: 'Open document selector' },
        { phrase: 'select [number]', description: 'Select specific document' },
        { phrase: 'next document', description: 'Select next document' },
        { phrase: 'previous document', description: 'Select previous document' },
        { phrase: 'switch to converted', description: 'Show converted files' },
        { phrase: 'switch to current', description: 'Show original files' },
      ],
    });
  }

  // Settings commands based on mode
  if (mode === 'print') {
    categories.push({
      title: 'Print Settings',
      icon: 'solar:printer-bold-duotone',
      commands: [
        { phrase: 'portrait / landscape', description: 'Change orientation' },
        { phrase: 'color / grayscale / black and white', description: 'Change color mode' },
        { phrase: 'A4 / letter / legal', description: 'Change paper size' },
        { phrase: '[number] copies', description: 'Set number of copies' },
        { phrase: 'double sided', description: 'Enable duplex printing' },
        { phrase: 'high quality / draft', description: 'Change print quality' },
        { phrase: '[number] DPI', description: 'Set resolution' },
      ],
    });
  } else if (mode === 'scan') {
    categories.push({
      title: 'Scan Settings',
      icon: 'solar:scanner-bold-duotone',
      commands: [
        { phrase: 'portrait / landscape', description: 'Change orientation' },
        { phrase: 'color / grayscale', description: 'Change color mode' },
        { phrase: 'enable OCR', description: 'Turn on text recognition' },
        { phrase: 'disable OCR', description: 'Turn off text recognition' },
        { phrase: 'high quality', description: 'Set high resolution' },
        { phrase: '300 / 600 DPI', description: 'Set specific resolution' },
      ],
    });
  }

  // Workflow commands
  categories.push({
    title: 'Actions',
    icon: 'solar:play-bold-duotone',
    commands: [
      { phrase: 'confirm', description: `Start ${mode || 'operation'}` },
      { phrase: 'cancel', description: 'Cancel and close' },
      { phrase: 'status', description: 'Get current status' },
      { phrase: 'repeat settings', description: 'Hear current settings' },
      { phrase: 'help', description: 'Get command help' },
    ],
  });

  return categories;
};

const VoiceCommandsHelper: React.FC<VoiceCommandsHelperProps> = ({
  mode,
  step,
  isExpanded: initialExpanded = false,
  compact = false,
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: initialExpanded });
  const categories = getCommandCategories(mode, step);

  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('brand.200', 'brand.700');
  const headerBg = useColorModeValue('brand.50', 'brand.900');
  const categoryBg = useColorModeValue('gray.50', 'gray.700');
  const phraseBg = useColorModeValue('brand.100', 'brand.800');
  const phraseColor = useColorModeValue('brand.700', 'brand.200');

  if (compact) {
    return (
      <Tooltip
        label="Voice commands available - click for help"
        placement="top"
        hasArrow
      >
        <IconButton
          aria-label="Voice commands help"
          icon={<Iconify icon="solar:question-circle-bold-duotone" width={20} height={20} />}
          size="sm"
          variant="ghost"
          colorScheme="brand"
          onClick={onToggle}
        />
      </Tooltip>
    );
  }

  return (
    <Box
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      bg={bgColor}
      overflow="hidden"
      boxShadow="sm"
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        bg={headerBg}
        cursor="pointer"
        onClick={onToggle}
        justify="space-between"
        _hover={{ bg: useColorModeValue('brand.100', 'brand.800') }}
        transition="all 0.2s"
      >
        <HStack spacing={2}>
          <Iconify icon="solar:microphone-3-bold-duotone" width={20} height={20} />
          <Text fontWeight="600" fontSize="sm">
            Voice Commands
          </Text>
          {mode && (
            <Badge colorScheme={mode === 'print' ? 'blue' : 'purple'} fontSize="xs">
              {mode.toUpperCase()}
            </Badge>
          )}
        </HStack>
        <Iconify
          icon={isOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
          width={16}
          height={16}
        />
      </HStack>

      {/* Content */}
      <Collapse in={isOpen}>
        <VStack spacing={3} p={4} align="stretch">
          {categories.map((category, idx) => (
            <Box key={idx}>
              <HStack spacing={2} mb={2}>
                <Iconify icon={category.icon} width={16} height={16} />
                <Text fontWeight="600" fontSize="xs" textTransform="uppercase" color="text.muted">
                  {category.title}
                </Text>
              </HStack>
              <VStack spacing={1} align="stretch" pl={6}>
                {category.commands.map((cmd, cmdIdx) => (
                  <HStack key={cmdIdx} spacing={2} fontSize="sm">
                    <Badge
                      bg={phraseBg}
                      color={phraseColor}
                      fontWeight="500"
                      px={2}
                      py={0.5}
                      borderRadius="md"
                      fontSize="xs"
                    >
                      "{cmd.phrase}"
                    </Badge>
                    <Text color="text.muted" fontSize="xs">
                      {cmd.description}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          ))}

          <Text fontSize="xs" color="text.muted" textAlign="center" pt={2} borderTop="1px solid" borderColor={borderColor}>
            💡 Tip: Speak naturally - "set color to grayscale" or "make it landscape"
          </Text>
        </VStack>
      </Collapse>
    </Box>
  );
};

export default VoiceCommandsHelper;
