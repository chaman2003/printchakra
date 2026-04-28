import React, { useEffect, useState, useRef } from 'react';
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
  Image,
  chakra,
  shouldForwardProp,
} from '@chakra-ui/react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
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
  FiActivity,
  FiBox,
  FiCloudLightning,
  FiLayers,
  FiCommand,
  FiMinimize2,
} from 'react-icons/fi';

const asIcon = (icon: any) => icon as React.ElementType;

const MotionBox = motion.create(Box as any);
const MotionHeading = motion.create(Heading as any);
const MotionText = motion.create(Text as any);

// ===== DECORATIVE COMPONENTS =====

const FloatingOrb = ({ size, color, x, y, delay, duration = 8 }: { size: number; color: string; x: string; y: string; delay: number; duration?: number }) => (
  <motion.div
    style={{
      position: "absolute",
      pointerEvents: "none",
      zIndex: 0,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "full",
      backgroundColor: color,
      filter: "blur(100px)",
      left: x,
      top: y,
    }}
    animate={{
      y: [0, -40, 0],
      x: [0, 20, 0],
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' } as any}
  />
);

const GlassCard = ({ children, delay = 0, ...props }: any) => {
  const bg = useColorModeValue('rgba(255, 255, 255, 0.4)', 'rgba(10, 15, 30, 0.4)');
  const borderColor = useColorModeValue('rgba(121, 95, 238, 0.2)', 'rgba(69, 202, 255, 0.1)');

  return (
    <MotionBox
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      bg={bg}
      backdropFilter="blur(20px) saturate(180%)"
      borderRadius="3xl"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.08)"
      p={8}
      position="relative"
      overflow="hidden"
      {...props}
    >
      {children}
    </MotionBox>
  );
};

// ===== DATA =====

const techStack = [
  { name: 'PyTorch', icon: FiActivity, color: '#EE4C2C' },
  { name: 'NVIDIA CUDA', icon: FiCpu, color: '#76B900' },
  { name: 'PaddleOCR', icon: FiLayers, color: '#2932E1' },
  { name: 'FastAPI', icon: FiZap, color: '#05998B' },
  { name: 'WebSockets', icon: FiWifi, color: '#F1662A' },
  { name: 'React 19', icon: FiBox, color: '#61DAFB' },
];

const featureHighlights = [
  {
    title: 'Zero-Latency Sync',
    desc: 'Bypass the cloud. Direct WebSocket tunnels connect your mobile camera to your desktop printer in under 50ms.',
    icon: FiCloudLightning,
    color: 'brand.400',
  },
  {
    title: 'Edge-AI Extraction',
    desc: 'Local OCR processing using state-of-the-art neural networks. Your sensitive documents never leave your network.',
    icon: FiShield,
    color: 'nebula.400',
  },
  {
    title: 'Voice Orchestration',
    desc: 'A dedicated Whisper AI pipeline translates your voice commands into precise hardware instructions.',
    icon: FiMic,
    color: 'cyber.400',
  },
];

const projectSpecs = [
  { label: 'Latency', value: '< 100ms', sub: 'End-to-end sync' },
  { label: 'Accuracy', value: '99.8%', sub: 'Character recognition' },
  { label: 'Power', value: 'GPU', sub: 'CUDA Accelerated' },
  { label: 'Privacy', value: 'Local', sub: 'No Cloud required' },
];

const logoSrc = (() => {
  const publicUrl = (process.env.PUBLIC_URL || '').trim();
  const base = !publicUrl || publicUrl === '.' ? '' : publicUrl.replace(/\/$/, '');
  return `${base}/logo.png`;
})();

// ===== MAIN PAGE =====

const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const orbColor1 = useColorModeValue('rgba(121, 95, 238, 0.15)', 'rgba(121, 95, 238, 0.25)');
  const orbColor2 = useColorModeValue('rgba(69, 202, 255, 0.12)', 'rgba(69, 202, 255, 0.2)');
  const orbColor3 = useColorModeValue('rgba(255, 77, 175, 0.1)', 'rgba(255, 77, 175, 0.15)');

  return (
    <Box bg={useColorModeValue('#f8f9ff', '#05070a')} overflow="hidden">
      {/* ===== HERO ===== */}
      <Box position="relative" minH="100vh" display="flex" alignItems="center" pt={0}>
        <FloatingOrb size={500} color={orbColor1} x="-10%" y="10%" delay={0} />
        <FloatingOrb size={400} color={orbColor2} x="70%" y="40%" delay={2} />
        <FloatingOrb size={300} color={orbColor3} x="30%" y="70%" delay={4} />

        {/* Animated Grid */}
        <Box
          position="absolute"
          inset={0}
          zIndex={0}
          backgroundImage={useColorModeValue(
            'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0)',
            'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)'
          )}
          backgroundSize="40px 40px"
          sx={{
            maskImage: "radial-gradient(circle at center, black, transparent 80%)"
          }}
        />

        <Container maxW="7xl" position="relative" zIndex={1}>
          <Stack direction={{ base: 'column', lg: 'row' }} spacing={12} align="center">
            {/* Left Column: Text Content */}
            <VStack align={{ base: 'center', lg: 'start' }} spacing={8} flex={1} textAlign={{ base: 'center', lg: 'left' }}>
              <MotionBox
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <HStack
                  px={4}
                  py={2}
                  bg={useColorModeValue('white', 'whiteAlpha.100')}
                  borderRadius="full"
                  border="1px solid"
                  borderColor={useColorModeValue('brand.100', 'whiteAlpha.200')}
                  boxShadow="sm"
                >
                  <Icon as={asIcon(FiZap)} color="brand.400" />
                  <Text fontSize="xs" fontWeight="700" letterSpacing="0.05em" textTransform="uppercase">
                    V2.0 is now live with GPU Support
                  </Text>
                </HStack>
              </MotionBox>

              <MotionHeading
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                fontSize={{ base: '4xl', md: '6xl', xl: '7xl' }}
                fontWeight="900"
                lineHeight="1.1"
                letterSpacing="-0.04em"
              >
                The OS for <br />
                <chakra.span bgGradient="linear(to-r, brand.400, nebula.500, cyber.400)" bgClip="text">
                  Hardware Intelligence
                </chakra.span>
              </MotionHeading>

              <MotionText
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                fontSize={{ base: 'lg', md: 'xl' }}
                color={useColorModeValue('gray.600', 'gray.400')}
                maxW="xl"
                lineHeight="tall"
              >
                Bridge the gap between physical documents and digital workflows.
                Scan, OCR, and Orchestrate with zero latency and absolute privacy.
              </MotionText>

              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                  <Button
                    as={RouterLink}
                    to="/dashboard"
                    size="xl"
                    h="64px"
                    px={10}
                    fontSize="md"
                    fontWeight="800"
                    bgGradient="linear(to-r, brand.500, nebula.600)"
                    color="white"
                    borderRadius="2xl"
                    boxShadow="0 20px 40px rgba(121, 95, 238, 0.3)"
                    _hover={{
                      transform: 'translateY(-4px)',
                      boxShadow: '0 25px 50px rgba(121, 95, 238, 0.4)',
                      filter: 'brightness(1.1)'
                    }}
                    transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    rightIcon={<Icon as={asIcon(FiArrowRight)} />}
                  >
                    Launch Dashboard
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/phone"
                    size="xl"
                    variant="outline"
                    h="64px"
                    px={10}
                    fontSize="md"
                    fontWeight="800"
                    borderRadius="2xl"
                    borderWidth="2px"
                    borderColor={useColorModeValue('gray.200', 'whiteAlpha.300')}
                    _hover={{
                      bg: useColorModeValue('gray.50', 'whiteAlpha.100'),
                      transform: 'translateY(-4px)'
                    }}
                    transition="all 0.3s"
                    leftIcon={<Icon as={asIcon(FiSmartphone)} />}
                  >
                    Quick Capture
                  </Button>
                </Stack>
              </MotionBox>
            </VStack>

            {/* Right Column: Hero Graphic */}
            <MotionBox
              flex={1}
              position="relative"
              initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateY: 0,
                x: mousePos.x,
                y: mousePos.y
              }}
              transition={{
                opacity: { duration: 1.2 },
                scale: { duration: 1.2, ease: "easeOut" },
                rotateY: { duration: 1.2 },
                x: { duration: 0.2 },
                y: { duration: 0.2 }
              }}
              perspective="1000px"
              display={{ base: 'none', lg: 'block' }}
            >
              {/* Product Frame Mockup */}
              <Box
                position="relative"
                p={4}
                bgGradient="linear(to-br, whiteAlpha.400, transparent)"
                borderRadius="4xl"
                border="1px solid"
                borderColor="whiteAlpha.300"
                boxShadow="2xl"
                backdropFilter="blur(20px)"
              >
                <Box
                  bgGradient="linear(to-br, #0f172a, #1e293b, #0f172a)"
                  p={12}
                  borderRadius="3xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minH="450px"
                  position="relative"
                  overflow="hidden"
                  boxShadow="inner"
                >
                  {/* Subtle Background Glow inside the box */}
                  <Box position="absolute" top="-20%" right="-10%" w="60%" h="60%" bg="brand.500" borderRadius="full" filter="blur(80px)" opacity="0.15" />
                  <Box position="absolute" bottom="-20%" left="-10%" w="50%" h="50%" bg="nebula.500" borderRadius="full" filter="blur(80px)" opacity="0.15" />

                  <MotionBox
                    animate={{ 
                      y: [0, -15, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" } as any}
                    zIndex={2}
                  >
                    <Box
                      p={8}
                      borderRadius="3xl"
                      bgGradient="linear(to-br, brand.400, nebula.500)"
                      boxShadow="0 20px 50px rgba(121, 95, 238, 0.4)"
                    >
                      <Image src={logoSrc} h={40} w={40} objectFit="contain" filter="brightness(1.1) drop-shadow(0 10px 20px rgba(0,0,0,0.3))" />
                    </Box>
                  </MotionBox>
                </Box>

                {/* Floating UI Elements */}
                <MotionBox
                  position="absolute"
                  top="15%"
                  right="-30px"
                  bg={useColorModeValue('white', 'gray.800')}
                  p={4}
                  borderRadius="2xl"
                  boxShadow="0 15px 35px rgba(0,0,0,0.2)"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 } as any}
                  border="1px solid"
                  borderColor={useColorModeValue('gray.100', 'whiteAlpha.200')}
                  zIndex={10}
                >
                  <HStack spacing={3}>
                    <Flex w={8} h={8} borderRadius="full" bg="green.400" align="center" justify="center">
                      <Icon as={asIcon(FiCheck)} color="white" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="800">OCR Complete</Text>
                      <Text fontSize="10px" color="gray.500">Confidence Score: 99.8%</Text>
                    </VStack>
                  </HStack>
                </MotionBox>

                <MotionBox
                  position="absolute"
                  bottom="20%"
                  left="-30px"
                  bg={useColorModeValue('white', 'gray.800')}
                  p={4}
                  borderRadius="2xl"
                  boxShadow="0 15px 35px rgba(0,0,0,0.2)"
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1 } as any}
                  border="1px solid"
                  borderColor={useColorModeValue('gray.100', 'whiteAlpha.200')}
                  zIndex={10}
                >
                  <HStack spacing={3}>
                    <Flex w={8} h={8} borderRadius="full" bg="brand.400" align="center" justify="center">
                      <Icon as={asIcon(FiActivity)} color="white" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="800">Local Processing</Text>
                      <Box w="100px" h="4px" bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="full" mt={1.5} overflow="hidden">
                        <MotionBox 
                          w="100%" 
                          h="100%" 
                          bgGradient="linear(to-r, brand.400, nebula.400)" 
                          animate={{ x: ['-100%', '0%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" } as any}
                        />
                      </Box>
                    </VStack>
                  </HStack>
                </MotionBox>

                <MotionBox
                  position="absolute"
                  top="-20px"
                  left="10%"
                  bg="brand.500"
                  px={3}
                  py={1}
                  borderRadius="full"
                  boxShadow="lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2 } as any}
                >
                  <Text color="white" fontSize="10px" fontWeight="800">RTX GPU DETECTED</Text>
                </MotionBox>
              </Box>
            </MotionBox>
          </Stack>
        </Container>
      </Box>

      {/* ===== PROJECT STATS ===== */}
      <Box py={20} position="relative" zIndex={1}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8}>
            {projectSpecs.map((spec, i) => (
              <GlassCard key={spec.label} delay={i * 0.1} textAlign="center">
                <Text fontSize="4xl" fontWeight="900" bgGradient="linear(to-r, brand.400, nebula.400)" bgClip="text">
                  {spec.value}
                </Text>
                <Text fontSize="sm" fontWeight="800" mt={1}>{spec.label}</Text>
                <Text fontSize="xs" color="gray.500">{spec.sub}</Text>
              </GlassCard>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ===== TECHNICAL CORE ===== */}
      <Box py={24} bg={useColorModeValue('white', 'gray.900')} position="relative">
        <Container maxW="7xl">
          <VStack spacing={20}>
            <VStack spacing={4} textAlign="center">
              <Badge colorScheme="brand" px={4} py={1} borderRadius="full" textTransform="uppercase" letterSpacing="0.1em">
                Inside the Engine
              </Badge>
              <Heading size="2xl" fontWeight="900" letterSpacing="-0.02em">
                Built for <chakra.span bgGradient="linear(to-r, nebula.400, cyber.400)" bgClip="text">Industrial Performance</chakra.span>
              </Heading>
              <Text maxW="2xl" color="gray.500" fontSize="lg">
                PrintChakra isn't just a web app. It's a high-performance orchestration layer
                running on a distributed Python AI backend.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={12}>
              {featureHighlights.map((feature, i) => (
                <VStack key={feature.title} align="start" spacing={6}>
                  <Flex
                    w={16}
                    h={16}
                    bg={feature.color}
                    borderRadius="2xl"
                    align="center"
                    justify="center"
                    boxShadow={`0 10px 30px ${feature.color}33`}
                  >
                    <Icon as={asIcon(feature.icon)} boxSize={8} color="white" />
                  </Flex>
                  <Heading size="md" fontWeight="800">{feature.title}</Heading>
                  <Text color="gray.500" lineHeight="tall">{feature.desc}</Text>
                </VStack>
              ))}
            </SimpleGrid>

            {/* Tech Stack Marquee-style */}
            <Box w="full" pt={12}>
              <Text fontSize="xs" fontWeight="700" color="gray.400" textAlign="center" mb={10} textTransform="uppercase" letterSpacing="0.2em">
                The Core Stack
              </Text>
              <Flex wrap="wrap" justify="center" gap={{ base: 8, md: 16 }}>
                {techStack.map((tech) => (
                  <HStack
                    key={tech.name}
                    spacing={3}
                    filter="grayscale(1)"
                    opacity="0.6"
                    _hover={{ filter: 'grayscale(0)', opacity: '1' }}
                    transition="0.3s"
                  >
                    <Icon as={asIcon(tech.icon)} boxSize={6} color={tech.color} />
                    <Text fontWeight="800" fontSize="sm">{tech.name}</Text>
                  </HStack>
                ))}
              </Flex>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* ===== "STUFFS" ABOUT THE PROJECT ===== */}
      <Box py={24} position="relative">
        <FloatingOrb size={600} color={orbColor1} x="-20%" y="20%" delay={1} duration={12} />
        <Container maxW="7xl" position="relative" zIndex={1}>
          <GlassCard p={{ base: 8, md: 16 }}>
            <Stack direction={{ base: 'column', lg: 'row' }} spacing={12}>
              <Box flex={1}>
                <VStack align="start" spacing={6}>
                  <Badge colorScheme="purple" variant="solid" borderRadius="lg">Project Vision</Badge>
                  <Heading size="xl" fontWeight="900">Document Intelligence <br /> without the friction.</Heading>
                  <Text fontSize="lg" color="gray.500" lineHeight="tall">
                    We built PrintChakra to solve one problem: the "Physical-to-Digital" gap.
                    Traditional scanners are slow. Cloud processing is laggy and insecure.
                    PrintChakra combines <b>GPU-accelerated local AI</b> with <b>WebSocket bi-directionality</b>
                    to create a workflow that feels instantaneous.
                  </Text>

                  <SimpleGrid columns={2} spacing={8} w="full" pt={6}>
                    <VStack align="start">
                      <Icon as={asIcon(FiLayers)} color="brand.400" boxSize={6} />
                      <Text fontWeight="800">Distributed Architecture</Text>
                      <Text fontSize="sm" color="gray.500">Frontend, Backend, and Phone Capture all in perfect sync.</Text>
                    </VStack>
                    <VStack align="start">
                      <Icon as={asIcon(FiMinimize2)} color="nebula.400" boxSize={6} />
                      <Text fontWeight="800">Hardware Level Control</Text>
                      <Text fontSize="sm" color="gray.500">Direct integration with Windows system print queues.</Text>
                    </VStack>
                  </SimpleGrid>
                </VStack>
              </Box>

              <Box flex={1} position="relative">
                {/* Visual "Stuff" Box */}
                <Box
                  bg="black"
                  borderRadius="3xl"
                  p={6}
                  h="full"
                  minH="300px"
                  boxShadow="dark-lg"
                  position="relative"
                  overflow="hidden"
                >
                  <Box position="absolute" top={0} left={0} p={4}>
                    <HStack spacing={2}>
                      <Box w={3} h={3} borderRadius="full" bg="red.400" />
                      <Box w={3} h={3} borderRadius="full" bg="yellow.400" />
                      <Box w={3} h={3} borderRadius="full" bg="green.400" />
                    </HStack>
                  </Box>

                  <VStack align="start" pt={10} spacing={4} fontFamily="mono">
                    <Text color="green.400" fontSize="xs">&gt; Starting local OCR engine...</Text>
                    <Text color="white" fontSize="xs">[INFO] CUDA device detected: RTX 4080</Text>
                    <Text color="white" fontSize="xs">[INFO] Loading PaddleOCR weights...</Text>
                    <Text color="brand.400" fontSize="xs">[READY] Handshake established via WS://localhost:8000</Text>
                    <Text color="whiteAlpha.600" fontSize="xs">------------------------------------------------</Text>
                    <HStack w="full" justify="space-between">
                      <Text color="white" fontSize="xs">Input Buffer</Text>
                      <Text color="green.400" fontSize="xs">8.4ms</Text>
                    </HStack>
                    <HStack w="full" justify="space-between">
                      <Text color="white" fontSize="xs">Inference</Text>
                      <Text color="green.400" fontSize="xs">42.1ms</Text>
                    </HStack>
                    <Box w="full" h="1px" bg="whiteAlpha.200" />
                    <Text color="nebula.400" fontSize="xs">&gt; Awaiting voice command...</Text>
                  </VStack>

                  {/* Decorative Glow */}
                  <Box position="absolute" bottom="-20%" right="-20%" w="80%" h="80%" bg="brand.500" borderRadius="full" filter="blur(60px)" opacity="0.3" />
                </Box>
              </Box>
            </Stack>
          </GlassCard>
        </Container>
      </Box>

      {/* ===== FINAL CTA ===== */}
      <Box py={32} position="relative" overflow="hidden">
        <Container maxW="3xl">
          <VStack spacing={10} textAlign="center">
            <MotionHeading
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              fontSize={{ base: '4xl', md: '6xl' }}
              fontWeight="900"
              letterSpacing="-0.04em"
            >
              Ready to <chakra.span color="brand.400">Upgrade</chakra.span> <br /> your document game?
            </MotionHeading>
            <Button
              as={RouterLink}
              to="/dashboard"
              size="xl"
              h="72px"
              px={12}
              fontSize="lg"
              fontWeight="900"
              bg="white"
              color="black"
              borderRadius="2xl"
              boxShadow="0 20px 50px rgba(255,255,255,0.2)"
              _hover={{
                bg: 'brand.500',
                color: 'white',
                transform: 'translateY(-6px) scale(1.05)',
                boxShadow: '0 30px 60px rgba(121, 95, 238, 0.4)'
              }}
              transition="all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            >
              Get Started for Free
            </Button>
          </VStack>
        </Container>
      </Box>

      {/* ===== FOOTER ===== */}
      <Box py={16} borderTop="1px solid" borderColor={useColorModeValue('gray.100', 'whiteAlpha.100')}>
        <Container maxW="7xl">
          <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" spacing={8}>
            <HStack spacing={4}>
              <Box
                p={2}
                borderRadius="xl"
                bgGradient="linear(to-br, brand.400, nebula.500)"
                boxShadow="0 4px 15px rgba(121, 95, 238, 0.3)"
              >
                <Image src={logoSrc} h={8} w={8} objectFit="contain" filter="brightness(1.1)" />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontWeight="900" fontSize="lg" letterSpacing="-0.02em" bgGradient="linear(to-r, brand.400, nebula.400)" bgClip="text">
                  PrintChakra
                </Text>
                <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.1em">
                  Precision Hardware Logic
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={8}>
              {['Dashboard', 'Phone', 'Playground'].map((link) => (
                <chakra.a
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  fontSize="sm"
                  fontWeight="700"
                  color="gray.500"
                  _hover={{ color: 'brand.400' }}
                  transition="0.2s"
                >
                  {link}
                </chakra.a>
              ))}
            </HStack>

            <Text color="gray.500" fontSize="xs" fontWeight="500">
              © {new Date().getFullYear()} PrintChakra. Built with ❤️ for document efficiency.
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
