# PrintChakra MVP - Offline Document OCR System

A 60-day MVP for offline document scanning and OCR processing with local Wi-Fi sync capabilities.

## 🎯 Project Goals
- Offline-first document scanning and OCR
- Local storage with MongoDB + GridFS
- Basic mobile app for document capture
- Web dashboard for document management
- Local Wi-Fi sync between devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Backend API   │    │   Dashboard     │
│  React Native   │◄──►│  Python Flask   │◄──►│   React.js      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   MongoDB       │
                       │   + GridFS      │
                       └─────────────────┘
```

## 📱 Components

### Mobile App (`/mobile`)
- **Tech**: React Native CLI (Android only)
- **Camera**: react-native-vision-camera
- **Features**: Document capture, basic cropping, JPEG compression
- **Sync**: REST API calls over local Wi-Fi

### Backend API (`/backend`)
- **Tech**: Python 3.x + Flask
- **OCR**: Tesseract (English only)
- **Image Processing**: OpenCV + Pillow
- **Auth**: PyJWT, HTTPS (self-signed)
- **Storage**: MongoDB + GridFS

### Dashboard (`/dashboard`)
- **Tech**: React.js + Bootstrap
- **Features**: Document viewing, search, export (TXT/PDF)
- **Exports**: reportlab for PDF generation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- MongoDB Community Edition
- Android Studio (for mobile development)
- Android device or emulator

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Mobile App Setup
```bash
cd mobile
npm install
npx react-native run-android
```

### Dashboard Setup
```bash
cd dashboard
npm install
npm start
```

## 📋 Development Timeline (60 Days)

### Week 1-2: Foundation (14 days)
- [x] Project structure setup
- [ ] Backend API skeleton
- [ ] MongoDB setup
- [ ] Basic authentication

### Week 3-4: Core Backend (14 days)
- [ ] OCR processing pipeline
- [ ] Image preprocessing
- [ ] Document storage (GridFS)
- [ ] REST API endpoints

### Week 5-6: Mobile App (14 days)
- [ ] React Native setup
- [ ] Camera integration
- [ ] Image capture & compression
- [ ] API integration

### Week 7-8: Dashboard & Integration (14 days)
- [ ] React.js dashboard
- [ ] Document viewing
- [ ] Export functionality
- [ ] End-to-end testing

### Week 9: Final Polish (4 days)
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation
- [ ] MVP validation

## 🔧 Technical Specifications

### Image Processing
- Input: JPEG from mobile camera
- Preprocessing: OpenCV (deskew, noise reduction)
- OCR: Tesseract 4.x (English only)
- Output: Searchable text + original image

### Storage Schema
```javascript
{
  _id: ObjectId,
  filename: String,
  capturedAt: Date,
  deviceId: String,
  ocrText: String,
  imageData: GridFS reference,
  metadata: {
    fileSize: Number,
    dimensions: Object,
    processingTime: Number
  }
}
```

### API Endpoints
- `POST /api/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get specific document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/auth/login` - Authentication
- `GET /api/search?q=text` - Search documents

## 📊 MVP Limitations
- Android only (no iOS)
- English OCR only
- No handwriting recognition
- No AI categorization
- Basic UI/UX
- Local network only (no cloud)
- Single user (no role-based access)

## 🛠️ Development Tools
- **Mobile**: Android Studio, React Native CLI
- **Backend**: Python, Flask, MongoDB Compass
- **Frontend**: VS Code, React DevTools
- **Testing**: Manual testing focus for MVP

## 📈 Success Metrics
- Document capture and OCR accuracy
- Offline functionality
- Basic sync between devices
- Export capabilities (TXT/PDF)
- 2-hour daily development sustainability

## 🔗 Useful Links
- [React Native Documentation](https://reactnative.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)

---

**Development Log**: Track daily progress in `/docs/development-log.md`
