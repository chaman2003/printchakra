/**
 * DocumentSelector Component
 * Modern tabbed modal for selecting documents from multiple sources
 * Features: Current Documents, Converted Documents, Local Upload
 */

import React, {
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Image,
  Text,
  Badge,
  Checkbox,
  Input,
  Flex,
  useColorModeValue,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { FiFile, FiUpload, FiCheck } from 'react-icons/fi';
import Iconify from '../common/Iconify';
import { Document } from '../../types';
import { processFileForPreview } from '../../utils/pdfUtils';

export interface DocumentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (documents: Document[]) => void;
  currentDocuments?: Document[];
  convertedDocuments?: Document[];
  allowMultiple?: boolean;
  mode: 'scan' | 'print';
  isChatVisible?: boolean;
}

export interface DocumentSelectorHandle {
  focusSection: (section: 'current' | 'converted' | 'upload') => void;
  selectDocumentByIndex: (section: 'current' | 'converted', position: number) => Document | null;
  selectMultipleDocuments: (section: 'current' | 'converted', indices: number[]) => void;
  clearSelections: () => void;
}

const TAB_INDEX: Record<'current' | 'converted' | 'upload', number> = {
  current: 0,
  converted: 1,
  upload: 2,
};

const DocumentSelector = forwardRef<DocumentSelectorHandle, DocumentSelectorProps>(
  ({
    isOpen,
    onClose,
    onSelect,
    currentDocuments = [],
    convertedDocuments = [],
    allowMultiple = true,
    mode,
    isChatVisible = false,
  }, ref) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Updated to match SurfaceCard theme - fully opaque for better visibility
  const bgColor = useColorModeValue('white', 'gray.900');
  const hoverBg = useColorModeValue('orange.50', 'whiteAlpha.100');
  const selectedBg = useColorModeValue('brand.50', 'rgba(121,95,238,0.15)');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleDocumentClick = useCallback(
    (filename: string, index: number, shiftKey: boolean, docs: Document[]) => {
      if (!allowMultiple) {
        setSelectedDocs(new Set([filename]));
        setLastClickedIndex(index);
        return;
      }

      if (shiftKey && lastClickedIndex !== null) {
        // Range select
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        const newSelected = new Set(selectedDocs);

        for (let i = start; i <= end; i++) {
          if (docs[i]) {
            newSelected.add(docs[i].filename);
          }
        }

        setSelectedDocs(newSelected);
      } else {
        // Single toggle
        const newSelected = new Set(selectedDocs);
        if (newSelected.has(filename)) {
          newSelected.delete(filename);
        } else {
          newSelected.add(filename);
        }
        setSelectedDocs(newSelected);
        setLastClickedIndex(index);
      }
    },
    [allowMultiple, lastClickedIndex, selectedDocs]
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const validExtensions =
        mode === 'print' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png'];

      setIsUploading(true);
      const processedDocs: Document[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (!ext || !validExtensions.includes(ext)) {
          continue;
        }

        try {
          setUploadProgress(`Processing ${file.name}... (${i + 1}/${files.length})`);
          
          // Use PDF.js to convert PDF to images, or FileReader for images
          const result = await processFileForPreview(file);
          
          processedDocs.push({
            filename: result.filename,
            size: result.size,
            type: result.type,
            fileObject: result.fileObject,
            thumbnailUrl: result.thumbnailUrl,
            pages: result.pages,
          });
          
        } catch (error) {
          console.error(`[DocumentSelector] Error processing ${file.name}:`, error);
        }
      }

      setUploadedFiles(prev => [...prev, ...processedDocs]);
      setIsUploading(false);
      setUploadProgress('');
    },
    [mode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleConfirm = () => {
    console.log('[DOC_SELECTOR] handleConfirm called');
    console.log('[DOC_SELECTOR] selectedDocs Set:', selectedDocs);
    console.log('[DOC_SELECTOR] currentDocuments:', currentDocuments);
    console.log('[DOC_SELECTOR] convertedDocuments:', convertedDocuments);
    console.log('[DOC_SELECTOR] uploadedFiles:', uploadedFiles);
    
    const allDocs = [...currentDocuments, ...convertedDocuments, ...uploadedFiles];
    const selected = allDocs.filter(doc => selectedDocs.has(doc.filename));
    
    console.log('[DOC_SELECTOR] allDocs:', allDocs);
    console.log('[DOC_SELECTOR] selected:', selected);
    
    // Ensure all selected documents have proper pages structure
    const docsWithPages = selected.map(doc => ({
      ...doc,
      pages: doc.pages || [{
        pageNumber: 1,
        thumbnailUrl: doc.thumbnailUrl
      }]
    }));
    
    console.log('[DOC_SELECTOR] docsWithPages:', docsWithPages);
    
    onSelect(docsWithPages);
    onClose();
  };

  const renderDocumentCard = (doc: Document, index: number, allDocs: Document[]) => {
    const isSelected = selectedDocs.has(doc.filename);
    const documentIndex = index + 1;
    const pageCount = doc.pages?.length || 1;

    return (
      <Box
        key={doc.filename}
        position="relative"
        borderRadius="xl"
        border="2px solid"
        borderColor={isSelected ? 'brand.400' : borderColor}
        bg={isSelected ? selectedBg : 'white'}
        overflow="hidden"
        cursor="pointer"
        transition="all 0.2s ease"
        _hover={{
          transform: 'translateY(-4px)',
          boxShadow: 'xl',
          borderColor: 'brand.400',
        }}
        onClick={e => handleDocumentClick(doc.filename, index, e.shiftKey, allDocs)}
        _dark={{
          bg: isSelected ? selectedBg : 'gray.800',
        }}
      >
        {/* Document order badge */}
        <Badge
          position="absolute"
          top={3}
          left={3}
          colorScheme="purple"
          borderRadius="full"
          px={3}
          py={1}
          zIndex={2}
        >
          #{documentIndex}
        </Badge>

        {/* Page count badge for multi-page docs */}
        {pageCount > 1 && (
          <Badge
            position="absolute"
            top={3}
            right={isSelected ? 10 : 3}
            colorScheme="cyan"
            borderRadius="full"
            px={2}
            py={1}
            fontSize="xs"
            zIndex={2}
          >
            {pageCount} pages
          </Badge>
        )}

        {isSelected && (
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="brand.500"
            color="white"
            borderRadius="full"
            p={1}
            zIndex={2}
          >
            <Iconify icon="solar:check-circle-bold" width={16} height={16} />
          </Box>
        )}

        <Box position="relative" h={{ base: '120px', md: '150px' }} bg="gray.100" overflow="hidden" _dark={{ bg: 'gray.700' }}>
          {doc.thumbnailUrl ? (
            <img 
              src={doc.thumbnailUrl} 
              alt={doc.filename}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                backgroundColor: '#f5f5f5'
              }}
            />
          ) : (
            <Flex align="center" justify="center" h="100%" bg="gray.200" _dark={{ bg: 'gray.700' }}>
              <Iconify 
                icon="solar:document-bold" 
                boxSize={10} 
                color="gray.400" 
                _dark={{ color: 'whiteAlpha.400' }}
              />
            </Flex>
          )}
        </Box>

        <VStack align="start" spacing={1} p={3}>
          <Text fontSize="sm" fontWeight="600" noOfLines={1} w="100%">
            {doc.filename}
          </Text>
          <HStack justify="space-between" w="100%">
            <Text fontSize="xs" color="text.muted">
              {doc.size ? (doc.size / 1024).toFixed(1) : '0'} KB
            </Text>
          </HStack>
        </VStack>

        {isSelected && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="brand.500"
            opacity={0.1}
            pointerEvents="none"
          />
        )}
      </Box>
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      focusSection: section => {
        if (TAB_INDEX[section] !== undefined) {
          setActiveTab(TAB_INDEX[section]);
        }
      },
      selectDocumentByIndex: (section, position) => {
        const docs = section === 'current' ? currentDocuments : convertedDocuments;
        const target = docs[position - 1];
        if (!target) {
          return null;
        }
        setActiveTab(TAB_INDEX[section]);
        setSelectedDocs(new Set([target.filename]));
        setLastClickedIndex(position - 1);
        return target;
      },
      selectMultipleDocuments: (section, indices) => {
        const docs = section === 'current' ? currentDocuments : convertedDocuments;
        const newSelected = new Set<string>();
        let lastValidIndex: number | null = null;
        
        for (const idx of indices) {
          if (docs[idx]) {
            newSelected.add(docs[idx].filename);
            lastValidIndex = idx;
          }
        }
        
        if (newSelected.size > 0) {
          setActiveTab(TAB_INDEX[section]);
          setSelectedDocs(newSelected);
          if (lastValidIndex !== null) {
            setLastClickedIndex(lastValidIndex);
          }
        }
      },
      clearSelections: () => {
        setSelectedDocs(new Set());
        setLastClickedIndex(null);
      },
    }),
    [currentDocuments, convertedDocuments]
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={isChatVisible ? "4xl" : "6xl"}
      scrollBehavior="inside" 
      isCentered={!isChatVisible}
      closeOnEsc={true}
      closeOnOverlayClick={true}
      blockScrollOnMount={true}
    >
      <ModalOverlay 
        bg="blackAlpha.600"
        backdropFilter="none"
      />
      <ModalContent 
        bg={bgColor} 
        maxH="90vh" 
        borderRadius="2xl" 
        boxShadow="0 30px 80px rgba(0, 0, 0, 0.5)"
        border="2px solid"
        borderColor="brand.500"
        maxW={isChatVisible ? "calc(100vw - 400px)" : "1200px"}
        w={isChatVisible ? "calc(100vw - 400px)" : "95vw"}
        ml={isChatVisible ? "8px" : "auto"}
        mr={isChatVisible ? "392px" : "auto"}
        mt={isChatVisible ? "8px" : "auto"}
      >
        <ModalHeader
          fontSize="2xl"
          fontWeight="700"
          borderBottom="1px solid"
          borderColor={borderColor}
        >
          <HStack spacing={3}>
            <Iconify icon="solar:document-add-bold-duotone" width={28} height={28} />
            <Text>Select Documents</Text>
            {selectedDocs.size > 0 && (
              <Badge colorScheme="brand" fontSize="md" px={3} py={1}>
                {selectedDocs.size} selected
              </Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton size="lg" />

        <ModalBody py={6}>
          <Tabs
            colorScheme="brand"
            variant="enclosed"
            index={activeTab}
            onChange={index => setActiveTab(index)}
          >
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Iconify icon="solar:documents-bold" width={18} height={18} />
                  <Text>Current Documents</Text>
                  <Badge colorScheme="purple">{currentDocuments.length}</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Iconify icon="solar:file-check-bold" width={18} height={18} />
                  <Text>Converted Documents</Text>
                  <Badge colorScheme="green">{convertedDocuments.length}</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Iconify icon={FiUpload} width={18} height={18} />
                  <Text>Upload Local Files</Text>
                  {uploadedFiles.length > 0 && (
                    <Badge colorScheme="blue">{uploadedFiles.length}</Badge>
                  )}
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Current Documents Tab */}
              <TabPanel>
                {currentDocuments.length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    minH="300px"
                    color="text.muted"
                  >
                    <Iconify icon="solar:document-bold" width={48} height={48} />
                    <Text mt={4} fontSize="lg">
                      No documents in current session
                    </Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4} mt={4}>
                    {currentDocuments.map((doc, index) =>
                      renderDocumentCard(doc, index, currentDocuments)
                    )}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Converted Documents Tab */}
              <TabPanel>
                {convertedDocuments.length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    minH="300px"
                    color="text.muted"
                  >
                    <Iconify icon="solar:file-check-bold" width={48} height={48} />
                    <Text mt={4} fontSize="lg">
                      No converted documents available
                    </Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4} mt={4}>
                    {convertedDocuments.map((doc, index) =>
                      renderDocumentCard(doc, index, convertedDocuments)
                    )}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Local Upload Tab */}
              <TabPanel>
                <VStack spacing={4}>
                  <Box
                    as="div"
                    w="100%"
                    minH="200px"
                    border="2px dashed"
                    borderColor={isDragging ? 'brand.400' : borderColor}
                    borderRadius="xl"
                    bg={isDragging ? 'rgba(121,95,238,0.1)' : 'transparent'}
                    transition="all 0.3s"
                    cursor="pointer"
                    pointerEvents="auto"
                    onDrop={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    onDragOver={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragEnter={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Flex direction="column" align="center" justify="center" h="100%" p={6}>
                      <Iconify
                        icon={FiUpload}
                        boxSize={16}
                        color={isDragging ? 'brand.400' : 'text.muted'}
                      />
                      <Text
                        mt={4}
                        fontSize="lg"
                        fontWeight="600"
                        color={isDragging ? 'brand.400' : 'text.primary'}
                      >
                        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                      </Text>
                      <Text fontSize="sm" color="text.muted" mt={2}>
                        or click to browse
                      </Text>
                      <Text fontSize="xs" color="text.muted" mt={2}>
                        Supported: {mode === 'print' ? 'PDF, JPG, PNG' : 'JPG, PNG'}
                      </Text>
                    </Flex>
                  </Box>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={allowMultiple}
                    accept={mode === 'print' ? '.pdf,.jpg,.jpeg,.png' : '.jpg,.jpeg,.png'}
                    style={{ display: 'none' }}
                    onChange={e => handleFileUpload(e.target.files)}
                    disabled={isUploading}
                  />

                  {isUploading && (
                    <Flex align="center" justify="center" p={4} bg="rgba(121,95,238,0.1)" borderRadius="lg">
                      <Spinner size="md" color="brand.400" mr={3} />
                      <Text color="brand.300">{uploadProgress || 'Processing files...'}</Text>
                    </Flex>
                  )}

                  {uploadedFiles.length > 0 && (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4} w="100%">
                      {uploadedFiles.map((doc, index) =>
                        renderDocumentCard(doc, index, uploadedFiles)
                      )}
                    </SimpleGrid>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <HStack spacing={3}>
            <Text fontSize="sm" color="text.muted">
              {allowMultiple && 'Shift+Click for range selection'}
            </Text>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleConfirm}
              isDisabled={selectedDocs.size === 0}
              leftIcon={<Iconify icon="solar:check-circle-bold" width={20} height={20} />}
            >
              Select {selectedDocs.size > 0 && `(${selectedDocs.size})`}
            </Button>
          </HStack>
        </ModalFooter>
        </ModalContent>
      </Modal>
  );
});

DocumentSelector.displayName = 'DocumentSelector';

export default DocumentSelector;
