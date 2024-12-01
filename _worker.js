import { connect as socketConnect } from 'cloudflare:sockets';

let uID = '';
let pIP = '';
let subscription = '';
let subConverterURL = 'SUBAPI.fxxk.dedyn.io';
let subConfigURL = "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_MultiMode.ini";
let protocolType = 'https';
let socks5Addr = '';
let socks5Parsed = {}; 
let socksEnabled = false;

let fakeUID;
let fakeHostname;
let disableTLS = 'false'; 
const expiration = 4102329600; // 2099-12-31
let proxyIPsArray;
let sockProxies;
let redirectToSocks = [
	'*ttvnw.net',
	'*tapecontent.net',
	'*cloudatacdn.com',
	'*.loadshare.org',
];
let addrList = [];
let apiAddrList = [];
let noTLSAddrList = [];
let noTLSAPIList = [];
let csvAddrList = [];
let downloadLimit = 8;
let filename = atob('ZWRnZXR1bm5lbA==');
let botSecretToken;
let botChatID; 
let hostProxies = [];
let hostProxyURL = '';
let randomProxyIP = 'false';
let securePorts = ["2053", "2083", "2087", "2096", "8443"];
let validDays = 7; // 默认有效期：天
let updateInterval = 3; // 更新间隔
let lowUID;
let uidGeneratedTime = "";
let proxyIPPool = [];

