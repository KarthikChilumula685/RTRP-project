# Price Comparison Website

A web application that compares product prices across Amazon, Flipkart, and Myntra. Users can search for products and see price comparisons across these platforms.

## Features

- Search for products across multiple e-commerce platforms
- View product details including title, price, and image
- Direct links to product pages on respective websites
- Responsive design for mobile and desktop
- Real-time price comparison

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd price-comparison-website
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

## Running the Application

1. Start the backend server:
```bash
npm run dev
```

2. In a new terminal, start the frontend development server:
```bash
npm run client
```

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

- `server.js` - Backend server with Express
- `client/` - React frontend application
  - `src/App.js` - Main React component
  - `src/App.css` - Styling for the application

## Note

This application uses web scraping to fetch product data. Please ensure you comply with the terms of service of the respective websites when using this application in production.

## License

MIT 