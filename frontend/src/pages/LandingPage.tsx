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
  Badge,
  Divider,
} from '@chakra-ui/react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  FiArrowRight,
  FiCamera,
  FiZap,
  FiShield,
  FiGlobe,
  FiCheck,
  FiStar,
  FiCpu,
  FiFileText,
  FiMic,
  FiPrinter,
  FiSmartphone,
  FiWifi,
  FiLock,
  FiTrendingUp,
  FiUsers,
  FiAward,
  FiGitBranch,
} from 'react-icons/fi';

const asIcon = (icon: any) => icon as React.ElementType;
const MotionBox = motion.create(Box as any);
const MotionHeading = motion.create(Heading as any);
const MotionText = motion.create(Text as any);

// Floating orb background decoration
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
    animate={{ y: [0, -30, 0], scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
    transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
  />
);

// Feature card
const FeatureCard = ({ icon, title, description, gradient, delay }: any) => {
  const cardBg = useColorModeValue('rgba(255,255,255,0.9)', 'rgba(12,16,35,0.85)');
  const borderColor = useColorModeValue('rgba(121,95,238,0.12)', 'rgba(69,202,255,0.15)');
  return (
    <MotionBox
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay }}
    >
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="2xl"
        p={{ base: 6, md: 8 }}
        position="relative"
        overflow="hidden"
        _hover={{ transform: 'translateY(-6px)', boxShadow: '0 20px 60px rgba(69,202,255,0.15)' }}
        transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        cursor="default"
        h="100%"
      >
        <Box position="absolute" top={0} left={0} right={0} height="3px" bgGradient={gradient} />
        <Flex w={12} h={12} borderRadius="xl" bgGradient={gradient} align="center" justify="center" mb={4} boxShadow="0 8px 24px rgba(0,0,0,0.15)">
          <Icon as={asIcon(icon)} boxSize={5} color="white" />
        </Flex>
        <Heading size="md" mb={2} fontWeight="700">{title}</Heading>
        <Text color="text.muted" fontSize="sm" lineHeight="tall">{description}</Text>
      </Box>
    </MotionBox>
  );
};

// Stat card
const StatCard = ({ value, label, icon, delay }: { value: string; label: string; icon: any; delay: number }) => (
  <MotionBox
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <VStack
      spacing={2}
      p={6}
      borderRadius="xl"
      bg={useColorModeValue('rgba(255,255,255,0.7)', 'rgba(15,20,40,0.6)')}
      border="1px solid"
      borderColor={useColorModeValue('rgba(121,95,238,0.08)', 'rgba(69,202,255,0.1)')}
    >
      <Icon as={asIcon(icon)} boxSize={5} color={useColorModeValue('brand.500', 'nebula.400')} />
      <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" bgGradient="linear(to-r, brand.400, nebula.400)" bgClip="text">
        {value}
      </Text>
      <Text color="text.muted" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">{label}</Text>
    </VStack>
  </MotionBox>
);

const features = [
  { icon: FiSmartphone, title: 'Phone Capture', description: 'Scan documents with your phone camera. AI-powered edge detection automatically finds and crops your documents.', gradient: 'linear(to-r, brand.400, nebula.400)' },
  { icon: FiFileText, title: 'Smart OCR', description: 'Extract text from any document with industry-leading accuracy. Supports multiple languages and complex layouts.', gradient: 'linear(to-r, nebula.400, cyber.400)' },
  { icon: FiMic, title: 'Voice AI', description: 'Control everything with your voice. Natural language commands for printing, scanning, and document management.', gradient: 'linear(to-r, cyber.400, neon.400)' },
  { icon: FiPrinter, title: 'Print Management', description: 'Configure and send print jobs with precision controls. Paper size, quality, color mode, duplex — all in one place.', gradient: 'linear(to-r, neon.400, brand.400)' },
  { icon: FiCpu, title: 'GPU Accelerated', description: 'Powered by NVIDIA CUDA for blazing-fast document processing. Real-time AI enhancement and noise reduction.', gradient: 'linear(to-r, brand.500, cyber.400)' },
  { icon: FiWifi, title: 'Real-time Sync', description: 'Instant WebSocket-powered synchronization between your phone and desktop. No delays, no refreshing.', gradient: 'linear(to-r, nebula.400, neon.400)' },
];

const workflowSteps = [
  { step: '01', icon: FiSmartphone, title: 'Capture', description: 'Point your phone at any document. AI detects edges and captures automatically.', gradient: 'linear(to-br, brand.400, nebula.400)' },
  { step: '02', icon: FiCpu, title: 'Process', description: 'GPU-accelerated OCR extracts text. AI enhances image quality and corrects perspective.', gradient: 'linear(to-br, nebula.400, cyber.400)' },
  { step: '03', icon: FiPrinter, title: 'Output', description: 'Print, export, or convert to any format. Voice-controlled workflow automation.', gradient: 'linear(to-br, cyber.400, neon.400)' },
];