export default {
	async fetch(request, environment, ctx) {
		try {
			const userAgentHeader = request.headers.get('User-Agent') || 'null';
			const userAgentLower = userAgentHeader.toLowerCase();

			if (environment.KEY) {
				validDays = environment.TIME || validDays;
				updateInterval = environment.UPTIME || updateInterval;
				const generatedUUIDs = await generateDynamicUUID(environment.KEY);
				uID = generatedUUIDs[0];
			} else if (environment.UUID) {
				uID = environment.UUID;
			}
			
			if (!uID) {
				return new Response('请设置你的UUID变量，或检查变量是否正确？', { 
					status: 404,
					headers: {
						"Content-Type": "text/plain;charset=utf-8",
					}
				});
			}
			
			const today = new Date();
			today.setHours(0, 0, 0, 0); 
			const timestamp = Math.ceil(today.getTime() / 1000);
			const hashedFakeUID = await doubleHash(`${uID}${timestamp}`);
			fakeUID = [
				hashedFakeUID.slice(0, 8),
				hashedFakeUID.slice(8, 12),
				hashedFakeUID.slice(12, 16),
				hashedFakeUID.slice(16, 20),
				hashedFakeUID.slice(20)
			].join('-');
			
			fakeHostname = `${hashedFakeUID.slice(6, 9)}.${hashedFakeUID.slice(13, 19)}`;

			pIP = environment.PROXYIP || pIP;
			proxyIPsArray = await parseList(pIP);
			pIP = proxyIPsArray[Math.floor(Math.random() * proxyIPsArray.length)];

			socks5Addr = environment.SOCKS5 || socks5Addr;
			sockProxies = await parseList(socks5Addr);
			socks5Addr = sockProxies[Math.floor(Math.random() * sockProxies.length)];
			socks5Addr = socks5Addr.split('//')[1] || socks5Addr;

			if (environment.CFPORTS) securePorts = await parseList(environment.CFPORTS);

			subscription = environment.SUB || subscription;
			subConverterURL = environment.SUBAPI || subConverterURL;

			if (subConverterURL.includes("http://")) {
				subConverterURL = subConverterURL.split("//")[1];
				protocolType = 'http';
			} else {
				subConverterURL = subConverterURL.split("//")[1] || subConverterURL;
			}

			subConfigURL = environment.SUBCONFIG || subConfigURL;

			if (socks5Addr) {
				try {
					socks5Parsed = parseSocks5Address(socks5Addr);
					randomProxyIP = environment.RPROXYIP || 'false';
					socksEnabled = true;
				} catch (err) {
					socksEnabled = false;
					randomProxyIP = environment.RPROXYIP || !pIP ? 'true' : 'false';
				}
			} else {
				randomProxyIP = environment.RPROXYIP || !pIP ? 'true' : 'false';
			}

			// Handle additional environment variables
			if (environment.ADD) addrList = await parseList(environment.ADD);
			if (environment.ADDAPI) apiAddrList = await parseList(environment.ADDAPI);
			if (environment.ADDNOTLS) noTLSAddrList = await parseList(environment.ADDNOTLS);
			if (environment.ADDNOTLSAPI) noTLSAPIList = await parseList(environment.ADDNOTLSAPI);
			if (environment.ADDCSV) csvAddrList = await parseList(environment.ADDCSV);

			downloadLimit = environment.DLS || downloadLimit;
			botSecretToken = environment.TGTOKEN || botSecretToken;
			botChatID = environment.TGID || botChatID; 

			if (environment.GO2SOCKS5) redirectToSocks = await parseList(environment.GO2SOCKS5);

			const upgradeHeader = request.headers.get('Upgrade');
			const parsedURL = new URL(request.url);

			if (parsedURL.searchParams.has('sub') && parsedURL.searchParams.get('sub') !== '') subscription = parsedURL.searchParams.get('sub');
			filename = environment.SUBNAME || filename;

			if (parsedURL.searchParams.has('notls')) disableTLS = 'true';

			// Process paths
			const path = parsedURL.pathname.toLowerCase();
			if (path === '/') {
				if (environment.URL302) return Response.redirect(environment.URL302, 302);
				else if (environment.URL) return await proxyURL(environment.URL, parsedURL);
				else return new Response(JSON.stringify(request.cf, null, 4), {
					status: 200,
					headers: {
						'content-type': 'application/json',
					},
				});
			} else if (path === `/${fakeUID}`) {
				const generatedConfig = await createConfig(uID, request.headers.get('Host'), subscription, 'CF-Workers-SUB', randomProxyIP, parsedURL, environment);
				return new Response(`${generatedConfig}`, { status: 200 });
			} else if (path === `/${environment.KEY}` || path === `/${uID}`) {
				await sendNotification(`#订阅获取 ${filename}`, request.headers.get('CF-Connecting-IP'), `User Agent: ${userAgentHeader}\nHost: ${parsedURL.hostname}\nPath: ${parsedURL.pathname + parsedURL.search}`);
				const vlessConfig = await createConfig(uID, request.headers.get('Host'), subscription, userAgentHeader, randomProxyIP, parsedURL, environment);
				const now = Date.now();
				const today = new Date(now);
				today.setHours(0, 0, 0, 0);
				const usageData = Math.floor(((now - today.getTime()) / 86400000) * 24 * 1099511627776 / 2);

				if (userAgentLower.includes('mozilla')) {
					return new Response(`${vlessConfig}`, {
						status: 200,
						headers: {
							"Content-Type": "text/plain;charset=utf-8",
							"Profile-Update-Interval": "6",
							"Subscription-Userinfo": `upload=${usageData}; download=${usageData}; total=${24 * 1099511627776}; expire=${expiration}`,
						}
					});
				} else {
					return new Response(`${vlessConfig}`, {
						status: 200,
						headers: {
							"Content-Disposition": `attachment; filename=${filename}; filename*=utf-8''${encodeURIComponent(filename)}`,
							"Content-Type": "text/plain;charset=utf-8",
							"Profile-Update-Interval": "6",
							"Subscription-Userinfo": `upload=${usageData}; download=${usageData}; total=${24 * 1099511627776}; expire=${expiration}`,
						}
					});
				}
			} else {
				if (environment.URL302) return Response.redirect(environment.URL302, 302);
				else if (environment.URL) return await proxyURL(environment.URL, parsedURL);
				else return new Response('', { status: 404 });
			}
		} catch (err) {
			return new Response(err.toString());
		}
	},
};

// You can continue adding the rest of the code structure, including additional helper functions
// in a similarly obfuscated format.
