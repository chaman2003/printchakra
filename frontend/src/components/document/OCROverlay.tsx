/**
 * OCR Overlay Component
 * Displays bounding boxes and text overlay on document thumbnails/previews
 */

import React from 'react';
import { Box, Text, Badge, Tooltip } from '@chakra-ui/react';
import { OCRRawResult, OCRStructuredUnit, OCRBoundingBox } from '../../types';

interface OCROverlayProps {
  /** Raw OCR results with bounding boxes */
  rawResults?: OCRRawResult[];
  /** Structured text units */
  structuredUnits?: OCRStructuredUnit[];
  /** Image dimensions [width, height] */
  imageDimensions: [number, number];
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Show raw boxes or structured units */
  mode?: 'raw' | 'structured';
  /** Show text labels on hover */
  showLabels?: boolean;
  /** Opacity of overlay */
  opacity?: number;
}

const getColorForType = (type: string): string => {
  const colors: Record<string, string> = {
    title: 'purple.400',
    heading: 'blue.400',
    paragraph: 'green.400',
    list_item: 'cyan.400',
    table_cell: 'orange.400',
    footer: 'gray.400',
    other: 'pink.400',
  };
  return colors[type] || 'green.400';
};

const getBorderColorForConfidence = (confidence: number): string => {
  if (confidence >= 0.95) return 'green.400';
  if (confidence >= 0.8) return 'yellow.400';
  if (confidence >= 0.6) return 'orange.400';
  return 'red.400';
};

interface BoxOverlayProps {
  bbox: OCRBoundingBox;
  text: string;
  confidence: number;
  type?: string;
  imageDimensions: [number, number];
  containerWidth: number;
  containerHeight: number;
  showLabel: boolean;
}

const BoxOverlay: React.FC<BoxOverlayProps> = ({
  bbox,
  text,
  confidence,
  type,
  imageDimensions,
  containerWidth,
  containerHeight,
  showLabel,
}) => {
  // Calculate scale factors
  const scaleX = containerWidth / imageDimensions[0];
  const scaleY = containerHeight / imageDimensions[1];
  
  // Scale bounding box coordinates
  const scaledBox = {
    left: bbox.x * scaleX,
    top: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };

  const borderColor = type ? getColorForType(type) : getBorderColorForConfidence(confidence);

  return (
    <Tooltip
      label={
        <Box>
          <Text fontWeight="bold" fontSize="sm">{text}</Text>
          <Text fontSize="xs" color="gray.300">
            Confidence: {(confidence * 100).toFixed(1)}%
            {type && ` • ${type}`}
          </Text>
        </Box>
      }
      hasArrow
      placement="top"
      bg="gray.800"
    >
      <Box
        position="absolute"
        left={`${scaledBox.left}px`}
        top={`${scaledBox.top}px`}
        width={`${scaledBox.width}px`}
        height={`${scaledBox.height}px`}
        border="2px solid"
        borderColor={borderColor}
        borderRadius="sm"
        bg={`${borderColor.replace('.400', '.500')}20`}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          bg: `${borderColor.replace('.400', '.500')}40`,
          borderWidth: '3px',
          zIndex: 10,
        }}
      >
        {showLabel && (
          <Text
            position="absolute"
            bottom="100%"
            left="0"
            fontSize="xx-small"
            bg="blackAlpha.700"
            color="white"
            px={1}
            borderRadius="sm"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxW={`${scaledBox.width}px`}
          >
            {text}
          </Text>
        )}
      </Box>
    </Tooltip>
  );
};

export const OCROverlay: React.FC<OCROverlayProps> = ({
  rawResults = [],
  structuredUnits = [],
  imageDimensions,
  containerWidth,
  containerHeight,
  mode = 'raw',
  showLabels = false,
  opacity = 0.8,
}) => {
  if (imageDimensions[0] === 0 || imageDimensions[1] === 0) {
    return null;
  }

  const items = mode === 'structured' && structuredUnits.length > 0
    ? structuredUnits.map((unit, i) => ({
        key: `unit-${i}`,
        bbox: unit.bbox,
        text: unit.text,
        confidence: unit.confidence,
        type: unit.type,
      }))
    : rawResults.map((result, i) => ({
        key: `raw-${i}`,
        bbox: result.bbox,
        text: result.text,
        confidence: result.confidence,
        type: undefined,
      }));

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
      opacity={opacity}
    >
      <Box position="relative" width="100%" height="100%" pointerEvents="auto">
        {items.map(item => (
          <BoxOverlay
            key={item.key}
            bbox={item.bbox}
            text={item.text}
            confidence={item.confidence}
            type={item.type}
            imageDimensions={imageDimensions}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            showLabel={showLabels}
          />
        ))}
      </Box>
    </Box>
  );
};

interface OCRReadyBadgeProps {
  wordCount?: number;
  confidence?: number;
  title?: string;
  onClick?: () => void;
}

export const OCRReadyBadge: React.FC<OCRReadyBadgeProps> = ({ wordCount, confidence, title, onClick }) => {
  return (
    <Badge
      colorScheme="green"
      borderRadius="full"
      px={2}
      py={0.5}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      _hover={onClick ? { bg: 'green.600' } : undefined}
      display="flex"
      alignItems="center"
      gap={1}
      title={title}
    >
      <Box as="span" fontSize="10px">✓</Box>
      OCR ready
      {title && (
        <Text as="span" fontWeight="normal" ml={1} noOfLines={1} maxW="120px">
          • {title}
        </Text>
      )}
    </Badge>
  );
};

export default OCROverlay;
