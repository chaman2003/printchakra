# PrintChakra: AI-Powered Smart Print and Capture Solution

![PrintChakra Logo](https://img.shields.io/badge/PrintChakra-v1.0.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-green.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.72.6-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

PrintChakra is an **AI-powered smart print and capture solution** that combines advanced OCR technology with intelligent document processing. This offline-first system focuses on document scanning, processing, and management capabilities without requiring internet connectivity.

## 🌟 Key Features

- **📱 Mobile Document Scanning**: React Native app for capturing documents
- **🔍 Advanced OCR Processing**: Text extraction using Tesseract OCR with image preprocessing
- **💾 Local Storage**: MongoDB with GridFS for secure offline data storage
- **🌐 Web Dashboard**: React-based management interface
- **🔒 Secure Authentication**: JWT-based user authentication
- **🔎 Full-Text Search**: Search through extracted document content
- **📊 Export Options**: Multiple export formats (PDF, Text, JSON, CSV)
- **⚡ Real-time Processing**: Fast document processing with OpenCV optimization

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │◄──►│   Backend API    │◄──►│  Web Dashboard  │
│  (React Native) │    │  (Python Flask)  │    │     (React)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               │
                        ┌──────▼──────┐
                        │   MongoDB   │
                        │  + GridFS   │
                        └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **MongoDB Community Edition**
- **Tesseract OCR**
- **Android Studio** (for mobile development)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/chaman2003/printchakra.git
cd printchakra
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start MongoDB (in separate terminal)
mongod --dbpath /path/to/your/db

# Run backend server
python app.py
```

Backend will start at `https://localhost:5000`

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Update API URL in src/services/ApiService.js
# Replace localhost with your computer's IP address

# Start Metro bundler
npx react-native start

# Run on Android (in separate terminal)
npx react-native run-android
```

### 4. Web Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=https://localhost:5000/api" > .env

# Start development server
npm start
```

Dashboard will be available at `http://localhost:3000`

## 📁 Project Structure

```
printchakra/
├── backend/                 # Python Flask API
│   ├── app.py              # Main application file
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/           # Temporary file storage
│   └── README.md          # Backend documentation
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── services/      # API services
│   │   └── components/    # Reusable components
│   ├── android/           # Android-specific code
│   └── package.json       # Mobile dependencies
├── dashboard/              # React web dashboard
│   ├── src/
│   │   ├── pages/         # Dashboard pages
│   │   ├── components/    # UI components
│   │   ├── services/      # API services
│   │   └── styles/        # CSS styles
│   └── package.json       # Dashboard dependencies
├── docs/                   # Documentation
│   ├── setup-guide.md     # Detailed setup instructions
│   ├── api-documentation.md # API reference
│   └── development-log.md  # Development progress
├── print-test.py          # Windows printer integration script
└── README.md              # This file
```

## 🔧 Technology Stack

### Backend (Python Flask)
- **Flask 2.3.3**: Web framework
- **PyMongo 4.5.0**: MongoDB driver
- **OpenCV 4.8.1**: Image processing
- **Tesseract 0.3.10**: OCR engine
- **PyJWT 2.8.0**: Authentication
- **GridFS**: Large file storage

### Mobile App (React Native)
- **React Native 0.72.6**: Cross-platform framework
- **React Navigation 6.x**: Navigation
- **Vision Camera 3.6.4**: Camera functionality
- **AsyncStorage**: Local data storage
- **Axios 1.5.1**: HTTP client

### Web Dashboard (React)
- **React 18.2.0**: UI framework
- **Bootstrap 5.3.2**: CSS framework
- **React Router 6.15.0**: Routing
- **jsPDF 2.5.1**: PDF generation
- **Chart.js**: Data visualization

## 📱 Mobile App Features

- **Document Capture**: Advanced camera interface with image optimization
- **Offline Queue**: Documents are queued when offline and synced when connected
- **User Authentication**: Secure login/registration with JWT tokens
- **Document Management**: View, search, and organize scanned documents
- **Real-time Processing**: Instant feedback on document processing status

## 🌐 Web Dashboard Features

- **Document Management**: Grid/list view with bulk operations
- **Advanced Search**: Full-text search with filters and sorting
- **Export System**: PDF, Text, JSON, and CSV export options
- **Analytics Dashboard**: Processing statistics and document metrics
- **User Management**: Account settings and preferences

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: SHA-256 password encryption
- **HTTPS Support**: SSL/TLS encryption for API communication
- **Permission Management**: Camera and storage permissions
- **Local Data Storage**: All data stored locally for privacy

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User authentication

### Document Management
- `POST /api/documents/upload` - Upload and process document
- `GET /api/documents` - Get user's documents (paginated)
- `GET /api/documents/{id}` - Get specific document
- `GET /api/documents/{id}/image` - Get document image
- `DELETE /api/documents/{id}` - Delete document

### Search & Export
- `GET /api/search?q=query` - Search documents by text
- `GET /api/health` - System health check

## 🖨️ Printing Integration

PrintChakra includes Windows printing capabilities through `print-test.py`:

```python
# Example: Print PDF document
python print-test.py
```

**Features:**
- Automatic printer detection
- Multiple printing methods (PowerShell, direct API)
- Error handling and fallback options
- Support for various document formats

## 🛠️ Development

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest

# Mobile tests
cd mobile
npm test

# Dashboard tests
cd dashboard
npm test
```

### Building for Production

```bash
# Build mobile app for Android
cd mobile
npx react-native build-android

# Build dashboard for production
cd dashboard
npm run build
```

## 📝 Configuration

### Environment Variables

Create `.env` files in respective directories:

**Backend (.env):**
```env
SECRET_KEY=your-super-secret-key
MONGODB_URI=mongodb://localhost:27017/
TESSERACT_PATH=/usr/local/bin/tesseract
MAX_CONTENT_LENGTH=16777216
```

**Dashboard (.env):**
```env
REACT_APP_API_URL=https://localhost:5000/api
```

## 🐛 Troubleshooting

### Common Issues

1. **Tesseract not found**
   - Install Tesseract OCR and add to PATH
   - Update `TESSERACT_PATH` in configuration

2. **MongoDB connection failed**
   - Ensure MongoDB service is running
   - Check connection string in configuration

3. **Mobile app not connecting**
   - Update API URL with correct IP address
   - Check network connectivity
   - Verify backend server is running

4. **SSL certificate warnings**
   - Expected with self-signed certificates in development
   - Use production certificates for deployment

### Getting Help

- 📖 Check the [Setup Guide](docs/setup-guide.md) for detailed instructions
- 📋 Review [API Documentation](docs/api-documentation.md) for endpoint details
- 🔍 Search existing [Issues](https://github.com/chaman2003/printchakra/issues)
- 💬 Create a new issue for bugs or feature requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 👥 Team

- **Chaman Kumar** - [@chaman2003](https://github.com/chaman2003) - Lead Developer

## 🙏 Acknowledgments

- **Tesseract OCR** - Google's OCR engine
- **OpenCV** - Computer vision library
- **React Native Community** - Mobile development framework
- **Flask** - Python web framework
- **MongoDB** - NoSQL database

## 📞 Support

For support and questions:

- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)
- 🐙 GitHub: [PrintChakra Repository](https://github.com/chaman2003/printchakra)
- 📱 Issues: [Report a Bug](https://github.com/chaman2003/printchakra/issues/new)

---

**PrintChakra** - *Transforming documents through AI based intelligent processing* 🚀
