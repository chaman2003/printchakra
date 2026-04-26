import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Icon,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FiCpu,
  FiFileText,
  FiMic,
  FiPrinter,
  FiSmartphone,
  FiWifi,
} from 'react-icons/fi';

const MotionBox = motion.create(Box as any);

const asIcon = (icon: any) => icon as React.ElementType;

export const landingFeatures = [
  {
    icon: FiSmartphone,
    title: 'Phone Capture',
    description: 'Scan documents with your phone camera. AI-powered edge detection automatically finds and crops your documents.',
    gradient: 'linear(to-r, brand.400, nebula.400)',
  },
  {
    icon: FiFileText,
    title: 'Smart OCR',
    description: 'Extract text from any document with industry-leading accuracy. Supports multiple languages and complex layouts.',
    gradient: 'linear(to-r, nebula.400, cyber.400)',
  },
  {
    icon: FiMic,
    title: 'Voice AI',
    description: 'Control everything with your voice. Natural language commands for printing, scanning, and document management.',
    gradient: 'linear(to-r, cyber.400, neon.400)',
  },
  {
    icon: FiPrinter,
    title: 'Print Management',
    description: 'Configure and send print jobs with precision controls. Paper size, quality, color mode, duplex - all in one place.',
    gradient: 'linear(to-r, neon.400, brand.400)',
  },
  {
    icon: FiCpu,
    title: 'GPU Accelerated',
    description: 'Powered by NVIDIA CUDA for blazing-fast document processing. Real-time AI enhancement and noise reduction.',
    gradient: 'linear(to-r, brand.500, cyber.400)',
  },
  {
    icon: FiWifi,
    title: 'Real-time Sync',
    description: 'Instant WebSocket-powered synchronization between your phone and desktop. No delays, no refreshing.',
    gradient: 'linear(to-r, nebula.400, neon.400)',
  },
];

export const workflowSteps = [
  {
    step: '01',
    icon: FiSmartphone,
    title: 'Capture',
    description: 'Point your phone at any document. AI detects edges and captures automatically.',
    gradient: 'linear(to-br, brand.400, nebula.400)',
  },
  {
    step: '02',
    icon: FiCpu,
    title: 'Process',
    description: 'GPU-accelerated OCR extracts text. AI enhances image quality and corrects perspective.',
    gradient: 'linear(to-br, nebula.400, cyber.400)',
  },
  {
    step: '03',
    icon: FiPrinter,
    title: 'Print',
    description: 'Configure print settings with voice commands or the dashboard. One-click printing.',
    gradient: 'linear(to-br, cyber.400, neon.400)',
  },
];

export const FloatingOrb = ({ size, color, x, y, delay }: { size: number; color: string; x: string; y: string; delay: number }) => (
  <MotionBox
    position="absolute"
    pointerEvents="none"
    zIndex={0}
    width={`${size}px`}
    height={`${size}px`}
    borderRadius="full"
    bg={color}
    filter="blur(80px)"
    left={x}
    top={y}
    animate={{
      y: [0, -30, 0],
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  />
);

export const FeatureCard = ({ icon, title, description, gradient, delay }: {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) => {
  const cardBg = useColorModeValue('rgba(255,255,255,0.9)', 'rgba(12,16,35,0.85)');
  const borderColor = useColorModeValue('rgba(121,95,238,0.15)', 'rgba(69,202,255,0.2)');

  return (
    <MotionBox
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay }}
    >
      <Box
        bg={cardBg}
        border={`1px solid`}
        borderColor={borderColor}
        borderRadius="2xl"
        p={{ base: 6, md: 8 }}
        position="relative"
        overflow="hidden"
        _hover={{
          transform: 'translateY(-6px)',
          boxShadow: '0 20px 60px rgba(69,202,255,0.15)',
        }}
        transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        cursor="default"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="3px"
          bgGradient={gradient}
        />
        <Flex
          w={14}
          h={14}
          borderRadius="xl"
          bgGradient={gradient}
          align="center"
          justify="center"
          mb={4}
          boxShadow="0 8px 24px rgba(0,0,0,0.15)"
        >
          <Icon as={asIcon(icon)} boxSize={6} color="white" />
        </Flex>
        <Heading size="md" mb={2}>{title}</Heading>
        <Text color="text.muted" fontSize="sm" lineHeight="tall">
          {description}
        </Text>
      </Box>
    </MotionBox>
  );
};

export const StatCard = ({ value, label, delay }: { value: string; label: string; delay: number }) => (
  <MotionBox
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    textAlign="center"
  >
    <Text
      fontSize={{ base: '3xl', md: '4xl' }}
      fontWeight="800"
      bgGradient="linear(to-r, nebula.400, cyber.400)"
      bgClip="text"
    >
      {value}
    </Text>
    <Text color="text.muted" fontSize="sm" fontWeight="500">{label}</Text>
  </MotionBox>
);

export const WorkflowStepCard = ({
  item,
  delay,
}: {
  item: { step: string; icon: any; title: string; description: string; gradient: string };
  delay: number;
}) => (
  <MotionBox
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.6, delay }}
  >
    <VStack
      spacing={5}
      p={{ base: 8, md: 10 }}
      borderRadius="2xl"
      border="1px solid"
      borderColor={useColorModeValue('rgba(121,95,238,0.1)', 'rgba(69,202,255,0.15)')}
      bg={useColorModeValue('rgba(255,255,255,0.7)', 'rgba(12,16,35,0.5)')}
      position="relative"
      _hover={{
        borderColor: useColorModeValue('rgba(121,95,238,0.3)', 'rgba(69,202,255,0.4)'),
        transform: 'translateY(-4px)',
      }}
      transition="all 0.3s ease"
      textAlign="center"
    >
      <Text
        fontSize="5xl"
        fontWeight="900"
        bgGradient={item.gradient}
        bgClip="text"
        lineHeight="1"
      >
        {item.step}
      </Text>
      <Flex
        w={16}
        h={16}
        borderRadius="2xl"
        bgGradient={item.gradient}
        align="center"
        justify="center"
        boxShadow="0 8px 32px rgba(0,0,0,0.2)"
      >
        <Icon as={asIcon(item.icon)} boxSize={7} color="white" />
      </Flex>
      <Heading size="md">{item.title}</Heading>
      <Text color="text.muted" fontSize="sm" lineHeight="tall">
        {item.description}
      </Text>
    </VStack>
  </MotionBox>
);
