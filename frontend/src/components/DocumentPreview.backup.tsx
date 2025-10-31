/**
 * DocumentPreview Component
 * Responsive document preview with thumbnails, zoom and fullscreen.
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
import { FiZoomIn, FiZoomOut, FiMaximize, FiMinimize } from 'react-icons/fi';
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

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  documents,
  previewSettings,
  isLoading = false,
}) => {
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [zoomMode, setZoomMode] = useState<'fit-width' | 'fit-page' | 'custom'>('fit-width');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 600 });

  const bgColor = useColorModeValue('#e5e5e5', 'rgba(20, 24, 45, 0.95)');
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const thumbnailBg = useColorModeValue('white', 'rgba(30, 34, 50, 0.9)');
  const paperBg = useColorModeValue('white', '#ffffff');

  const currentDoc = documents[currentDocIndex];
  const totalPages = currentDoc?.pages?.length || 1;

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };
    measure();
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(measure);
      if (containerRef.current) ro.observe(containerRef.current);
    } catch (e) {}
    return () => {
      window.removeEventListener('resize', measure);
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
    };
  }, []);

  const thumbnailWidth = showThumbnails ? (containerSize.width < 800 ? 100 : 140) : 0;
  const paddingSpace = 56;
  const availableWidth = Math.max(300, containerSize.width - thumbnailWidth - paddingSpace);
  const imageDisplayWidth = Math.max(
    220,
    Math.min(availableWidth * (zoomLevel / 100), availableWidth * 3)
  );

  useEffect(() => {
    if (zoomMode === 'fit-width') setZoomLevel(100);
    else if (zoomMode === 'fit-page') setZoomLevel(85);
  }, [zoomMode]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(v => Math.min(v + 10, 400));
    setZoomMode('custom');
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoomLevel(v => Math.max(v - 10, 25));
    setZoomMode('custom');
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

  if (documents.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        h="100%"
        minH="600px"
        bg={bgColor}
        borderRadius="md"
        border="1px solid"
        borderColor={borderColor}
        p={8}
        position="relative"
      >
        {/* Paper Preview Placeholder */}
        <Box
          width="400px"
          height="550px"
          bg={paperBg}
          borderRadius="sm"
          boxShadow="0 8px 32px rgba(0,0,0,0.12)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid"
          borderColor="gray.300"
          position="relative"
        >
          <VStack spacing={4}>
            <Iconify icon="solar:document-bold" width={64} height={64} color="gray.300" />
            <Text fontSize="lg" fontWeight="500" color="gray.500">
              No Document Selected
            </Text>
            <Text fontSize="sm" color="gray.400" textAlign="center" maxW="280px">
              Select a document to see preview
            </Text>
          </VStack>
        </Box>

        {/* Page indicator at bottom */}
        <Text mt={6} fontSize="sm" color="text.muted" fontWeight="500">
          Ready to preview
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      ref={containerRef}
      bg={useColorModeValue('white', 'rgba(12,16,35,0.95)')}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
      position="relative"
      h="100%"
      minH="600px"
      boxShadow="0 2px 8px rgba(0,0,0,0.08)"
    >
      <Flex
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor={borderColor}
        bg={useColorModeValue('#f5f5f5', 'rgba(12,16,35,0.95)')}
        justify="space-between"
        align="center"
      >
        <HStack spacing={3}>
          <Text fontSize="sm" fontWeight="600" noOfLines={1} maxW="280px" color="gray.700">
            {currentDoc?.filename}
          </Text>
          {documents.length > 1 && (
            <Badge colorScheme="purple" fontSize="xs" px={2}>
              {currentDocIndex + 1} of {documents.length}
            </Badge>
          )}
        </HStack>

        <HStack spacing={2}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Zoom Out">
              <IconButton
                aria-label="Zoom out"
                icon={<Iconify icon={FiZoomOut} boxSize={4} />}
                onClick={handleZoomOut}
                isDisabled={zoomLevel <= 25}
                bg="white"
              />
            </Tooltip>
            <Button
              minW="70px"
              onClick={() => setZoomMode('fit-width')}
              bg="white"
              fontWeight="500"
            >
              {zoomLevel}%
            </Button>
            <Tooltip label="Zoom In">
              <IconButton
                aria-label="Zoom in"
                icon={<Iconify icon={FiZoomIn} boxSize={4} />}
                onClick={handleZoomIn}
                isDisabled={zoomLevel >= 400}
                bg="white"
              />
            </Tooltip>
          </ButtonGroup>

          <Tooltip label={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}>
            <IconButton
              aria-label="Toggle thumbnails"
              icon={<Iconify icon="solar:sidebar-bold" boxSize={4} />}
              size="sm"
              variant={showThumbnails ? 'solid' : 'outline'}
              colorScheme={showThumbnails ? 'brand' : 'gray'}
              onClick={() => setShowThumbnails(s => !s)}
              bg={showThumbnails ? undefined : 'white'}
            />
          </Tooltip>

          <Tooltip label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}>
            <IconButton
              aria-label="Toggle fullscreen"
              icon={<Iconify icon={isFullscreen ? FiMinimize : FiMaximize} boxSize={4} />}
              size="sm"
              onClick={handleFullscreen}
              bg="white"
            />
          </Tooltip>
        </HStack>
      </Flex>

      <Flex h={isFullscreen ? 'calc(100vh - 64px)' : 'calc(100% - 64px)'}>
        {showThumbnails && (
          <VStack
            w={`${thumbnailWidth}px`}
            borderRight="1px solid"
            borderColor={borderColor}
            bg={thumbnailBg}
            p={2}
            spacing={2}
            overflowY="auto"
          >
            {currentDoc?.pages?.map(page => (
              <Box
                key={page.pageNumber}
                w="100%"
                cursor="pointer"
                onClick={() => setCurrentPage(page.pageNumber)}
                borderRadius="md"
                overflow="hidden"
                bg={bgColor}
                transition="all 0.15s"
              >
                <Box h={{ base: '70px', md: '100px' }} bg="gray.700">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${page.pageNumber}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Flex align="center" justify="center" h="100%">
                      <Text color="whiteAlpha.700">{page.pageNumber}</Text>
                    </Flex>
                  )}
                </Box>
                <Text fontSize="xs" textAlign="center" py={1}>
                  Page {page.pageNumber}
                </Text>
              </Box>
            ))}
          </VStack>
        )}

        <Flex flex={1} align="center" justify="center" p={8} overflowY="auto" bg={bgColor}>
          {isLoading ? (
            <VStack spacing={4}>
              <Spinner size="xl" color="brand.500" thickness="4px" />
              <Text color="text.muted">Loading preview...</Text>
            </VStack>
          ) : (
            <Box
              width={`${imageDisplayWidth}px`}
              maxW="90%"
              transition="all 0.25s ease"
              borderRadius="sm"
              overflow="hidden"
              boxShadow="0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)"
              bg={paperBg}
              border="1px solid"
              borderColor="gray.300"
              position="relative"
            >
              {currentDoc?.thumbnailUrl ? (
                <img
                  src={currentDoc.thumbnailUrl}
                  alt={currentDoc.filename}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    filter:
                      previewSettings?.colorMode === 'grayscale'
                        ? 'grayscale(100%)'
                        : previewSettings?.colorMode === 'bw'
                          ? 'grayscale(100%) contrast(2)'
                          : 'none',
                  }}
                />
              ) : (
                <Flex align="center" justify="center" minH={{ base: '400px', md: '600px' }} p={8}>
                  <VStack spacing={3}>
                    <Iconify icon="solar:document-bold" width={56} height={56} color="gray.300" />
                    <Text color="gray.500" fontSize="md">
                      Preview not available
                    </Text>
                  </VStack>
                </Flex>
              )}
            </Box>
          )}
        </Flex>
      </Flex>

      {/* Bottom Footer - Sheet Count (Windows-like) */}
      {documents.length > 0 && (
        <Flex
          px={5}
          py={2}
          borderTop="1px solid"
          borderColor={borderColor}
          bg={useColorModeValue('#f5f5f5', 'rgba(12,16,35,0.95)')}
          justify="center"
          align="center"
        >
          <HStack spacing={2}>
            <Iconify icon="solar:document-bold" width={16} height={16} color="gray.500" />
            <Text fontSize="sm" color="gray.600" fontWeight="500">
              {documents.length} {documents.length === 1 ? 'sheet' : 'sheets'} of paper
            </Text>
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

export default DocumentPreview;
