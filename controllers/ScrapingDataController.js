import axios from "axios";
import cheerio from "cheerio";
import { products } from "../data/products.js";
import { fetchingAvito } from "../services/scrapingAvito.js";
import { fetchDecathlonData } from "../services/scrapingDecathlon.js";
import { fetchingJumia } from "../services/scrapingJumia.js";

const fetchAliexpressProductDetails = async (url, productData) => {
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  const regex = /[\n\*-\s+]/g;
  const productDescription = $("#root").text();
  const cleanedProductDescription = productDescription
    .replace(regex, " ")
    .trim();
  const detailedProductData = {
    ...productData,
    details: {
      productDescription: cleanedProductDescription,
      comments: [],
    },
  };
  products.push(detailedProductData);
};

const scrapingAlexpriss = async (searchedProduct) => {
  const url = `https://www.aliexpress.com/w/wholesale-${searchedProduct}.html`;

  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);

  // Create an array of promises for fetching product details
  const fetchDetailsPromises = $(
    "a.multi--container--1UZxxHY.cards--card--3PJxwBm.search-card-item"
  )
    .map(async function () {
      let productUrl = $(this).attr("href");
      if (!productUrl.startsWith("http")) {
        productUrl = "https:" + $(this).attr("href");
      }
      const productData = {
        name: $(this)
          .children(".multi--content--11nFIBL")
          .children(".multi--title--G7dOCj3")
          .children(".multi--titleText--nXeOvyr")
          .text()
          .trim(),
        price: $(this)
          .children(".multi--content--11nFIBL")
          .children(".multi--price--1okBCly")
          .children(".multi--price-sale--U-S0jtj")
          .text()
          .trim(),
        imageUrl:
          "https:" +
          $(this)
            .children(
              ".multi--image--2bIiWPB.multi--imagesGallery--3xCP4Ci.cards--image--1nakz5t"
            )
            .children(".images--multiImage--25mi-3K")
            .children(".images--hover--1N5tJXp")
            .children(".images--imageWindow--1Z-J9gn")
            .children("img")
            .attr("src"),
        source: "aliexpress",
        productOriginUrl: productUrl,
      };
      return fetchAliexpressProductDetails(productUrl, productData);
    })
    .get();

  // Wait for all promises to resolve
  await Promise.all(fetchDetailsPromises);
};

export const getAllData = async (req, res) => {
  try {
    await scrapingAlexpriss(req.params.product);
    await fetchingAvito(req.params.product);
    await fetchDecathlonData(req.params.product);
    await fetchingJumia(req.params.product);
    res.json({ products: products, howManyProducts: products.length });
  } catch (err) {
    console.log("Error fetch: ", err);
    res.status(500).json({ error: err.message });
  }
};
