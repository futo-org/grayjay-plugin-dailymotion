// Disable TLS certificate validation for graphql.api.dailymotion.com
// Their certificate doesn't include graphql.api.dailymotion.com in the SAN
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const REGEX_API_CLIENT_ID = /get apiClientId\(\)\{return"([a-f0-9]{20})"\}/;
const REGEX_API_CLIENT_SECRET = /get apiClientSecret\(\)\{return"([a-f0-9]{40})"\}/;
const REGEX_APP_JS_URL = /static\/app\.[a-f0-9]+\.js/;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';

const commonHeaders = {
  'User-Agent': USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'en-GB,en;q=0.5',
  Origin: 'https://www.dailymotion.com',
  DNT: '1',
  'Sec-GPC': '1',
  Connection: 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'Cache-Control': 'no-cache',
};

// Extract API credentials from Dailymotion's website
async function extractCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  console.log('Fetching Dailymotion homepage...');
  const homepageResponse = await fetch('https://www.dailymotion.com', {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!homepageResponse.ok) {
    throw new Error(`Failed to fetch homepage: ${homepageResponse.status}`);
  }

  const homepageHtml = await homepageResponse.text();

  // Find the app.js URL
  const appJsMatch = homepageHtml.match(REGEX_APP_JS_URL);
  if (!appJsMatch) {
    throw new Error('Could not find app.js URL in homepage');
  }

  const appJsUrl = `https://static.neon-ssr.dailymotion.com/neon-user-ssr/${appJsMatch[0]}`;
  console.log(`Fetching app.js from ${appJsUrl}...`);

  const appJsResponse = await fetch(appJsUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!appJsResponse.ok) {
    throw new Error(`Failed to fetch app.js: ${appJsResponse.status}`);
  }

  const appJsContent = await appJsResponse.text();

  // Extract credentials
  const clientIdMatch = appJsContent.match(REGEX_API_CLIENT_ID);
  const clientSecretMatch = appJsContent.match(REGEX_API_CLIENT_SECRET);

  if (!clientIdMatch || !clientSecretMatch) {
    throw new Error('Could not extract API credentials from app.js');
  }

  const clientId = clientIdMatch[1];
  const clientSecret = clientSecretMatch[1];

  console.log(`Extracted client_id: ${clientId}`);
  console.log(`Extracted client_secret: ${clientSecret.substring(0, 8)}...`);

  return { clientId, clientSecret };
}

// Function to fetch OAuth token
async function fetchToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await fetch('https://graphql.api.dailymotion.com/oauth/token', {
    method: 'POST',
    headers: {
      ...commonHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('Token fetched successfully');
  return data.access_token;
}

// Main function to setup GraphQL Codegen config
async function setupCodegenConfig() {
  const { clientId, clientSecret } = await extractCredentials();
  const token = await fetchToken(clientId, clientSecret);

  const config = {
    overwrite: true,
    schema: {
      'https://graphql.api.dailymotion.com': {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...commonHeaders,
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          Priority: 'u=4',
        },
      },
    },
    generates: {
      './types/CodeGenDailymotion.d.ts': {
        plugins: ['typescript'],
      },
    },
  };

  return config;
}

export default new Promise((resolve, reject) => {
  setupCodegenConfig()
    .then((config) => {
      resolve(config);
    })
    .catch((error) => {
      console.error('Failed to setup GraphQL Codegen config:', error);
      reject(error);
    });
});
