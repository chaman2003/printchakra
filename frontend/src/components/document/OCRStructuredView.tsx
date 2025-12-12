/**
 * OCR Structured View Component
 * Displays OCR results in a structured, readable format with confidence indicators
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Button,
  Collapse,
  Progress,
  useColorModeValue,
  IconButton,
  Tooltip,
  Flex,
  Heading,
} from '@chakra-ui/react';
import Iconify from '../common/Iconify';
import { OCRResult, OCRStructuredUnit, OCRRawResult } from '../../types';

interface OCRStructuredViewProps {
  ocrResult?: OCRResult;
  result?: OCRResult;  // Alternative prop name for compatibility
  filename?: string;
  onClose?: () => void;
  maxHeight?: string;
}

const UnitTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colorSchemes: Record<string, string> = {
    title: 'purple',
    heading: 'blue',
    paragraph: 'green',
    list_item: 'cyan',
    table_cell: 'orange',
    footer: 'gray',
    other: 'pink',
  };

  return (
    <Badge
      colorScheme={colorSchemes[type] || 'gray'}
      variant="subtle"
      fontSize="xx-small"
      textTransform="uppercase"
    >
      {type.replace('_', ' ')}
    </Badge>
  );
};

const ConfidenceIndicator: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percent = confidence * 100;
  let colorScheme = 'green';
  if (percent < 60) colorScheme = 'red';
  else if (percent < 80) colorScheme = 'orange';
  else if (percent < 95) colorScheme = 'yellow';

  return (
    <Tooltip label={`Confidence: ${percent.toFixed(1)}%`}>
      <HStack spacing={1} fontSize="xs">
        <Progress
          value={percent}
          size="xs"
          colorScheme={colorScheme}
          w="40px"
          borderRadius="full"
        />
        <Text color="text.muted" fontSize="xx-small">
          {percent.toFixed(0)}%
        </Text>
      </HStack>
    </Tooltip>
  );
};

const StructuredUnitCard: React.FC<{ unit: OCRStructuredUnit; index: number }> = ({ unit, index }) => {
  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  return (
    <Box
      p={3}
      bg={bgColor}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ borderColor: 'brand.400', bg: useColorModeValue('gray.100', 'whiteAlpha.100') }}
    >
      <HStack justify="space-between" mb={2}>
        <HStack spacing={2}>
          <Text fontSize="xs" color="text.muted">#{index + 1}</Text>
          <UnitTypeBadge type={unit.type} />
        </HStack>
        <ConfidenceIndicator confidence={unit.confidence} />
      </HStack>
      <Text fontSize="sm" lineHeight="tall">
        {unit.text}
      </Text>
    </Box>
  );
};

const RawResultItem: React.FC<{ result: OCRRawResult; index: number }> = ({ result, index }) => {
  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50');

  return (
    <HStack
      p={2}
      bg={bgColor}
      borderRadius="md"
      spacing={3}
      fontSize="sm"
    >
      <Text color="text.muted" fontSize="xs" minW="24px">
        {index + 1}
      </Text>
      <Text flex={1} noOfLines={1}>
        {result.text}
      </Text>
      <ConfidenceIndicator confidence={result.confidence} />
    </HStack>
  );
};

export const OCRStructuredView: React.FC<OCRStructuredViewProps> = ({
  ocrResult: ocrResultProp,
  result,
  filename,
  onClose,
  maxHeight = '400px',
}) => {
  const [viewMode, setViewMode] = useState<'structured' | 'raw' | 'full'>('structured');
  const [showStats, setShowStats] = useState(true);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  // Support both prop names
  const ocrResult = ocrResultProp || result;
  
  if (!ocrResult) {
    return (
      <Box p={4} textAlign="center">
        <Text color="text.muted">No OCR result available</Text>
      </Box>
    );
  }

  const hasStructured = ocrResult.structured_units && ocrResult.structured_units.length > 0;

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        p={3}
        borderBottom="1px solid"
        borderColor={borderColor}
        align="center"
        justify="space-between"
        bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
      >
        <HStack spacing={3}>
          <Iconify icon="solar:document-text-bold" boxSize={5} color="brand.400" />
          <Box>
            <Heading size="sm">{ocrResult.derived_title || 'OCR Results'}</Heading>
            <Text fontSize="xs" color="text.muted">
              {ocrResult.word_count} words • {ocrResult.raw_results.length} text regions
            </Text>
          </Box>
        </HStack>
        <HStack>
          {onClose && (
            <IconButton
              aria-label="Close"
              icon={<Iconify icon="solar:close-circle-bold" />}
              size="sm"
              variant="ghost"
              onClick={onClose}
            />
          )}
        </HStack>
      </Flex>

      {/* Stats bar */}
      <Collapse in={showStats}>
        <HStack
          p={2}
          borderBottom="1px solid"
          borderColor={borderColor}
          spacing={4}
          fontSize="xs"
          flexWrap="wrap"
        >
          <HStack>
            <Text color="text.muted">Confidence:</Text>
            <Badge colorScheme={ocrResult.confidence_avg >= 0.8 ? 'green' : 'orange'}>
              {(ocrResult.confidence_avg * 100).toFixed(1)}%
            </Badge>
          </HStack>
          <HStack>
            <Text color="text.muted">Processing:</Text>
            <Text>{ocrResult.processing_time_ms.toFixed(0)}ms</Text>
          </HStack>
          <HStack>
            <Text color="text.muted">Size:</Text>
            <Text>{ocrResult.image_dimensions[0]}×{ocrResult.image_dimensions[1]}</Text>
          </HStack>
        </HStack>
      </Collapse>

      {/* View mode tabs */}
      <HStack p={2} borderBottom="1px solid" borderColor={borderColor} spacing={1}>
        <Button
          size="xs"
          variant={viewMode === 'structured' ? 'solid' : 'ghost'}
          colorScheme={viewMode === 'structured' ? 'brand' : 'gray'}
          onClick={() => setViewMode('structured')}
          isDisabled={!hasStructured}
        >
          Structured
        </Button>
        <Button
          size="xs"
          variant={viewMode === 'raw' ? 'solid' : 'ghost'}
          colorScheme={viewMode === 'raw' ? 'brand' : 'gray'}
          onClick={() => setViewMode('raw')}
        >
          Raw Regions
        </Button>
        <Button
          size="xs"
          variant={viewMode === 'full' ? 'solid' : 'ghost'}
          colorScheme={viewMode === 'full' ? 'brand' : 'gray'}
          onClick={() => setViewMode('full')}
        >
          Full Text
        </Button>
        <Box flex={1} />
        <IconButton
          aria-label="Toggle stats"
          icon={<Iconify icon={showStats ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />}
          size="xs"
          variant="ghost"
          onClick={() => setShowStats(!showStats)}
        />
      </HStack>

      {/* Content */}
      <Box maxH={maxHeight} overflowY="auto" p={3}>
        {viewMode === 'structured' && hasStructured && (
          <VStack spacing={2} align="stretch">
            {ocrResult.structured_units.map((unit, i) => (
              <StructuredUnitCard key={i} unit={unit} index={i} />
            ))}
          </VStack>
        )}

        {viewMode === 'raw' && (
          <VStack spacing={1} align="stretch">
            {ocrResult.raw_results.map((result, i) => (
              <RawResultItem key={i} result={result} index={i} />
            ))}
          </VStack>
        )}

        {viewMode === 'full' && (
          <Box>
            <Text
              fontSize="sm"
              lineHeight="tall"
              whiteSpace="pre-wrap"
              fontFamily="mono"
              p={3}
              bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
              borderRadius="md"
            >
              {ocrResult.full_text || 'No text extracted'}
            </Text>
          </Box>
        )}

        {viewMode === 'structured' && !hasStructured && (
          <Text fontSize="sm" color="text.muted" textAlign="center" py={4}>
            No structured units available. View raw regions or full text.
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default OCRStructuredView;
