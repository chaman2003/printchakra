# 📁 Project Organization Guide

## Overview

PrintChakra follows a clean, organized structure with consistent formatting and clear separation of concerns.

---

## 📂 Project Structure

```
printchakra/
│
├── 📄 Configuration Files (Root)
│   ├── .editorconfig          # Editor settings for consistent formatting
│   ├── .gitignore             # Git ignore rules
│   ├── pyproject.toml         # Python project config (black, isort, etc.)
│   ├── README.md              # Main documentation
│   ├── CODE_SIMPLIFICATION.md # Code simplification guide
│   └── PROJECT_ORGANIZATION.md # This file
│
├── 🐍 Backend (Python/Flask)
│   ├── app.py                 # Main Flask application
│   ├── app_modular.py         # Modular Flask app (alternative)
│   ├── requirements.txt       # Python dependencies
│   │
│   ├── config/                # Configuration management
│   │   ├── __init__.py
│   │   └── settings.py        # Centralized settings
│   │
│   ├── helpers/               # ✨ Reusable helper functions
│   │   ├── __init__.py
│   │   ├── logging_helper.py  # Logging utilities
│   │   ├── file_helper.py     # File operations
│   │   └── image_helper.py    # Image processing helpers
│   │
│   ├── models/                # Data models & schemas
│   │   ├── __init__.py
│   │   ├── document.py        # Document model
│   │   ├── file_info.py       # File information
│   │   ├── scan_config.py     # Scan configuration
│   │   └── print_config.py    # Print configuration
│   │
│   ├── modules/               # Core processing modules
│   │   ├── __init__.py
│   │   ├── pipeline.py        # Main processing pipeline
│   │   ├── document_detection.py  # Document detection
│   │   ├── image_enhancement.py   # Image enhancement
│   │   ├── ocr_ai.py          # OCR processing
│   │   ├── voice_ai.py        # Voice AI integration
│   │   ├── export.py          # Export functionality
│   │   ├── file_converter.py  # File conversion
│   │   └── storage.py         # Storage management
│   │
│   ├── routes/                # API route handlers
│   │   ├── __init__.py
│   │   ├── file_routes.py     # File operations routes
│   │   ├── scan_routes.py     # Scanning routes
│   │   ├── print_routes.py    # Printing routes
│   │   ├── ocr_routes.py      # OCR routes
│   │   └── conversion_routes.py # Conversion routes
│   │
│   ├── services/              # Business logic layer
│   │   ├── __init__.py
│   │   ├── file_service.py    # File service
│   │   ├── scan_service.py    # Scan service
│   │   ├── print_service.py   # Print service
│   │   ├── ocr_service.py     # OCR service
│   │   ├── conversion_service.py # Conversion service
│   │   └── orchestration_service.py # AI orchestration
│   │
│   ├── middleware/            # Request/response middleware
│   │   ├── __init__.py
│   │   ├── cors_config.py     # CORS configuration
│   │   ├── error_handler.py   # Error handling
│   │   └── request_logger.py  # Request logging
│   │
│   ├── utils/                 # Utility functions
│   │   ├── __init__.py
│   │   ├── logger.py          # Logging utils
│   │   ├── file_utils.py      # File utils
│   │   └── image_utils.py     # Image utils
│   │
│   ├── tests/                 # Unit tests
│   │   ├── test_api.py
│   │   ├── test_conversion.py
│   │   └── test_voice_ai.py
│   │
│   ├── models_ai/             # AI models storage
│   │   ├── whisper/           # Whisper models
│   │   ├── ollama/            # Ollama cache
│   │   └── tts/               # TTS configs
│   │
│   ├── data/                  # Data directories
│   │   ├── uploads/           # Uploaded files
│   │   ├── processed/         # Processed images
│   │   ├── processed_text/    # OCR text
│   │   ├── pdfs/              # Generated PDFs
│   │   └── converted/         # Converted files
│   │
│   ├── logs/                  # Application logs
│   ├── static/                # Static assets
│   └── print_scripts/         # Printing scripts
│
├── ⚛️ Frontend (React/TypeScript)
│   ├── package.json           # Node dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── .prettierrc            # Prettier config
│   ├── .prettierignore        # Prettier ignore
│   │
│   ├── public/                # Public assets
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   │
│   ├── src/                   # Source code
│   │   ├── index.tsx          # App entry point
│   │   ├── App.tsx            # Main component
│   │   ├── config.ts          # Configuration
│   │   ├── theme.ts           # UI theme
│   │   │
│   │   ├── components/        # Shared components
│   │   │   ├── Iconify.tsx
│   │   │   ├── VoiceAIChat.tsx
│   │   │   ├── DocumentPreview.tsx
│   │   │   ├── DocumentSelector.tsx
│   │   │   └── OrchestrationOverlay.tsx
│   │   │
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Phone.tsx
│   │   │   ├── Dashboard.css
│   │   │   └── Phone.css
│   │   │
│   │   ├── features/          # Feature modules
│   │   │   └── dashboard/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       └── types/
│   │   │
│   │   ├── services/          # API services
│   │   │   └── index.ts
│   │   │
│   │   ├── context/           # React context
│   │   ├── lib/               # Utilities
│   │   ├── shared/            # Shared code
│   │   │   ├── components/
│   │   │   └── ui/
│   │   └── utils/             # Utility functions
│   │
│   └── build/                 # Production build
│
├── 📓 Notebook
│   └── printchakra_clean.ipynb # Jupyter notebook
│
└── 🔧 Scripts (PowerShell)
    ├── backend.ps1            # Start backend
    ├── ngrok.ps1              # Start ngrok
    ├── cleanup.ps1            # Cleanup data
    └── setup-backend.ps1      # Setup backend
```

