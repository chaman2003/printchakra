# PrintChakra Setup Guide

A comprehensive guide to set up the PrintChakra offline document OCR system.

## System Requirements

### Hardware
- **Development Machine**: Windows/Mac/Linux with 8GB+ RAM
- **Android Device**: Android 7.0+ with camera
- **Local Network**: Wi-Fi router for device communication

### Software Prerequisites
- **Node.js** 18.x or higher
- **Python** 3.8 or higher
- **MongoDB** Community Edition 6.0+
- **Android Studio** (for mobile development)
- **Git** for version control

## Quick Start (5-Minute Setup)

### 1. Clone and Install
```bash
cd printchakra
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 3. Dashboard Setup
```bash
cd dashboard
npm install
npm start
```

### 4. Mobile Setup
```bash
cd mobile
npm install
npx react-native run-android
```

## Detailed Setup Instructions

### Backend (Python Flask)

#### Prerequisites
```bash
# Install Python dependencies
pip install --upgrade pip
pip install virtualenv

# Create virtual environment
python -m venv printchakra-env
# Windows
printchakra-env\Scripts\activate
# macOS/Linux
source printchakra-env/bin/activate
```

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Install Tesseract OCR

**Windows:**
1. Download from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
2. Install to `C:\Program Files\Tesseract-OCR`
3. Add to PATH or update code with full path

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install tesseract-ocr
```

#### Setup MongoDB

**Windows:**
1. Download MongoDB Community Edition
2. Install with default settings
3. Start MongoDB service

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Configure Backend
```bash
# Create .env file
cp .env.example .env

# Edit configuration
MONGODB_URI=mongodb://localhost:27017/printchakra
SECRET_KEY=your-super-secret-key-here
TESSERACT_PATH=/usr/local/bin/tesseract
```

#### Run Backend
```bash
python app.py
```
Server will start at `https://localhost:5000`

### Dashboard (React.js)

#### Prerequisites
```bash
# Install Node.js 18+ from nodejs.org
node --version
npm --version
```

#### Install and Run
```bash
cd dashboard
npm install
npm start
```
Dashboard will open at `http://localhost:3000`

#### Build for Production
```bash
npm run build
# Serve static files with a web server
```

### Mobile App (React Native)

#### Prerequisites

**Android Studio Setup:**
1. Install Android Studio from developer.android.com
2. Install Android SDK (API 33 recommended)
3. Create an Android Virtual Device (AVD) or connect physical device
4. Enable USB Debugging on physical device

**React Native CLI:**
```bash
npm install -g react-native-cli
```

#### Install Dependencies
```bash
cd mobile
npm install
```

#### Android Setup
```bash
# Check React Native environment
npx react-native doctor

# Start Metro bundler
npx react-native start

# Run on Android (separate terminal)
npx react-native run-android
```

#### Configuration
Update `src/services/ApiService.js` with your local IP:
```javascript
const API_BASE_URL = 'https://192.168.1.100:5000/api'; // Your computer's IP
```

## Network Configuration

### Find Your Local IP Address

**Windows:**
```cmd
ipconfig
```

**macOS/Linux:**
```bash
ifconfig
```

Look for your Wi-Fi adapter's IPv4 address (usually 192.168.x.x)

### Configure Firewall

**Windows:**
- Allow Python and Node.js through Windows Firewall
- Allow ports 3000 and 5000

**macOS:**
```bash
sudo pfctl -d  # Disable firewall temporarily for development
```

**Linux:**
```bash
sudo ufw allow 3000
sudo ufw allow 5000
```

### Test Network Connectivity

From your mobile device browser, visit:
- `https://YOUR-IP:5000/api/health` (Backend)
- `http://YOUR-IP:3000` (Dashboard)

## Development Workflow

### 1. Start All Services
```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Dashboard
cd dashboard
npm start

# Terminal 3: Mobile
cd mobile
npx react-native start

# Terminal 4: Run Android
npx react-native run-android
```

### 2. Test End-to-End Flow
1. Register/Login in mobile app
2. Scan a document with camera
3. View document in mobile app
4. Check dashboard for synced document
5. Export document from dashboard

### 3. Development Tools

**MongoDB Compass:**
- Download from mongodb.com/products/compass
- Connect to `mongodb://localhost:27017`
- Browse `printchakra` database

**React Developer Tools:**
- Install browser extension for React debugging

**React Native Debugger:**
- Install standalone app for mobile debugging

## Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check Python version
python --version

# Check MongoDB status
# Windows
net start MongoDB
# macOS
brew services start mongodb-community
# Linux
sudo systemctl status mongodb

# Check port availability
netstat -an | grep :5000
```

#### Mobile App Won't Connect
1. Verify IP address in ApiService.js
2. Check firewall settings
3. Ensure devices on same Wi-Fi network
4. Test backend health endpoint in browser

#### OCR Not Working
```bash
# Test Tesseract installation
tesseract --version

# On Windows, check PATH or update code with full path:
# C:\\Program Files\\Tesseract-OCR\\tesseract.exe
```

#### Dashboard Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

### Performance Issues

#### Slow OCR Processing
- Reduce image resolution in mobile app
- Optimize image preprocessing pipeline
- Consider running on SSD storage

#### Memory Issues
- Monitor MongoDB memory usage
- Implement image compression
- Clean up temporary files

### Network Issues

#### Can't Access from Mobile
1. Check IP address configuration
2. Verify firewall settings
3. Test with browser first
4. Ensure HTTPS certificate acceptance

## Production Deployment

### Backend Production
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# With SSL
gunicorn -w 4 -b 0.0.0.0:5000 --certfile cert.pem --keyfile key.pem app:app
```

### Dashboard Production
```bash
# Build for production
npm run build

# Serve with nginx or Apache
# Example nginx config:
server {
    listen 80;
    root /path/to/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass https://localhost:5000;
    }
}
```

### Mobile Production
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

## Security Considerations

### Development Security
- Self-signed certificates for HTTPS
- Local network access only
- Basic JWT authentication

### Production Security
- Use proper SSL certificates
- Implement rate limiting
- Add input validation
- Regular security updates
- Network isolation

## Backup and Recovery

### Database Backup
```bash
# MongoDB backup
mongodump --db printchakra --out backup/

# Restore
mongorestore backup/printchakra/
```

### Application Backup
- Backup source code with Git
- Export user data regularly
- Document configuration settings

## Monitoring and Maintenance

### Log Monitoring
- Check application logs regularly
- Monitor disk space usage
- Track OCR processing times

### Performance Monitoring
- Monitor API response times
- Check database performance
- Track mobile app crashes

### Regular Maintenance
- Update dependencies monthly
- Clean up old documents
- Monitor storage usage
- Test backup/restore procedures

## Support and Resources

### Documentation
- API documentation: `/docs/api.md`
- User guide: `/docs/user-guide.md`
- Architecture: `/docs/architecture.md`

### Community
- GitHub Issues for bug reports
- Development log for progress tracking
- Feature requests welcome

### Professional Support
- Custom development available
- Training and consultation
- Enterprise deployment assistance