const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

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

  const heroBg = useColorModeValue(
    'linear-gradient(180deg, #f5f7ff 0%, #eef2ff 50%, #e8ecff 100%)',
    'linear-gradient(180deg, #080c18 0%, #0d1229 50%, #080c18 100%)'
  );
  const sectionBg = useColorModeValue('white', 'rgba(12,16,35,0.6)');
  const orbColor1 = useColorModeValue('rgba(121,95,238,0.15)', 'rgba(121,95,238,0.2)');
  const orbColor2 = useColorModeValue('rgba(69,202,255,0.12)', 'rgba(69,202,255,0.15)');
  const orbColor3 = useColorModeValue('rgba(147,51,234,0.12)', 'rgba(255,77,175,0.12)');
  const trustedTextColor = useColorModeValue('gray.400', 'gray.600');
  const footerBorderColor = useColorModeValue('rgba(121,95,238,0.1)', 'rgba(69,202,255,0.1)');

  return (
    <Box overflow="hidden" position="relative">
      {/* ===== HERO SECTION ===== */}
      <MotionBox
        style={{ opacity: heroOpacity, scale: heroScale }}
        position="relative"
        minH={{ base: 'calc(100vh - 56px)', md: 'calc(100vh - 56px)' }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={heroBg}
        overflow="hidden"
        px={{ base: 4, md: 0 }}
      >
        <FloatingOrb size={420} color={orbColor1} x="5%" y="10%" delay={0} />
        <FloatingOrb size={320} color={orbColor2} x="65%" y="55%" delay={2} />
        <FloatingOrb size={280} color={orbColor3} x="35%" y="75%" delay={4} />
        <FloatingOrb size={240} color={orbColor1} x="80%" y="15%" delay={1} />

        {/* Grid pattern overlay */}
        <Box
          position="absolute"
          inset={0}
          backgroundImage="radial-gradient(circle at 1px 1px, rgba(121,95,238,0.04) 1px, transparent 0)"
          backgroundSize="48px 48px"
        />

        <Container maxW="6xl" position="relative" zIndex={1} py={{ base: 12, md: 16 }}>
          <VStack spacing={{ base: 6, md: 8 }} textAlign="center">
            {/* Badge */}
            <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <HStack
                bg={useColorModeValue('rgba(121,95,238,0.06)', 'rgba(69,202,255,0.06)')}
                border="1px solid"
                borderColor={useColorModeValue('rgba(121,95,238,0.15)', 'rgba(69,202,255,0.15)')}
                borderRadius="full"
                px={4}
                py={1.5}
                spacing={2}
              >
                <Icon as={asIcon(FiZap)} color="nebula.400" boxSize={3.5} />
                <Text fontSize="xs" fontWeight="600" color={useColorModeValue('brand.600', 'nebula.300')}>
                  Powered by AI & GPU Acceleration
                </Text>
              </HStack>
            </MotionBox>

            {/* Main heading */}
            <MotionBox initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <Heading
                maxW="4xl"
                mx="auto"
                fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}
                fontWeight="900"
                lineHeight="1.05"
                letterSpacing="-0.03em"
              >
                <Text as="span" display="block">The Future of</Text>
                <Text as="span" bgGradient="linear(to-r, brand.400, nebula.400, cyber.400)" bgClip="text" display="block">
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
              fontSize={{ base: 'md', md: 'lg' }}
              color="text.muted"
              maxW="2xl"
              lineHeight="tall"
            >
              Scan, process, and print documents with AI-powered precision.
              Voice control, real-time sync, and GPU-accelerated OCR — all from your browser.
            </MotionText>

            {/* CTA buttons */}
            <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} w="full">
              <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} justify="center" align="center">
                <Button
                  as={RouterLink}
                  to="/dashboard"
                  size="lg"
                  w={{ base: 'full', sm: 'auto' }}
                  px={8}
                  h="52px"
                  fontSize="sm"
                  fontWeight="700"
                  bgGradient="linear(to-r, brand.500, nebula.500)"
                  color="white"
                  borderRadius="xl"
                  rightIcon={<Icon as={asIcon(FiArrowRight)} />}
                  _hover={{ bgGradient: 'linear(to-r, brand.600, nebula.600)', transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(69,202,255,0.35)' }}
                  transition="all 0.3s ease"
                >
                  Open Dashboard
                </Button>
                <Button
                  as={RouterLink}
                  to="/phone"
                  size="lg"
                  w={{ base: 'full', sm: 'auto' }}
                  px={8}
                  h="52px"
                  fontSize="sm"
                  fontWeight="700"
                  variant="outline"
                  borderColor={useColorModeValue('brand.300', 'nebula.500')}
                  color={useColorModeValue('brand.600', 'nebula.300')}
                  borderRadius="xl"
                  borderWidth="1.5px"
                  leftIcon={<Icon as={asIcon(FiCamera)} />}
                  _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100'), transform: 'translateY(-2px)' }}
                  transition="all 0.3s ease"
                >
                  Phone Capture
                </Button>
              </Stack>
            </MotionBox>

            {/* Trusted by */}
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }} pt={8}>
              <Text fontSize="xs" fontWeight="600" color={trustedTextColor} textTransform="uppercase" letterSpacing="0.1em" mb={4}>
                Built with industry-leading technology
              </Text>
              <HStack spacing={{ base: 4, md: 8 }} justify="center" flexWrap="wrap" opacity={0.5}>
                {['PaddleOCR', 'PyTorch', 'CUDA', 'WebSocket', 'Whisper AI'].map(tech => (
                  <Text key={tech} fontSize="sm" fontWeight="700" color={trustedTextColor} letterSpacing="0.02em">{tech}</Text>
                ))}
              </HStack>
            </MotionBox>
          </VStack>
        </Container>
      </MotionBox>

      {/* ===== STATS BAR ===== */}
      <Box py={{ base: 10, md: 14 }} bg={sectionBg} position="relative">
        <Container maxW="5xl">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 4, md: 6 }}>
            <StatCard value="<1s" label="OCR Processing" icon={FiZap} delay={0} />
            <StatCard value="99.2%" label="Text Accuracy" icon={FiAward} delay={0.1} />
            <StatCard value="GPU" label="Accelerated" icon={FiCpu} delay={0.2} />
            <StatCard value="Real-time" label="WebSocket Sync" icon={FiWifi} delay={0.3} />
          </SimpleGrid>
        </Container>
      </Box>

      {/* ===== FEATURES SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} position="relative" overflow="hidden">
        <FloatingOrb size={300} color={orbColor2} x="85%" y="20%" delay={2} />
        <FloatingOrb size={250} color={orbColor3} x="5%" y="70%" delay={4} />

        <Container maxW="6xl" position="relative" zIndex={1}>
          <VStack spacing={{ base: 10, md: 14 }}>
            <VStack spacing={3} textAlign="center">
              <Badge colorScheme="purple" variant="subtle" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
                Features
              </Badge>
              <MotionHeading
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                fontSize={{ base: '2xl', md: '4xl' }}
                fontWeight="800"
                letterSpacing="-0.02em"
              >
                Everything You Need,{' '}
                <Text as="span" bgGradient="linear(to-r, nebula.400, cyber.400)" bgClip="text">All in One Place</Text>
              </MotionHeading>
              <MotionText
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                color="text.muted"
                fontSize="md"
                maxW="lg"
              >
                From scanning to printing, powered by cutting-edge AI and real-time connections.
              </MotionText>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 5, md: 6 }} w="full">
              {features.map((feature, idx) => (
                <FeatureCard key={feature.title} icon={feature.icon} title={feature.title} description={feature.description} gradient={feature.gradient} delay={idx * 0.08} />
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* ===== WORKFLOW SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} bg={sectionBg} position="relative" overflow="hidden">
        <Container maxW="6xl" position="relative" zIndex={1}>
          <VStack spacing={{ base: 10, md: 14 }}>
            <VStack spacing={3} textAlign="center">
              <Badge colorScheme="cyan" variant="subtle" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
                How It Works
              </Badge>
              <MotionHeading
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                fontSize={{ base: '2xl', md: '4xl' }}
                fontWeight="800"
                letterSpacing="-0.02em"
              >
                Three Steps to{' '}
                <Text as="span" bgGradient="linear(to-r, brand.400, neon.400)" bgClip="text">Automation</Text>
              </MotionHeading>
            </VStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={{ base: 6, md: 8 }} w="full">
              {workflowSteps.map((item, idx) => (
                <MotionBox
                  key={item.step}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                >
                  <VStack
                    spacing={4}
                    p={{ base: 8, md: 10 }}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={useColorModeValue('rgba(121,95,238,0.1)', 'rgba(69,202,255,0.12)')}
                    bg={useColorModeValue('rgba(255,255,255,0.7)', 'rgba(12,16,35,0.5)')}
                    _hover={{ borderColor: useColorModeValue('rgba(121,95,238,0.3)', 'rgba(69,202,255,0.3)'), transform: 'translateY(-4px)' }}
                    transition="all 0.3s ease"
                    textAlign="center"
                    h="100%"
                  >
                    <Text fontSize="4xl" fontWeight="900" bgGradient={item.gradient} bgClip="text" lineHeight="1">{item.step}</Text>
                    <Flex w={14} h={14} borderRadius="2xl" bgGradient={item.gradient} align="center" justify="center" boxShadow="0 8px 32px rgba(0,0,0,0.2)">
                      <Icon as={asIcon(item.icon)} boxSize={6} color="white" />
                    </Flex>
                    <Heading size="md" fontWeight="700">{item.title}</Heading>
                    <Text color="text.muted" fontSize="sm" lineHeight="tall">{item.description}</Text>
                  </VStack>
                </MotionBox>
              ))}
            </Grid>
          </VStack>
        </Container>
      </Box>

      {/* ===== SECURITY & TRUST ===== */}
      <Box py={{ base: 12, md: 16 }} position="relative">
        <Container maxW="4xl">
          <MotionBox initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              {[
                { icon: FiLock, title: 'Local-First Processing', desc: 'All data stays on your machine. No cloud uploads required.' },
                { icon: FiShield, title: 'Enterprise Ready', desc: 'Windows printing integration with full device control.' },
                { icon: FiGitBranch, title: 'Open Architecture', desc: 'Modular pipeline with Groq fallback and local AI stack.' },
              ].map((item, idx) => (
                <HStack key={idx} spacing={4} align="flex-start" p={4}>
                  <Flex w={10} h={10} borderRadius="lg" bg={useColorModeValue('brand.50', 'whiteAlpha.100')} align="center" justify="center" flexShrink={0}>
                    <Icon as={asIcon(item.icon)} boxSize={5} color={useColorModeValue('brand.500', 'nebula.400')} />
                  </Flex>
                  <Box>
                    <Text fontWeight="700" fontSize="sm" mb={1}>{item.title}</Text>
                    <Text color="text.muted" fontSize="xs" lineHeight="tall">{item.desc}</Text>
                  </Box>
                </HStack>
              ))}
            </SimpleGrid>
          </MotionBox>
        </Container>
      </Box>

      {/* ===== CTA SECTION ===== */}
      <Box py={{ base: 14, md: 20 }} position="relative" overflow="hidden">
        <FloatingOrb size={400} color={orbColor1} x="50%" y="30%" delay={0} />
        <Container maxW="3xl" position="relative" zIndex={1}>
          <MotionBox initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <VStack
              spacing={{ base: 6, md: 8 }}
              p={{ base: 10, md: 14 }}
              borderRadius="3xl"
              bgGradient="linear(to-br, brand.500, nebula.600)"
              position="relative"
              overflow="hidden"
              textAlign="center"
            >
              <Box position="absolute" top="-60px" right="-60px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.100" />
              <Box position="absolute" bottom="-40px" left="-40px" w="150px" h="150px" borderRadius="full" bg="whiteAlpha.100" />

              <Heading fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="white" letterSpacing="-0.02em">
                Ready to Transform Your Workflow?
              </Heading>
              <Text color="whiteAlpha.900" fontSize="md" maxW="md">
                Start scanning, processing, and printing documents in seconds. No setup required.
              </Text>
              <Button
                as={RouterLink}
                to="/dashboard"
                size="lg"
                w={{ base: 'full', sm: 'auto' }}
                px={10}
                h="52px"
                bg="white"
                color="brand.600"
                borderRadius="xl"
                fontWeight="700"
                fontSize="sm"
                rightIcon={<Icon as={asIcon(FiArrowRight)} />}
                _hover={{ bg: 'whiteAlpha.900', transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
                transition="all 0.3s ease"
              >
                Get Started Free
              </Button>
            </VStack>
          </MotionBox>
        </Container>
      </Box>

      {/* ===== FOOTER ===== */}
      <Box py={8} borderTop="1px solid" borderColor={footerBorderColor}>
        <Container maxW="6xl">
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" gap={4}>
            <HStack spacing={2}>
              <Flex w={6} h={6} borderRadius="md" bgGradient="linear(to-br, brand.400, nebula.500)" align="center" justify="center">
                <Text fontSize="xs" fontWeight="900" color="white">P</Text>
              </Flex>
              <Text fontWeight="700" fontSize="sm" bgGradient="linear(to-r, brand.400, nebula.400)" bgClip="text">
                PrintChakra
              </Text>
            </HStack>
            <Text color="text.muted" fontSize="xs">
              © {new Date().getFullYear()} PrintChakra. All-in-One Document Intelligence Platform.
            </Text>
            <HStack spacing={4}>
              <Icon as={asIcon(FiShield)} color="text.muted" boxSize={4} />
              <Icon as={asIcon(FiGlobe)} color="text.muted" boxSize={4} />
              <Icon as={asIcon(FiZap)} color="text.muted" boxSize={4} />
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
