const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function cleanPrice(price) {
  if (!price) return '';
  return price.replace(/^₹/, '').replace(/,/g, '').trim();
}

async function scrapeProductData(url) {
  try {
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
      const productCards = $('div._1AtVbE').has('div._4rR01T, a.s1Q9rs, div._2B099V');
      if (productCards.length > 0) {
        const firstProduct = productCards.first();
        title = firstProduct.find('div._4rR01T').text().trim() ||
                firstProduct.find('a.s1Q9rs').text().trim() ||
                firstProduct.find('div._2B099V').text().trim();
        const priceText = firstProduct.find('div._30jeq3._1_WHN1, div._30jeq3, div._3I9_wc._27UcVY').text().trim();
        price = cleanPrice(priceText);
        image = firstProduct.find('img._396cs4, img._2r_T1I').attr('src');
        const productLink = firstProduct.find('a._1fQZEK, a.s1Q9rs').attr('href');
        if (productLink) {
          url = `https://www.flipkart.com${productLink}`;
        }
      }
    } else if (url.includes('myntra.com')) {
      const productCards = $('.product-base');
      if (productCards.length > 0) {
        const firstProduct = productCards.first();
        title = firstProduct.find('.product-brand, .product-product').text().trim();
        const priceText = firstProduct.find('.product-discountedPrice, .product-price').text().trim();
        price = cleanPrice(priceText);
        image = firstProduct.find('.product-image img').attr('src');
        const productLink = firstProduct.find('a').attr('href');
        if (productLink) {
          url = `https://www.myntra.com/${productLink}`;
        }
      } else {
        title = $('.pdp-title, .pdp-name').text().trim();
        const priceText = $('.pdp-price strong, .pdp-mrp strong').text().trim();
        price = cleanPrice(priceText);
        image = $('.image-grid-image img, .image-grid-imageContainer img').attr('src');
      }
    } else {
      const products = $('.s-result-item[data-asin]:not([data-asin=""])');
      if (products.length > 0) {
        const firstProduct = products.first();
        title = firstProduct.find('h2 .a-link-normal').text().trim() ||
                firstProduct.find('.a-size-medium.a-color-base.a-text-normal').text().trim();
        const priceText = firstProduct.find('.a-price .a-offscreen, .a-price-whole').first().text().trim();
        price = cleanPrice(priceText);
        image = firstProduct.find('.s-image').attr('src');
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

app.get('/api/search', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const amazonUrl = `https://www.amazon.in/s?k=${encodedQuery}`;
    const flipkartUrl = `https://www.flipkart.com/search?q=${encodedQuery}`;
    const myntraUrl = `https://www.myntra.com/${encodedQuery}`;

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

    res.status(200).json(results);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
