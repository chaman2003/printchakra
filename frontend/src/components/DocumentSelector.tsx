/**
 * DocumentSelector Component
 * Modern tabbed modal for selecting documents from multiple sources
 * Features: Current Documents, Converted Documents, Local Upload
 */

import React, { useState, useCallback, useRef } from 'react';
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
import Iconify from './Iconify';

interface Document {
  filename: string;
  size: number;
  type: string;
  thumbnailUrl?: string;
  isProcessed?: boolean;
}

interface DocumentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (documents: Document[]) => void;
  currentDocuments?: Document[];
  convertedDocuments?: Document[];
  allowMultiple?: boolean;
  mode: 'scan' | 'print';
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentDocuments = [],
  convertedDocuments = [],
  allowMultiple = true,
  mode,
}) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgColor = useColorModeValue('white', 'rgba(12, 16, 35, 0.95)');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const selectedBg = useColorModeValue('brand.50', 'rgba(121,95,238,0.15)');
  const borderColor = useColorModeValue('brand.200', 'rgba(121,95,238,0.3)');

  const handleDocumentClick = useCallback((filename: string, index: number, shiftKey: boolean, docs: Document[]) => {
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
  }, [allowMultiple, lastClickedIndex, selectedDocs]);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles: Document[] = [];
    const validExtensions = mode === 'print' 
      ? ['pdf', 'jpg', 'jpeg', 'png']
      : ['jpg', 'jpeg', 'png'];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && validExtensions.includes(ext)) {
        validFiles.push({
          filename: file.name,
          size: file.size,
          type: file.type,
          thumbnailUrl: URL.createObjectURL(file),
        });
      }
    });

    setUploadedFiles((prev) => [...prev, ...validFiles]);
  }, [mode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleConfirm = () => {
    const allDocs = [...currentDocuments, ...convertedDocuments, ...uploadedFiles];
    const selected = allDocs.filter((doc) => selectedDocs.has(doc.filename));
    onSelect(selected);
    onClose();
  };

  const renderDocumentCard = (doc: Document, index: number, allDocs: Document[]) => {
    const isSelected = selectedDocs.has(doc.filename);
    
    return (
      <Box
        key={doc.filename}
        position="relative"
        borderRadius="xl"
        border="2px solid"
        borderColor={isSelected ? 'brand.400' : borderColor}
        bg={isSelected ? selectedBg : bgColor}
        overflow="hidden"
        cursor="pointer"
        transition="all 0.2s ease"
        _hover={{
          transform: 'translateY(-4px)',
          boxShadow: 'xl',
          borderColor: 'brand.400',
        }}
        onClick={(e) => handleDocumentClick(doc.filename, index, e.shiftKey, allDocs)}
      >
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
        
  <Box position="relative" h={{ base: '120px', md: '150px' }} bg="gray.800" overflow="hidden">
          {doc.thumbnailUrl ? (
            <Image
              src={doc.thumbnailUrl}
              alt={doc.filename}
              objectFit="cover"
              w="100%"
              h="100%"
            />
          ) : (
            <Flex align="center" justify="center" h="100%">
              <Iconify icon={FiFile} boxSize={12} color="whiteAlpha.500" />
            </Flex>
          )}
        </Box>
        
        <VStack align="start" spacing={1} p={3}>
          <Text fontSize="sm" fontWeight="600" noOfLines={1} w="100%">
            {doc.filename}
          </Text>
          <HStack justify="space-between" w="100%">
            <Text fontSize="xs" color="text.muted">
              {(doc.size / 1024).toFixed(1)} KB
            </Text>
            {doc.isProcessed && (
              <Badge colorScheme="green" fontSize="xs">
                Processed
              </Badge>
            )}
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} maxH="90vh">
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
          <Tabs colorScheme="brand" variant="enclosed">
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
                    w="100%"
                    minH="200px"
                    border="2px dashed"
                    borderColor={isDragging ? 'brand.400' : borderColor}
                    borderRadius="xl"
                    bg={isDragging ? 'rgba(121,95,238,0.1)' : 'transparent'}
                    transition="all 0.3s"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    cursor="pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      h="100%"
                      p={6}
                    >
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
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />

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
};

export default DocumentSelector;
