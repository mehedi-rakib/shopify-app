export const DEFAULT_SUPPLIER = 'AzanWholeSale';

export const getBaseUrl = (sandboxManage) => {
  // sandboxManage will be true or false based on checkbox state
  return sandboxManage
    ? 'https://beta.azanwholesale.com'
    : 'https://api.azanwholesale.com';
};

export const getLatestShopifyApiVersion = async (session) => {
  // Return stable version instead of fetching unstable
  return '2024-01';
};
