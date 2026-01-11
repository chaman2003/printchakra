import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  FiCamera,
  FiCpu,
  FiFileText,
  FiMic,
  FiPrinter,
  FiSmartphone,
  FiZap,
  FiArrowRight,
  FiWifi,
  FiShield,
  FiGlobe,
} from 'react-icons/fi';

// Cast helper for react-icons + Chakra UI Icon compatibility with React 19
const asIcon = (icon: any) => icon as React.ElementType;

const MotionBox = motion.create(Box as any);
const MotionHeading = motion.create(Heading as any);
const MotionText = motion.create(Text as any);

// Floating orb background
const FloatingOrb = ({ size, color, x, y, delay }: { size: number; color: string; x: string; y: string; delay: number }) => (
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

// Feature card
const FeatureCard = ({ icon, title, description, gradient, delay }: {
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

// Stats card
const StatCard = ({ value, label, delay }: { value: string; label: string; delay: number }) => (
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

const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  // Animated text for hero
  const [displayText, setDisplayText] = useState('');
  const fullText = 'Document Intelligence';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Colors
  const heroBg = useColorModeValue(
    'linear-gradient(180deg, #f5f7ff 0%, #eef2ff 50%, #e8ecff 100%)',
    'linear-gradient(180deg, #080c18 0%, #0d1229 50%, #080c18 100%)'
  );
  const sectionBg = useColorModeValue('white', 'rgba(12,16,35,0.6)');
  const orbColor1 = useColorModeValue('rgba(121,95,238,0.15)', 'rgba(121,95,238,0.2)');
  const orbColor2 = useColorModeValue('rgba(69,202,255,0.12)', 'rgba(69,202,255,0.15)');
  const orbColor3 = useColorModeValue('rgba(147,51,234,0.12)', 'rgba(255,77,175,0.12)');

  const features = [
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
      description: 'Configure and send print jobs with precision controls. Paper size, quality, color mode, duplex — all in one place.',
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

  return (
    <Box overflow="hidden" position="relative">
      {/* ===== HERO SECTION ===== */}
      <MotionBox
        style={{ opacity: heroOpacity, scale: heroScale }}
        position="relative"
        minH={{ base: 'calc(100vh - 72px)', md: 'calc(100vh - 72px)' }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={heroBg}
        overflow="hidden"
        px={{ base: 4, md: 0 }}
      >
        {/* Background orbs */}
        <FloatingOrb size={420} color={orbColor1} x="5%" y="10%" delay={0} />
        <FloatingOrb size={320} color={orbColor2} x="65%" y="55%" delay={2} />
        <FloatingOrb size={280} color={orbColor3} x="35%" y="75%" delay={4} />
        <FloatingOrb size={240} color={orbColor1} x="80%" y="15%" delay={1} />
        <FloatingOrb size={220} color={orbColor2} x="15%" y="60%" delay={3} />

        {/* Grid pattern overlay */}
        <Box
          position="absolute"
          inset={0}
          backgroundImage="radial-gradient(circle at 1px 1px, rgba(121,95,238,0.06) 1px, transparent 0)"
          backgroundSize="40px 40px"
        />

        <Container maxW="7xl" position="relative" zIndex={1} py={{ base: 12, md: 16 }}>
          <VStack spacing={{ base: 6, md: 8 }} textAlign="center">
            {/* Badge */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HStack
                bg={useColorModeValue('rgba(121,95,238,0.1)', 'rgba(69,202,255,0.1)')}
                border="1px solid"
                borderColor={useColorModeValue('rgba(121,95,238,0.2)', 'rgba(69,202,255,0.2)')}
                borderRadius="full"
                px={5}
                py={2}
                spacing={2}
              >
                <Icon as={asIcon(FiZap)} color="nebula.400" />
                <Text fontSize="sm" fontWeight="600" color={useColorModeValue('brand.600', 'nebula.300')}>
                  Powered by AI & GPU Acceleration
                </Text>
              </HStack>
            </MotionBox>

            {/* Main heading */}
            <MotionBox
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Heading
                maxW="5xl"
                mx="auto"
                fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}
                fontWeight="900"
                lineHeight="1.1"
                letterSpacing="-0.02em"
              >
                <Text as="span" display="block">
                  The Future of
                </Text>
                <Text
                  as="span"
                  bgGradient="linear(to-r, brand.400, nebula.400, cyber.400)"
                  bgClip="text"
                  display="block"
                >
                  {displayText}
                  <Box
                    as="span"
                    display="inline-block"
                    w="3px"
                    h={{ base: '2rem', md: '3.5rem' }}
                    bg="nebula.400"
                    ml={1}
                    verticalAlign="middle"
                    animation="blink 1s step-end infinite"
                    sx={{ '@keyframes blink': { '50%': { opacity: 0 } } }}
                  />
                </Text>
              </Heading>
            </MotionBox>

            {/* Subtitle */}
            <MotionText
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              fontSize={{ base: 'md', md: 'lg', lg: 'xl' }}
              color="text.muted"
              maxW="3xl"
              lineHeight="tall"
            >
              Scan, process, and print documents with AI-powered precision.
              Voice control, real-time sync, and GPU-accelerated OCR — all from your browser.
            </MotionText>

            {/* CTA buttons */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              w="full"
            >
              <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} justify="center" align="center">
                <Button
                  as={RouterLink}
                  to="/dashboard"
                  size="lg"
                  w={{ base: 'full', sm: 'auto' }}
                  minW={{ sm: '220px' }}
                  px={8}
                  py={7}
                  fontSize="md"
                  bgGradient="linear(to-r, brand.500, nebula.500)"
                  color="white"
                  borderRadius="2xl"
                  rightIcon={<Icon as={asIcon(FiArrowRight)} />}
                  _hover={{
                    bgGradient: 'linear(to-r, brand.600, nebula.600)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(69,202,255,0.4)',
                  }}
                  transition="all 0.3s ease"
                >
                  Open Dashboard
                </Button>
                <Button
                  as={RouterLink}
                  to="/phone"
                  size="lg"
                  w={{ base: 'full', sm: 'auto' }}
                  minW={{ sm: '220px' }}
                  px={8}
                  py={7}
                  fontSize="md"
                  variant="outline"
                  borderColor={useColorModeValue('brand.400', 'nebula.400')}
                  color={useColorModeValue('brand.600', 'nebula.300')}
                  borderRadius="2xl"
                  borderWidth="2px"
                  leftIcon={<Icon as={asIcon(FiCamera)} />}
                  _hover={{
                    bg: useColorModeValue('brand.50', 'whiteAlpha.100'),
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(121,95,238,0.2)',
                  }}
                  transition="all 0.3s ease"
                >
                  Phone Capture
                </Button>
              </Stack>
            </MotionBox>

            {/* Stats row */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              pt={{ base: 4, md: 8 }}
              w="full"
            >
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 6, md: 8 }} maxW="4xl" mx="auto">
                <StatCard value="AI" label="Powered OCR" delay={0.9} />
                <StatCard value="RTX" label="GPU Accelerated" delay={1.0} />
                <StatCard value="Real-time" label="WebSocket Sync" delay={1.1} />
                <StatCard value="Voice" label="AI Commands" delay={1.2} />
              </SimpleGrid>
            </MotionBox>
          </VStack>
        </Container>
      </MotionBox>

      {/* ===== FEATURES SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} position="relative" overflow="hidden">
        <FloatingOrb size={300} color={orbColor2} x="85%" y="20%" delay={2} />
        <FloatingOrb size={250} color={orbColor3} x="5%" y="70%" delay={4} />

        <Container maxW="7xl" position="relative" zIndex={1}>
          <VStack spacing={{ base: 10, md: 16 }}>
            {/* Section header */}
            <VStack spacing={4} textAlign="center">
              <MotionHeading
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                fontSize={{ base: '3xl', md: '4xl' }}
                fontWeight="800"
              >
                Everything You Need,{' '}
                <Text as="span" bgGradient="linear(to-r, nebula.400, cyber.400)" bgClip="text">
                  All in One Place
                </Text>
              </MotionHeading>
              <MotionText
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                color="text.muted"
                fontSize="lg"
                maxW="xl"
              >
                From scanning to printing, powered by cutting-edge AI and real-time connections.
              </MotionText>
            </VStack>

            {/* Feature grid */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 5, md: 6 }} w="full">
              {features.map((feature, idx) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  gradient={feature.gradient}
                  delay={idx * 0.1}
                />
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* ===== WORKFLOW SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} bg={sectionBg} position="relative" overflow="hidden">
        <Container maxW="7xl" position="relative" zIndex={1}>
          <VStack spacing={{ base: 10, md: 16 }}>
            <VStack spacing={4} textAlign="center">
              <MotionHeading
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                fontSize={{ base: '3xl', md: '4xl' }}
                fontWeight="800"
              >
                How It{' '}
                <Text as="span" bgGradient="linear(to-r, brand.400, neon.400)" bgClip="text">
                  Works
                </Text>
              </MotionHeading>
            </VStack>

            {/* Workflow steps */}
            <Grid
              templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
              gap={{ base: 6, md: 8 }}
              w="full"
            >
              {[
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
              ].map((item, idx) => (
                <MotionBox
                  key={item.step}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
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
              ))}
            </Grid>
          </VStack>
        </Container>
      </Box>

      {/* ===== CTA SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} position="relative" overflow="hidden">
        <FloatingOrb size={400} color={orbColor1} x="50%" y="30%" delay={0} />
        <Container maxW="4xl" position="relative" zIndex={1}>
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <VStack
              spacing={{ base: 6, md: 8 }}
              p={{ base: 10, md: 16 }}
              borderRadius="3xl"
              bgGradient="linear(to-br, brand.500, nebula.600)"
              position="relative"
              overflow="hidden"
              textAlign="center"
            >
              {/* Decorative circles */}
              <Box
                position="absolute"
                top="-60px"
                right="-60px"
                w="200px"
                h="200px"
                borderRadius="full"
                bg="whiteAlpha.100"
              />
              <Box
                position="absolute"
                bottom="-40px"
                left="-40px"
                w="150px"
                h="150px"
                borderRadius="full"
                bg="whiteAlpha.100"
              />

              <Heading
                fontSize={{ base: '2xl', md: '4xl' }}
                fontWeight="800"
                color="white"
              >
                Ready to Transform Your Workflow?
              </Heading>
              <Text color="whiteAlpha.900" fontSize="lg" maxW="lg">
                Start scanning, processing, and printing documents in seconds. No setup required.
              </Text>
              <Button
                as={RouterLink}
                to="/dashboard"
                size="lg"
                w={{ base: 'full', sm: 'auto' }}
                px={10}
                py={7}
                bg="white"
                color="brand.600"
                borderRadius="2xl"
                fontWeight="700"
                rightIcon={<Icon as={asIcon(FiArrowRight)} />}
                _hover={{
                  bg: 'whiteAlpha.900',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                }}
                transition="all 0.3s ease"
              >
                Get Started Now
              </Button>
            </VStack>
          </MotionBox>
        </Container>
      </Box>

      {/* ===== FOOTER ===== */}
      <Box
        py={8}
        borderTop="1px solid"
        borderColor={useColorModeValue('rgba(121,95,238,0.1)', 'rgba(69,202,255,0.1)')}
      >
        <Container maxW="6xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap={4}
          >
            <HStack spacing={2}>
              <Text fontSize="lg" fontWeight="bold">📄</Text>
              <Text fontWeight="700" bgGradient="linear(to-r, brand.400, nebula.400)" bgClip="text">
                PrintChakra
              </Text>
            </HStack>
            <Text color="text.muted" fontSize="sm">
              All-in-One Document Intelligence Platform
            </Text>
            <HStack spacing={4}>
              <Icon as={asIcon(FiShield)} color="text.muted" />
              <Icon as={asIcon(FiGlobe)} color="text.muted" />
              <Icon as={asIcon(FiZap)} color="text.muted" />
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
