const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Updated CORS configuration
app.use(cors());  // Allow all origins for testing
app.use(express.json());

// Test endpoint with more detailed response
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend server is running!',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Helper function to clean price string
function cleanPrice(price) {
  if (!price) return '';
  return price.replace(/^₹/, '').replace(/,/g, '').trim();
}

// Helper function to scrape product data
async function scrapeProductData(url, selectors) {
  try {
    console.log(`Attempting to scrape: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    let title, price, image;

    if (url.includes('flipkart.com')) {
      // Updated Flipkart selectors
      const productCards = $('div._1AtVbE').has('div._4rR01T, a.s1Q9rs, div._2B099V');
      
      if (productCards.length > 0) {
        const firstProduct = productCards.first();
        
        // Title selectors
        title = firstProduct.find('div._4rR01T').text().trim() ||
                firstProduct.find('a.s1Q9rs').text().trim() ||
                firstProduct.find('div._2B099V').text().trim();

        // Price selectors
        const priceText = firstProduct.find('div._30jeq3._1_WHN1, div._30jeq3, div._3I9_wc._27UcVY').text().trim();
        price = cleanPrice(priceText);

        // Image selectors
        image = firstProduct.find('img._396cs4, img._2r_T1I').attr('src');

        // Get product link
        const productLink = firstProduct.find('a._1fQZEK, a.s1Q9rs').attr('href');
        if (productLink) {
          url = `https://www.flipkart.com${productLink}`;
        }

        console.log('Flipkart data found:', { title, price, image });
      } else {
        console.log('No product cards found on Flipkart');
      }
    } else if (url.includes('myntra.com')) {
      // Updated Myntra selectors
      const productCards = $('.product-base');
      
      if (productCards.length > 0) {
        const firstProduct = productCards.first();
        
        title = firstProduct.find('.product-brand, .product-product').text().trim();
        const priceText = firstProduct.find('.product-discountedPrice, .product-price').text().trim();
        price = cleanPrice(priceText);
        image = firstProduct.find('.product-image img').attr('src');
        
        // Get product link
        const productLink = firstProduct.find('a').attr('href');
        if (productLink) {
          url = `https://www.myntra.com/${productLink}`;
        }

        console.log('Myntra data found:', { title, price, image });
      } else {
        // Try alternative Myntra selectors for product page
        title = $('.pdp-title, .pdp-name').text().trim();
        const priceText = $('.pdp-price strong, .pdp-mrp strong').text().trim();
        price = cleanPrice(priceText);
        image = $('.image-grid-image img, .image-grid-imageContainer img').attr('src');
      }
    } else {
      // Amazon selectors
      const products = $('.s-result-item[data-asin]:not([data-asin=""])');
      if (products.length > 0) {
        const firstProduct = products.first();
        
        title = firstProduct.find('h2 .a-link-normal').text().trim() ||
                firstProduct.find('.a-size-medium.a-color-base.a-text-normal').text().trim();
        
        const priceText = firstProduct.find('.a-price .a-offscreen, .a-price-whole').first().text().trim();
        price = cleanPrice(priceText);
        
        image = firstProduct.find('.s-image').attr('src');
        
        // Get product link
        const productLink = firstProduct.find('h2 .a-link-normal').attr('href');
        if (productLink) {
          url = `https://www.amazon.in${productLink}`;
        }
      }
    }

    return {
      title: title || 'Product Title Not Available',
      price: price || 'Price Not Available',
      image: image || '',
      link: url
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return {
      title: 'Product Title Not Available',
      price: 'Price Not Available',
      image: '',
      link: url
    };
  }
}

// API endpoint to search products
app.get('/api/search', async (req, res) => {
  console.log('Received search request:', req.query);
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const amazonUrl = `https://www.amazon.in/s?k=${encodedQuery}`;
    const flipkartUrl = `https://www.flipkart.com/search?q=${encodedQuery}`;
    const myntraUrl = `https://www.myntra.com/${encodedQuery}`;

    console.log('Searching URLs:', { amazonUrl, flipkartUrl, myntraUrl });

    const [amazonData, flipkartData, myntraData] = await Promise.all([
      scrapeProductData(amazonUrl),
      scrapeProductData(flipkartUrl),
      scrapeProductData(myntraUrl)
    ]);

    const results = {
      amazon: amazonData,
      flipkart: flipkartData,
      myntra: myntraData
    };

    console.log('Search results:', results);
    res.json(results);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 