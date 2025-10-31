/**
 * DocumentPreview Component
 * Responsive document preview with real-time settings updates
 *
 * 📐 TO ADJUST PREVIEW SIZE: See PREVIEW_SIZE configuration below (lines 22-32)
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
import { motion, AnimatePresence } from 'framer-motion';
import Iconify from './Iconify';

// Motion components
const MotionBox = motion(Box);
const MotionIconButton = motion(IconButton);
const MotionFlex = motion(Flex);
const MotionImage = motion.img;

// ==================== PREVIEW SIZE CONFIGURATION ====================
// A4 paper aspect ratio: 1:1.414 (210mm x 297mm)
// Preview dimensions are calculated to maintain A4 proportions
const PREVIEW_SIZE = {
  // Portrait mode dimensions (A4 ratio: 210 x 297)
  portrait: {
    width: 28, // vw units
    height: 39.6, // vh units (28 * 1.414 for A4 ratio)
  },
  // Landscape mode dimensions (A4 rotated: 297 x 210)
  landscape: {
    width: 39.6, // vw units (28 * 1.414)
    height: 28, // vh units (matches portrait width for proper A4 landscape)
  },
  // Container minimum height
  containerMinHeight: '50vh', // Increase if preview gets cut off
};
// ===================================================================

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [rotation, setRotation] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const bgColor = useColorModeValue('rgba(20, 24, 45, 0.3)', 'rgba(20, 24, 45, 0.5)');
  const borderColor = useColorModeValue('whiteAlpha.400', 'whiteAlpha.300');
  const thumbnailBg = useColorModeValue('rgba(30, 34, 50, 0.5)', 'rgba(30, 34, 50, 0.9)');
  const paperBg = useColorModeValue('white', '#ffffff');
  const toolbarBg = useColorModeValue('rgba(12,16,35,0.7)', 'rgba(12,16,35,0.95)');

  const currentDoc = documents[currentDocIndex];
  const totalPages = currentDoc?.pages?.length || 1;

  // Get current page URL (if pages exist, use page-specific URL, otherwise use document thumbnail)
  const getCurrentPageUrl = () => {
    if (currentDoc?.pages && currentDoc.pages.length > 0) {
      const page = currentDoc.pages.find(p => p.pageNumber === currentPage);
      return page?.thumbnailUrl || page?.fullUrl || currentDoc.thumbnailUrl;
    }
    return currentDoc?.thumbnailUrl;
  };

  const currentPageUrl = getCurrentPageUrl();

  // Determine paper orientation and size based on settings
  const layout = previewSettings?.layout || 'portrait';
  const isLandscape = layout === 'landscape';

  // Calculate responsive paper dimensions using configurable values
  const getPaperDimensions = () => {
    const config = isLandscape ? PREVIEW_SIZE.landscape : PREVIEW_SIZE.portrait;
    const scale = ((zoomLevel / 100) * (previewSettings?.scale || 100)) / 100;

    return {
      width: `${config.width * scale}vw`,
      height: `${config.height * scale}vh`,
    };
  };

  const paperDimensions = getPaperDimensions();

  // Check if rotated sideways (90° or 270°)
  const isRotatedSideways = rotation === 90 || rotation === 270;

  const handleZoomIn = useCallback(() => {
    setZoomLevel(v => Math.min(v + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(v => Math.max(v - 10, 50));
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

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Reset zoom and rotation when documents change
  useEffect(() => {
    setZoomLevel(100);
    setRotation(0);
    setCurrentPage(1);
  }, [documents]);

  // Reset to page 1 when switching documents
  useEffect(() => {
    setCurrentPage(1);
  }, [currentDocIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys for page navigation
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      }
      // Ctrl/Cmd + Arrow keys for document navigation
      else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft' && currentDocIndex > 0) {
        setCurrentDocIndex(prev => prev - 1);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'ArrowRight' &&
        currentDocIndex < documents.length - 1
      ) {
        setCurrentDocIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, currentDocIndex, documents.length]);

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
          width="380px"
          height="520px"
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
        px={{ base: '0.75rem', md: '1rem' }}
        py="0.625rem"
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
              <MotionIconButton
                aria-label="Zoom out"
                icon={<Iconify icon="solar:magnifer-zoom-out-bold" width={14} height={14} />}
                onClick={handleZoomOut}
                isDisabled={zoomLevel <= 50}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                _dark={{ bg: 'whiteAlpha.100' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
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
              <MotionIconButton
                aria-label="Zoom in"
                icon={<Iconify icon="solar:magnifer-zoom-in-bold" width={14} height={14} />}
                onClick={handleZoomIn}
                isDisabled={zoomLevel >= 200}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                _dark={{ bg: 'whiteAlpha.100' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              />
            </Tooltip>
          </ButtonGroup>

          {/* Rotate Button */}
          <Tooltip label="Rotate 90°">
            <MotionIconButton
              aria-label="Rotate"
              icon={<Iconify icon="solar:refresh-bold" width={14} height={14} />}
              size="sm"
              onClick={handleRotate}
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              _dark={{ bg: 'whiteAlpha.100' }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            />
          </Tooltip>

          {/* Document Navigation (if multiple documents) */}
          {documents.length > 1 && (
            <ButtonGroup size="sm" isAttached variant="outline" ml={2}>
              <Tooltip label="Previous Document">
                <IconButton
                  aria-label="Previous document"
                  icon={<Iconify icon="solar:alt-arrow-left-bold" width={14} height={14} />}
                  onClick={() => setCurrentDocIndex(prev => Math.max(0, prev - 1))}
                  isDisabled={currentDocIndex === 0}
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  _dark={{ bg: 'whiteAlpha.100' }}
                />
              </Tooltip>
              <Button
                minW={{ base: '60px', md: '70px' }}
                fontSize="xs"
                bg="whiteAlpha.200"
                color="white"
                fontWeight="500"
                _hover={{ bg: 'whiteAlpha.300' }}
                _dark={{ bg: 'whiteAlpha.100' }}
                cursor="default"
              >
                Doc {currentDocIndex + 1}/{documents.length}
              </Button>
              <Tooltip label="Next Document">
                <IconButton
                  aria-label="Next document"
                  icon={<Iconify icon="solar:alt-arrow-right-bold" width={14} height={14} />}
                  onClick={() =>
                    setCurrentDocIndex(prev => Math.min(documents.length - 1, prev + 1))
                  }
                  isDisabled={currentDocIndex === documents.length - 1}
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  _dark={{ bg: 'whiteAlpha.100' }}
                />
              </Tooltip>
            </ButtonGroup>
          )}

          {/* Page Navigation (if multiple pages in current document) */}
          {totalPages > 1 && (
            <ButtonGroup size="sm" isAttached variant="outline" ml={2}>
              <Tooltip label="Previous Page">
                <IconButton
                  aria-label="Previous page"
                  icon={<Iconify icon="solar:alt-arrow-left-bold" width={14} height={14} />}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
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
                cursor="default"
              >
                {currentPage}/{totalPages}
              </Button>
              <Tooltip label="Next Page">
                <IconButton
                  aria-label="Next page"
                  icon={<Iconify icon="solar:alt-arrow-right-bold" width={14} height={14} />}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  isDisabled={currentPage === totalPages}
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  _dark={{ bg: 'whiteAlpha.100' }}
                />
              </Tooltip>
            </ButtonGroup>
          )}
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
            p="0.5rem"
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
            {currentDoc?.pages?.map(page => (
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
                      <Text fontSize="lg" color="gray.400">
                        {page.pageNumber}
                      </Text>
                    </Flex>
                  )}
                </Box>
                <Text
                  fontSize="xs"
                  textAlign="center"
                  py={1}
                  fontWeight={currentPage === page.pageNumber ? '600' : '400'}
                >
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
          p="1rem"
          minH={PREVIEW_SIZE.containerMinHeight}
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
              width={paperDimensions.width}
              height={paperDimensions.height}
              maxW="100%"
              maxH="100%"
              transition="width 0.3s ease, height 0.3s ease"
              borderRadius="sm"
              boxShadow="0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)"
              bg={paperBg}
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="visible"
              sx={{
                aspectRatio: isLandscape ? '1.414 / 1' : '1 / 1.414',
              }}
            >
              {currentPageUrl ? (
                <MotionImage
                  key={`${currentDocIndex}-${currentPage}-${rotation}`}
                  initial={{ opacity: 0, scale: 0.95, rotate: rotation }}
                  animate={{ opacity: 1, scale: 1, rotate: rotation }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  src={currentPageUrl}
                  alt={`${currentDoc.filename} - Page ${currentPage}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    transformOrigin: 'center center',
                    filter:
                      previewSettings?.colorMode === 'grayscale'
                        ? 'grayscale(100%)'
                        : previewSettings?.colorMode === 'bw'
                          ? 'grayscale(100%) contrast(2)'
                          : 'none',
                  }}
                />
              ) : (
                <VStack spacing={3}>
                  <Iconify icon="solar:document-bold" width={48} height={48} color="gray.300" />
                  <Text color="gray.500" fontSize="sm">
                    Preview not available
                  </Text>
                </VStack>
              )}
            </Box>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default DocumentPreview;