---

## 🎯 Organization Principles

### 1. **Separation of Concerns**

Each directory has a specific purpose:
- `helpers/` - Reusable utility functions
- `models/` - Data structures and schemas
- `modules/` - Core business logic
- `routes/` - API endpoints
- `services/` - Service layer logic
- `middleware/` - Request/response processing
- `utils/` - General utilities

### 2. **Clear Naming Conventions**

**Files:**
- Use descriptive names: `document_detection.py` not `detect.py`
- Use underscores for Python: `file_helper.py`
- Use camelCase for TypeScript: `VoiceAIChat.tsx`

**Functions:**
- Verbs for actions: `process_image()`, `save_file()`
- Nouns for getters: `get_file_info()`, `list_files()`
- Boolean functions start with `is_` or `has_`: `is_valid()`, `has_permission()`

**Classes:**
- PascalCase: `DocumentProcessor`, `VoiceAIChat`
- Descriptive names indicating purpose

### 3. **Consistent Formatting**

**Python (Backend):**
- Line length: 100 characters
- Indentation: 4 spaces
- Imports organized with `isort`
- Code formatted with `black`
- String quotes: Double quotes preferred

**TypeScript/JavaScript (Frontend):**
- Line length: 100 characters
- Indentation: 2 spaces
- Code formatted with `prettier`
- String quotes: Single quotes
- Semicolons: Required

### 4. **Import Organization**

**Python imports order:**
```python
# 1. Standard library
import os
import sys

# 2. Third-party packages
import cv2
import numpy as np
from flask import Flask

# 3. Local modules
from helpers import create_logger
from modules import pipeline
```

**TypeScript imports order:**
```typescript
// 1. External libraries
import React from 'react';
import { Box, Button } from '@chakra-ui/react';

// 2. Internal imports
import { apiClient } from '@/config';
import { FileService } from '@/services';

// 3. Relative imports
import './Dashboard.css';
```

---

## 📝 File Templates

### Python Module Template

```python
"""
Module Name
-----------
Brief description of what this module does.

Example:
    from module import function
    result = function(data)
"""

# Standard library imports
import os
from datetime import datetime

# Third-party imports
import cv2
import numpy as np

# Local imports
from helpers import create_logger

# Module constants
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3

# Initialize logger
logger = create_logger(__name__)


# ============================================
# MAIN FUNCTIONS
# ============================================

def main_function(param1, param2):
    """
    Brief description of function.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    
    Raises:
        ErrorType: When error occurs
    """
    # Implementation
    pass


# ============================================
# HELPER FUNCTIONS
# ============================================

def _helper_function():
    """Private helper function (note the leading underscore)"""
    pass


# ============================================
# CLASSES
# ============================================

class MyClass:
    """
    Brief class description.
    
    Attributes:
        attr1: Description
        attr2: Description
    """
    
    def __init__(self, param):
        """Initialize the class"""
        self.param = param
    
    def method(self):
        """Public method"""
        pass
    
    def _private_method(self):
        """Private method (note the leading underscore)"""
        pass
```

### TypeScript Component Template

```typescript
/**
 * Component Name
 * ---------------
 * Brief description of what this component does.
 */

import React, { useState, useEffect } from 'react';
import { Box, Button } from '@chakra-ui/react';

// Types
interface ComponentProps {
  prop1: string;
  prop2: number;
}

/**
 * Component description
 */
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State
  const [state, setState] = useState<string>('');

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Handlers
  const handleClick = () => {
    // Handler logic
  };

  // Render
  return (
    <Box>
      {/* Component JSX */}
    </Box>
  );
};

export default ComponentName;
```

---

## 🔧 Development Workflow

### 1. **Before Committing**

Run formatters to ensure consistent code style:

**Backend:**
```bash
cd backend
black . --exclude="(venv|__pycache__|data)" --line-length=100
isort . --skip venv --skip __pycache__ --skip data --profile black
```

**Frontend:**
```bash
cd frontend
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"
```

### 2. **Adding New Features**

