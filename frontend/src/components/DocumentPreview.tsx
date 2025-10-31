/**
 * DocumentPreview Component
 * Responsive document preview with real-time settings updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  IconButton,
  Text,
  Button,
  ButtonGroup,
  useColorModeValue,
  Spinner,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import Iconify from './Iconify';

interface DocumentPage {
  pageNumber: number;
  thumbnailUrl?: string;
  fullUrl?: string;
}

interface DocumentPreviewProps {
  documents: Array<{
    filename: string;
    pages?: DocumentPage[];
    thumbnailUrl?: string;
  }>;
  previewSettings?: {
    layout?: 'portrait' | 'landscape';
    scale?: number;
    colorMode?: 'color' | 'grayscale' | 'bw';
    paperSize?: string;
  };
  isLoading?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documents, previewSettings, isLoading = false }) => {
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const bgColor = useColorModeValue('rgba(20, 24, 45, 0.3)', 'rgba(20, 24, 45, 0.5)');
  const borderColor = useColorModeValue('whiteAlpha.400', 'whiteAlpha.300');
  const thumbnailBg = useColorModeValue('rgba(30, 34, 50, 0.5)', 'rgba(30, 34, 50, 0.9)');
  const paperBg = useColorModeValue('white', '#ffffff');
  const toolbarBg = useColorModeValue('rgba(12,16,35,0.7)', 'rgba(12,16,35,0.95)');

  const currentDoc = documents[currentDocIndex];
  const totalPages = currentDoc?.pages?.length || 1;

  // Determine paper orientation and size based on settings
  const layout = previewSettings?.layout || 'portrait';
  const isLandscape = layout === 'landscape';
  
  // Calculate responsive paper dimensions - fit to container
  const getPaperDimensions = () => {
    // Fixed size that works at all zoom levels
    const baseWidth = isLandscape ? 420 : 300;
    const baseHeight = isLandscape ? 300 : 400;
    const scale = (zoomLevel / 100) * (previewSettings?.scale || 100) / 100;
    
    return {
      width: baseWidth * scale,
      height: baseHeight * scale,
    };
  };

  const paperDimensions = getPaperDimensions();

  const handleZoomIn = useCallback(() => {
    setZoomLevel((v) => Math.min(v + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((v) => Math.max(v - 10, 50));
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Reset zoom when documents change
  useEffect(() => {
    setZoomLevel(100);
  }, [documents]);

  if (documents.length === 0) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        h="100%" 
        minH="500px"
        bg={bgColor} 
        borderRadius="lg" 
        border="1px solid" 
        borderColor={borderColor}
        p={6}
        position="relative"
      >
        <Box
          width="300px"
          height="400px"
          bg={paperBg}
          borderRadius="sm"
          boxShadow="0 4px 16px rgba(0,0,0,0.1)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid"
          borderColor="gray.200"
        >
          <VStack spacing={3}>
            <Iconify icon="solar:document-bold" width={48} height={48} color="gray.300" />
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="500" color="gray.500">
              No Document Selected
            </Text>
            <Text fontSize="xs" color="gray.400" textAlign="center" maxW="220px">
              Select a document to see preview
            </Text>
          </VStack>
        </Box>
        
        <Text mt={4} fontSize="xs" color="text.muted" fontWeight="500">
          Ready to preview
        </Text>
      </Flex>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      bg="transparent"
      borderRadius="lg" 
      border="1px solid" 
      borderColor={borderColor} 
      overflow="hidden" 
      position="relative" 
      h="100%"
      display="flex"
      flexDirection="column"
      boxShadow="sm"
    >
      {/* Top Toolbar */}
      <Flex 
        px={{ base: 3, md: 4 }} 
        py={2.5}
        borderBottom="1px solid" 
        borderColor={borderColor} 
        bg="rgba(12,16,35,0.4)"
        backdropFilter="blur(10px)"
        justify="space-between" 
        align="center"
        flexShrink={0}
        gap={2}
        flexWrap="wrap"
      >
        <HStack spacing={2} minW={0} flex={1}>
          <Text 
            fontSize={{ base: 'xs', md: 'sm' }} 
            fontWeight="600" 
            noOfLines={1} 
            color="whiteAlpha.900"
            flex={1}
            minW={0}
          >
            {currentDoc?.filename}
          </Text>
          {documents.length > 1 && (
            <Badge colorScheme="purple" fontSize="xs" flexShrink={0}>
              {currentDocIndex + 1}/{documents.length}
            </Badge>
          )}
        </HStack>

        <HStack spacing={1} flexShrink={0}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Zoom Out">
              <IconButton 
                aria-label="Zoom out" 
                icon={<Iconify icon="solar:magnifer-zoom-out-bold" width={14} height={14} />}
                onClick={handleZoomOut} 
                isDisabled={zoomLevel <= 50}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                _dark={{ bg: 'whiteAlpha.100' }}
              />
            </Tooltip>
            <Button 
              minW={{ base: '50px', md: '60px' }}
              fontSize="xs"
              bg="whiteAlpha.200"
              color="white"
              fontWeight="500"
              _hover={{ bg: 'whiteAlpha.300' }}
              _dark={{ bg: 'whiteAlpha.100' }}
            >
              {zoomLevel}%
            </Button>
            <Tooltip label="Zoom In">
              <IconButton 
                aria-label="Zoom in" 
                icon={<Iconify icon="solar:magnifer-zoom-in-bold" width={14} height={14} />}
                onClick={handleZoomIn} 
                isDisabled={zoomLevel >= 200}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                _dark={{ bg: 'whiteAlpha.100' }}
              />
            </Tooltip>
          </ButtonGroup>

          {/* Page Number Display */}
          <Text 
            fontSize="sm" 
            fontWeight="medium"
            color="whiteAlpha.800"
            px={2}
          >
            {currentPage}/{totalPages}
          </Text>
        </HStack>
      </Flex>

      {/* Content Area */}
      <Flex flex={1} overflow="hidden" position="relative">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <VStack
            w="120px"
            borderRight="1px solid"
            borderColor={borderColor}
            bg={thumbnailBg}
            p={2}
            spacing={2}
            overflowY="auto"
            flexShrink={0}
            display={{ base: 'none', lg: 'flex' }}
            css={{
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-thumb': { 
                background: 'rgba(121,95,238,0.4)', 
                borderRadius: '10px',
              },
            }}
          >
            {currentDoc?.pages?.map((page) => (
              <Box
                key={page.pageNumber}
                w="100%"
                cursor="pointer"
                onClick={() => setCurrentPage(page.pageNumber)}
                border="2px solid"
                borderColor={currentPage === page.pageNumber ? 'brand.400' : 'transparent'}
                borderRadius="md"
                overflow="hidden"
                bg={bgColor}
                transition="all 0.2s"
                _hover={{ borderColor: 'brand.300' }}
              >
                <Box h="80px" bg="gray.100">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${page.pageNumber}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Flex align="center" justify="center" h="100%">
                      <Text fontSize="lg" color="gray.400">{page.pageNumber}</Text>
                    </Flex>
                  )}
                </Box>
                <Text fontSize="xs" textAlign="center" py={1} fontWeight={currentPage === page.pageNumber ? '600' : '400'}>
                  {page.pageNumber}
                </Text>
              </Box>
            ))}
          </VStack>
        )}

        {/* Main Preview */}
        <Flex 
          flex={1} 
          align="center" 
          justify="center" 
          p={6}
          minH="500px"
          overflow="hidden"
          bg={bgColor}
        >
          {isLoading ? (
            <VStack spacing={4}>
              <Spinner size="xl" color="brand.500" thickness="4px" />
              <Text color="text.muted">Loading preview...</Text>
            </VStack>
          ) : (
            <Box 
              width={`${paperDimensions.width}px`}
              height={`${paperDimensions.height}px`}
              maxW="100%"
              maxH="100%"
              transition="all 0.3s ease"
              borderRadius="sm"
              overflow="hidden"
              boxShadow="0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)"
              bg={paperBg}
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {currentDoc?.thumbnailUrl ? (
                <img 
                  src={currentDoc.thumbnailUrl} 
                  alt={currentDoc.filename} 
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'contain',
                    filter: previewSettings?.colorMode === 'grayscale' 
                      ? 'grayscale(100%)' 
                      : previewSettings?.colorMode === 'bw' 
                      ? 'grayscale(100%) contrast(2)' 
                      : 'none',
                  }} 
                />
              ) : (
                <VStack spacing={3}>
                  <Iconify icon="solar:document-bold" width={48} height={48} color="gray.300" />
                  <Text color="gray.500" fontSize="sm">Preview not available</Text>
                </VStack>
              )}
            </Box>
          )}
        </Flex>
      </Flex>

      {/* Bottom Footer */}
      {documents.length > 0 && (
        <Flex 
          px={{ base: 3, md: 4 }} 
          py={2}
          borderTop="1px solid" 
          borderColor={borderColor}
          bg="rgba(12,16,35,0.4)"
          backdropFilter="blur(10px)"
          justify="space-between"
          align="center"
          flexShrink={0}
          gap={2}
          flexWrap="wrap"
        >
          <HStack spacing={2} fontSize={{ base: 'xs', md: 'sm' }}>
            <Iconify icon="solar:document-bold" width={14} height={14} color="whiteAlpha.700" />
            <Text color="whiteAlpha.800" fontWeight="500">
              {documents.length} {documents.length === 1 ? 'sheet' : 'sheets'}
            </Text>
          </HStack>

          <HStack spacing={2} fontSize={{ base: 'xs', md: 'sm' }}>
            {previewSettings?.paperSize && (
              <Badge colorScheme="blue" fontSize="xs">
                {previewSettings.paperSize}
              </Badge>
            )}
            {previewSettings?.layout && (
              <Badge colorScheme="purple" fontSize="xs">
                {previewSettings.layout}
              </Badge>
            )}
            {previewSettings?.colorMode && previewSettings.colorMode !== 'color' && (
              <Badge colorScheme="gray" fontSize="xs">
                {previewSettings.colorMode}
              </Badge>
            )}
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

export default DocumentPreview;
