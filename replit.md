# MP3 to WAV Audio Converter

## Overview

This is a full-stack web application for converting MP3 audio files to WAV format. The application features a React frontend with drag-and-drop file upload, real-time conversion progress tracking, and a Node.js/Express backend that uses FFmpeg for audio processing. Users can upload MP3 files, customize conversion settings (quality and sample rate), monitor conversion progress, and download the converted WAV files.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/bundling
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, composable interface elements
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management, caching, and real-time data synchronization
- **Routing**: Wouter for lightweight client-side routing
- **File Handling**: React Dropzone for drag-and-drop file upload with validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Processing**: FFmpeg via fluent-ffmpeg for audio conversion
- **File Upload**: Multer middleware for handling multipart form data
- **Development**: Vite integration for hot module replacement in development mode

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL
- **Schema**: Conversion jobs table tracking file metadata, progress, and status
- **Migrations**: Drizzle Kit for database schema management
- **Development Fallback**: In-memory storage implementation for testing without database

### File Management
- **Upload Directory**: Local filesystem storage for uploaded MP3 files
- **Output Directory**: Local filesystem storage for converted WAV files
- **File Cleanup**: Automatic cleanup of temporary files after processing
- **Size Limits**: 100MB maximum file size for uploads

### Real-time Features
- **Progress Tracking**: FFmpeg progress events streamed to update conversion status
- **Polling**: Frontend polls every 2 seconds for job status updates
- **Live Updates**: Real-time progress bars and status indicators

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database driver for Neon
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **fluent-ffmpeg**: Node.js wrapper for FFmpeg audio/video processing
- **multer**: Express middleware for handling file uploads

### UI and Styling
- **@radix-ui/***: Collection of unstyled, accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development plugins

### Form and Validation
- **react-hook-form**: Form library with validation
- **@hookform/resolvers**: Validation resolvers for react-hook-form
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

### File Processing
- **fs-extra**: Enhanced file system methods
- **react-dropzone**: Drag-and-drop file upload component