Follow this structure:
1. Create model in `models/` if needed
2. Add business logic in `services/`
3. Create route handler in `routes/`
4. Add helper functions in `helpers/` if reusable
5. Write tests in `tests/`
6. Update documentation

### 3. **Code Review Checklist**

- [ ] Code formatted with black/prettier
- [ ] Imports organized
- [ ] Functions have docstrings
- [ ] Variable names are descriptive
- [ ] No unused imports or variables
- [ ] Error handling in place
- [ ] Tests written and passing
- [ ] Documentation updated

---

## 📚 Documentation Standards

### 1. **Module Documentation**

Every Python file should start with:
```python
"""
Module Name
-----------
What this module does.

Functions:
    - function1: Brief description
    - function2: Brief description

Classes:
    - Class1: Brief description
"""
```

### 2. **Function Documentation**

```python
def process_image(image, options=None):
    """
    Process an image with optional settings.
    
    This function applies various transformations to an image
    based on the provided options.
    
    Args:
        image: Input image as numpy array
        options: Optional dict with processing options
            - 'resize': Tuple (width, height)
            - 'grayscale': Boolean
    
    Returns:
        Processed image as numpy array
    
    Raises:
        ValueError: If image is None or invalid
        ProcessingError: If processing fails
    
    Example:
        >>> img = load_image('photo.jpg')
        >>> result = process_image(img, {'resize': (800, 600)})
    """
```

### 3. **Inline Comments**

```python
# Check if file exists before processing
if not os.path.exists(filepath):
    logger.error(f"File not found: {filepath}")
    return None

# Load and validate image
image = cv2.imread(filepath)
if image is None:
    raise ValueError("Could not load image")

# Apply transformations
image = resize_image(image, width=800)  # Resize to standard width
image = enhance_image(image)  # Enhance brightness and contrast
```

---

## 🎨 Code Style Guidelines

### Python Style (PEP 8 + Black)

```python
# ✅ Good
def process_document(filepath, config=None):
    """Process a document with optional config"""
    if config is None:
        config = {}
    
    result = do_processing(filepath, **config)
    return result

# ❌ Bad
def procDoc(fp,cfg=None):
    if cfg==None:cfg={}
    result=do_processing(fp,**cfg)
    return result
```

### TypeScript Style

```typescript
// ✅ Good
const processDocument = async (filepath: string, config?: Config): Promise<Result> => {
  if (!config) {
    config = {};
  }

  const result = await doProcessing(filepath, config);
  return result;
};

// ❌ Bad
const procDoc=async(fp:string,cfg?:Config)=>{
  if(!cfg)cfg={}
  const result=await doProcessing(fp,cfg)
  return result
}
```

---

## 🔍 File Organization Best Practices

### 1. **Keep Files Focused**

- One class per file (unless tightly related)
- Group related functions together
- Maximum 500 lines per file (ideally under 300)

### 2. **Use Clear Directory Structure**

```
backend/
├── helpers/          # Generic reusable functions
├── services/         # Business logic
├── routes/           # API endpoints
└── models/           # Data structures
```

### 3. **Name Files Clearly**

```
✅ Good names:
- file_helper.py
- document_processor.py
- VoiceAIChat.tsx
- DocumentPreview.tsx

❌ Bad names:
- helper.py
- proc.py
- comp.tsx
- utils.tsx
```

---

## 🚀 Quick Commands

### Format All Code

**Backend:**
```bash
cd backend
black . --exclude="(venv|__pycache__|data)" --line-length=100
isort . --skip venv --skip __pycache__ --profile black
```

**Frontend:**
```bash
cd frontend
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"
```

### Check Code Quality

**Backend:**
```bash
cd backend
pylint **/*.py --max-line-length=100
```

**Frontend:**
```bash
cd frontend
npm run lint
```

### Run Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm test
```

---

## 📖 Additional Resources

- [Python PEP 8 Style Guide](https://pep8.org/)
- [Black Code Formatter](https://black.readthedocs.io/)
- [isort Import Sorter](https://pycqa.github.io/isort/)
- [Prettier Code Formatter](https://prettier.io/)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [React Best Practices](https://react.dev/learn)

---

## ✅ Checklist for New Files

When creating a new file:

- [ ] Choose correct directory based on purpose
- [ ] Use clear, descriptive filename
- [ ] Add module/file docstring at top
- [ ] Organize imports properly
- [ ] Add function docstrings
- [ ] Use consistent naming conventions
- [ ] Format code with black/prettier
- [ ] Add to appropriate `__init__.py` if needed
- [ ] Write tests if applicable
- [ ] Update documentation

---

## 🎯 Summary

**Well-organized code is:**
- ✅ Easy to find
- ✅ Easy to understand
- ✅ Easy to maintain
- ✅ Easy to extend
- ✅ Easy to test

**Follow these principles:**
1. **One purpose per file**
2. **Clear naming everywhere**
3. **Consistent formatting**
4. **Good documentation**
5. **Logical structure**

Keep the codebase clean and organized! 🎉
